const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  data: {
    type: String,
    required: true
  }
});

// Add compound index for efficient user queries
entrySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Entry", entrySchema);