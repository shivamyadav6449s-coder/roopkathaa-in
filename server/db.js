/* ==========================================================
   DATABASE
   ----------------------------------------------------------
   Two modes, chosen automatically:

   - MONGODB_URI is set (this is how it runs on Render, in
     production) -> uses a real MongoDB Atlas database. This is
     required for deployment: most hosts wipe local files on
     every restart, so the old JSON-file approach can't survive
     there.
   - MONGODB_URI is NOT set (this is how it runs on your own PC,
     unchanged) -> falls back to the original JSON file at
     server/data/users.json, exactly as before. Local testing
     with `npm start` still needs nothing extra.

   Every function here returns a Promise either way, so the rest
   of the app (auth.js) doesn't need to know or care which mode
   is active.
========================================================== */

const fs = require("fs");
const path = require("path");

const MONGODB_URI = process.env.MONGODB_URI;
const USE_MONGO = !!MONGODB_URI;

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

/* ============================================================
   MODE 1: MongoDB (production)
============================================================ */

let mongoClientPromise = null;

async function getMongoDb() {
    if (!mongoClientPromise) {
        // Only require the driver when it's actually needed, so local
        // JSON-file mode never depends on the "mongodb" package being installed.
        const { MongoClient } = require("mongodb");
        const client = new MongoClient(MONGODB_URI);
        mongoClientPromise = client.connect().then(async function (connectedClient) {
            const database = connectedClient.db(); // uses the db name from the connection string
            await database.collection("users").createIndex({ email: 1 }, { unique: true });
            await database.collection("orders").createIndex({ id: 1 }, { unique: true });
            await database.collection("orders").createIndex({ razorpayOrderId: 1 });
            return database;
        });
    }
    return mongoClientPromise;
}

const mongoImpl = {
    async findUserByEmail(email) {
        const database = await getMongoDb();
        return database.collection("users").findOne({ email: normalizeEmail(email) });
    },
    async findUserById(id) {
        const database = await getMongoDb();
        return database.collection("users").findOne({ id: id });
    },
    async createUser(user) {
        const database = await getMongoDb();
        await database.collection("users").insertOne(user);
        return user;
    },
    async updateUserPassword(email, passwordHash) {
        const database = await getMongoDb();
        const result = await database.collection("users").updateOne(
            { email: normalizeEmail(email) },
            { $set: { passwordHash: passwordHash } }
        );
        return result.matchedCount > 0;
    },
    async saveResetToken(entry) {
        const database = await getMongoDb();
        await database.collection("resetTokens").deleteMany({ email: normalizeEmail(entry.email) });
        await database.collection("resetTokens").insertOne(entry);
    },
    async findResetToken(token) {
        const database = await getMongoDb();
        return database.collection("resetTokens").findOne({ token: token });
    },
    async deleteResetToken(token) {
        const database = await getMongoDb();
        await database.collection("resetTokens").deleteOne({ token: token });
    },

    /* ---------- orders (Razorpay checkout) ---------- */
    async createOrder(order) {
        const database = await getMongoDb();
        await database.collection("orders").insertOne(order);
        return order;
    },
    async findOrderById(id) {
        const database = await getMongoDb();
        return database.collection("orders").findOne({ id: id });
    },
    async findOrdersByUser(userId) {
        const database = await getMongoDb();
        return database.collection("orders").find({ userId: userId }).sort({ createdAt: -1 }).toArray();
    },
    async findOrderByRazorpayOrderId(razorpayOrderId) {
        const database = await getMongoDb();
        return database.collection("orders").findOne({ razorpayOrderId: razorpayOrderId });
    },
    async updateOrder(id, patch) {
        const database = await getMongoDb();
        const result = await database.collection("orders").updateOne({ id: id }, { $set: patch });
        return result.matchedCount > 0;
    }
};

/* ============================================================
   MODE 2: JSON file (local development — unchanged behavior)
============================================================ */

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "users.json");

function ensureFileDb() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], resetTokens: [], orders: [] }, null, 2));
    }
}

function readFileDb() {
    ensureFileDb();
    try {
        const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (!Array.isArray(parsed.resetTokens)) parsed.resetTokens = [];
        if (!Array.isArray(parsed.orders)) parsed.orders = [];
        return parsed;
    } catch (e) {
        return { users: [], resetTokens: [], orders: [] };
    }
}

function writeFileDb(data) {
    ensureFileDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const fileImpl = {
    async findUserByEmail(email) {
        const target = normalizeEmail(email);
        return readFileDb().users.find(function (u) { return u.email === target; }) || null;
    },
    async findUserById(id) {
        return readFileDb().users.find(function (u) { return u.id === id; }) || null;
    },
    async createUser(user) {
        const db = readFileDb();
        db.users.push(user);
        writeFileDb(db);
        return user;
    },
    async updateUserPassword(email, passwordHash) {
        const target = normalizeEmail(email);
        const db = readFileDb();
        const user = db.users.find(function (u) { return u.email === target; });
        if (!user) return false;
        user.passwordHash = passwordHash;
        writeFileDb(db);
        return true;
    },
    async saveResetToken(entry) {
        const target = normalizeEmail(entry.email);
        const db = readFileDb();
        db.resetTokens = db.resetTokens.filter(function (t) { return t.email !== target; });
        db.resetTokens.push(entry);
        writeFileDb(db);
    },
    async findResetToken(token) {
        return readFileDb().resetTokens.find(function (t) { return t.token === token; }) || null;
    },
    async deleteResetToken(token) {
        const db = readFileDb();
        db.resetTokens = db.resetTokens.filter(function (t) { return t.token !== token; });
        writeFileDb(db);
    },

    /* ---------- orders (Razorpay checkout) ---------- */
    async createOrder(order) {
        const db = readFileDb();
        db.orders.push(order);
        writeFileDb(db);
        return order;
    },
    async findOrderById(id) {
        return readFileDb().orders.find(function (o) { return o.id === id; }) || null;
    },
    async findOrdersByUser(userId) {
        return readFileDb().orders
            .filter(function (o) { return o.userId === userId; })
            .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    },
    async findOrderByRazorpayOrderId(razorpayOrderId) {
        return readFileDb().orders.find(function (o) { return o.razorpayOrderId === razorpayOrderId; }) || null;
    },
    async updateOrder(id, patch) {
        const db = readFileDb();
        const order = db.orders.find(function (o) { return o.id === id; });
        if (!order) return false;
        Object.assign(order, patch);
        writeFileDb(db);
        return true;
    }
};

const impl = USE_MONGO ? mongoImpl : fileImpl;

module.exports = {
    mode: USE_MONGO ? "mongodb" : "file",
    normalizeEmail: normalizeEmail,
    findUserByEmail: impl.findUserByEmail,
    findUserById: impl.findUserById,
    createUser: impl.createUser,
    updateUserPassword: impl.updateUserPassword,
    saveResetToken: impl.saveResetToken,
    findResetToken: impl.findResetToken,
    deleteResetToken: impl.deleteResetToken,
    createOrder: impl.createOrder,
    findOrderById: impl.findOrderById,
    findOrdersByUser: impl.findOrdersByUser,
    findOrderByRazorpayOrderId: impl.findOrderByRazorpayOrderId,
    updateOrder: impl.updateOrder
};
