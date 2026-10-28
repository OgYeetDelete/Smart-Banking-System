const Customer = require("../models/Customer");
const SecurityLog = require("../models/SecurityLog");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ── Existing: Register ──
exports.registerCustomer = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const existing = await Customer.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await Customer.create({ name, email, password: hashedPassword, phone, role });

    await SecurityLog.create({ email, action: "REGISTER", details: "New customer registered" });

    res.status(201).json({ message: "Customer registered successfully", customer: { _id: customer._id, name: customer.name, email: customer.email, role: customer.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Login ──
exports.loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });

    if (!customer) {
      await SecurityLog.create({ email, action: "LOGIN_FAILED", status: "failed", details: "Email not found" });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      await SecurityLog.create({ email, action: "LOGIN_FAILED", status: "failed", details: "Wrong password" });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: customer._id, email: customer.email, role: customer.role },
      process.env.JWT_SECRET || "banking_secret_key",
      { expiresIn: "24h" }
    );

    await SecurityLog.create({ email, action: "LOGIN_SUCCESS", details: "JWT token issued" });

    res.json({
      token,
      customer: { _id: customer._id, name: customer.name, email: customer.email, role: customer.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Get All Customers ──
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().select("-password");
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Existing: Security Logs ──
exports.getSecurityLogs = async (req, res) => {
  try {
    const logs = await SecurityLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: Update Customer Profile (User Functionality #1)
// ══════════════════════════════════════════════════════════════
exports.updateProfile = async (req, res) => {
  try {
    const customerId = req.user.id; // from JWT middleware
    const { name, phone, oldPassword, newPassword } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    // If changing password, verify old password first
    if (newPassword) {
      if (!oldPassword) return res.status(400).json({ error: "Old password is required to set a new password" });
      const isMatch = await bcrypt.compare(oldPassword, customer.password);
      if (!isMatch) return res.status(401).json({ error: "Old password is incorrect" });
      customer.password = await bcrypt.hash(newPassword, 10);

      await SecurityLog.create({ email: customer.email, action: "PASSWORD_CHANGE", details: "Password changed via profile update" });
    }

    if (name) customer.name = name;
    if (phone) customer.phone = phone;
    await customer.save();

    await SecurityLog.create({ email: customer.email, action: "PROFILE_UPDATE", details: "Profile details updated" });

    res.json({
      message: "Profile updated successfully",
      customer: { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone, role: customer.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// NEW: Search Customers using Text Index + $text (MongoDB Functionality #2)
// ══════════════════════════════════════════════════════════════
exports.searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Search query 'q' is required" });

    // MongoDB $text search uses the text index on { name: "text", email: "text" }
    const results = await Customer.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" }, password: 0 }
    ).sort({ score: { $meta: "textScore" } }).limit(20);

    res.json({ query: q, count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
