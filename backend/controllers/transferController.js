const mongoose = require("mongoose");
const Transfer = require("../models/Transfer");
const Account = require("../models/Account");
const AuditLog = require("../models/AuditLog");

// ── Existing: Fund Transfer with ACID Transaction ──
exports.transferFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { fromAccount, toAccount, amount } = req.body;
    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({ error: "fromAccount, toAccount, and amount are required" });
    }
    if (fromAccount === toAccount) {
      return res.status(400).json({ error: "Cannot transfer to the same account" });
    }

    const sender = await Account.findOne({ accountNumber: fromAccount }).session(session);
    const receiver = await Account.findOne({ accountNumber: toAccount }).session(session);

    if (!sender) { await session.abortTransaction(); return res.status(404).json({ error: "Sender account not found" }); }
    if (!receiver) { await session.abortTransaction(); return res.status(404).json({ error: "Receiver account not found" }); }

    // ── NEW: Check frozen status ──
    if (sender.isFrozen) { await session.abortTransaction(); return res.status(403).json({ error: "Sender account is frozen. Contact admin." }); }
    if (receiver.isFrozen) { await session.abortTransaction(); return res.status(403).json({ error: "Receiver account is frozen. Contact admin." }); }

    if (sender.balance < amount) { await session.abortTransaction(); return res.status(400).json({ error: "Insufficient balance" }); }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save({ session });
    await receiver.save({ session });

    const transfer = await Transfer.create([{ fromAccount, toAccount, amount }], { session });

    await session.commitTransaction();
    session.endSession();

    // Audit log (outside transaction — best effort)
    AuditLog.create({
      action: "TRANSFER",
      performedBy: req.user?.email || "system",
      targetResource: `Transfer:${fromAccount}->${toAccount}`,
      details: `₹${amount} transferred`
    }).catch(() => {});

    res.json({
      message: "Transfer successful (ACID Transaction committed)",
      transfer: transfer[0],
      remainingBalance: sender.balance
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Transfer History ──
exports.getTransferHistory = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const transfers = await Transfer.find({
      $or: [{ fromAccount: accountNumber }, { toAccount: accountNumber }]
    }).sort({ transferredAt: -1 });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Spending Analytics (Aggregation Pipeline) ──
exports.spendingAnalytics = async (req, res) => {
  try {
    const analytics = await Transfer.aggregate([
      { $group: {
          _id: "$fromAccount",
          totalSent: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
          avgTransfer: { $avg: "$amount" },
          maxTransfer: { $max: "$amount" }
      }},
      { $sort: { totalSent: -1 } },
      { $limit: 20 }
    ]);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: Date-Range Statement (User Functionality #5)
// ══════════════════════════════════════════════════════════════
exports.getStatement = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "Both fromDate and toDate query params are required (YYYY-MM-DD)" });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999); // include full end day

    const statement = await Transfer.find({
      $or: [{ fromAccount: accountNumber }, { toAccount: accountNumber }],
      transferredAt: { $gte: start, $lte: end }
    }).sort({ transferredAt: -1 });

    res.json({
      accountNumber,
      period: { from: fromDate, to: toDate },
      totalTransactions: statement.length,
      statement
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: $lookup — LEFT JOIN transfers with customer names (MongoDB Functionality #1)
// ══════════════════════════════════════════════════════════════
exports.getTransfersWithCustomerNames = async (req, res) => {
  try {
    const enrichedTransfers = await Transfer.aggregate([
      { $sort: { transferredAt: -1 } },
      { $limit: 50 },
      // Join with accounts collection to find sender's customerId
      { $lookup: {
          from: "accounts",
          localField: "fromAccount",
          foreignField: "accountNumber",
          as: "senderAccountInfo"
      }},
      { $unwind: { path: "$senderAccountInfo", preserveNullAndEmptyArrays: true } },
      // Join with customers to get the sender's name
      { $lookup: {
          from: "customers",
          localField: "senderAccountInfo.customerId",
          foreignField: "_id",
          as: "senderInfo"
      }},
      { $unwind: { path: "$senderInfo", preserveNullAndEmptyArrays: true } },
      // Join with accounts for receiver's customerId
      { $lookup: {
          from: "accounts",
          localField: "toAccount",
          foreignField: "accountNumber",
          as: "receiverAccountInfo"
      }},
      { $unwind: { path: "$receiverAccountInfo", preserveNullAndEmptyArrays: true } },
      // Join with customers to get receiver's name
      { $lookup: {
          from: "customers",
          localField: "receiverAccountInfo.customerId",
          foreignField: "_id",
          as: "receiverInfo"
      }},
      { $unwind: { path: "$receiverInfo", preserveNullAndEmptyArrays: true } },
      // Project clean output
      { $project: {
          fromAccount: 1,
          toAccount: 1,
          amount: 1,
          transferredAt: 1,
          senderName: { $ifNull: ["$senderInfo.name", "Unknown"] },
          senderEmail: { $ifNull: ["$senderInfo.email", "N/A"] },
          receiverName: { $ifNull: ["$receiverInfo.name", "Unknown"] },
          receiverEmail: { $ifNull: ["$receiverInfo.email", "N/A"] }
      }}
    ]);

    res.json({ count: enrichedTransfers.length, transfers: enrichedTransfers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: $bucket — Transaction Amount Distribution (MongoDB Functionality #4)
// ══════════════════════════════════════════════════════════════
exports.getTransactionDistribution = async (req, res) => {
  try {
    const distribution = await Transfer.aggregate([
      { $bucket: {
          groupBy: "$amount",
          boundaries: [0, 500, 1000, 3000, 5000, 10000, 50000, 100000, Infinity],
          default: "Other",
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            avgAmount: { $avg: "$amount" },
            transactions: { $push: { from: "$fromAccount", to: "$toAccount", amount: "$amount" } }
          }
      }}
    ]);

    // Label each bucket for readability
    const labeled = distribution.map(bucket => {
      const labels = {
        0: "₹0 – ₹499",
        500: "₹500 – ₹999",
        1000: "₹1,000 – ₹2,999",
        3000: "₹3,000 – ₹4,999",
        5000: "₹5,000 – ₹9,999",
        10000: "₹10,000 – ₹49,999",
        50000: "₹50,000 – ₹99,999",
        100000: "₹1,00,000+",
        "Other": "Other"
      };
      return {
        range: labels[bucket._id] || `₹${bucket._id}+`,
        count: bucket.count,
        totalAmount: bucket.totalAmount,
        avgAmount: Math.round(bucket.avgAmount),
        sampleTransactions: bucket.transactions.slice(0, 3) // only first 3
      };
    });

    res.json(labeled);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
