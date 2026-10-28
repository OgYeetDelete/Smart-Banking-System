/**
 * Fraud Simulation Script
 * Creates test transfers that trigger the Change Stream → Fraud Detection Engine.
 * Run: node scripts/simulateFraud.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Transfer = require("../models/Transfer");

async function simulate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Simulating fraudulent transfers...\n");

  // High-amount transfer (triggers AMOUNT_THRESHOLD rule)
  const t1 = await Transfer.create({
    fromAccount: "17930TEST001",
    toAccount: "17930TEST999",
    amount: 75000
  });
  console.log(`[1] High amount ₹75,000 — ID: ${t1._id}`);

  // Rapid-fire transfers (triggers VELOCITY_CHECK rule)
  const t2 = await Transfer.create({ fromAccount: "17930TEST002", toAccount: "17930TEST888", amount: 2000 });
  const t3 = await Transfer.create({ fromAccount: "17930TEST002", toAccount: "17930TEST777", amount: 1500 });
  const t4 = await Transfer.create({ fromAccount: "17930TEST002", toAccount: "17930TEST666", amount: 3000 });
  console.log(`[2-4] Velocity burst from 17930TEST002 — 3 transfers in quick succession`);

  console.log("\nDone. Check the fraud_alerts collection and notifications for results.");
  console.log("(Change Stream must be running via server.js for alerts to generate)");

  await mongoose.disconnect();
  process.exit(0);
}

simulate().catch(err => { console.error(err); process.exit(1); });
