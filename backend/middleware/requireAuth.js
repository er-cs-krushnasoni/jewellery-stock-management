const { verifyToken } = require("../utils/authMiddleware");
const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith("Bearer ")) {
return res.status(401).json({ message: "Unauthorized" });
}

const token = authHeader.split(" ")[1];

try {
const decoded = verifyToken(token);
req.userId = decoded.userId;
next();
} catch (err) {
return res.status(401).json({ message: "Invalid token" });
}
};

module.exports = requireAuth;