const Customer = require("../models/Customer");
const SecurityLog = require("../models/SecurityLog");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "banksecret";

exports.registerCustomer = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            role = "customer"
        } = req.body;

        const existing = await Customer.findOne({ email });

        if (existing) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const customer = new Customer({
            name,
            email,
            password: hashedPassword,
            phone,
            role
        });

        await customer.save();

        res.status(201).json({
            message: "Customer Registered Successfully",
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                role: customer.role
            }
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

exports.loginCustomer = async (req, res) => {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || "127.0.0.1";

    try {
        const customer = await Customer.findOne({ email });

        if (!customer) {
            // Log failed login attempt with TTL
            await SecurityLog.create({
                email: email || "unknown",
                action: "LOGIN_FAILED",
                status: "FAILED",
                details: "Customer account not found",
                ipAddress: clientIp
            });

            return res.status(404).json({
                message: "Customer Not Found"
            });
        }

        const match = await bcrypt.compare(password, customer.password);

        if (!match) {
            // Log incorrect password attempt with TTL
            await SecurityLog.create({
                email,
                action: "LOGIN_FAILED",
                status: "FAILED",
                details: "Incorrect password provided",
                ipAddress: clientIp
            });

            return res.status(400).json({
                message: "Invalid Password"
            });
        }

        // Log successful login attempt with TTL
        await SecurityLog.create({
            email,
            action: "LOGIN_SUCCESS",
            status: "SUCCESS",
            details: `Authenticated as ${customer.role || "customer"}`,
            ipAddress: clientIp
        });

        const token = jwt.sign(
            {
                id: customer._id,
                email: customer.email,
                role: customer.role || "customer",
                name: customer.name
            },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login Successful",
            token,
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                role: customer.role || "customer"
            }
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({}, "-password").sort({ createdAt: -1 });
        res.status(200).json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSecurityLogs = async (req, res) => {
    try {
        const logs = await SecurityLog.find().sort({ createdAt: -1 }).limit(50);
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
