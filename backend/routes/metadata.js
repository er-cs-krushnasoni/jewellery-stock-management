const express = require("express");
const router = express.Router();
const Metadata = require("../models/Metadata");
const requireAuth = require("../middleware/requireAuth");
const { encryptData, decryptData } = require("../utils/encrypt");

// Helper function to calculate pure weight
const calcPure = (gross, purity) => +(gross * (purity / 100)).toFixed(3);

// Helper function to rebuild metadata from entries
const rebuildMetadataFromEntries = async (userId) => {
  try {
    console.log("🔍 rebuildMetadataFromEntries called for userId:", userId);

    const Entry = require("../models/Entry");
    const entries = await Entry.find({ userId });
    console.log("🔍 Found", entries.length, "entries for user");

    // FIX: Load existing metadata first so we can preserve empty categories
    let existingCategoryTotals = {};
    try {
      const existingMetadata = await Metadata.findOne({ userId });
      if (existingMetadata && existingMetadata.data) {
        const existing = decryptData(existingMetadata.data);
        existingCategoryTotals = existing.categoryTotals || {};
        console.log("🔍 Loaded existing metadata with", Object.keys(existingCategoryTotals).length, "categories");
      }
    } catch (err) {
      console.warn("⚠️ Could not load existing metadata for preservation, starting fresh:", err.message);
    }

    // Start with a fresh metadata object
    const metadata = {
      totalGoldGross: 0,
      totalGoldPure: 0,
      totalSilverGross: 0,
      totalSilverPure: 0,
      categoryTotals: {}
    };

    // FIX: Seed categoryTotals with all existing empty categories BEFORE processing entries.
    // This ensures categories with no entries are not wiped on rebuild.
    for (const categoryKey in existingCategoryTotals) {
      const existing = existingCategoryTotals[categoryKey];
      metadata.categoryTotals[categoryKey] = {
        grossWeight: 0,
        pureWeight: 0,
        totalItems: 0,
        purities: {},
        metal: existing.metal,
        categoryName: existing.categoryName
      };

      // Also seed existing empty purities within each category
      for (const purityKey in existing.purities || {}) {
        metadata.categoryTotals[categoryKey].purities[purityKey] = {
          grossWeight: 0,
          pureWeight: 0,
          totalItems: 0
        };
      }
      console.log(`🌱 Seeded existing category: ${categoryKey}`);
    }

    // Process entries and accumulate into metadata
    for (let i = 0; i < entries.length; i++) {
      const encEntry = entries[i];
      console.log(`🔍 Processing entry ${i + 1}/${entries.length}`);

      try {
        const entry = decryptData(encEntry.data);
        console.log("🔍 Decrypted entry data:", entry);

        const { metalType, category, purity, weight, isBulk, itemCount } = entry;

        if (
          typeof weight !== 'number' || isNaN(weight) ||
          typeof purity !== 'number' || isNaN(purity)
        ) {
          console.warn("⚠️ Skipping invalid entry:", entry);
          continue;
        }

        const pure = calcPure(weight, purity);
        const items = isBulk ? (itemCount || 1) : 1;

        console.log(`🔍 Entry: metalType=${metalType}, category=${category}, weight=${weight}, pure=${pure}`);

        const categoryKey = `${category}_${metalType}`;

        // Initialize category if it doesn't exist yet (new category from entry)
        if (!metadata.categoryTotals[categoryKey]) {
          metadata.categoryTotals[categoryKey] = {
            grossWeight: 0,
            pureWeight: 0,
            totalItems: 0,
            purities: {},
            metal: metalType,
            categoryName: category
          };
          console.log(`🔥 Initialized new category from entry: ${categoryKey}`);
        }

        const cat = metadata.categoryTotals[categoryKey];
        const purityKey = purity.toString();

        if (!cat.purities[purityKey]) {
          cat.purities[purityKey] = {
            grossWeight: 0,
            pureWeight: 0,
            totalItems: 0
          };
        }

        const pur = cat.purities[purityKey];

        cat.grossWeight += weight;
        cat.pureWeight += pure;
        cat.totalItems += items;

        pur.grossWeight += weight;
        pur.pureWeight += pure;
        pur.totalItems += items;

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

    // Round top-level totals
    metadata.totalGoldGross = +metadata.totalGoldGross.toFixed(3);
    metadata.totalGoldPure = +metadata.totalGoldPure.toFixed(3);
    metadata.totalSilverGross = +metadata.totalSilverGross.toFixed(3);
    metadata.totalSilverPure = +metadata.totalSilverPure.toFixed(3);

    // Round category/purity values but DO NOT delete empty categories/purities —
    // they were intentionally created by the user and must be preserved.
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
    console.log("📊 Total categories (including empty):", Object.keys(metadata.categoryTotals).length);

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

    let decryptedData;
    try {
      decryptedData = decryptData(metadata.data);
      console.log("🔍 Successfully decrypted metadata");
    } catch (decryptError) {
      console.error("❌ Failed to decrypt metadata, rebuilding...", decryptError);

      try {
        decryptedData = await updateMetadata(userId);
        console.log("🔍 Successfully rebuilt metadata");
      } catch (rebuildError) {
        console.error("❌ Failed to rebuild metadata:", rebuildError);
        return res.json({
          totalGoldGross: 0,
          totalGoldPure: 0,
          totalSilverGross: 0,
          totalSilverPure: 0,
          categoryTotals: {}
        });
      }
    }

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

    await Metadata.deleteMany({ userId });
    console.log("🔍 Deleted existing metadata");

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