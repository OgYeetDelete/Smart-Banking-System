const Beneficiary = require("../models/Beneficiary");

exports.addBeneficiary = async (req, res) => {
    try {
        const { customerId, beneficiaryName, accountNumber } = req.body;

        const beneficiary = new Beneficiary({
            customerId,
            beneficiaryName,
            accountNumber
        });

        await beneficiary.save();

        res.status(201).json({
            message: "Beneficiary Added Successfully",
            beneficiary
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getBeneficiariesByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const beneficiaries = await Beneficiary.find({ customerId });
        res.status(200).json(beneficiaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
