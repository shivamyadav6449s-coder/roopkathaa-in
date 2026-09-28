/* ==========================================================
   RAZORPAY PAYMENTS
   ----------------------------------------------------------
   Adds online payment to the existing checkout (Cash on Delivery
   and UPI-deep-link, in script.js, are untouched and keep working
   exactly as before — this is a third option, not a replacement).

   Three endpoints:
     POST /api/payment/create-order  — start a payment
     POST /api/payment/verify        — confirm one after Razorpay
                                        Checkout closes
     POST /api/payment/webhook       — Razorpay's own server-to-server
                                        confirmation (backstop in case
                                        the customer's browser closes
                                        before /verify runs)

   The amount that reaches Razorpay — and the order that gets saved —
   is always recalculated here from server/products.js, never taken
   from the browser. An order is only ever marked "paid" after its
   Razorpay signature has been verified server-side with
   RAZORPAY_KEY_SECRET; nothing marks an order paid just because the
   frontend says the payment succeeded.
========================================================== */

const crypto = require("crypto");
const express = require("express");

const db = require("./db");
const { requireAuth } = require("./middleware");
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = require("./config");
const { priceForName, SHIPPING_FEE, FREE_SHIP_THRESHOLD } = require("./products");

const router = express.Router();

function asyncRoute(handler) {
    return function (req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

/* Only require()s (and constructs) the Razorpay SDK once it's
   actually needed, and only if both keys are configured — so a site
   that hasn't set up Razorpay yet never fails to start, it just
   can't take online payments until the keys are added. */
let razorpayInstance = null;
function getRazorpay() {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
    if (!razorpayInstance) {
        const Razorpay = require("razorpay");
        razorpayInstance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    }
    return razorpayInstance;
}

function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function cleanString(v, maxLen) {
    return String(v == null ? "" : v).trim().slice(0, maxLen || 200);
}

function newOrderId() {
    return "RK" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString("hex").toUpperCase();
}

/* Recomputes items/subtotal/shipping/total from the server's own
   price list. Returns { error } if the cart sent by the browser
   doesn't correspond to real products — this is the "never trust
   the amount from the browser" step. */
function priceCart(rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return { error: "Your bag is empty." };
    }
    if (rawItems.length > 50) {
        return { error: "That's too many items for one order." };
    }

    const items = [];
    for (const raw of rawItems) {
        if (!isPlainObject(raw)) return { error: "Invalid item in bag." };

        const name = cleanString(raw.name, 200);
        const size = cleanString(raw.size || "M", 10);
        const qty = Math.floor(Number(raw.qty));

        if (!name) return { error: "Invalid item in bag." };
        if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
            return { error: "Invalid quantity for " + name + "." };
        }

        const price = priceForName(name);
        if (price == null) {
            return { error: "'" + name + "' is no longer available." };
        }

        items.push({ name: name, size: size, qty: qty, price: price });
    }

    const subtotal = items.reduce(function (sum, it) { return sum + it.price * it.qty; }, 0);
    const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;

    return { items: items, subtotal: subtotal, shipping: shipping, total: total };
}

function priceShipping(raw) {
    if (!isPlainObject(raw)) return null;
    const name = cleanString(raw.name, 100);
    const phone = cleanString(raw.phone, 15);
    const address = cleanString(raw.address, 300);
    const city = cleanString(raw.city, 100);
    const state = cleanString(raw.state, 100);
    const pincode = cleanString(raw.pincode, 10);
    if (!name || !phone || !address || !city || !state || !pincode) return null;
    return { name: name, phone: phone, address: address, city: city, state: state, pincode: pincode };
}

function publicOrder(o) {
    return {
        id: o.id,
        items: o.items,
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        shippingAddress: o.shippingAddress,
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt: o.createdAt
    };
}

/* ---------- POST /api/payment/create-order ---------- */

router.post("/create-order", requireAuth, asyncRoute(async function (req, res) {
    const razorpay = getRazorpay();
    if (!razorpay) {
        return res.status(503).json({
            error: "Online payment isn't set up yet. Please choose Cash on Delivery or UPI instead."
        });
    }

    const body = req.body || {};
    const priced = priceCart(body.items);
    if (priced.error) return res.status(400).json({ error: priced.error });

    const shippingAddress = priceShipping(body.shipping);
    if (!shippingAddress) {
        return res.status(400).json({ error: "Please fill in all shipping details." });
    }

    const localOrder = {
        id: newOrderId(),
        userId: req.user.id,
        userEmail: req.user.email,
        items: priced.items,
        subtotal: priced.subtotal,
        shipping: priced.shipping,
        total: priced.total,
        shippingAddress: shippingAddress,
        paymentMethod: "razorpay",
        paymentStatus: "pending",   // pending -> paid | verification_failed
        status: "created",          // created -> confirmed
        razorpayOrderId: null,
        razorpayPaymentId: null,
        createdAt: new Date().toISOString()
    };

    let razorpayOrder;
    try {
        razorpayOrder = await razorpay.orders.create({
            amount: Math.round(localOrder.total * 100), // paise
            currency: "INR",
            receipt: localOrder.id,
            notes: { localOrderId: localOrder.id, userId: req.user.id }
        });
    } catch (e) {
        console.error("Razorpay order creation failed:", e && e.message ? e.message : e);
        return res.status(502).json({ error: "Could not start payment right now. Please try again in a moment." });
    }

    localOrder.razorpayOrderId = razorpayOrder.id;
    await db.createOrder(localOrder);

    res.json({
        keyId: RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        localOrderId: localOrder.id
    });
}));

