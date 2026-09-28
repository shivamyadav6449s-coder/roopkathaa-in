/* ==========================================================
   PRODUCT CATALOG (server-side source of truth for prices)
   ----------------------------------------------------------
   The frontend cart (script.js) only ever sends product NAMES,
   sizes and quantities to the server — never prices. This file is
   what turns those names back into trusted prices, so a payment
   amount always comes from here, never from the browser.

   Mirrors the data-name / data-price attributes on the product
   cards in index.html. If you add, remove or re-price a product
   there, update this list the same way — nothing here is read
   from index.html automatically, on purpose (no build step, no
   new moving parts, matches how the rest of this project already
   works).
========================================================== */

var CATALOG = {
    "Embellished Georgette Anarkali Set — Maroon": 1999,
    "Embellished Georgette Anarkali Set — Mustard": 1999,
    "Embellished Georgette Anarkali Set — Lavender": 1999,
    "Embellished Georgette Anarkali Set — Chocolate Brown": 1999,
    "Embellished Georgette Anarkali Set — Yellow": 1999,
    "Embellished Georgette Anarkali Set — Sky Blue": 1999,
    "Embellished Georgette Anarkali Set": 1999,
    "Green Zari Banarasi Silk Saree": 4499,
    "Bandhani Print Kurti": 1299,
    "Emerald Designer Lehenga": 6999,
    "Mustard Organza Saree": 2599,
    "Sharara Festive Set": 3299,
    "Chikankari Cotton Kurta": 1599,
    "Wine Velvet Lehenga": 7499,
    "Classic Banarasi Saree": 5299,
    "Royal Blue Designer Lehenga": 8299,
    "Ivory Chikankari Anarkali": 3899,
    "Indigo Block-Print Kurti": 1199
};

// Same numbers script.js uses for the cart/checkout summary — kept
// here too so the server can independently recompute the same total.
var SHIPPING_FEE = 99;
var FREE_SHIP_THRESHOLD = 999;

/* Looks up a trusted price for a cart item's name. Handles both
   product-name shapes that exist in the DOM:
     - a standalone color card, whose data-name already IS
       "Base Name — Color" (matches directly)
     - a swatch-driven card, whose data-name is just "Base Name"
       and gets " — Color" appended client-side when a swatch is
       picked (falls back to the base name so price still resolves)
   Returns null if the name isn't a real product — the caller must
   treat that as an invalid/tampered request, never default to 0. */
function priceForName(name) {
    var n = String(name || "").trim();
    if (Object.prototype.hasOwnProperty.call(CATALOG, n)) return CATALOG[n];

    var dashIndex = n.indexOf(" — ");
    if (dashIndex !== -1) {
        var base = n.slice(0, dashIndex);
        if (Object.prototype.hasOwnProperty.call(CATALOG, base)) return CATALOG[base];
    }
    return null;
}

module.exports = {
    CATALOG: CATALOG,
    priceForName: priceForName,
    SHIPPING_FEE: SHIPPING_FEE,
    FREE_SHIP_THRESHOLD: FREE_SHIP_THRESHOLD
};
