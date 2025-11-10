// const express = require("express");
// const router = express.Router();
// const Metadata = require("../models/Metadata");
// const requireAuth = require("../middleware/requireAuth");

// // ✅ Import updateMetadata from entries route or extract to a helper
// const { updateMetadata } = require("./entries");

// // @route GET /api/metadata
// router.get("/", requireAuth, async (req, res) => {
//   try {
//     const userId = req.userId;
//     const metadata = await Metadata.findOne({ userId });
//     if (!metadata) return res.status(404).json({ error: "Not found" });
//     res.json(metadata);
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // ✅ NEW ROUTE: Rebuild metadata manually via Postman
// // @route POST /api/metadata/rebuild
// router.post("/rebuild", requireAuth, async (req, res) => {
//   try {
//     const userId = req.userId;
//     await updateMetadata(userId);
//     res.json({ message: "Metadata rebuilt successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to rebuild metadata", details: err.message });
//   }
// });

// module.exports = router;




const express = require("express");
const router = express.Router();
const Metadata = require("../models/Metadata");
const requireAuth = require("../middleware/requireAuth");
const { encryptData, decryptData } = require("../utils/encrypt");

// Helper function to calculate pure weight
const calcPure = (gross, purity) => +(gross * (purity / 100)).toFixed(3);

// Helper function to rebuild metadata from entries
// const rebuildMetadataFromEntries = async (userId) => {
//   try {
//     console.log("🔍 rebuildMetadataFromEntries called for userId:", userId);
    
//     const Entry = require("../models/Entry");
//     const entries = await Entry.find({ userId });
//     console.log("🔍 Found", entries.length, "entries for user");

//     const metadata = {
//       totalGoldGross: 0,
//       totalGoldPure: 0,
//       totalSilverGross: 0,
//       totalSilverPure: 0,
//       categoryTotals: {}
//     };

//     // Process entries and build metadata
//     for (let i = 0; i < entries.length; i++) {
//       const encEntry = entries[i];
//       console.log(`🔍 Processing entry ${i + 1}/${entries.length}`);
      
//       try {
//         // Decrypt using new format only
//         const entry = decryptData(encEntry.data);
//         console.log("🔍 Decrypted entry data:", entry);
        
//         const { metalType, category, purity, weight, isBulk, itemCount } = entry;

//         // Validate data types
//         if (
//           typeof weight !== 'number' || isNaN(weight) ||
//           typeof purity !== 'number' || isNaN(purity)
//         ) {
//           console.warn("⚠️ Skipping invalid entry:", entry);
//           continue;
//         }

//         const pure = calcPure(weight, purity);
//         const items = isBulk ? (itemCount || 1) : 1;

//         console.log(`🔍 Entry processing: metalType=${metalType}, category=${category}, weight=${weight}, pure=${pure}`);

//         // Use composite key "category_metalType" to separate gold and silver of same category
//         const categoryKey = `${category}_${metalType}`;
        
//         // Initialize category if doesn't exist
//         if (!metadata.categoryTotals[categoryKey]) {
//           metadata.categoryTotals[categoryKey] = {
//             grossWeight: 0,
//             pureWeight: 0,
//             totalItems: 0,
//             purities: {},
//             metal: metalType,
//             categoryName: category
//           };
//           console.log(`🔥 Initialized new category: ${categoryKey}`);
//         }

//         const cat = metadata.categoryTotals[categoryKey];
//         const purityKey = purity.toString();

//         // Initialize purity if doesn't exist
//         if (!cat.purities[purityKey]) {
//           cat.purities[purityKey] = {
//             grossWeight: 0,
//             pureWeight: 0,
//             totalItems: 0
//           };
//           console.log(`🔥 Initialized new purity ${purityKey}% for category ${categoryKey}`);
//         }

//         const pur = cat.purities[purityKey];

//         // Update category totals
//         cat.grossWeight += weight;
//         cat.pureWeight += pure;
//         cat.totalItems += items;

//         // Update purity totals
//         pur.grossWeight += weight;
//         pur.pureWeight += pure;
//         pur.totalItems += items;

//         // Update metal totals
//         if (metalType === "gold") {
//           metadata.totalGoldGross += weight;
//           metadata.totalGoldPure += pure;
//         } else if (metalType === "silver") {
//           metadata.totalSilverGross += weight;
//           metadata.totalSilverPure += pure;
//         }
//       } catch (decryptError) {
//         console.error(`❌ Failed to decrypt entry ${encEntry._id}:`, decryptError);
//         console.error("⚠️ Entry might be corrupted. Skipping...");
//         continue;
//       }
//     }

//     // Round all values to 3 decimal places
//     metadata.totalGoldGross = +metadata.totalGoldGross.toFixed(3);
//     metadata.totalGoldPure = +metadata.totalGoldPure.toFixed(3);
//     metadata.totalSilverGross = +metadata.totalSilverGross.toFixed(3);
//     metadata.totalSilverPure = +metadata.totalSilverPure.toFixed(3);

