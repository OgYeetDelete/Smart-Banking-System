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

const app = express();

app.use(cors());
app.use(express.json());

// Serve static UI assets directly from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("=========================================");
    console.log("MongoDB Atlas Connected Successfully");
    console.log("=========================================");

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

// Express 5 compatible SPA fallback router
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open Web UI at: http://localhost:${PORT}`);
});
