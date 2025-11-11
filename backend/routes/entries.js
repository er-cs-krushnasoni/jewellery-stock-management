const express = require("express");
const router = express.Router();
const Entry = require("../models/Entry");
const { decryptData, encryptData } = require("../utils/encrypt");
const requireAuth = require("../middleware/requireAuth");

// Import updateMetadata function from metadata routes
const { updateMetadata } = require("./metadata");

// @route POST /api/entries
// @desc Add new entry (individual or bulk)
// @access Private
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, category, purity, weight, isBulk, itemCount, notes } = req.body;

    // DEBUG: Log incoming request data
    console.log("🔍 POST /api/entries - Incoming request:");
    console.log("Raw body:", req.body);
    console.log("Parsed fields:", { metalType, category, purity, weight, isBulk, itemCount, notes });

    // Validation
    if (
      !metalType ||
      !category ||
      typeof purity !== "number" ||
      typeof weight !== "number" ||
      isNaN(purity) ||
      isNaN(weight) ||
      weight <= 0 ||
      purity < 0 ||
      purity > 100
    ) {
      return res.status(400).json({ 
        error: "Invalid or missing fields. Weight must be > 0, purity must be 0-100%" 
      });
    }

    if (!["gold", "silver"].includes(metalType.toLowerCase())) {
      return res.status(400).json({ error: "Metal type must be 'gold' or 'silver'" });
    }

    if (isBulk && (!itemCount || itemCount <= 0)) {
      return res.status(400).json({ error: "Bulk entries must have itemCount > 0" });
    }

    // Validate notes field (optional, but if provided should be string)
    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      return res.status(400).json({ error: "Notes must be a string" });
    }

    const entryData = {
      metalType: metalType.toLowerCase(),
      category: category.trim(),
      purity: +purity,
      weight: +weight,
      isBulk: !!isBulk,
      itemCount: isBulk ? +itemCount : 1,
      notes: notes ? notes.trim() : null
    };

    // DEBUG: Log processed entry data
    console.log("🔍 Processed entryData:", entryData);

    // Encrypt with new format only
    const encryptedData = encryptData(entryData);
    console.log("🔐 Data encrypted with new format");

    // Handle bulk entry logic - update existing bulk entry if found
    if (isBulk) {
      console.log("🔍 Processing bulk entry...");
      const entries = await Entry.find({ userId });
      for (let e of entries) {
        try {
          const d = decryptData(e.data);
          console.log("🔍 Checking existing entry:", d);
          if (
            d.metalType === entryData.metalType &&
            d.category === entryData.category &&
            d.purity === entryData.purity &&
            d.isBulk
          ) {
            console.log("🔍 Found matching bulk entry, updating...");
            // Update existing bulk entry
            d.weight = +(d.weight + entryData.weight).toFixed(3);
            d.itemCount += entryData.itemCount;
            
            // Update notes for bulk entry - append new notes if provided
            if (entryData.notes) {
              if (d.notes) {
                d.notes = `${d.notes}; ${entryData.notes}`;
              } else {
                d.notes = entryData.notes;
              }
            }
            
            // Re-encrypt with new format
            e.data = encryptData(d);
            await e.save();
            
            console.log("🔍 Calling updateMetadata after bulk update...");
            await updateMetadata(userId);
            
            return res.json({ 
              message: "Bulk entry updated successfully",
              updated: true,
              totalWeight: d.weight,
              totalItems: d.itemCount
            });
          }
        } catch (decryptError) {
          console.error(`❌ Failed to decrypt entry ${e._id} during bulk check:`, decryptError);
          console.error("⚠️ Entry might be corrupted. Skipping...");
          continue;
        }
      }
    }

    console.log("🔍 Creating new entry...");
    // Create new entry
    const newEntry = await Entry.create({
      userId,
      createdAt: new Date(),
      data: encryptedData
    });

    console.log("🔍 New entry created with ID:", newEntry._id);
    console.log("🔍 Calling updateMetadata after new entry...");
    
    await updateMetadata(userId);
    
    res.status(201).json({ 
      message: "Entry created successfully",
      created: true,
      entryId: newEntry._id
    });
  } catch (err) {
    console.error("❌ Error creating entry:", err);
    res.status(500).json({ 
      error: "Server error while creating entry", 
      details: err.message 
    });
  }
});

