const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "banksecret";

/**
 * Verify JWT Bearer Token
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["x-access-token"];

    if (!authHeader) {
        return res.status(401).json({ error: "Access denied. No authentication token provided." });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired authentication token." });
    }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * Ensures only authorized roles (e.g. 'admin') can access sensitive endpoints
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: "Forbidden: No user role assigned." });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Forbidden: Access requires one of [${allowedRoles.join(", ")}], but current role is [${req.user.role}].`
            });
        }

        next();
    };
};

const requireAdmin = requireRole("admin");

module.exports = {
    verifyToken,
    requireRole,
    requireAdmin
};
