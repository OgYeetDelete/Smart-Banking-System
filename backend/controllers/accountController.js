const Account = require("../models/Account");

exports.createAccount = async (req, res) => {
    try {
        const { customerId, accountType } = req.body;

        const account = new Account({
            customerId,
            accountType: accountType || "Savings",
            accountNumber: Date.now().toString(),
            balance: 5000
        });

        await account.save();
        res.status(201).json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Deposit funds (useful for adding balance in testing)
exports.depositFunds = async (req, res) => {
    try {
        const { accountNumber, amount } = req.body;
        const depositAmount = Number(amount);

        if (!accountNumber || isNaN(depositAmount) || depositAmount <= 0) {
            return res.status(400).json({ error: "Valid accountNumber and positive amount required" });
        }

        const account = await Account.findOne({ accountNumber });
        if (!account) {
            return res.status(404).json({ error: `Account [${accountNumber}] not found` });
        }

        account.balance += depositAmount;
        await account.save();

        res.status(200).json({
            message: "Deposit Successful",
            accountNumber: account.accountNumber,
            newBalance: account.balance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Aggregation Pipeline for Account Statistics
exports.accountReport = async (req, res) => {
    try {
        const report = await Account.aggregate([
            {
                $group: {
                    _id: "$accountType",
                    totalAccounts: { $sum: 1 },
                    totalBalance: { $sum: "$balance" },
                    averageBalance: { $avg: "$balance" }
                }
            }
        ]);

        res.status(200).json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Fetch all accounts belonging to a specific customer
exports.getCustomerAccounts = async (req, res) => {
    try {
        const { customerId } = req.params;
        const accounts = await Account.find({ customerId });
        res.status(200).json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Fetch account details by account number
exports.getAccountByNumber = async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const account = await Account.findOne({ accountNumber }).populate("customerId", "name email");
        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }
        res.status(200).json(account);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// List all accounts (admin view)
exports.getAllAccounts = async (req, res) => {
    try {
        const accounts = await Account.find().populate("customerId", "name email phone");
        res.status(200).json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
