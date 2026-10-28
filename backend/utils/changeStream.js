const Customer = require("../models/Customer");
const Transfer = require("../models/Transfer");
const { evaluateTransfer } = require("./fraudDetectionEngine");

/**
 * MongoDB Change Streams — watches real-time oplog for:
 *   1. Customer collection (inserts) — logs new registrations
 *   2. Transfer collection (inserts) — triggers fraud detection engine
 */

// Watch Customers
const customerStream = Customer.watch([], { fullDocument: "updateLookup" });
customerStream.on("change", (change) => {
  if (change.operationType === "insert") {
    console.log(`[CHANGE STREAM] New customer registered: ${change.fullDocument.name} (${change.fullDocument.email})`);
  }
});

// Watch Transfers — triggers fraud pipeline on every new transfer
const transferStream = Transfer.watch([], { fullDocument: "updateLookup" });
transferStream.on("change", async (change) => {
  if (change.operationType === "insert") {
    const transfer = change.fullDocument;
    console.log(`[CHANGE STREAM] New transfer detected: ₹${transfer.amount} from ${transfer.fromAccount} → ${transfer.toAccount}`);

    // Run fraud detection engine
    try {
      await evaluateTransfer(transfer);
    } catch (err) {
      console.error("[CHANGE STREAM] Fraud evaluation error:", err.message);
    }
  }
});

console.log("[CHANGE STREAM] Watching Customer and Transfer collections for real-time events...");

module.exports = { customerStream, transferStream };