//     for (let categoryKey in metadata.categoryTotals) {
//       const cat = metadata.categoryTotals[categoryKey];
//       cat.grossWeight = +cat.grossWeight.toFixed(3);
//       cat.pureWeight = +cat.pureWeight.toFixed(3);
      
//       for (let purityKey in cat.purities) {
//         const pur = cat.purities[purityKey];
//         pur.grossWeight = +pur.grossWeight.toFixed(3);
//         pur.pureWeight = +pur.pureWeight.toFixed(3);
//       }
//     }

//     console.log("🔥 Final metadata structure:", metadata);
//     return metadata;
//   } catch (error) {
//     console.error("❌ Error rebuilding metadata:", error);
//     throw error;
//   }
// };

// Helper function to rebuild metadata from entries
const rebuildMetadataFromEntries = async (userId) => {
  try {
    console.log("🔍 rebuildMetadataFromEntries called for userId:", userId);
    
    const Entry = require("../models/Entry");
    const entries = await Entry.find({ userId });
    console.log("🔍 Found", entries.length, "entries for user");

    // Get existing metadata to preserve empty categories/purities
    let existingMetadata = {};
    try {
      const existingMetadataDoc = await Metadata.findOne({ userId });
      if (existingMetadataDoc) {
        existingMetadata = decryptData(existingMetadataDoc.data);
        console.log("🔍 Found existing metadata to preserve structure");
      }
    } catch (error) {
      console.log("🔍 No existing metadata found or failed to decrypt, starting fresh");
    }

    const metadata = {
      totalGoldGross: 0,
      totalGoldPure: 0,
      totalSilverGross: 0,
      totalSilverPure: 0,
      categoryTotals: { ...existingMetadata.categoryTotals } || {} // Preserve existing structure
    };

    // Reset all values to 0 but keep the structure
    for (let categoryKey in metadata.categoryTotals) {
      const cat = metadata.categoryTotals[categoryKey];
      cat.grossWeight = 0;
      cat.pureWeight = 0;
      cat.totalItems = 0;
      
      for (let purityKey in cat.purities) {
        const pur = cat.purities[purityKey];
        pur.grossWeight = 0;
        pur.pureWeight = 0;
        pur.totalItems = 0;
      }
    }

    // Process entries and build metadata
    for (let i = 0; i < entries.length; i++) {
      const encEntry = entries[i];
      console.log(`🔍 Processing entry ${i + 1}/${entries.length}`);
      
      try {
        // Decrypt using new format only
        const entry = decryptData(encEntry.data);
        console.log("🔍 Decrypted entry data:", entry);
        
        const { metalType, category, purity, weight, isBulk, itemCount } = entry;

        // Validate data types
        if (
          typeof weight !== 'number' || isNaN(weight) ||
          typeof purity !== 'number' || isNaN(purity)
        ) {
          console.warn("⚠️ Skipping invalid entry:", entry);
          continue;
        }

        const pure = calcPure(weight, purity);
        const items = isBulk ? (itemCount || 1) : 1;

        console.log(`🔍 Entry processing: metalType=${metalType}, category=${category}, weight=${weight}, pure=${pure}`);

        // Use composite key "category_metalType" to separate gold and silver of same category
        const categoryKey = `${category}_${metalType}`;
        
        // Initialize category if doesn't exist
        if (!metadata.categoryTotals[categoryKey]) {
          metadata.categoryTotals[categoryKey] = {
            grossWeight: 0,
            pureWeight: 0,
            totalItems: 0,
            purities: {},
            metal: metalType,
            categoryName: category
          };
          console.log(`🔥 Initialized new category: ${categoryKey}`);
        }

        const cat = metadata.categoryTotals[categoryKey];
        const purityKey = purity.toString();

        // Initialize purity if doesn't exist
        if (!cat.purities[purityKey]) {
          cat.purities[purityKey] = {
            grossWeight: 0,
            pureWeight: 0,
            totalItems: 0
          };
          console.log(`🔥 Initialized new purity ${purityKey}% for category ${categoryKey}`);
        }

        const pur = cat.purities[purityKey];

        // Update category totals
        cat.grossWeight += weight;
        cat.pureWeight += pure;
        cat.totalItems += items;

        // Update purity totals
        pur.grossWeight += weight;
        pur.pureWeight += pure;
        pur.totalItems += items;

        // Update metal totals
        if (metalType === "gold") {
          metadata.totalGoldGross += weight;
          metadata.totalGoldPure += pure;
        } else if (metalType === "silver") {
          metadata.totalSilverGross += weight;
          metadata.totalSilverPure += pure;
        }
      } catch (decryptError) {
        console.error(`❌ Failed to decrypt entry ${encEntry._id}:`, decryptError);
        console.error("⚠️ Entry might be corrupted. Skipping...");
        continue;
      }
    }

    // Round all values to 3 decimal places
    metadata.totalGoldGross = +metadata.totalGoldGross.toFixed(3);
    metadata.totalGoldPure = +metadata.totalGoldPure.toFixed(3);
    metadata.totalSilverGross = +metadata.totalSilverGross.toFixed(3);
    metadata.totalSilverPure = +metadata.totalSilverPure.toFixed(3);

    for (let categoryKey in metadata.categoryTotals) {
      const cat = metadata.categoryTotals[categoryKey];
      cat.grossWeight = +cat.grossWeight.toFixed(3);
      cat.pureWeight = +cat.pureWeight.toFixed(3);
      
      for (let purityKey in cat.purities) {
        const pur = cat.purities[purityKey];
        pur.grossWeight = +pur.grossWeight.toFixed(3);
        pur.pureWeight = +pur.pureWeight.toFixed(3);
      }
    }

    console.log("🔥 Final metadata structure:", metadata);
    return metadata;
  } catch (error) {
    console.error("❌ Error rebuilding metadata:", error);
    throw error;
  }
};

