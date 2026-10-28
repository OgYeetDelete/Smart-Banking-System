const Loan = require("../models/Loan");
const Account = require("../models/Account");
const Transfer = require("../models/Transfer");
const Notification = require("../models/Notification");

// ── Existing: Apply for Loan ──
exports.applyLoan = async (req, res) => {
  try {
    const { customerId, loanType, amount } = req.body;
    const loan = await Loan.create({ customerId, loanType, amount });
    res.status(201).json({ message: "Loan application submitted (TTL: 1 year)", loan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Loan Statistics (Aggregation) ──
exports.loanStatistics = async (req, res) => {
  try {
    const stats = await Loan.aggregate([
      { $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" }
      }},
      { $sort: { count: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Get Customer Loans ──
exports.getCustomerLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ customerId: req.params.customerId }).sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Get All Loans ──
exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find().populate("customerId", "name email").sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Update Loan Status (with auto-disburse on Approved) ──
exports.updateLoanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const loan = await Loan.findById(id).populate("customerId", "name email");
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.status = status;
    await loan.save();

    // Auto-disburse: credit customer's first account when Approved
    if (status === "Approved") {
      const account = await Account.findOne({ customerId: loan.customerId._id });
      if (account) {
        account.balance += loan.amount;
        await account.save();

        await Transfer.create({
          fromAccount: "BANK_LOAN_DISBURSAL",
          toAccount: account.accountNumber,
          amount: loan.amount
        });

        await Notification.create({
          message: `Loan of ₹${loan.amount.toLocaleString()} (${loan.loanType}) approved and disbursed to account ${account.accountNumber}`,
          type: "TRANSACTION",
          metadata: { loanId: loan._id, accountNumber: account.accountNumber }
        });

        loan.status = "Disbursed";
        await loan.save();
      }
    }

    res.json({ message: `Loan status updated to ${loan.status}`, loan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: $facet — Multi-Dimensional Loan Analytics (MongoDB Functionality #3)
// Runs multiple aggregation sub-pipelines in a single query.
// ══════════════════════════════════════════════════════════════
exports.loanFacetAnalytics = async (req, res) => {
  try {
    const [result] = await Loan.aggregate([
      { $facet: {
          // Sub-pipeline 1: By loan type
          byType: [
            { $group: { _id: "$loanType", count: { $sum: 1 }, totalAmount: { $sum: "$amount" }, avgAmount: { $avg: "$amount" } } },
            { $sort: { totalAmount: -1 } }
          ],
          // Sub-pipeline 2: By status
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
            { $sort: { count: -1 } }
          ],
          // Sub-pipeline 3: Top 5 largest loans
          topLoans: [
            { $sort: { amount: -1 } },
            { $limit: 5 },
            { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } },
            { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
            { $project: { loanType: 1, amount: 1, status: 1, customerName: "$customer.name", createdAt: 1 } }
          ],
          // Sub-pipeline 4: Overall statistics
          overall: [
            { $group: { _id: null, totalLoans: { $sum: 1 }, totalValue: { $sum: "$amount" }, avgValue: { $avg: "$amount" }, maxLoan: { $max: "$amount" }, minLoan: { $min: "$amount" } } }
          ]
      }}
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
