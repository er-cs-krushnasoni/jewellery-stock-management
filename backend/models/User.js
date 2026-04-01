const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  subscription: {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    history: [
      {
        action: { type: String, enum: ["extend", "reduce", "set"], default: "set" },
        days: { type: Number },
        date: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ]
  }
});

// Virtual: days remaining (null = no subscription set, negative = expired)
userSchema.virtual("daysRemaining").get(function () {
  if (this.isAdmin) return null;
  if (!this.subscription?.endDate) return null;
  const now = new Date();
  const diff = this.subscription.endDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual: subscription status string
userSchema.virtual("subscriptionStatus").get(function () {
  if (this.isAdmin) return "admin";
  if (!this.subscription?.endDate) return "no_subscription";
  const days = this.daysRemaining;
  if (days < 0) return "expired";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  return "active";
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", userSchema);