// Helper function to save encrypted metadata
const saveMetadata = async (userId, metadataObj) => {
  try {
    const encryptedData = encryptData(metadataObj);
    
    await Metadata.findOneAndUpdate(
      { userId },
      {
        data: encryptedData,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Metadata saved for user ${userId}`);
    return metadataObj;
  } catch (error) {
    console.error("❌ Error saving metadata:", error);
    throw error;
  }
};

// Main updateMetadata function that can be imported by entries.js
const updateMetadata = async (userId) => {
  try {
    const metadata = await rebuildMetadataFromEntries(userId);
    await saveMetadata(userId, metadata);
    return metadata;
  } catch (error) {
    console.error("❌ Error updating metadata:", error);
    throw error;
  }
};

// GET /api/metadata - Get user's metadata
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const metadata = await Metadata.findOne({ userId });
    
    if (!metadata) {
      console.log("🔍 No metadata found, returning default structure");
      return res.json({
        totalGoldGross: 0,
        totalGoldPure: 0,
        totalSilverGross: 0,
        totalSilverPure: 0,
        categoryTotals: {}
      });
    }

    // Try to decrypt the metadata
    let decryptedData;
    try {
      decryptedData = decryptData(metadata.data);
      console.log("🔍 Successfully decrypted metadata");
    } catch (decryptError) {
      console.error("❌ Failed to decrypt metadata, rebuilding...", decryptError);
      
      // If decryption fails, rebuild metadata from entries
      try {
        decryptedData = await updateMetadata(userId);
        console.log("🔍 Successfully rebuilt metadata");
      } catch (rebuildError) {
        console.error("❌ Failed to rebuild metadata:", rebuildError);
        // Return default values if everything fails
        return res.json({
          totalGoldGross: 0,
          totalGoldPure: 0,
          totalSilverGross: 0,
          totalSilverPure: 0,
          categoryTotals: {}
        });
      }
    }
    
    // Return the metadata in the expected format
    console.log("🔍 Returning metadata to frontend:", {
      totalGoldGross: decryptedData.totalGoldGross || 0,
      totalGoldPure: decryptedData.totalGoldPure || 0,
      totalSilverGross: decryptedData.totalSilverGross || 0,
      totalSilverPure: decryptedData.totalSilverPure || 0,
      categoryCount: Object.keys(decryptedData.categoryTotals || {}).length
    });

    res.json({
      totalGoldGross: decryptedData.totalGoldGross || 0,
      totalGoldPure: decryptedData.totalGoldPure || 0,
      totalSilverGross: decryptedData.totalSilverGross || 0,
      totalSilverPure: decryptedData.totalSilverPure || 0,
      categoryTotals: decryptedData.categoryTotals || {}
    });
  } catch (err) {
    console.error("❌ Metadata get error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// POST /api/metadata/rebuild - Rebuild metadata from entries
router.post("/rebuild", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    console.log("🔍 Rebuilding metadata for user:", userId);
    
    const rebuiltData = await updateMetadata(userId);
    
    res.json({ 
      message: "Metadata rebuilt successfully",
      stats: {
        totalGoldGross: rebuiltData.totalGoldGross,
        totalGoldPure: rebuiltData.totalGoldPure,
        totalSilverGross: rebuiltData.totalSilverGross,
        totalSilverPure: rebuiltData.totalSilverPure,
        categories: Object.keys(rebuiltData.categoryTotals).length
      }
    });
  } catch (err) {
    console.error("❌ Rebuild metadata error:", err);
    res.status(500).json({ 
      error: "Failed to rebuild metadata", 
      details: err.message 
    });
  }
});

// POST /api/metadata/cleanup - Clean up corrupted metadata and rebuild
router.post("/cleanup", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    console.log("🔍 Cleaning up metadata for user:", userId);
    
    // Delete any existing metadata
    await Metadata.deleteMany({ userId });
    console.log("🔍 Deleted existing metadata");
    
    // Rebuild from entries
    const rebuiltData = await updateMetadata(userId);
    
    res.json({ 
      message: "Metadata cleaned up and rebuilt successfully",
      data: rebuiltData
    });
  } catch (err) {
    console.error("❌ Cleanup error:", err);
    res.status(500).json({ 
      error: "Failed to cleanup metadata", 
      details: err.message 
    });
  }
});

module.exports = router;
module.exports.updateMetadata = updateMetadata;