const Account = require("../models/Account");

exports.createAccount = async (req, res) => {

    try {

        const {
            customerId,
            accountType
        } = req.body;

        const account = new Account({

            customerId,

            accountType,

            accountNumber:
                Date.now().toString(),

            balance: 5000
        });

        await account.save();

        res.status(201).json(account);

    }
    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

// Aggregation Pipeline
exports.accountReport = async (req, res) => {

    try {

        const report = await Account.aggregate([

            {
                $group: {

                    _id: "$accountType",

                    totalAccounts: {
                        $sum: 1
                    },

                    totalBalance: {
                        $sum: "$balance"
                    },

                    averageBalance: {
                        $avg: "$balance"
                    }

                }
            }

        ]);

        res.status(200).json(report);

    }
    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};