const Customer = require("../models/Customer");
const Transfer = require("../models/Transfer");
const { evaluateTransfer } = require("./fraudDetectionEngine");

console.log("==================================================");
console.log("MongoDB Change Streams Active & Listening:");
console.log("  1. Customers (Audit & Registration Watcher)");
console.log("  2. Transfers (Real-Time Fraud Detection Pipeline)");
console.log("==================================================");

// 1. Customer Change Stream (from Review 2)
try {
    const customerStream = Customer.watch();
    customerStream.on("change", (change) => {
        console.log("=================================");
        console.log("Customer Collection Changed");
        console.log("Operation:", change.operationType);
        if (change.operationType === "insert" && change.fullDocument) {
            console.log("New Customer Registered:", change.fullDocument.name, `(${change.fullDocument.email})`);
        }
        console.log("=================================");
    });

    customerStream.on("error", (err) => {
        console.warn("Customer change stream notice:", err.message);
    });
} catch (err) {
    console.error("Failed to initialize Customer change stream:", err.message);
}

// 2. Transfer Change Stream for Real-Time Fraud Detection
try {
    const transferStream = Transfer.watch();

    transferStream.on("change", async (change) => {
        console.log("=================================");
        console.log("Transfer Collection Changed");
        console.log("Operation:", change.operationType);

        if (change.operationType === "insert" && change.fullDocument) {
            console.log(`[Change Stream Event] New Transaction Inserted: ID ${change.fullDocument._id}`);
            console.log(`From: ${change.fullDocument.fromAccount} -> To: ${change.fullDocument.toAccount} | Amount: ₹${change.fullDocument.amount}`);
            await evaluateTransfer(change.fullDocument);
        }
        console.log("=================================");
    });

    transferStream.on("error", (err) => {
        console.warn("Transfer change stream notice:", err.message);
    });
} catch (err) {
    console.error("Failed to initialize Transfer change stream:", err.message);
}

module.exports = {
    Customer,
    Transfer
};
