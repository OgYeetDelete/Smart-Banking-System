const Beneficiary = require("../models/Beneficiary");

// ── Existing: Add Beneficiary ──
exports.addBeneficiary = async (req, res) => {
  try {
    const { customerId, beneficiaryName, accountNumber } = req.body;
    const beneficiary = await Beneficiary.create({ customerId, beneficiaryName, accountNumber });
    res.status(201).json({ message: "Beneficiary added", beneficiary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Get Beneficiaries by Customer ──
exports.getBeneficiariesByCustomer = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find({ customerId: req.params.customerId });
    res.json(beneficiaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: Delete Beneficiary (User Functionality #2)
// ══════════════════════════════════════════════════════════════
exports.deleteBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const beneficiary = await Beneficiary.findById(id);
    if (!beneficiary) return res.status(404).json({ error: "Beneficiary not found" });

    // Ensure the logged-in user owns this beneficiary
    if (beneficiary.customerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this beneficiary" });
    }

    await Beneficiary.findByIdAndDelete(id);
    res.json({ message: "Beneficiary deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
