/* ==========================================================
   ROOPKATHAA.IN — SITE INTERACTIONS
   Mobile menu, search, cart drawer, wishlist, quick view,
   filters, countdown, back-to-top, newsletter, toasts.
   Cart & wishlist persist in localStorage.
========================================================== */

(function () {
    "use strict";

    /* ---------- STORE CONFIG ----------
       Update these two values with your real details —
       orders are sent to this WhatsApp number, and UPI
       payments go to this UPI ID. */
    var STORE_WHATSAPP = "917408072382";   // WhatsApp number: country code (91) + number, no + or spaces
    var STORE_UPI_ID = "8545859568@pthdfc";   // store UPI ID
    var STORE_UPI_NAME = "Roopkathaa";
    var SHIPPING_FEE = 99;
    var FREE_SHIP_THRESHOLD = 1999;
    var MAX_QTY_PER_PRODUCT = 3;   // a customer can't buy more than this many of the same product (same size)

    /* ---------- helpers ---------- */

    function money(n) {
        return "₹" + Number(n).toLocaleString("en-IN");
    }

    function safeParse(json, fallback) {
        try {
            var v = JSON.parse(json);
            return v || fallback;
        } catch (e) {
            return fallback;
        }
    }

    function productDisplayName(card) {
        var base = card.getAttribute("data-name");
        var color = card.getAttribute("data-selected-color");
        return color ? base + " — " + color : base;
    }

    function openPanel(panelEl, backdropEl) {
        if (panelEl) panelEl.classList.add("active");
        if (backdropEl) backdropEl.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closePanel(panelEl, backdropEl) {
        if (panelEl) panelEl.classList.remove("active");
        if (backdropEl) backdropEl.classList.remove("active");
        var anyOpen = document.querySelector(
            ".mobile-menu.active, .search-overlay.active, .cart-drawer.active, .quickview-modal.active, .checkout-modal.active, .size-chart-modal.active, .photo-zoom-modal.active"
        );
        if (!anyOpen) document.body.style.overflow = "";
    }

    function closeAllPanels() {
        document.querySelectorAll(
            ".mobile-menu, .search-overlay, .cart-drawer, .quickview-modal, .checkout-modal, .size-chart-modal, .photo-zoom-modal"
        ).forEach(function (el) { el.classList.remove("active"); });
        document.querySelectorAll(".overlay-backdrop").forEach(function (el) {
            el.classList.remove("active");
        });
        document.body.style.overflow = "";
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeAllPanels();
    });


    /* ---------- TOAST ---------- */

    var toastEl = document.getElementById("toast");
    var toastTimer = null;

    function showToast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add("active");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove("active");
        }, 2200);
    }


    /* ---------- MOBILE MENU ---------- */

    var menuToggle = document.getElementById("menuToggle");
    var mobileMenu = document.getElementById("mobileMenu");
    var menuBackdrop = document.getElementById("menuBackdrop");
    var mobileMenuClose = document.getElementById("mobileMenuClose");

    if (menuToggle) menuToggle.addEventListener("click", function () {
        openPanel(mobileMenu, menuBackdrop);
    });
    if (mobileMenuClose) mobileMenuClose.addEventListener("click", function () {
        closePanel(mobileMenu, menuBackdrop);
    });
    if (menuBackdrop) menuBackdrop.addEventListener("click", closeAllPanels);
    document.querySelectorAll(".mobile-link").forEach(function (a) {
        a.addEventListener("click", closeAllPanels);
    });


    /* ---------- SEARCH OVERLAY ---------- */

    var searchToggle = document.getElementById("searchToggle");
    var searchOverlay = document.getElementById("searchOverlay");
    var searchClose = document.getElementById("searchClose");
    var searchInput = document.getElementById("searchInput");

    var noResultsMsg = document.getElementById("noResultsMsg");
    var searchFilterChips = document.querySelectorAll(".chip-filter");

    if (searchToggle) searchToggle.addEventListener("click", function () {
        openPanel(searchOverlay, null);
        setTimeout(function () { if (searchInput) searchInput.focus(); }, 300);
    });
    if (searchClose) searchClose.addEventListener("click", function () {
        closePanel(searchOverlay, null);
    });

    /* Filters product cards by name/category text — same show/hide
       mechanism the category chips already use, so it plays nicely
       with them (a live search resets the chips back to "All" since
       a text search isn't tied to one category).
       Covers BOTH the New Arrivals grid and the Best Sellers grid
       (bestSellersGrid, declared further below) — searching only New
       Arrivals used to make Best-Sellers-only products (e.g. "Royal
       Blue Designer Lehenga") show "No results found" even though
       they're right there on the page. */
    function runSiteSearch(rawQuery) {
        var query = String(rawQuery || "").trim().toLowerCase();
        if (!newArrivalsGrid) return;

        var newArrivalsCards = newArrivalsGrid.querySelectorAll(".product");
        var bestSellerCards = bestSellersGrid ? bestSellersGrid.querySelectorAll(".product") : [];
        var kurtiCards = kurtisGrid ? kurtisGrid.querySelectorAll(".product") : [];

        if (!query) {
            newArrivalsCards.forEach(function (card) { card.classList.remove("hidden-by-filter"); });
            bestSellerCards.forEach(function (card) { card.classList.remove("hidden-by-filter"); });
            kurtiCards.forEach(function (card) { card.classList.remove("hidden-by-filter"); });
            if (noResultsMsg) noResultsMsg.hidden = true;
            return;
        }

        searchFilterChips.forEach(function (c) { c.classList.remove("active"); });
        var allChip = document.querySelector('.chip-filter[data-filter="all"]');
        if (allChip) allChip.classList.add("active");

        var anyVisible = false;
        function matchCard(card) {
            var haystack = (
                (card.getAttribute("data-name") || "") + " " +
                (card.getAttribute("data-category") || "")
            ).toLowerCase();
            var show = haystack.indexOf(query) !== -1;
            card.classList.toggle("hidden-by-filter", !show);
            if (show) anyVisible = true;
        }
        newArrivalsCards.forEach(matchCard);
        bestSellerCards.forEach(matchCard);
        kurtiCards.forEach(matchCard);

        if (noResultsMsg) noResultsMsg.hidden = anyVisible;
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            runSiteSearch(searchInput.value);
        });
        searchInput.addEventListener("keydown", function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            runSiteSearch(searchInput.value);
            closeAllPanels();
            var target = document.getElementById("new-arrivals");
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
    }

    document.querySelectorAll(".search-box .chip").forEach(function (a) {
        a.addEventListener("click", function (e) {
            e.preventDefault();
            var term = a.textContent.trim();
            if (searchInput) searchInput.value = term;
            runSiteSearch(term);
            closeAllPanels();
            var target = document.getElementById("new-arrivals");
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
    });


    /* ---------- CART ---------- */

    var CART_KEY = "roopkathaa_cart";
    var cart = safeParse(localStorage.getItem(CART_KEY), []);

    var cartToggle = document.getElementById("cartToggle");
    var cartDrawer = document.getElementById("cartDrawer");
    var cartBackdrop = document.getElementById("cartBackdrop");
    var cartClose = document.getElementById("cartClose");
    var continueShoppingBtn = document.getElementById("continueShoppingBtn");
    var checkoutBtn = document.getElementById("checkoutBtn");
    var cartItemsEl = document.getElementById("cartItems");
    var cartEmptyMsg = document.getElementById("cartEmptyMsg");
    var cartSubtotalEl = document.getElementById("cartSubtotal");
    var cartCountBadge = document.getElementById("cartCount");
    var cartItemCountEl = document.getElementById("cartItemCount");

    function saveCart() {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    function cartTotalQty() {
        return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    }

    function renderCart() {
        var totalQty = cartTotalQty();
        if (cartCountBadge) cartCountBadge.textContent = totalQty;
        if (cartItemCountEl) cartItemCountEl.textContent = totalQty;

        if (!cartItemsEl) return;
        cartItemsEl.innerHTML = "";

        if (cart.length === 0) {
            var empty = document.createElement("p");
            empty.className = "cart-empty";
            empty.id = "cartEmptyMsg";
            empty.textContent = "Your bag is empty. Start adding pieces you love.";
            cartItemsEl.appendChild(empty);
        } else {
            cart.forEach(function (item) {
                var row = document.createElement("div");
                row.className = "cart-item";
                row.innerHTML =
                    '<img src="' + item.image + '" alt="' + item.name + '">' +
                    '<div class="cart-item-info">' +
                        '<h4>' + item.name + '</h4>' +
                        '<p>Size: ' + item.size + ' · ' + money(item.price) + '</p>' +
                        '<div class="cart-item-bottom">' +
                            '<div class="cart-qty">' +
                                '<button class="cart-qty-minus" aria-label="Decrease quantity">−</button>' +
                                '<span>' + item.qty + '</span>' +
                                '<button class="cart-qty-plus" aria-label="Increase quantity">+</button>' +
                            '</div>' +
                            '<button class="cart-item-remove">REMOVE</button>' +
                        '</div>' +
                    '</div>';

                row.querySelector(".cart-qty-plus").addEventListener("click", function () {
                    if (item.qty >= MAX_QTY_PER_PRODUCT) {
                        showToast("You can add up to " + MAX_QTY_PER_PRODUCT + " of this item");
                        return;
                    }
                    item.qty += 1;
                    saveCart();
                    renderCart();
                });
                row.querySelector(".cart-qty-minus").addEventListener("click", function () {
                    item.qty -= 1;
                    if (item.qty <= 0) {
                        cart = cart.filter(function (c) { return c.key !== item.key; });
                    }
                    saveCart();
                    renderCart();
                });
                row.querySelector(".cart-item-remove").addEventListener("click", function () {
                    cart = cart.filter(function (c) { return c.key !== item.key; });
                    saveCart();
                    renderCart();
                });

                cartItemsEl.appendChild(row);
            });
        }

        var subtotal = cart.reduce(function (sum, item) {
            return sum + item.price * item.qty;
        }, 0);
        if (cartSubtotalEl) cartSubtotalEl.textContent = money(subtotal);
    }

    function addToCart(product, size, qty) {
        size = size || "M";
        qty = qty || 1;
        var key = product.name + "|" + size;
        var existing = cart.find(function (c) { return c.key === key; });
        var wasCapped = false;
        if (existing) {
            existing.qty += qty;
            if (existing.qty > MAX_QTY_PER_PRODUCT) {
                existing.qty = MAX_QTY_PER_PRODUCT;
                wasCapped = true;
            }
        } else {
            if (qty > MAX_QTY_PER_PRODUCT) {
                qty = MAX_QTY_PER_PRODUCT;
                wasCapped = true;
            }
            cart.push({
                key: key,
                name: product.name,
                price: product.price,
                image: product.image,
                size: size,
                qty: qty
            });
        }
        saveCart();
        renderCart();
        showToast(wasCapped
            ? "Only up to " + MAX_QTY_PER_PRODUCT + " of " + product.name + " can be added"
            : product.name + " added to bag");
    }

    if (cartToggle) cartToggle.addEventListener("click", function () {
        openPanel(cartDrawer, cartBackdrop);
    });
    if (cartClose) cartClose.addEventListener("click", function () {
        closePanel(cartDrawer, cartBackdrop);
    });
    if (continueShoppingBtn) continueShoppingBtn.addEventListener("click", function () {
        closePanel(cartDrawer, cartBackdrop);
    });
    if (cartBackdrop) cartBackdrop.addEventListener("click", closeAllPanels);

    renderCart();


    /* ---------- CHECKOUT ---------- */

    var checkoutModal = document.getElementById("checkoutModal");
    var checkoutBackdrop = document.getElementById("checkoutBackdrop");
    var checkoutClose = document.getElementById("checkoutClose");
    var checkoutFormView = document.getElementById("checkoutFormView");
    var checkoutSuccessView = document.getElementById("checkoutSuccessView");
    var checkoutForm = document.getElementById("checkoutForm");
    var checkoutSummaryEl = document.getElementById("checkoutSummary");
    var checkoutTotalsEl = document.getElementById("checkoutTotals");
    var payMethodRadios = document.querySelectorAll('input[name="payMethod"]');
    var upiBox = document.getElementById("upiBox");
    var upiAmountEl = document.getElementById("upiAmount");
    var upiIdText = document.getElementById("upiIdText");
    var upiPayBtn = document.getElementById("upiPayBtn");
    var copyUpiBtn = document.getElementById("copyUpiBtn");
    var checkoutDoneBtn = document.getElementById("checkoutDoneBtn");
    var successOrderId = document.getElementById("successOrderId");
    var successNote = document.getElementById("successNote");
    var placeOrderBtn = document.getElementById("placeOrderBtn");

    if (upiIdText) upiIdText.textContent = STORE_UPI_ID;

    /* "Pay Online" is only offered when the server actually has
       Razorpay configured — otherwise customers would see an option
       that can't work. Hidden until the server confirms. */
    var razorpayOptionLabel = (function () {
        var input = document.querySelector('input[name="payMethod"][value="razorpay"]');
        return input ? input.closest(".payment-option") : null;
    })();
    if (razorpayOptionLabel) {
        razorpayOptionLabel.style.display = "none";
        fetch("/api/payment/config", { credentials: "include" })
            .then(function (res) { return res.ok ? res.json() : { enabled: false }; })
            .then(function (cfg) {
                if (cfg && cfg.enabled) razorpayOptionLabel.style.display = "";
            })
            .catch(function () { /* stays hidden */ });
    }

    function checkoutTotals() {
        var subtotal = cart.reduce(function (sum, item) {
            return sum + item.price * item.qty;
        }, 0);
        var shipping = (subtotal === 0 || subtotal >= FREE_SHIP_THRESHOLD) ? 0 : SHIPPING_FEE;
        return { subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
    }

    function renderCheckoutSummary() {
        if (!checkoutSummaryEl || !checkoutTotalsEl) return;

        checkoutSummaryEl.innerHTML = "";
        cart.forEach(function (item) {
            var row = document.createElement("div");
            row.className = "checkout-summary-item";
            row.innerHTML =
                '<img src="' + item.image + '" alt="' + item.name + '">' +
                '<div class="checkout-summary-item-info">' +
                    '<strong>' + item.name + '</strong>' +
                    '<span>Size ' + item.size + ' · Qty ' + item.qty + ' · ' + money(item.price) + '</span>' +
                '</div>';
            checkoutSummaryEl.appendChild(row);
        });

        var t = checkoutTotals();
        checkoutTotalsEl.innerHTML =
            '<div class="checkout-totals-row"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
            '<div class="checkout-totals-row"><span>Shipping</span><span>' + (t.shipping === 0 ? "FREE" : money(t.shipping)) + '</span></div>' +
            '<div class="checkout-totals-row grand-total"><span>Total</span><span>' + money(t.total) + '</span></div>';

        updateUpiLink();
    }

    function currentPayMethod() {
        var checked = document.querySelector('input[name="payMethod"]:checked');
        return checked ? checked.value : "upi";
    }

    function updateUpiLink() {
        var t = checkoutTotals();
        if (upiAmountEl) upiAmountEl.textContent = money(t.total);
        if (upiPayBtn) {
            var upiUrl = "upi://pay?pa=" + encodeURIComponent(STORE_UPI_ID) +
                "&pn=" + encodeURIComponent(STORE_UPI_NAME) +
                "&am=" + encodeURIComponent(t.total) +
                "&cu=INR&tn=" + encodeURIComponent("Roopkathaa order");
            upiPayBtn.setAttribute("href", upiUrl);
        }
    }

    payMethodRadios.forEach(function (radio) {
        radio.addEventListener("change", function () {
            document.querySelectorAll(".payment-option").forEach(function (opt) {
                opt.classList.remove("active");
            });
            radio.closest(".payment-option").classList.add("active");
            if (upiBox) upiBox.hidden = currentPayMethod() !== "upi";
            updateUpiLink();
        });
    });

    if (copyUpiBtn) copyUpiBtn.addEventListener("click", function () {
        var text = STORE_UPI_ID;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("UPI ID copied");
            }).catch(function () {
                showToast(text);
            });
        } else {
            showToast(text);
        }
    });

    function showCheckoutForm() {
        checkoutFormView.hidden = false;
        checkoutFormView.classList.add("active");
        checkoutSuccessView.hidden = true;
        renderCheckoutSummary();
        if (upiBox) upiBox.hidden = currentPayMethod() !== "upi";
        closePanel(cartDrawer, cartBackdrop);
        openPanel(checkoutModal, checkoutBackdrop);
    }

    function goToLoginForCheckout() {
        // Browsing and the cart are fully open to guests — an account
        // is only needed at this point, right before placing an order.
        // Bring them back here (with the cart still intact in
        // localStorage) once they've logged in.
        var returnTo = window.location.pathname + "?checkout=1";
        window.location.href = "/login.html?redirect=" + encodeURIComponent(returnTo);
    }

    function openCheckout() {
        if (cart.length === 0) {
            showToast("Your bag is empty");
            return;
        }
        // Re-check auth fresh every time (a session can log out/expire
        // in another tab), then either continue straight to the
        // checkout form or send a guest to log in first.
        fetch("/api/auth/me", { credentials: "include" })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (data && data.user) {
                    showCheckoutForm();
                } else {
                    goToLoginForCheckout();
                }
            })
            .catch(function () {
                goToLoginForCheckout();
            });
    }

    if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);
    if (checkoutClose) checkoutClose.addEventListener("click", function () {
        closePanel(checkoutModal, checkoutBackdrop);
    });
    if (checkoutBackdrop) checkoutBackdrop.addEventListener("click", closeAllPanels);

    function buildWhatsAppMessage(order) {
        var lines = [];
        lines.push("New order from Roopkathaa.in");
        lines.push("Order ID: " + order.id);
        lines.push("");
        lines.push("Items:");
        order.items.forEach(function (item) {
            lines.push("- " + item.name + " (Size " + item.size + ") x" + item.qty + " — " + money(item.price * item.qty));
        });
        lines.push("");
        lines.push("Subtotal: " + money(order.subtotal));
        lines.push("Shipping: " + (order.shipping === 0 ? "FREE" : money(order.shipping)));
        lines.push("Total: " + money(order.total));
        lines.push("");
        lines.push("Payment Method: " + (order.payMethod === "razorpay" ? "Paid online via Razorpay (payment verified by server)" : "UPI (payment verify karein)"));
        lines.push("");
        lines.push("Name: " + order.name);
        lines.push("Phone: " + order.phone);
        lines.push("Address: " + order.address + ", " + order.city + ", " + order.state + " - " + order.pincode);
        return lines.join("\n");
    }

    function saveOrder(order) {
        var ORDERS_KEY = "roopkathaa_orders";
        var orders = safeParse(localStorage.getItem(ORDERS_KEY), []);
        orders.push(order);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }

    /* Shared by both the existing UPI flow below and the Razorpay
       flow — swaps the checkout modal from the form to the success
       view exactly as it already did, just no longer duplicated in
       two places. */
    function showOrderSuccess(orderId, noteText, opts) {
        opts = opts || {};
        var successTitle = document.getElementById("successTitle");
        var successWaLink = document.getElementById("successWhatsappLink");
        if (successTitle) successTitle.textContent = opts.title || "Order Placed!";
        if (successWaLink) {
            if (opts.whatsappUrl) {
                successWaLink.setAttribute("href", opts.whatsappUrl);
                successWaLink.style.display = "";
            } else {
                successWaLink.style.display = "none";
            }
        }
        successNote.textContent = noteText;
        successOrderId.textContent = orderId;

        cart = [];
        saveCart();
        renderCart();

        checkoutFormView.hidden = true;
        checkoutFormView.classList.remove("active");
        checkoutSuccessView.hidden = false;

        checkoutForm.reset();
        if (upiBox) upiBox.hidden = true;
        document.querySelectorAll(".payment-option").forEach(function (opt, i) {
            opt.classList.toggle("active", i === 0);
        });
    }

    function setPlaceOrderLoading(isLoading, label) {
        if (!placeOrderBtn) return;
        placeOrderBtn.disabled = isLoading;
        placeOrderBtn.textContent = label;
    }

    function readShippingFields() {
        return {
            name: document.getElementById("ckName").value.trim(),
            phone: document.getElementById("ckPhone").value.trim(),
            address: document.getElementById("ckAddress").value.trim(),
            city: document.getElementById("ckCity").value.trim(),
            state: document.getElementById("ckState").value.trim(),
            pincode: document.getElementById("ckPincode").value.trim()
        };
    }

    /* ---------- Razorpay (Pay Online) ----------
       A second payment path alongside the existing UPI one above —
       that one is completely untouched. This one actually charges a
       card/UPI/wallet through Razorpay's Checkout widget, with the
       amount always coming from the server (server/products.js +
       server/payment.js), never from this cart. */
    /* Razorpay's Checkout script is only downloaded when a customer
       actually chooses Pay Online — nobody else pays for it. */
    function loadRazorpaySdk() {
        return new Promise(function (resolve, reject) {
            if (typeof Razorpay !== "undefined") { resolve(); return; }
            var tag = document.createElement("script");
            tag.src = "https://checkout.razorpay.com/v1/checkout.js";
            tag.onload = function () { resolve(); };
            tag.onerror = function () { reject(new Error("razorpay sdk failed to load")); };
            document.head.appendChild(tag);
        });
    }

    function startRazorpayCheckout() {
        var shipping = readShippingFields();
        setPlaceOrderLoading(true, "STARTING PAYMENT…");

        loadRazorpaySdk()
            .then(function () {
                return fetch("/api/payment/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        items: cart.map(function (item) {
                            return { name: item.name, size: item.size, qty: item.qty };
                        }),
                        shipping: shipping
                    })
                });
            })
            .then(function (res) {
                return res.json().then(function (data) { return { ok: res.ok, data: data }; });
            })
            .then(function (result) {
                if (!result.ok) {
                    showToast((result.data && result.data.error) || "Could not start payment. Please try again.");
                    setPlaceOrderLoading(false, "PLACE ORDER");
                    return;
                }

                var data = result.data;
                var rzp = new Razorpay({
                    key: data.keyId,
                    amount: data.amount,
                    currency: data.currency,
                    name: "Roopkathaa.in",
                    description: "Order " + data.localOrderId,
                    order_id: data.razorpayOrderId,
                    prefill: {
                        name: shipping.name,
                        email: data.customerEmail || "",
                        contact: shipping.phone
                    },
                    notes: { localOrderId: data.localOrderId },
                    theme: { color: "#3d1512" },
                    handler: function (response) {
                        setPlaceOrderLoading(true, "CONFIRMING PAYMENT…");
                        fetch("/api/payment/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                localOrderId: data.localOrderId,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        })
                            .then(function (res) {
                                return res.json().then(function (body) { return { ok: res.ok, body: body }; });
                            })
                            .then(function (verifyResult) {
                                setPlaceOrderLoading(false, "PLACE ORDER");
                                if (verifyResult.ok && verifyResult.body && verifyResult.body.ok) {
                                    // Only reached after the server verified Razorpay's signature.
                                    var t = checkoutTotals();
                                    var paidOrder = {
                                        id: data.localOrderId,
                                        items: cart.map(function (item) {
                                            return { name: item.name, size: item.size, qty: item.qty, price: item.price };
                                        }),
                                        subtotal: t.subtotal,
                                        shipping: t.shipping,
                                        total: t.total,
                                        payMethod: "razorpay",
                                        name: shipping.name,
                                        phone: shipping.phone,
                                        address: shipping.address,
                                        city: shipping.city,
                                        state: shipping.state,
                                        pincode: shipping.pincode,
                                        placedAt: new Date().toISOString()
                                    };
                                    saveOrder(paidOrder);
                                    showOrderSuccess(
                                        data.localOrderId,
                                        "Payment successful — your order is confirmed! Tap the button below to also send your order details to us on WhatsApp.",
                                        {
                                            title: "Payment Successful · Order Confirmed",
                                            whatsappUrl: "https://wa.me/" + STORE_WHATSAPP + "?text=" + encodeURIComponent(buildWhatsAppMessage(paidOrder))
                                        }
                                    );
                                } else {
                                    showToast((verifyResult.body && verifyResult.body.error) || "Payment verification failed. Please contact us if money was deducted.");
                                }
                            })
                            .catch(function () {
                                setPlaceOrderLoading(false, "PLACE ORDER");
                                showToast("Could not confirm payment. Please contact us if money was deducted.");
                            });
                    },
                    modal: {
                        ondismiss: function () {
                            setPlaceOrderLoading(false, "PLACE ORDER");
                            showToast("Payment cancelled — you can tap Place Order to try again.");
                        }
                    }
                });

                rzp.on("payment.failed", function (resp) {
                    setPlaceOrderLoading(false, "PLACE ORDER");
                    var reason = resp && resp.error && resp.error.description;
                    showToast("Payment failed" + (reason ? ": " + reason : ". Please try again."));
                });

                setPlaceOrderLoading(false, "PLACE ORDER");
                rzp.open();
            })
            .catch(function () {
                setPlaceOrderLoading(false, "PLACE ORDER");
                showToast("Could not start payment. Please check your connection and try again.");
            });
    }

    if (checkoutForm) checkoutForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (cart.length === 0) return;

        var payMethod = currentPayMethod();

        if (payMethod === "razorpay") {
            startRazorpayCheckout();
            return;
        }

        // ---- UPI (unchanged) ----
        var t = checkoutTotals();
        var orderId = "RK" + Date.now().toString().slice(-8);
        var shipping = readShippingFields();

        var order = {
            id: orderId,
            items: cart.map(function (item) {
                return { name: item.name, size: item.size, qty: item.qty, price: item.price };
            }),
            subtotal: t.subtotal,
            shipping: t.shipping,
            total: t.total,
            payMethod: payMethod,
            name: shipping.name,
            phone: shipping.phone,
            address: shipping.address,
            city: shipping.city,
            state: shipping.state,
            pincode: shipping.pincode,
            placedAt: new Date().toISOString()
        };

        saveOrder(order);

        var waMessage = buildWhatsAppMessage(order);
        var waUrl = "https://wa.me/" + STORE_WHATSAPP + "?text=" + encodeURIComponent(waMessage);
        window.open(waUrl, "_blank");

        var note = "We've opened WhatsApp with your order details — please tap send there so our team can confirm your UPI payment.";
        showOrderSuccess(orderId, note);
    });

    if (checkoutDoneBtn) checkoutDoneBtn.addEventListener("click", function () {
        closePanel(checkoutModal, checkoutBackdrop);
    });


    /* ---------- WISHLIST ---------- */

    var WISHLIST_KEY = "roopkathaa_wishlist";
    var wishlist = safeParse(localStorage.getItem(WISHLIST_KEY), []);
    var wishlistCountBadge = document.getElementById("wishlistCount");

    var wishlistToggle = document.getElementById("wishlistToggle");
    var wishlistDrawer = document.getElementById("wishlistDrawer");
    var wishlistBackdrop = document.getElementById("wishlistBackdrop");
    var wishlistClose = document.getElementById("wishlistClose");
    var wishlistContinueBtn = document.getElementById("wishlistContinueBtn");
    var wishlistItemsEl = document.getElementById("wishlistItems");
    var wishlistItemCountEl = document.getElementById("wishlistItemCount");

    function saveWishlist() {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    }

    function refreshWishlistBadge() {
        if (wishlistCountBadge) wishlistCountBadge.textContent = wishlist.length;
    }

    function syncWishButtons() {
        document.querySelectorAll(".product").forEach(function (card) {
            var name = card.getAttribute("data-name");
            var btn = card.querySelector(".wish-btn");
            if (btn) {
                btn.classList.toggle("active", wishlist.indexOf(name) !== -1);
                btn.textContent = wishlist.indexOf(name) !== -1 ? "♥" : "♡";
            }
        });
    }

    /* Looks a wishlisted name up against the products actually on the
       page, rather than building a CSS selector out of it (product
       names can contain punctuation like an em dash for color
       variants — this avoids any selector-escaping issues). */
    function findProductCardByName(name) {
        var cards = document.querySelectorAll(".product");
        for (var i = 0; i < cards.length; i++) {
            if (cards[i].getAttribute("data-name") === name) return cards[i];
        }
        return null;
    }

    function removeFromWishlist(name) {
        var idx = wishlist.indexOf(name);
        if (idx !== -1) wishlist.splice(idx, 1);
        saveWishlist();
        refreshWishlistBadge();
        syncWishButtons();
        renderWishlist();
    }

    /* Renders the wishlist drawer's contents — mirrors renderCart()
       below. Pulls each item's current image/price live from its
       product card (the wishlist itself only stores the name), so it
       always reflects the live catalog. */
    function renderWishlist() {
        if (wishlistItemCountEl) wishlistItemCountEl.textContent = wishlist.length;
        if (!wishlistItemsEl) return;
        wishlistItemsEl.innerHTML = "";

        if (wishlist.length === 0) {
            var empty = document.createElement("p");
            empty.className = "cart-empty";
            empty.id = "wishlistEmptyMsg";
            empty.textContent = "Your wishlist is empty. Tap the ♡ on any product to save it here.";
            wishlistItemsEl.appendChild(empty);
            return;
        }

        wishlist.forEach(function (name) {
            var card = findProductCardByName(name);
            var image = card ? card.getAttribute("data-image") : "";
            var price = card ? parseFloat(card.getAttribute("data-price")) : null;

            var row = document.createElement("div");
            row.className = "cart-item";
            row.innerHTML =
                '<img src="' + image + '" alt="' + name + '">' +
                '<div class="cart-item-info">' +
                    '<h4>' + name + '</h4>' +
                    (price != null && !isNaN(price) ? '<p>' + money(price) + '</p>' : '<p>No longer available</p>') +
                    '<div class="cart-item-bottom">' +
                        '<button class="cart-item-remove wish-move-btn"' + (card ? '' : ' disabled') + '>ADD TO BAG</button>' +
                        '<button class="cart-item-remove wish-remove-btn">REMOVE</button>' +
                    '</div>' +
                '</div>';

            var moveBtn = row.querySelector(".wish-move-btn");
            var removeBtn = row.querySelector(".wish-remove-btn");

            if (moveBtn) moveBtn.addEventListener("click", function () {
                if (!card) return;
                addToCart({ name: name, price: price, image: image }, "M", 1);
            });
            if (removeBtn) removeBtn.addEventListener("click", function () {
                removeFromWishlist(name);
            });

            wishlistItemsEl.appendChild(row);
        });
    }

    document.querySelectorAll(".wish-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var card = btn.closest(".product");
            if (!card) return;
            var name = card.getAttribute("data-name");
            var idx = wishlist.indexOf(name);
            if (idx === -1) {
                wishlist.push(name);
                showToast(name + " added to wishlist");
            } else {
                wishlist.splice(idx, 1);
                showToast(name + " removed from wishlist");
            }
            saveWishlist();
            refreshWishlistBadge();
            syncWishButtons();
            renderWishlist();
        });
    });

    if (wishlistToggle) wishlistToggle.addEventListener("click", function () {
        renderWishlist();
        openPanel(wishlistDrawer, wishlistBackdrop);
    });
    if (wishlistClose) wishlistClose.addEventListener("click", function () {
        closePanel(wishlistDrawer, wishlistBackdrop);
    });
    if (wishlistContinueBtn) wishlistContinueBtn.addEventListener("click", function () {
        closePanel(wishlistDrawer, wishlistBackdrop);
    });
    if (wishlistBackdrop) wishlistBackdrop.addEventListener("click", closeAllPanels);

    refreshWishlistBadge();
    syncWishButtons();
    renderWishlist();


    /* ---------- COLOR SWATCHES ---------- */

    document.querySelectorAll(".color-swatches").forEach(function (group) {
        var card = group.closest(".product");
        if (!card) return;

        group.querySelectorAll(".swatch").forEach(function (swatch) {
            swatch.addEventListener("click", function () {
                group.querySelectorAll(".swatch").forEach(function (s) {
                    s.classList.remove("active");
                });
                swatch.classList.add("active");

                var front = swatch.getAttribute("data-front");
                var back = swatch.getAttribute("data-back");
                var color = swatch.getAttribute("data-color");

                var imgFront = card.querySelector(".img-front");
                var imgBack = card.querySelector(".img-back");
                if (imgFront && front) imgFront.src = front;
                if (imgBack && back) imgBack.src = back;

                card.setAttribute("data-image", front || card.getAttribute("data-image"));
                card.setAttribute("data-selected-color", color || "");

                var label = group.querySelector(".swatch-label");
                if (label) label.textContent = color || "";
            });
        });
    });


    /* ---------- ADD TO CART (grid buttons) ---------- */

    document.querySelectorAll(".add-cart-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var card = btn.closest(".product");
            if (!card) return;
            var product = {
                name: productDisplayName(card),
                price: parseFloat(card.getAttribute("data-price")),
                image: card.getAttribute("data-image")
            };
            addToCart(product, "M", 1);

            var original = btn.textContent;
            btn.textContent = "ADDED ✓";
            btn.classList.add("added");
            setTimeout(function () {
                btn.textContent = original;
                btn.classList.remove("added");
            }, 1400);
        });
    });


    /* ---------- QUICK VIEW ---------- */

    var quickviewModal = document.getElementById("quickviewModal");
    var quickviewBackdrop = document.getElementById("quickviewBackdrop");
    var quickviewClose = document.getElementById("quickviewClose");
    var qvImage = document.getElementById("qvImage");
    var qvName = document.getElementById("qvName");
    var qvPriceRow = document.getElementById("qvPriceRow");
    var qvQty = document.getElementById("qvQty");
    var qvQtyMinus = document.getElementById("qvQtyMinus");
    var qvQtyPlus = document.getElementById("qvQtyPlus");
    var qvAddBtn = document.getElementById("qvAddBtn");
    var qvViewToggle = document.getElementById("qvViewToggle");
    var qvViewFront = document.getElementById("qvViewFront");
    var qvViewBack = document.getElementById("qvViewBack");

    var currentQVProduct = null;
    var currentQVQty = 1;
    var currentQVSize = "M";
    var currentQVFront = null;
    var currentQVBack = null;

    /* ---------- QUICK VIEW IMAGE ZOOM ----------
       Cursor-following zoom on the Quick View main photo — the mouse
       position decides which part of the image is magnified, like a
       premium fashion e-commerce product page. Purely additive: it
       only ever touches #qvImage's own transform/transform-origin, so
       it never interferes with the existing FRONT/BACK crossfade,
       swipe, size selection or add-to-bag logic below. Skipped
       entirely on touch/no-hover devices, so mobile keeps the normal,
       non-zoomed image exactly as before. */
    var qvZoomEnabled = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    var QV_ZOOM_SCALE = 1.8;

    function resetQVZoom() {
        if (!qvImage) return;
        qvImage.style.transform = "";
        qvImage.style.transformOrigin = "center center";
    }

    if (qvImage && qvZoomEnabled) {
        qvImage.addEventListener("mouseenter", function () {
            qvImage.style.transform = "scale(" + QV_ZOOM_SCALE + ")";
        });
        qvImage.addEventListener("mousemove", function (e) {
            var rect = qvImage.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            var x = ((e.clientX - rect.left) / rect.width) * 100;
            var y = ((e.clientY - rect.top) / rect.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            qvImage.style.transformOrigin = x + "% " + y + "%";
        });
        qvImage.addEventListener("mouseleave", function () {
            resetQVZoom();
        });
    }

    /* Swaps the big Quick View image between the product's existing
       FRONT and BACK photos (only — never generates or fetches any
       other image). Used by the FRONT/BACK buttons, arrow keys and
       swipe below. */
    function setQVView(which) {
        var src = which === "back" ? currentQVBack : currentQVFront;
        if (!qvImage || !src) return;

        resetQVZoom();
        qvImage.classList.add("qv-image-fade");
        setTimeout(function () {
            qvImage.src = src;
            if (currentQVProduct) currentQVProduct.image = src;
            qvImage.classList.remove("qv-image-fade");
        }, 150);

        if (qvViewFront) qvViewFront.classList.toggle("active", which !== "back");
        if (qvViewBack) qvViewBack.classList.toggle("active", which === "back");
    }

    function openQuickView(card) {
        var name = productDisplayName(card);
        var price = parseFloat(card.getAttribute("data-price"));
        var oldPrice = card.getAttribute("data-old-price");
        var image = card.getAttribute("data-image");

        var frontEl = card.querySelector(".img-front");
        var backEl = card.querySelector(".img-back");
        currentQVFront = frontEl ? frontEl.src : image;
        currentQVBack = backEl ? backEl.src : null;

        currentQVProduct = { name: name, price: price, image: currentQVFront || image };
        currentQVQty = 1;
        currentQVSize = "M";

        if (qvImage) { resetQVZoom(); qvImage.src = currentQVFront || image; qvImage.alt = name; qvImage.classList.remove("qv-image-fade"); }
        if (qvName) qvName.textContent = name;
        if (qvQty) qvQty.textContent = currentQVQty;

        // Only Anarkali (and any other) products that actually have a
        // second, back-facing photo get the FRONT/BACK toggle — a
        // product with just one image (e.g. the Mustard variant) shows
        // its single image exactly as before, no toggle shown.
        if (qvViewToggle) qvViewToggle.hidden = !currentQVBack;
        if (qvViewFront) qvViewFront.classList.add("active");
        if (qvViewBack) qvViewBack.classList.remove("active");

        if (qvPriceRow) {
            var html = '<span class="price">' + money(price) + '</span>';
            if (oldPrice) {
                var discount = Math.round((1 - price / parseFloat(oldPrice)) * 100);
                html += '<span class="old-price">' + money(oldPrice) + '</span>';
                html += '<span class="discount">' + discount + '% OFF</span>';
            }
            qvPriceRow.innerHTML = html;
        }

        document.querySelectorAll(".size-btn").forEach(function (b, i) {
            b.classList.toggle("active", b.textContent.trim() === "M");
        });

        openPanel(quickviewModal, quickviewBackdrop);
    }

    document.querySelectorAll(".quickview-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var card = btn.closest(".product");
            if (card) openQuickView(card);
        });
    });

    if (qvViewFront) qvViewFront.addEventListener("click", function () { setQVView("front"); });
    if (qvViewBack) qvViewBack.addEventListener("click", function () { setQVView("back"); });

    // Left/right arrow keys switch FRONT/BACK while Quick View is open.
    document.addEventListener("keydown", function (e) {
        if (!quickviewModal || !quickviewModal.classList.contains("active") || !currentQVBack) return;
        if (e.key === "ArrowLeft") setQVView("front");
        if (e.key === "ArrowRight") setQVView("back");
    });

    // Swipe left/right on the image itself does the same, for mobile.
    if (qvImage) {
        var qvTouchStartX = null;
        qvImage.addEventListener("touchstart", function (e) {
            qvTouchStartX = e.changedTouches[0].clientX;
        }, { passive: true });
        qvImage.addEventListener("touchend", function (e) {
            if (qvTouchStartX === null || !currentQVBack) return;
            var dx = e.changedTouches[0].clientX - qvTouchStartX;
            qvTouchStartX = null;
            if (Math.abs(dx) < 40) return;
            setQVView(dx < 0 ? "back" : "front");
        }, { passive: true });
    }

    if (quickviewClose) quickviewClose.addEventListener("click", function () {
        closePanel(quickviewModal, quickviewBackdrop);
    });
    if (quickviewBackdrop) quickviewBackdrop.addEventListener("click", closeAllPanels);


    /* ---------- PHOTO POPUP ----------
       Clicking any product photo opens this popup. The product's
       front and back photos sit side by side on a sliding track:
       arrows / swipe / keyboard / dots move from front to back.
       Size + ADD TO BAG live here too (Quick View button is removed). */

    var photoZoomModal = document.getElementById("photoZoomModal");
    var photoZoomBackdrop = document.getElementById("photoZoomBackdrop");
    var photoZoomClose = document.getElementById("photoZoomClose");
    var photoZoomTrack = document.getElementById("photoZoomTrack");
    var photoZoomViewport = document.getElementById("photoZoomViewport");
    var photoZoomDots = document.getElementById("photoZoomDots");
    var photoZoomPrev = document.getElementById("photoZoomPrev");
    var photoZoomNext = document.getElementById("photoZoomNext");
    var pzName = document.getElementById("pzName");
    var pzPrice = document.getElementById("pzPrice");
    var pzAddBtn = document.getElementById("pzAddBtn");
    var pzSizeChartBtn = document.getElementById("pzSizeChartBtn");
    var pzSizeBtns = document.querySelectorAll(".pz-size-btn");

    var photoZoomCount = 0;
    var photoZoomIndex = 0;
    var photoZoomCard = null;
    var photoZoomSize = "M";

    function showPhotoZoomImage() {
        if (!photoZoomTrack) return;
        photoZoomTrack.style.transform = "translateX(" + (-photoZoomIndex * 100) + "%)";
        if (photoZoomDots) {
            photoZoomDots.querySelectorAll(".pz-dot").forEach(function (d, i) {
                d.classList.toggle("active", i === photoZoomIndex);
            });
        }
    }

    function openPhotoZoom(card, startSrc) {
        var front = card.querySelector(".img-front") || card.querySelector(".product-image img");
        var back = card.querySelector(".img-back");
        var srcs = [];
        if (front) srcs.push(front.currentSrc || front.src);
        if (back) srcs.push(back.currentSrc || back.src);
        if (!srcs.length || !photoZoomTrack) return;

        photoZoomCard = card;
        photoZoomCount = srcs.length;
        photoZoomIndex = 0;
        var name = productDisplayName(card);

        photoZoomTrack.innerHTML = "";
        photoZoomDots.innerHTML = "";
        srcs.forEach(function (src, i) {
            var slide = document.createElement("div");
            slide.className = "pz-slide";
            var img = document.createElement("img");
            img.src = src;
            img.alt = name + (srcs.length > 1 ? (i === 0 ? " - front" : " - back") : "");
            img.draggable = false;
            slide.appendChild(img);
            photoZoomTrack.appendChild(slide);

            var dot = document.createElement("button");
            dot.type = "button";
            dot.className = "pz-dot";
            dot.setAttribute("aria-label", i === 0 ? "Front photo" : "Back photo");
            dot.addEventListener("click", function () { photoZoomIndex = i; showPhotoZoomImage(); });
            photoZoomDots.appendChild(dot);
        });

        var multi = srcs.length > 1;
        photoZoomPrev.hidden = !multi;
        photoZoomNext.hidden = !multi;
        photoZoomDots.hidden = !multi;

        pzName.textContent = name;
        var price = parseFloat(card.getAttribute("data-price"));
        var oldPrice = parseFloat(card.getAttribute("data-old-price"));
        var html = '<span class="pz-now">' + money(price) + '</span>';
        if (oldPrice && oldPrice > price) {
            html += ' <span class="old-price">' + money(oldPrice) + '</span>';
            html += ' <span class="discount">' + Math.round((1 - price / oldPrice) * 100) + '% OFF</span>';
        }
        pzPrice.innerHTML = html;

        photoZoomSize = "M";
        pzSizeBtns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-size") === "M"); });

        showPhotoZoomImage();
        openPanel(photoZoomModal, photoZoomBackdrop);
    }

    // Click on any product photo (not the wishlist heart) opens the Quick View modal (front/back, size, qty, add to bag).
    document.querySelectorAll(".product .product-image").forEach(function (imageBox) {
        imageBox.addEventListener("click", function (e) {
            if (e.target.closest(".wish-btn")) return;
            var card = imageBox.closest(".product");
            if (card) openQuickView(card);
        });
    });

    function photoZoomStep(dir) {
        if (photoZoomCount < 2) return;
        photoZoomIndex = (photoZoomIndex + dir + photoZoomCount) % photoZoomCount;
        showPhotoZoomImage();
    }

    if (photoZoomPrev) photoZoomPrev.addEventListener("click", function () { photoZoomStep(-1); });
    if (photoZoomNext) photoZoomNext.addEventListener("click", function () { photoZoomStep(1); });
    if (photoZoomClose) photoZoomClose.addEventListener("click", function () {
        closePanel(photoZoomModal, photoZoomBackdrop);
    });
    if (photoZoomBackdrop) photoZoomBackdrop.addEventListener("click", closeAllPanels);

    // Hover zoom (desktop): the zoomed photo follows the cursor.
    if (photoZoomTrack) photoZoomTrack.addEventListener("mousemove", function (e) {
        var slide = e.target.closest(".pz-slide");
        if (!slide) return;
        var img = slide.querySelector("img");
        var r = slide.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width) * 100;
        var y = ((e.clientY - r.top) / r.height) * 100;
        img.style.transformOrigin = x + "% " + y + "%";
    });

    // Swipe left/right on touch screens.
    var pzTouchX = null;
    if (photoZoomViewport) {
        photoZoomViewport.addEventListener("touchstart", function (e) {
            pzTouchX = e.touches[0].clientX;
        }, { passive: true });
        photoZoomViewport.addEventListener("touchend", function (e) {
            if (pzTouchX === null) return;
            var dx = e.changedTouches[0].clientX - pzTouchX;
            pzTouchX = null;
            if (Math.abs(dx) > 40) photoZoomStep(dx < 0 ? 1 : -1);
        }, { passive: true });
    }

    document.addEventListener("keydown", function (e) {
        if (!photoZoomModal || !photoZoomModal.classList.contains("active")) return;
        if (e.key === "ArrowLeft") photoZoomStep(-1);
        if (e.key === "ArrowRight") photoZoomStep(1);
    });

    pzSizeBtns.forEach(function (b) {
        b.addEventListener("click", function () {
            photoZoomSize = b.getAttribute("data-size");
            pzSizeBtns.forEach(function (x) { x.classList.toggle("active", x === b); });
        });
    });

    if (pzAddBtn) pzAddBtn.addEventListener("click", function () {
        if (!photoZoomCard) return;
        var product = {
            name: productDisplayName(photoZoomCard),
            price: parseFloat(photoZoomCard.getAttribute("data-price")),
            image: photoZoomCard.getAttribute("data-image")
        };
        addToCart(product, photoZoomSize, 1);
        closePanel(photoZoomModal, photoZoomBackdrop);
    });


    /* ---------- SIZE CHART ----------
       One shared chart image, reused for every category (Anarkali,
       Short Kurti, Lehnga, Saree) — opened from the "SIZE CHART" link
       inside Quick View, so it automatically works for every product
       without any per-category setup. */
    var sizeChartBtn = document.getElementById("sizeChartBtn");
    var sizeChartModal = document.getElementById("sizeChartModal");
    var sizeChartBackdrop = document.getElementById("sizeChartBackdrop");
    var sizeChartClose = document.getElementById("sizeChartClose");

    if (sizeChartBtn) sizeChartBtn.addEventListener("click", function () {
        openPanel(sizeChartModal, sizeChartBackdrop);
    });
    if (sizeChartClose) sizeChartClose.addEventListener("click", function () {
        closePanel(sizeChartModal, sizeChartBackdrop);
    });
    // Backdrop click closes only the size chart (so the photo popup underneath stays open).
    if (sizeChartBackdrop) sizeChartBackdrop.addEventListener("click", function () {
        closePanel(sizeChartModal, sizeChartBackdrop);
    });
    if (pzSizeChartBtn) pzSizeChartBtn.addEventListener("click", function () {
        openPanel(sizeChartModal, sizeChartBackdrop);
    });

    document.querySelectorAll(".size-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".size-btn").forEach(function (b) {
                b.classList.remove("active");
            });
            btn.classList.add("active");
            currentQVSize = btn.textContent.trim();
        });
    });

    if (qvQtyPlus) qvQtyPlus.addEventListener("click", function () {
        if (currentQVQty >= MAX_QTY_PER_PRODUCT) {
            showToast("You can add up to " + MAX_QTY_PER_PRODUCT + " of this item");
            return;
        }
        currentQVQty += 1;
        qvQty.textContent = currentQVQty;
    });
    if (qvQtyMinus) qvQtyMinus.addEventListener("click", function () {
        if (currentQVQty > 1) currentQVQty -= 1;
        qvQty.textContent = currentQVQty;
    });
    if (qvAddBtn) qvAddBtn.addEventListener("click", function () {
        if (!currentQVProduct) return;
        addToCart(currentQVProduct, currentQVSize, currentQVQty);
        closePanel(quickviewModal, quickviewBackdrop);
    });


    /* ---------- FILTER CHIPS (New Arrivals) ---------- */

    var filterChips = document.querySelectorAll(".chip-filter");
    var newArrivalsGrid = document.getElementById("newArrivalsGrid");
    var bestSellersGrid = document.getElementById("bestSellersGrid"); // used by runSiteSearch() above (hoisted var)
    var kurtisGrid = document.getElementById("kurtisGrid");           // used by runSiteSearch() above (hoisted var)

    filterChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            filterChips.forEach(function (c) { c.classList.remove("active"); });
            chip.classList.add("active");
            var filter = chip.getAttribute("data-filter");

            if (!newArrivalsGrid) return;
            newArrivalsGrid.querySelectorAll(".product").forEach(function (card) {
                var cat = card.getAttribute("data-category");
                var show = filter === "all" || cat === filter;
                card.classList.toggle("hidden-by-filter", !show);
            });
        });
    });


    /* ---------- HERO CATEGORY PILLS ----------
       The four invisible links laid over the hero banner photo
       (Anarkali / Kurti / Lehenga / Saree) jump to New Arrivals AND
       apply that category's filter chip, so they're genuinely
       working buttons and not just a scroll. */

    var heroPillLinks = document.querySelectorAll("[data-hero-filter]");

    heroPillLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            var wanted = link.getAttribute("data-hero-filter");
            var matchingChip = document.querySelector('.chip-filter[data-filter="' + wanted + '"]');
            if (matchingChip) matchingChip.click();
        });
    });


    /* ---------- BACK TO TOP ---------- */

    var backToTop = document.getElementById("backToTop");

    window.addEventListener("scroll", function () {
        if (!backToTop) return;
        if (window.scrollY > 500) {
            backToTop.classList.add("visible");
        } else {
            backToTop.classList.remove("visible");
        }
    });

    if (backToTop) backToTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });


    /* ---------- WHATSAPP FLOATING BUTTON ----------
       Uses the same STORE_WHATSAPP number as checkout, so updating
       it once at the top of this file updates both. */

    var whatsappFloatBtn = document.getElementById("whatsappFloatBtn");
    if (whatsappFloatBtn) {
        whatsappFloatBtn.href = "https://wa.me/" + STORE_WHATSAPP;
    }

    document.querySelectorAll(".whatsapp-social-link").forEach(function (el) {
        el.href = "https://wa.me/" + STORE_WHATSAPP;
    });


    /* ---------- NEWSLETTER ---------- */

    var newsletterForm = document.getElementById("newsletterForm");
    var newsletterEmail = document.getElementById("newsletterEmail");
    var newsletterMsg = document.getElementById("newsletterMsg");

    if (newsletterForm) newsletterForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = newsletterEmail ? newsletterEmail.value.trim() : "";
        var isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!isValid) {
            if (newsletterMsg) {
                newsletterMsg.textContent = "Please enter a valid email address.";
                newsletterMsg.style.color = "#b23a2b";
            }
            return;
        }

        if (newsletterMsg) {
            newsletterMsg.textContent = "Thanks for joining! Check your inbox for your 10% off code.";
            newsletterMsg.style.color = "#1a8a4a";
        }
        newsletterForm.reset();
    });


    /* ---------- COUNTDOWN TIMER (resets nightly at midnight) ---------- */

    var countdownEl = document.getElementById("countdown");

    function updateCountdown() {
        if (!countdownEl) return;
        var now = new Date();
        var midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        var diff = midnight - now;

        var h = Math.floor(diff / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);

        function pad(n) { return String(n).padStart(2, "0"); }
        countdownEl.textContent = pad(h) + ":" + pad(m) + ":" + pad(s);
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);


    /* ---------- RESUME CHECKOUT AFTER LOGIN ----------
       A guest who tried to check out gets sent to /login.html and,
       on success, back here at "...?checkout=1" (see auth.js's
       redirectHome() and goToLoginForCheckout() above). Their cart
       was never touched — it's been sitting in localStorage the
       whole time — so all that's left is to clean the URL and
       re-open the checkout modal automatically. */
    (function resumeCheckoutIfNeeded() {
        var params = new URLSearchParams(window.location.search);
        if (params.get("checkout") !== "1") return;

        params.delete("checkout");
        var qs = params.toString();
        var cleanUrl = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
        window.history.replaceState(null, "", cleanUrl);

        if (cart.length > 0) {
            openCheckout();
        }
    })();

})();