// @route GET /api/entries
// @desc Get filtered entries
// @access Private
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, category, purity, minWeight, maxWeight, useGrossWeight = 'true', sortBy = 'createdAt' } = req.query;
    const entries = await Entry.find({ userId }).sort({ createdAt: -1 });
    
    let decrypted = [];
    let skippedCount = 0;
    
    // Decrypt entries (new format only)
    for (const e of entries) {
      try {
        const decryptedData = decryptData(e.data);
        decrypted.push({
          id: e._id,
          createdAt: e.createdAt,
          ...decryptedData
        });
      } catch (decryptError) {
        console.error(`❌ Failed to decrypt entry ${e._id}:`, decryptError);
        console.error("⚠️ Entry might be corrupted. Skipping...");
        skippedCount++;
        continue;
      }
    }

    if (skippedCount > 0) {
      console.warn(`⚠️ Skipped ${skippedCount} entries due to decryption errors`);
    }

    // Apply filters
    let filtered = decrypted;
    
    if (metalType) {
      filtered = filtered.filter((e) => e.metalType === metalType.toLowerCase());
    }
    
    if (category) {
      filtered = filtered.filter((e) => e.category === category);
    }
    
    if (purity) {
      filtered = filtered.filter((e) => e.purity === +purity);
    }

    if (minWeight) {
      filtered = filtered.filter((e) => {
        const weightToCheck = useGrossWeight === 'true' ? e.weight : (e.weight * e.purity / 100);
        return weightToCheck >= +minWeight;
      });
    }
    
    if (maxWeight) {
      filtered = filtered.filter((e) => {
        const weightToCheck = useGrossWeight === 'true' ? e.weight : (e.weight * e.purity / 100);
        return weightToCheck <= +maxWeight;
      });
    }

    // Sort results
    if (sortBy === 'weight') {
      filtered.sort((a, b) => {
        const pureWeightA = a.weight * a.purity / 100;
        const pureWeightB = b.weight * b.purity / 100;
        return pureWeightA - pureWeightB;
      });
    } else if (sortBy === 'purity') {
      filtered.sort((a, b) => b.purity - a.purity);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Separate bulk and individual entries
    const bulkEntries = filtered.filter(e => e.isBulk);
    const individualEntries = filtered.filter(e => !e.isBulk);

    res.json({
      entries: [...bulkEntries, ...individualEntries],
      totalCount: filtered.length,
      bulkCount: bulkEntries.length,
      individualCount: individualEntries.length,
      skippedCount: skippedCount
    });
  } catch (err) {
    console.error("❌ Error fetching entries:", err);
    res.status(500).json({ 
      error: "Error fetching entries", 
      details: err.message 
    });
  }
});

