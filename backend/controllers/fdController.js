const FixedDeposit = require("../models/FixedDeposit");
const Account = require("../models/Account");
const AuditLog = require("../models/AuditLog");
const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════
// NEW: Fixed Deposit Controller (User Functionality #3)
// ══════════════════════════════════════════════════════════════

// Create FD — debits principal from source account via ACID transaction
exports.createFD = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId, principal, tenureMonths } = req.body;
    const customerId = req.user.id;

    if (!accountId || !principal || !tenureMonths) {
      return res.status(400).json({ error: "accountId, principal, and tenureMonths are required" });
    }
    if (principal < 1000) {
      return res.status(400).json({ error: "Minimum FD amount is ₹1,000" });
    }

    const account = await Account.findById(accountId).session(session);
    if (!account) { await session.abortTransaction(); return res.status(404).json({ error: "Account not found" }); }
    if (account.isFrozen) { await session.abortTransaction(); return res.status(403).json({ error: "Account is frozen" }); }
    if (account.balance < principal) { await session.abortTransaction(); return res.status(400).json({ error: "Insufficient balance for FD" }); }

    // Interest rate based on tenure
    let interestRate;
    if (tenureMonths <= 6) interestRate = 5.5;
    else if (tenureMonths <= 12) interestRate = 6.5;
    else if (tenureMonths <= 24) interestRate = 7.0;
    else interestRate = 7.5;

    // Simple interest: maturityAmount = principal + (principal * rate * tenure/12) / 100
    const maturityAmount = Math.round(principal + (principal * interestRate * tenureMonths) / (12 * 100));
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);

    // Debit principal from account
    account.balance -= principal;
    await account.save({ session });

    const [fd] = await FixedDeposit.create([{
      customerId,
      accountId,
      principal,
      interestRate,
      tenureMonths,
      maturityAmount,
      maturityDate,
      status: "Active"
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Audit log
    AuditLog.create({
      action: "FD_CREATE",
      performedBy: req.user.email,
      targetResource: `FD:${fd._id}`,
      details: `₹${principal} locked for ${tenureMonths} months at ${interestRate}%`
    }).catch(() => {});

    res.status(201).json({
      message: "Fixed Deposit created successfully",
      fd,
      remainingBalance: account.balance
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

// Early Withdrawal — credits principal back (no interest on early withdrawal)
exports.withdrawFD = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const fd = await FixedDeposit.findById(id).session(session);
    if (!fd) { await session.abortTransaction(); return res.status(404).json({ error: "Fixed Deposit not found" }); }
    if (fd.status !== "Active") { await session.abortTransaction(); return res.status(400).json({ error: `FD is already ${fd.status}` }); }

    // Penalty: return only principal (no interest) on early withdrawal
    const account = await Account.findById(fd.accountId).session(session);
    if (!account) { await session.abortTransaction(); return res.status(404).json({ error: "Linked account not found" }); }

    account.balance += fd.principal;
    await account.save({ session });

    fd.status = "Withdrawn";
    fd.withdrawnAt = new Date();
    await fd.save({ session });

    await session.commitTransaction();
    session.endSession();

    AuditLog.create({
      action: "FD_WITHDRAW",
      performedBy: req.user.email,
      targetResource: `FD:${fd._id}`,
      details: `Early withdrawal — ₹${fd.principal} refunded (no interest)`
    }).catch(() => {});

    res.json({
      message: "FD withdrawn early — principal refunded (no interest earned)",
      fd,
      newBalance: account.balance
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

// List FDs for a customer
exports.getCustomerFDs = async (req, res) => {
  try {
    const fds = await FixedDeposit.find({ customerId: req.params.customerId })
      .populate("accountId", "accountNumber accountType")
      .sort({ createdAt: -1 });
    res.json(fds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