/* ---------- POST /api/payment/verify ---------- */

router.post("/verify", requireAuth, asyncRoute(async function (req, res) {
    const body = req.body || {};
    const localOrderId = cleanString(body.localOrderId, 64);
    const razorpayOrderId = cleanString(body.razorpay_order_id, 64);
    const razorpayPaymentId = cleanString(body.razorpay_payment_id, 64);
    const razorpaySignature = cleanString(body.razorpay_signature, 256);

    if (!localOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ error: "Missing payment details." });
    }
    if (!RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ error: "Online payment isn't set up yet." });
    }

    const order = await db.findOrderById(localOrderId);
    if (!order || order.userId !== req.user.id) {
        return res.status(404).json({ error: "Order not found." });
    }
    if (order.razorpayOrderId !== razorpayOrderId) {
        return res.status(400).json({ error: "This payment doesn't match this order." });
    }
    if (order.paymentStatus === "paid") {
        // Already confirmed (e.g. the webhook beat this request to it) —
        // treat as success rather than erroring on a legitimate retry.
        return res.json({ ok: true, order: publicOrder(order) });
    }

    const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(razorpayOrderId + "|" + razorpayPaymentId)
        .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const gotBuf = Buffer.from(razorpaySignature, "utf8");
    const signatureValid = expectedBuf.length === gotBuf.length && crypto.timingSafeEqual(expectedBuf, gotBuf);

    if (!signatureValid) {
        await db.updateOrder(localOrderId, {
            paymentStatus: "verification_failed",
            razorpayPaymentId: razorpayPaymentId
        });
        return res.status(400).json({
            error: "Payment verification failed. If money was deducted, it will be auto-refunded by Razorpay within a few days. Please contact us with your Order ID: " + localOrderId
        });
    }

    await db.updateOrder(localOrderId, {
        paymentStatus: "paid",
        status: "confirmed",
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        paidAt: new Date().toISOString()
    });

    const updated = await db.findOrderById(localOrderId);
    res.json({ ok: true, order: publicOrder(updated) });
}));

/* ---------- POST /api/payment/webhook ----------
   Mounted in server.js with express.raw() BEFORE the global
   express.json() middleware, because verifying a webhook needs the
   exact raw request bytes — not Express's re-serialized JSON. Not
   protected by requireAuth: Razorpay calls this directly, and the
   HMAC signature check below is what authenticates it instead. */

const webhookHandler = asyncRoute(async function (req, res) {
    if (!RAZORPAY_WEBHOOK_SECRET) {
        // Webhook not configured — nothing to verify against, so there's
        // nothing safe to do with this request. Acknowledge it anyway
        // (200) so Razorpay doesn't keep retrying; /verify above already
        // covers the normal checkout flow on its own.
        return res.status(200).json({ ok: true, skipped: "webhook not configured" });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.get("x-razorpay-signature") || "";

    const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const gotBuf = Buffer.from(signature, "utf8");
    const valid = signature && expectedBuf.length === gotBuf.length && crypto.timingSafeEqual(expectedBuf, gotBuf);

    if (!valid) {
        return res.status(400).json({ error: "Invalid webhook signature" });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody.toString("utf8"));
    } catch (e) {
        return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const event = payload && payload.event;
    const paymentEntity = payload && payload.payload && payload.payload.payment && payload.payload.payment.entity;

    if ((event === "payment.captured" || event === "order.paid") && paymentEntity) {
        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;

        // Look up which local order this Razorpay order belongs to by
        // the razorpayOrderId we stored on it in /create-order — works
        // regardless of whether Razorpay echoes notes back on the
        // payment entity.
        const order = razorpayOrderId ? await db.findOrderByRazorpayOrderId(razorpayOrderId) : null;

        if (order && order.paymentStatus !== "paid") {
            await db.updateOrder(order.id, {
                paymentStatus: "paid",
                status: "confirmed",
                razorpayPaymentId: razorpayPaymentId,
                paidAt: new Date().toISOString()
            });
        }
    }

    res.status(200).json({ ok: true });
});

module.exports = { router: router, webhookHandler: webhookHandler };
