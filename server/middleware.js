const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");

function getUserFromReq(req) {
    const token = req.cookies && req.cookies.auth_token;
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

/* Protects an API route: rejects with 401 if there is no valid session. */
function requireAuth(req, res, next) {
    const user = getUserFromReq(req);
    if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    req.user = user;
    next();
}

module.exports = { getUserFromReq: getUserFromReq, requireAuth: requireAuth };
