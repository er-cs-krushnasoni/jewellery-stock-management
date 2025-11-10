// const mongoose = require("mongoose");

// const metadataSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     unique: true
//   },
//   totalGoldGross: {
//     type: Number,
//     default: 0
//   },
//   totalGoldPure: {
//     type: Number,
//     default: 0
//   },
//   totalSilverGross: {
//     type: Number,
//     default: 0
//   },
//   totalSilverPure: {
//     type: Number,
//     default: 0
//   },
//   categoryTotals: {
//     type: Object, // ✅ Use plain object instead of Map
//     default: {}
//   }
// });

// module.exports = mongoose.model("Metadata", metadataSchema);



// // FILE: models/Metadata.js
// // CHAIN POSITION: 4/11

// // DEPENDENCIES: utils/encrypt.js (completed)
// // EXPORTS: Metadata model with encrypted data field

// const mongoose = require("mongoose");

// const metadataSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     unique: true
//   },
//   // NEW: Encrypted data field to store all sensitive aggregated data
//   data: {
//     type: String,
//     required: true
//   },
//   // REMOVED: Individual fields now stored in encrypted data
//   // Keep createdAt/updatedAt for basic queries if needed
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Update the updatedAt field before saving
// metadataSchema.pre('save', function(next) {
//   this.updatedAt = new Date();
//   next();
// });

// // ADD: Index for efficient user queries
// metadataSchema.index({ userId: 1 });

// module.exports = mongoose.model("Metadata", metadataSchema);

// // TESTING: 
// // 1. Ensure model can be imported without errors
// // 2. Verify schema has userId and data fields
// // 3. Check that indexes are created properly
// // 4. Test basic create/find operations (will be tested in routes/metadata.js)


// FILE: models/Metadata.js
// CHAIN POSITION: 4/11
// DEPENDENCIES: utils/encrypt.js (completed)
// EXPORTS: Metadata model with encrypted data field

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