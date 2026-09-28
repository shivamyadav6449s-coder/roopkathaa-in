/* ==========================================================
   ROOPKATHAA.IN — AUTH SERVER
   Serves the existing static frontend (the folder one level up
   from this file — index.html, index.css, script.js, images,
   login.html, etc.) AND the login/registration API, from a
   single Express app on one port. This is why Live Server is no
   longer used for this project — a real backend + database are
   required for real accounts, and Live Server can only serve
   static files.
========================================================== */

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { PORT, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require("./config");
const db = require("./db");
const { getUserFromReq } = require("./middleware");
const authRouter = require("./auth");
const { router: paymentRouter, webhookHandler } = require("./payment");

const app = express();

// The existing frontend lives one directory above /server.
const SITE_ROOT = path.join(__dirname, "..");

/* Razorpay's webhook signature has to be checked against the exact
   raw request bytes, so this one route needs express.raw() instead
   of express.json() — and it has to be registered BEFORE the global
   express.json() below, otherwise that would already have consumed
   the request body by the time this route runs. Everything else
   (including the rest of /api/payment) uses normal JSON as usual. */
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), webhookHandler);

app.use(express.json());
app.use(cookieParser());

// Slows down password-guessing: at most 20 login/register attempts per
// 15 minutes from the same visitor. Doesn't affect normal use at all.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please wait a few minutes and try again." }
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRouter);

// Same idea, sized for checkout instead of login: plenty of headroom
// for a genuine customer retrying a failed/cancelled payment, not
// enough to be useful for abuse.
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please wait a few minutes and try again." }
});
app.use("/api/payment/create-order", paymentLimiter);
app.use("/api/payment/verify", paymentLimiter);

app.use("/api/payment", paymentRouter);

/* ---------- Protected routes ----------
   The shop itself (index.html / "/") is public — anyone can browse
   the site, view products and use the cart without an account.
   Login/registration is only required at checkout, which is
   enforced by the /api/auth/me check the frontend runs before
   opening the checkout form (see script.js). Genuinely private
   routes (account info, placing an order, etc.) still check
   getUserFromReq() the same way they always did. */

/* A user who is already logged in doesn't need to see the
   login screen again. */
app.get("/login.html", function (req, res, next) {
    if (getUserFromReq(req)) {
        return res.redirect("/");
    }
    next();
});

app.use(express.static(SITE_ROOT));

/* ---------- Error handling ----------
   Without this, an unexpected error (a bad request body, a database
   hiccup, etc.) would fall through to Express's default handler, which
   in development mode sends back a raw stack trace. This always returns
   a clean, generic JSON message instead — the real error is still logged
   on the server for debugging, just never shown to the visitor. */
app.use(function (err, req, res, next) {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(err && err.status ? err.status : 500).json({
        error: "Something went wrong on our end. Please try again."
    });
});

app.listen(PORT, function () {
    console.log("");
    console.log("  Roopkathaa.in is running:");
    console.log("  -> http://localhost:" + PORT);
    console.log("  -> database mode: " + db.mode + (db.mode === "file" ? " (local server/data/users.json)" : " (MongoDB)"));
    console.log("  -> Razorpay: " + (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET ? "configured (" + RAZORPAY_KEY_ID + ")" : "NOT configured — Pay Online will show a friendly error until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set"));
    console.log("");
});
