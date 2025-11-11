const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyPassword, generateToken } = require("../utils/authMiddleware");

// Add CORS headers manually for this route
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log("📝 Login attempt for username:", username); // Debug log
    
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      console.log("❌ User not found:", username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    console.log("✅ User found:", user.username);

    // Check password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.log("❌ Invalid password for user:", username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    console.log("✅ Password valid for user:", username);

    // Generate token
    const token = generateToken(user);

    console.log("✅ Token generated successfully");

    // ✅ Return both token AND user object
    return res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;