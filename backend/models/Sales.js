// const mongoose = require("mongoose");

// const salesSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true
//   },
//   metalType: {
//     type: String,
//     required: true,
//     enum: ['gold', 'silver'] // Changed to lowercase to match Entry system
//   },
//   category: {
//     type: String,
//     required: true
//   },
//   purity: {
//     type: Number,
//     required: true
//   },
//   weight: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   isBulk: {
//     type: Boolean,
//     required: true,
//     default: false
//   },
//   itemCount: {
//     type: Number,
//     min: 1,
//     validate: {
//       validator: function(v) {
//         // itemCount is required only when isBulk is true
//         return !this.isBulk || (this.isBulk && v != null && v > 0);
//       },
//       message: 'Item count is required when bulk is enabled'
//     }
//   },
//   salesPrice: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   // Optional customer information
//   customerName: {
//     type: String,
//     trim: true
//   },
//   customerAddress: {
//     type: String,
//     trim: true
//   },
//   customerMobile: {
//     type: String,
//     validate: {
//       validator: function(v) {
//         // Mobile validation - optional field but if provided should be valid
//         return !v || /^\d{10,15}$/.test(v);
//       },
//       message: 'Mobile number should be 10-15 digits'
//     }
//   },
//   soldAt: {
//     type: Date,
//     default: Date.now
//   },
//   // Track original entry for return purposes
//   originalEntryId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Entry"
//   }
// }, {
//   timestamps: true
// });

// // Index for better query performance
// salesSchema.index({ userId: 1, soldAt: -1 });
// salesSchema.index({ userId: 1, metalType: 1, category: 1, purity: 1 });
// salesSchema.index({ userId: 1, customerName: 1 });
// salesSchema.index({ userId: 1, customerAddress: 1 });

// // Virtual for pure weight calculation
// salesSchema.virtual('pureWeight').get(function() {
//   return +(this.weight * this.purity / 100).toFixed(3);
// });

// // Ensure virtual fields are serialized
// salesSchema.set('toJSON', { virtuals: true });

// module.exports = mongoose.model("Sales", salesSchema);


// FILE: models/Sales.js
// CHAIN POSITION: 6/11

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

// ENCRYPTED DATA STRUCTURE:
// {
//   metalType: String,         // 'gold' or 'silver'
//   category: String,          // category name
//   purity: Number,            // purity percentage
//   weight: Number,            // weight in grams
//   isBulk: Boolean,           // bulk sale flag
//   itemCount: Number,         // required when isBulk is true
//   salesPrice: Number,        // sale price
//   customerName: String,      // customer name (optional)
//   customerAddress: String,   // customer address (optional)
//   customerMobile: String     // customer mobile (optional)
// }