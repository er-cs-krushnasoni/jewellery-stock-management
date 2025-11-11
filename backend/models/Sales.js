const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // All sensitive sales data stored encrypted in this field
  data: {
    type: String,
    required: true
  },
  // Keep soldAt unencrypted for efficient date queries and sorting
  soldAt: {
    type: Date,
    default: Date.now
  },
  // Keep original entry ID unencrypted for return functionality
  originalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Entry"
  }
}, {
  timestamps: true
});

// Index for better query performance
salesSchema.index({ userId: 1, soldAt: -1 });
salesSchema.index({ userId: 1, originalEntryId: 1 });

// Virtual for accessing decrypted data (will be populated by routes)
salesSchema.virtual('decryptedData').get(function() {
  return this._decryptedData;
});

salesSchema.virtual('decryptedData').set(function(value) {
  this._decryptedData = value;
});

// Ensure virtual fields are serialized
salesSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Sales", salesSchema);