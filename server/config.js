/* ==========================================================
   CONFIG
   JWT_SECRET signs the login session tokens. A default is
   provided so the server works immediately after `npm install`,
   but for a real production launch you should override it by
   setting an environment variable instead of relying on the
   default:

     Windows (cmd):        set JWT_SECRET=your-long-random-string
     Windows (PowerShell):  $env:JWT_SECRET="your-long-random-string"

   PORT can be overridden the same way if 3000 is already in use.
========================================================== */

const usingDefaultSecret = !process.env.JWT_SECRET;

if (usingDefaultSecret && process.env.NODE_ENV === "production") {
    console.warn(
        "WARNING: JWT_SECRET environment variable is not set. " +
        "Using the built-in default is not safe for a real deployment — " +
        "set a real JWT_SECRET in your hosting provider's environment variables."
    );
}

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || "roopkathaa-dev-secret-please-change-this-2026",
    PORT: process.env.PORT || 3000,

    /* ---------- Razorpay ----------
       No built-in defaults for these three, on purpose — unlike
       JWT_SECRET above, there is no safe placeholder for a payment
       secret. If they're missing, the payment routes respond with a
       clear "online payment isn't set up yet" error instead of
       silently doing something insecure; Cash on Delivery / UPI
       checkout keeps working either way.
       Set them the same way as JWT_SECRET above — as real
       environment variables, never hard-coded here:

         Windows (PowerShell):  $env:RAZORPAY_KEY_ID="rzp_test_..."
                                 $env:RAZORPAY_KEY_SECRET="..."
                                 $env:RAZORPAY_WEBHOOK_SECRET="..."

       ...and on Render, under your service's Environment tab. */
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || ""
};