// @route PUT /api/entries/:id
// @desc Update an existing entry
// @access Private
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const entryId = req.params.id;
    const { weight, itemCount, purity, notes } = req.body;

    const entry = await Entry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    // Decrypt entry (new format only)
    let decryptedData;
    try {
      decryptedData = decryptData(entry.data);
    } catch (decryptError) {
      console.error(`❌ Failed to decrypt entry ${entryId}:`, decryptError);
      return res.status(500).json({ error: "Failed to decrypt entry data" });
    }
    
    // Update fields if provided
    if (weight !== undefined) {
      if (typeof weight !== 'number' || weight <= 0) {
        return res.status(400).json({ error: "Weight must be a positive number" });
      }
      decryptedData.weight = +weight;
    }

    if (itemCount !== undefined && decryptedData.isBulk) {
      if (typeof itemCount !== 'number' || itemCount <= 0) {
        return res.status(400).json({ error: "Item count must be a positive number" });
      }
      decryptedData.itemCount = +itemCount;
    }

    if (purity !== undefined) {
      if (typeof purity !== 'number' || purity < 0 || purity > 100) {
        return res.status(400).json({ error: "Purity must be between 0-100%" });
      }
      decryptedData.purity = +purity;
    }

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== 'string') {
        return res.status(400).json({ error: "Notes must be a string" });
      }
      decryptedData.notes = notes ? notes.trim() : null;
    }

    // Re-encrypt with new format and save
    entry.data = encryptData(decryptedData);
    await entry.save();
    await updateMetadata(userId);

    res.json({ 
      message: "Entry updated successfully",
      updated: true 
    });
  } catch (err) {
    console.error("❌ Error updating entry:", err);
    res.status(500).json({ 
      error: "Error updating entry", 
      details: err.message 
    });
  }
});

// @route DELETE /api/entries/:id
// @desc Delete an entry
// @access Private
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const entryId = req.params.id;
    
    const entry = await Entry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    await Entry.deleteOne({ _id: entryId });
    await updateMetadata(userId);
    
    res.json({ 
      message: "Entry deleted successfully",
      deleted: true 
    });
  } catch (err) {
    console.error("❌ Error deleting entry:", err);
    res.status(500).json({ 
      error: "Error deleting entry", 
      details: err.message 
    });
  }
});

// @route POST /api/entries/remove-item
// @desc Remove single item (from bulk or delete individual entry)
// @access Private
router.post("/remove-item", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, category, purity, weight } = req.body;

    if (!metalType || !category || typeof purity !== 'number' || typeof weight !== 'number') {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const entries = await Entry.find({ userId });
    let removed = false;

    // First, try to find and remove a matching individual entry
    for (let entry of entries) {
      try {
        const data = decryptData(entry.data);
        if (
          data.metalType === metalType.toLowerCase() &&
          data.category === category &&
          data.purity === purity &&
          !data.isBulk &&
          Math.abs(data.weight - weight) < 0.001
        ) {
          await Entry.deleteOne({ _id: entry._id });
          removed = true;
          break;
        }
      } catch (decryptError) {
        console.error(`❌ Failed to decrypt entry ${entry._id} during removal:`, decryptError);
        continue;
      }
    }

    // If no individual entry found, try to deduct from bulk
    if (!removed) {
      for (let entry of entries) {
        try {
          const data = decryptData(entry.data);
          if (
            data.metalType === metalType.toLowerCase() &&
            data.category === category &&
            data.purity === purity &&
            data.isBulk
          ) {
            if (data.weight < weight || data.itemCount <= 0) {
              return res.status(400).json({ 
                error: "Insufficient quantity in bulk entry",
                available: `${data.weight}g (${data.itemCount} items)`
              });
            }

            data.weight = +(data.weight - weight).toFixed(3);
            data.itemCount -= 1;

            // If bulk entry becomes empty, delete it
            if (data.itemCount <= 0 || data.weight <= 0) {
              await Entry.deleteOne({ _id: entry._id });
            } else {
              entry.data = encryptData(data);
              await entry.save();
            }
            removed = true;
            break;
          }
        } catch (decryptError) {
          console.error(`❌ Failed to decrypt entry ${entry._id} during bulk removal:`, decryptError);
          continue;
        }
      }
    }

    if (!removed) {
      return res.status(404).json({ 
        error: "No matching entry found to remove",
        searched: { metalType, category, purity, weight }
      });
    }

    await updateMetadata(userId);
    res.json({ 
      message: "Item removed successfully",
      removed: true 
    });
  } catch (err) {
    console.error("❌ Error removing item:", err);
    res.status(500).json({ 
      error: "Error removing item", 
      details: err.message 
    });
  }
});

module.exports = router;