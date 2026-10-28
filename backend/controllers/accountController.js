const Account = require("../models/Account");
const AuditLog = require("../models/AuditLog");

// ── Existing: Create Account ──
exports.createAccount = async (req, res) => {
  try {
    const { customerId, accountType } = req.body;
    const accountNumber = "17930" + Date.now().toString().slice(-8);
    const account = await Account.create({ customerId, accountNumber, accountType, balance: 5000 });
    res.status(201).json({ message: "Account created", account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Deposit Funds ──
exports.depositFunds = async (req, res) => {
  try {
    const { accountNumber, amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid deposit amount" });

    const account = await Account.findOne({ accountNumber });
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.isFrozen) return res.status(403).json({ error: "Account is frozen. Contact admin." });

    account.balance += amount;
    await account.save();
    res.json({ message: "Deposit successful", newBalance: account.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Aggregation Pipeline — Account Report ($group, $sum, $avg) ──
exports.accountReport = async (req, res) => {
  try {
    const report = await Account.aggregate([
      { $group: {
          _id: "$accountType",
          totalAccounts: { $sum: 1 },
          totalBalance: { $sum: "$balance" },
          averageBalance: { $avg: "$balance" },
          maxBalance: { $max: "$balance" },
          minBalance: { $min: "$balance" }
      }},
      { $sort: { totalBalance: -1 } }
    ]);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Get Customer Accounts ──
exports.getCustomerAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ customerId: req.params.customerId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Get Account by Number ──
exports.getAccountByNumber = async (req, res) => {
  try {
    const account = await Account.findOne({ accountNumber: req.params.accountNumber });
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Get All Accounts ──
exports.getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find().populate("customerId", "name email");
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: Freeze Account — Admin only (User Functionality #4)
// ══════════════════════════════════════════════════════════════
exports.freezeAccount = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const account = await Account.findOne({ accountNumber });
    if (!account) return res.status(404).json({ error: "Account not found" });

    account.isFrozen = true;
    await account.save();

    // Audit log entry
    await AuditLog.create({
      action: "ACCOUNT_FREEZE",
      performedBy: req.user.email,
      targetResource: `Account:${accountNumber}`,
      details: "Account frozen by admin"
    });

    res.json({ message: `Account ${accountNumber} has been frozen`, account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: Unfreeze Account — Admin only (User Functionality #4)
// ══════════════════════════════════════════════════════════════
exports.unfreezeAccount = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const account = await Account.findOne({ accountNumber });
    if (!account) return res.status(404).json({ error: "Account not found" });

    account.isFrozen = false;
    await account.save();

    await AuditLog.create({
      action: "ACCOUNT_UNFREEZE",
      performedBy: req.user.email,
      targetResource: `Account:${accountNumber}`,
      details: "Account unfrozen by admin"
    });

    res.json({ message: `Account ${accountNumber} has been unfrozen`, account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
