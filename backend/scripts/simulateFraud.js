require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transfer = require("../models/Transfer");
const Customer = require("../models/Customer");
const Beneficiary = require("../models/Beneficiary");
const FraudAlert = require("../models/FraudAlert");
const Notification = require("../models/Notification");

async function simulate() {
    try {
        console.log("==================================================");
        console.log("Simulating Live Transactions for Fraud Testing");
        console.log("==================================================");

        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB Atlas\n");

        // 1. Fetch or ensure sample accounts exist
        const accounts = await Account.find().limit(2);
        if (accounts.length < 2) {
            console.log("Need at least 2 accounts in the database to simulate transfers.");
            return;
        }

        const senderAccount = accounts[0].accountNumber;
        const receiverAccount = accounts[1].accountNumber;
        console.log(`Using Sender Account:   ${senderAccount} (Balance: ₹${accounts[0].balance})`);
        console.log(`Using Receiver Account: ${receiverAccount} (Balance: ₹${accounts[1].balance})\n`);

        // Test Scenario 1: High-Value Transfer
        console.log("--- TEST SCENARIO 1: High-Value Anomalous Transfer (₹75,000) ---");
        const highValueTx = await Transfer.create({
            fromAccount: senderAccount,
            toAccount: "9999888877771", // Unregistered external account
            amount: 75000,
            transferredAt: new Date()
        });
        console.log(`Created Transaction ID: ${highValueTx._id}`);

        // Wait a moment for Change Stream to process
        await new Promise(r => setTimeout(r, 2000));

        // Check recent fraud alerts
        const latestAlert = await FraudAlert.findOne().sort({ detectedAt: -1 });
        if (latestAlert) {
            console.log("\n[VERIFIED] Latest Fraud Alert from Database:");
            console.log(`- Severity:    ${latestAlert.severity}`);
            console.log(`- Risk Score:  ${latestAlert.riskScore}%`);
            console.log(`- Rules:       ${latestAlert.rulesTriggered.map(r => r.ruleCode).join(", ")}`);
            console.log(`- Amount:      ₹${latestAlert.amount}`);
        }

        // Check active TTL notifications
        const activeNotifs = await Notification.find({ type: "FRAUD_WARNING" }).sort({ createdAt: -1 }).limit(1);
        if (activeNotifs.length > 0) {
            console.log("\n[VERIFIED] Active TTL Notification:");
            console.log(`- ${activeNotifs[0].message}`);
        }

        console.log("\n==================================================");
        console.log("Simulation Completed Successfully.");
        console.log("==================================================");

    } catch (err) {
        console.error("Simulation error:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

simulate();
