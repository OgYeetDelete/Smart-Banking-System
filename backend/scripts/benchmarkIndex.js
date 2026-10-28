/**
 * Compound Index Benchmark with explain()
 * Demonstrates COLLSCAN vs IXSCAN performance difference.
 * Run: node scripts/benchmarkIndex.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Transfer = require("../models/Transfer");

async function benchmark() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas\n");

  const testAccount = "17930" + Date.now().toString().slice(-8);

  // Insert test data
  console.log("Inserting 100 test transfers...");
  const transfers = [];
  for (let i = 0; i < 100; i++) {
    transfers.push({
      fromAccount: testAccount,
      toAccount: "17930" + Math.floor(Math.random() * 100000000),
      amount: Math.floor(Math.random() * 10000) + 100
    });
  }
  await Transfer.insertMany(transfers);

  // Benchmark with explain()
  console.log("\n── explain() with Compound Index {fromAccount:1, transferredAt:-1} ──");
  const explained = await Transfer.find({ fromAccount: testAccount })
    .sort({ transferredAt: -1 })
    .explain("executionStats");

  const stats = explained[0]?.executionStats || explained?.executionStats;
  if (stats) {
    console.log(`  Winning Plan:        ${JSON.stringify(explained[0]?.queryPlanner?.winningPlan?.inputStage?.stage || "N/A")}`);
    console.log(`  Documents Examined:   ${stats.totalDocsExamined}`);
    console.log(`  Keys Examined:        ${stats.totalKeysExamined}`);
    console.log(`  Execution Time:       ${stats.executionTimeMillis} ms`);
    console.log(`  Documents Returned:   ${stats.nReturned}`);
  }

  // Cleanup
  await Transfer.deleteMany({ fromAccount: testAccount });
  console.log("\nTest data cleaned up.");

  await mongoose.disconnect();
  process.exit(0);
}

benchmark().catch(err => { console.error(err); process.exit(1); });
