// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Entry = require("../models/Entry");
const Metadata = require("../models/Metadata");
const Sales = require("../models/Sales");
const mongoose = require("mongoose");
const { hashPassword } = require("../utils/authMiddleware");
const requireAuth = require("../middleware/requireAuth");
const subscriptionScheduler = require("../utils/subscriptionScheduler");

// ── Admin-only guard ───────────────────────────────────────────────────────────
const requireAdmin = async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

router.use(requireAuth, requireAdmin);

// ── GET /api/admin/dashboard ───────────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, expiredUsers, expiringSoon, expiringThisMonth, noSubscription] =
      await Promise.all([
        User.countDocuments({ isAdmin: false }),
        User.countDocuments({
          isAdmin: false,
          "subscription.endDate": { $gte: now }
        }),
        User.countDocuments({
          isAdmin: false,
          $or: [
            { "subscription.endDate": { $lt: now } },
            { "subscription.endDate": null }
          ]
        }),
        User.countDocuments({
          isAdmin: false,
          "subscription.endDate": { $gte: now, $lte: sevenDaysLater }
        }),
        User.countDocuments({
          isAdmin: false,
          "subscription.endDate": { $gte: now, $lte: thirtyDaysLater }
        }),
        User.countDocuments({
          isAdmin: false,
          $or: [
            { "subscription.endDate": null },
            { "subscription.endDate": { $exists: false } }
          ]
        })
      ]);

    res.json({
      totalUsers,
      activeUsers,
      expiredUsers,
      expiringSoon,
      expiringThisMonth,
      noSubscription
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

// ── GET /api/admin/users ───────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select("-passwordHash").sort({ createdAt: -1 });

    const now = new Date();
    const enriched = users.map((u) => {
      const obj = u.toObject();
      const endDate = u.subscription?.endDate;
      let daysRemaining = null;
      let status = "no_subscription";

      if (endDate) {
        daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) status = "expired";
        else if (daysRemaining <= 3) status = "critical";
        else if (daysRemaining <= 7) status = "warning";
        else status = "active";
      }

      return { ...obj, daysRemaining, subscriptionStatus: status };
    });

    res.json({ users: enriched });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
// Create user with subscription
router.post("/users", async (req, res) => {
  try {
    const { username, password, subscriptionDays } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    if (!subscriptionDays || isNaN(subscriptionDays) || Number(subscriptionDays) < 1) {
      return res.status(400).json({ error: "Subscription days must be a positive number" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const passwordHash = await hashPassword(password);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(subscriptionDays));

    const user = new User({
      username,
      passwordHash,
      isAdmin: false,
      subscription: {
        startDate,
        endDate,
        isActive: true,
        history: [
          {
            action: "set",
            days: Number(subscriptionDays),
            date: startDate,
            by: req.userId
          }
        ]
      }
    });

    await user.save();
    res.status(201).json({ message: "User created successfully", userId: user._id });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ── PUT /api/admin/users/:id/subscription/extend ──────────────────────────────
router.put("/users/:id/subscription/extend", async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || isNaN(days) || Number(days) < 1) {
      return res.status(400).json({ error: "Days must be a positive number" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isAdmin) return res.status(400).json({ error: "Cannot modify admin subscription" });

    const now = new Date();
    // If expired or no subscription, start from today; otherwise extend from current end
    const baseDate =
      user.subscription?.endDate && user.subscription.endDate > now
        ? new Date(user.subscription.endDate)
        : now;

    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + Number(days));

    if (!user.subscription) user.subscription = {};
    if (!user.subscription.startDate) user.subscription.startDate = now;
    user.subscription.endDate = newEndDate;
    user.subscription.isActive = true;

    if (!user.subscription.history) user.subscription.history = [];
    user.subscription.history.push({
      action: "extend",
      days: Number(days),
      date: now,
      by: req.userId
    });

    await user.save();

    const daysRemaining = Math.ceil((newEndDate - now) / (1000 * 60 * 60 * 24));
    res.json({
      message: `Subscription extended by ${days} days`,
      endDate: newEndDate,
      daysRemaining
    });
  } catch (err) {
    console.error("Extend subscription error:", err);
    res.status(500).json({ error: "Failed to extend subscription" });
  }
});

// ── PUT /api/admin/users/:id/subscription/reduce ──────────────────────────────
router.put("/users/:id/subscription/reduce", async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || isNaN(days) || Number(days) < 1) {
      return res.status(400).json({ error: "Days must be a positive number" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isAdmin) return res.status(400).json({ error: "Cannot modify admin subscription" });

    if (!user.subscription?.endDate) {
      return res.status(400).json({ error: "User has no subscription to reduce" });
    }

    const now = new Date();
    if (user.subscription.endDate < now) {
      return res.status(400).json({ error: "Cannot reduce an already expired subscription" });
    }

    const newEndDate = new Date(user.subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() - Number(days));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newEndDate < today) {
      const maxReducible = Math.ceil((user.subscription.endDate - today) / (1000 * 60 * 60 * 24));
      return res.status(400).json({
        error: `Cannot reduce by ${days} days — new end date would be in the past. Max reducible: ${maxReducible} days`
      });
    }

    user.subscription.endDate = newEndDate;
    user.subscription.history.push({
      action: "reduce",
      days: -Number(days),
      date: now,
      by: req.userId
    });

    await user.save();

    const daysRemaining = Math.ceil((newEndDate - now) / (1000 * 60 * 60 * 24));
    res.json({
      message: `Subscription reduced by ${days} days`,
      endDate: newEndDate,
      daysRemaining
    });
  } catch (err) {
    console.error("Reduce subscription error:", err);
    res.status(500).json({ error: "Failed to reduce subscription" });
  }
});

// ── PUT /api/admin/users/:id ──────────────────────────────────────────────────
// Update username or password
router.put("/users/:id", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) return res.status(409).json({ error: "Username already exists" });
      user.username = username;
    }

    if (password) {
      user.passwordHash = await hashPassword(password);
    }

    await user.save();
    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const entriesDeleted = await Entry.deleteMany({ userId }).session(session);
      const metadataDeleted = await Metadata.deleteMany({ userId }).session(session);
      const salesDeleted = await Sales.deleteMany({ userId }).session(session);
      await User.findByIdAndDelete(userId).session(session);

      await session.commitTransaction();

      res.json({
        message: "User and all data deleted successfully",
        deleted: {
          entries: entriesDeleted.deletedCount,
          metadata: metadataDeleted.deletedCount,
          sales: salesDeleted.deletedCount
        }
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ── POST /api/admin/scheduler/run ─────────────────────────────────────────────
// Manually trigger subscription check
router.post("/scheduler/run", async (req, res) => {
  try {
    const count = await subscriptionScheduler.manualCheck();
    res.json({ message: `Checked subscriptions. Deactivated: ${count}` });
  } catch (err) {
    res.status(500).json({ error: "Scheduler run failed" });
  }
});

module.exports = router;