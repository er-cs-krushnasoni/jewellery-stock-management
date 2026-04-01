// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyPassword, generateToken } = require("../utils/authMiddleware");

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("📝 Login attempt for username:", username);

    const user = await User.findOne({ username });
    if (!user) {
      console.log("❌ User not found:", username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.log("❌ Invalid password for user:", username);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // ── Subscription check (skip for admins) ──────────────────────────────
    if (!user.isAdmin) {
      const now = new Date();

      // User has a subscription set and it has expired
      if (user.subscription?.endDate && user.subscription.endDate < now) {
        console.log(`🔒 Subscription expired for user: ${username}`);
        return res.status(403).json({
          message: "Subscription Expired",
          subscriptionExpired: true,
          expiredAt: user.subscription.endDate
        });
      }

      // User has no subscription set at all (admin hasn't assigned one)
      if (!user.subscription?.endDate) {
        console.log(`🔒 No subscription set for user: ${username}`);
        return res.status(403).json({
          message: "No active subscription. Please contact the administrator.",
          subscriptionExpired: true,
          noSubscription: true
        });
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const token = generateToken(user);
    console.log("✅ Login successful for:", username);

    // Build subscription info for frontend
    const subscriptionInfo = user.isAdmin
      ? null
      : {
          endDate: user.subscription?.endDate || null,
          daysRemaining: user.daysRemaining,
          status: user.subscriptionStatus
        };

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        subscription: subscriptionInfo
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;