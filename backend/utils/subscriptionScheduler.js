const cron = require("node-cron");
const User = require("../models/User");

class SubscriptionScheduler {
  constructor() {
    this.task = null;
  }

  start() {
    // Run once daily at midnight (00:00)
    this.task = cron.schedule("0 0 * * *", async () => {
      console.log("[SubscriptionScheduler] Running daily expired subscription check...");
      const count = await this.deactivateExpiredUsers();
      console.log(`[SubscriptionScheduler] Deactivated ${count} expired user(s)`);
    });

    console.log("[SubscriptionScheduler] Started — checking daily at midnight");
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log("[SubscriptionScheduler] Stopped");
    }
  }

  async deactivateExpiredUsers() {
    try {
      const now = new Date();

      // Find all non-admin active users whose subscription has expired
      const expiredUsers = await User.find({
        isAdmin: false,
        isActive: true,
        "subscription.endDate": { $lte: now }
      });

      if (expiredUsers.length === 0) return 0;

      const ids = expiredUsers.map((u) => u._id);
      await User.updateMany({ _id: { $in: ids } }, { isActive: false });

      expiredUsers.forEach((u) => {
        console.log(
          `[SubscriptionScheduler] Deactivated: ${u.username} (expired: ${u.subscription.endDate})`
        );
      });

      return expiredUsers.length;
    } catch (err) {
      console.error("[SubscriptionScheduler] Error:", err);
      return 0;
    }
  }

  // Manual trigger (useful for testing or immediate check via API)
  async runNow() {
    return await this.deactivateExpiredUsers();
  }
}

module.exports = new SubscriptionScheduler();