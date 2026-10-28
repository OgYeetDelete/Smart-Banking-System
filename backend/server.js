const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const notificationRoutes = require("./routes/notificationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const accountRoutes = require("./routes/accountRoutes");
const beneficiaryRoutes = require("./routes/beneficiaryRoutes");
const transferRoutes = require("./routes/transferRoutes");
const loanRoutes = require("./routes/loanRoutes");
const fraudRoutes = require("./routes/fraudRoutes");

// ── NEW route imports ──
const fdRoutes = require("./routes/fdRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve static UI assets directly from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("=========================================");
    console.log("MongoDB Atlas Connected Successfully");
    console.log("=========================================");

    // ── NEW: Create Capped Collection for Audit Logs (MongoDB Functionality #5) ──
    // Capped collections have a fixed size and auto-drop oldest documents.
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: "auditlogs" }).toArray();
    if (collections.length === 0) {
      await db.createCollection("auditlogs", {
        capped: true,
        size: 1048576,   // 1 MB max size
        max: 500          // 500 documents max — oldest auto-purged
      });
      console.log("[CAPPED COLLECTION] 'auditlogs' created (1 MB, max 500 docs)");
    } else {
      console.log("[CAPPED COLLECTION] 'auditlogs' already exists");
    }

    // Initialize Change Streams (Customers & Transfers Fraud Pipeline)
    require("./utils/changeStream");
})
.catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
});

// Mount API Routes
app.use("/api/customers", customerRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/beneficiaries", beneficiaryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/fraud-alerts", fraudRoutes);

// ── NEW: Mount new routes ──
app.use("/api/fixed-deposits", fdRoutes);
app.use("/api/audit-logs", auditRoutes);

// Express 5 compatible SPA fallback router
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open Web UI at: http://localhost:${PORT}`);
});
