const mongoose = require("mongoose");

const metadataSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true 
  },
  // Encrypted data field to store all sensitive aggregated data
  data: { 
    type: String, 
    required: true 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the lastUpdated field before saving
metadataSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Update the lastUpdated field before findOneAndUpdate
metadataSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastUpdated: new Date() });
  next();
});

// ADD: Index for efficient user queries
metadataSchema.index({ userId: 1 });

module.exports = mongoose.model("Metadata", metadataSchema);