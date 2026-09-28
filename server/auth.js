const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const db = require("./db");
const { JWT_SECRET } = require("./config");
const { requireAuth } = require("./middleware");

const router = express.Router();

/* Wraps an async route handler so a rejected promise (e.g. the database
   connection failing) reaches Express's error handler as a clean JSON
   response instead of hanging the request or leaking a stack trace. */
function asyncRoute(handler) {
    return function (req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

/* ---------- validation helpers ---------- */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidMobile(mobile) {
    return /^[6-9]\d{9}$/.test(String(mobile || "").trim());
}

function isStrongPassword(pw) {
    return typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

function publicUser(u) {
    return { id: u.id, fullName: u.fullName, email: u.email, mobile: u.mobile };
}

function signToken(user, remember) {
    return jwt.sign(
        { id: user.id, email: user.email, fullName: user.fullName },
        JWT_SECRET,
        { expiresIn: remember ? "30d" : "1d" }
    );
}

function setAuthCookie(res, token, remember) {
    res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "lax",
        // Secure cookies require HTTPS. Render serves your site over HTTPS
        // and sets NODE_ENV=production automatically, so this turns on by
        // itself in production while still working over plain http on your
        // own PC during local testing.
        secure: process.env.NODE_ENV === "production",
        maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        path: "/"
    });
}

/* ---------- POST /api/auth/register ---------- */

router.post("/register", asyncRoute(async function (req, res) {
    const body = req.body || {};
    const fullName = body.fullName;
    const email = body.email;
    const mobile = body.mobile;
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    const errors = {};
    if (!fullName || !String(fullName).trim()) errors.fullName = "Full name is required";

    if (!email || !String(email).trim()) errors.email = "Email is required";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address";

    if (!mobile || !String(mobile).trim()) errors.mobile = "Mobile number is required";
    else if (!isValidMobile(mobile)) errors.mobile = "Enter a valid 10-digit mobile number";

    if (!password) errors.password = "Password is required";
    else if (!isStrongPassword(password)) errors.password = "Password must be at least 8 characters and include a letter and a number";

    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

    if (Object.keys(errors).length) {
        return res.status(400).json({ errors: errors });
    }

    if (await db.findUserByEmail(email)) {
        return res.status(409).json({ errors: { email: "An account with this email is already registered" } });
    }

    const user = {
        id: crypto.randomBytes(12).toString("hex"),
        fullName: String(fullName).trim(),
        email: db.normalizeEmail(email),
        mobile: String(mobile).trim(),
        passwordHash: bcrypt.hashSync(password, 10),
        createdAt: new Date().toISOString()
    };
    await db.createUser(user);

    const token = signToken(user, true);
    setAuthCookie(res, token, true);
    res.status(201).json({ user: publicUser(user) });
}));

/* ---------- POST /api/auth/login ---------- */

router.post("/login", asyncRoute(async function (req, res) {
    const body = req.body || {};
    const email = body.email;
    const password = body.password;
    const remember = !!body.remember;

    if (!email || !String(email).trim() || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db.findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        // Same message for "no such user" and "wrong password" on purpose —
        // never reveal which part was wrong.
        return res.status(401).json({ error: "Incorrect email or password" });
    }

    const token = signToken(user, remember);
    setAuthCookie(res, token, remember);
    res.json({ user: publicUser(user) });
}));

/* ---------- POST /api/auth/logout ---------- */

router.post("/logout", function (req, res) {
    res.clearCookie("auth_token", { path: "/" });
    res.json({ ok: true });
});

/* ---------- GET /api/auth/me ---------- */

router.get("/me", requireAuth, asyncRoute(async function (req, res) {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({ user: publicUser(user) });
}));

/* ---------- POST /api/auth/forgot-password ---------- */

router.post("/forgot-password", asyncRoute(async function (req, res) {
    const email = (req.body || {}).email;
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Enter a valid email address" });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
        // Don't reveal whether the email is registered.
        return res.json({ ok: true, message: "If that email is registered, a reset link has been generated." });
    }

    const token = crypto.randomBytes(24).toString("hex");
    await db.saveResetToken({
        token: token,
        email: user.email,
        expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    const resetLink = req.protocol + "://" + req.get("host") + "/reset-password.html?token=" + token;

    // NOTE: no email provider (SMTP / SendGrid / etc.) is configured yet, so
    // this can't actually land in the user's inbox. The link is handed back
    // directly in the response so the reset flow is fully working end to
    // end right now. To send a real email, plug a provider in here (e.g.
    // Nodemailer) and stop returning `resetLink` in the JSON.
    res.json({
        ok: true,
        message: "Email sending isn't set up yet, so use the link below for now.",
        resetLink: resetLink
    });
}));

/* ---------- POST /api/auth/reset-password ---------- */

router.post("/reset-password", asyncRoute(async function (req, res) {
    const body = req.body || {};
    const token = body.token;
    const newPassword = body.newPassword;
    const confirmPassword = body.confirmPassword;

    if (!token) return res.status(400).json({ error: "Missing or invalid reset link" });

    if (!newPassword || !isStrongPassword(newPassword)) {
        return res.status(400).json({ error: "Password must be at least 8 characters and include a letter and a number" });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
    }

    const entry = await db.findResetToken(token);
    if (!entry || entry.expiresAt < Date.now()) {
        return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    }

    await db.updateUserPassword(entry.email, bcrypt.hashSync(newPassword, 10));
    await db.deleteResetToken(token);
    res.json({ ok: true, message: "Password updated. You can now log in with your new password." });
}));

module.exports = router;
