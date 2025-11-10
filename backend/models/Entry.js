// const mongoose = require("mongoose");

// const entrySchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   data: {
//     type: String,
//     required: true
//   }
// });

// module.exports = mongoose.model("Entry", entrySchema);


// // FILE: models/Entry.js
// // CHAIN POSITION: 2/11

// // DEPENDENCIES: utils/encrypt.js (completed)
// // EXPORTS: Entry model (backward compatible with enhanced encryption)

// const mongoose = require("mongoose");

// const entrySchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     index: true // Add index for performance
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//     index: true // Add index for sorting
//   },
//   data: {
//     type: String,
//     required: true
//     // This field stores encrypted data in format:
//     // Old format: "iv:encrypted" (hex) - for backward compatibility
//     // New format: "v1:iv:encrypted:tag" (base64) - enhanced security
//   }
// });

// // Add compound index for efficient user queries
// entrySchema.index({ userId: 1, createdAt: -1 });

// module.exports = mongoose.model("Entry", entrySchema);





// FILE: models/Entry.js
// CHAIN POSITION: 2/11

// DEPENDENCIES: utils/encrypt.js (completed)
// EXPORTS: Entry model (backward compatible with enhanced encryption)

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