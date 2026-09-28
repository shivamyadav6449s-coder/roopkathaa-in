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
    var STORE_WHATSAPP = "919999999999";   // TODO: replace with your WhatsApp number, country code + number, no + or spaces
    var STORE_UPI_ID = "roopkathaa@upi";   // TODO: replace with your real UPI ID
    var STORE_UPI_NAME = "Roopkathaa";
    var SHIPPING_FEE = 99;
    var FREE_SHIP_THRESHOLD = 999;

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
            ".mobile-menu.active, .search-overlay.active, .cart-drawer.active, .quickview-modal.active, .checkout-modal.active"
        );
        if (!anyOpen) document.body.style.overflow = "";
    }

    function closeAllPanels() {
        document.querySelectorAll(
            ".mobile-menu, .search-overlay, .cart-drawer, .quickview-modal, .checkout-modal"
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

    if (searchToggle) searchToggle.addEventListener("click", function () {
        openPanel(searchOverlay, null);
        setTimeout(function () { if (searchInput) searchInput.focus(); }, 300);
    });
    if (searchClose) searchClose.addEventListener("click", function () {
        closePanel(searchOverlay, null);
    });
    document.querySelectorAll(".search-box .chip").forEach(function (a) {
        a.addEventListener("click", closeAllPanels);
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
        if (existing) {
            existing.qty += qty;
        } else {
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
        showToast(product.name + " added to bag");
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

    if (upiIdText) upiIdText.textContent = STORE_UPI_ID;

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
        return checked ? checked.value : "cod";
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
        lines.push("Payment Method: " + (order.payMethod === "upi" ? "UPI (paid via app)" : "Cash on Delivery"));
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

    if (checkoutForm) checkoutForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (cart.length === 0) return;

        var t = checkoutTotals();
        var payMethod = currentPayMethod();
        var orderId = "RK" + Date.now().toString().slice(-8);

        var order = {
            id: orderId,
            items: cart.map(function (item) {
                return { name: item.name, size: item.size, qty: item.qty, price: item.price };
            }),
            subtotal: t.subtotal,
            shipping: t.shipping,
            total: t.total,
            payMethod: payMethod,
            name: document.getElementById("ckName").value.trim(),
            phone: document.getElementById("ckPhone").value.trim(),
            address: document.getElementById("ckAddress").value.trim(),
            city: document.getElementById("ckCity").value.trim(),
            state: document.getElementById("ckState").value.trim(),
            pincode: document.getElementById("ckPincode").value.trim(),
            placedAt: new Date().toISOString()
        };

        saveOrder(order);

        var waMessage = buildWhatsAppMessage(order);
        var waUrl = "https://wa.me/" + STORE_WHATSAPP + "?text=" + encodeURIComponent(waMessage);
        window.open(waUrl, "_blank");

        if (payMethod === "upi") {
            successNote.textContent = "We've opened WhatsApp with your order details — please tap send there so our team can confirm your UPI payment.";
        } else {
            successNote.textContent = "We've opened WhatsApp with your order details — please tap send there so our team can confirm your Cash on Delivery order.";
        }
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
    });

    if (checkoutDoneBtn) checkoutDoneBtn.addEventListener("click", function () {
        closePanel(checkoutModal, checkoutBackdrop);
    });


    /* ---------- WISHLIST ---------- */

    var WISHLIST_KEY = "roopkathaa_wishlist";
    var wishlist = safeParse(localStorage.getItem(WISHLIST_KEY), []);
    var wishlistCountBadge = document.getElementById("wishlistCount");

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
        });
    });

    refreshWishlistBadge();
    syncWishButtons();


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

    /* Swaps the big Quick View image between the product's existing
       FRONT and BACK photos (only — never generates or fetches any
       other image). Used by the FRONT/BACK buttons, arrow keys and
       swipe below. */
    function setQVView(which) {
        var src = which === "back" ? currentQVBack : currentQVFront;
        if (!qvImage || !src) return;

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

        if (qvImage) { qvImage.src = currentQVFront || image; qvImage.alt = name; qvImage.classList.remove("qv-image-fade"); }
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
