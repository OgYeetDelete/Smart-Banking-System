const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transfer = require("../models/Transfer");

/**
 * Atomic Fund Transfer with MongoDB Multi-Document Transactions
 * Enforces consistency, balance checks, and sender!=receiver validation.
 */
exports.transferFunds = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { fromAccount, toAccount, amount } = req.body;
        const transferAmount = Number(amount);

        // Validation Checks
        if (!fromAccount || !toAccount || isNaN(transferAmount)) {
            throw new Error("Missing required fields: fromAccount, toAccount, and valid amount");
        }

        if (fromAccount === toAccount) {
            throw new Error("Sender and receiver accounts cannot be identical");
        }

        if (transferAmount <= 0) {
            throw new Error("Transfer amount must be strictly greater than zero");
        }

        // Atomically query sender and receiver inside the session
        const sender = await Account.findOne({ accountNumber: fromAccount }).session(session);
        const receiver = await Account.findOne({ accountNumber: toAccount }).session(session);

        if (!sender) {
            throw new Error(`Sender account [${fromAccount}] does not exist`);
        }

        if (!receiver) {
            throw new Error(`Receiver account [${toAccount}] does not exist`);
        }

        // Check sufficient balance
        if (sender.balance < transferAmount) {
            throw new Error(`Insufficient Balance: Available ₹${sender.balance}, Required ₹${transferAmount}`);
        }

        // Execute Debit and Credit operations
        sender.balance -= transferAmount;
        receiver.balance += transferAmount;

        await sender.save({ session });
        await receiver.save({ session });

        // Record transfer audit log in the same transaction
        const [transferRecord] = await Transfer.create(
            [{
                fromAccount,
                toAccount,
                amount: transferAmount,
                transferredAt: new Date()
            }],
            { session }
        );

        // Commit all changes atomically
        await session.commitTransaction();

        res.status(200).json({
            message: "Transfer Successful",
            transaction: transferRecord,
            remainingBalance: sender.balance
        });

    } catch (err) {
        // Rollback all write operations if any error occurs
        await session.abortTransaction();
        res.status(400).json({
            error: err.message
        });
    } finally {
        session.endSession();
    }
};

/**
 * Get account transaction history (Uses compound index { fromAccount: 1, transferredAt: -1 })
 */
exports.getTransferHistory = async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const transfers = await Transfer.find({
            $or: [
                { fromAccount: accountNumber },
                { toAccount: accountNumber }
            ]
        })
        .sort({ transferredAt: -1 })
        .limit(50);

        res.status(200).json(transfers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Aggregation Pipeline: Spending Analytics & Transaction Volume Summary
 */
exports.spendingAnalytics = async (req, res) => {
    try {
        const analytics = await Transfer.aggregate([
            {
                $group: {
                    _id: "$fromAccount",
                    totalSent: { $sum: "$amount" },
                    transactionCount: { $sum: 1 },
                    averageAmount: { $avg: "$amount" },
                    maxAmount: { $max: "$amount" }
                }
            },
            {
                $sort: { totalSent: -1 }
            },
            {
                $limit: 10
            }
        ]);

        res.status(200).json(analytics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
