const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyPassword, generateToken } = require("../utils/authMiddleware");

router.post("/login", async (req, res) => {
try {
const { username, password } = req.body;
// Check if user exists
const user = await User.findOne({ username });
if (!user) return res.status(401).json({ message: "Invalid username or password" });

// Check password
const isValid = await verifyPassword(password, user.passwordHash);
if (!isValid) return res.status(401).json({ message: "Invalid username or password" });

// Generate token
const token = generateToken(user);

return res.json({ token });
} 
catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
    }
    });
    
    module.exports = router;