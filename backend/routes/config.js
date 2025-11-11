const express = require("express");
const router = express.Router();
const Entry = require("../models/Entry");
const Metadata = require("../models/Metadata");
const { decryptData, encryptData } = require("../utils/encrypt");
const requireAuth = require("../middleware/requireAuth");
// Import updateMetadata function from metadata routes
let updateMetadata;
try {
  ({ updateMetadata } = require("./metadata"));
} catch (err) {
  console.error("❌ Failed to import updateMetadata:", err.message);
  // Fallback function
  updateMetadata = async (userId) => {
    console.warn("⚠️ updateMetadata not available, skipping metadata update");
  };
}
// Helper function to get decrypted metadata
const getDecryptedMetadata = async (userId) => {
  try {
    const metadata = await Metadata.findOne({ userId });
    if (!metadata || !metadata.data) {
      return {
        categoryTotals: {},
        totalGoldGross: 0,
        totalGoldPure: 0,
        totalSilverGross: 0,
        totalSilverPure: 0
      };
    }
    
    return decryptData(metadata.data);
  } catch (err) {
    console.error("Error decrypting metadata:", err);
    return {
      categoryTotals: {},
      totalGoldGross: 0,
      totalGoldPure: 0,
      totalSilverGross: 0,
      totalSilverPure: 0
    };
  }
};

// Helper function to save encrypted metadata
const saveEncryptedMetadata = async (userId, metadataObj) => {
  try {
    const encryptedData = encryptData(metadataObj);
    
    // Use findOneAndUpdate with proper options
    const result = await Metadata.findOneAndUpdate(
      { userId },
      { 
        data: encryptedData,
        lastUpdated: new Date()
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );
    
    console.log("💾 Metadata save result:", result ? "SUCCESS" : "FAILED");
    return !!result;
  } catch (err) {
    console.error("Error saving encrypted metadata:", err);
    return false;
  }
};

// @route GET /api/config/categories/:metal
// @desc Get all categories for a metal type
// @access Private
router.get("/categories/:metal", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metal } = req.params;
    
    if (!["gold", "silver"].includes(metal.toLowerCase())) {
      return res.status(400).json({ error: "Metal type must be 'gold' or 'silver'" });
    }

    const metadataObj = await getDecryptedMetadata(userId);
    
    if (!metadataObj.categoryTotals) {
      return res.json({ metalType: metal.toLowerCase(), categories: [] });
    }

    // Extract categories for the specified metal
    const categories = [];
    for (let categoryKey in metadataObj.categoryTotals) {
      const categoryData = metadataObj.categoryTotals[categoryKey];
      if (categoryData.metal === metal.toLowerCase()) {
        categories.push({
          key: categoryKey,
          name: categoryData.categoryName,
          grossWeight: categoryData.grossWeight,
          pureWeight: categoryData.pureWeight,
          totalItems: categoryData.totalItems,
          purityCount: Object.keys(categoryData.purities || {}).length
        });
      }
    }

    res.json({ 
      metalType: metal.toLowerCase(), 
      categories: categories.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Server error while fetching categories" });
  }
});

// @route GET /api/config/purities/:metal/:category
// @desc Get all purities for a specific category
// @access Private
router.get("/purities/:metal/:category", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metal, category } = req.params;
    
    if (!["gold", "silver"].includes(metal.toLowerCase())) {
      return res.status(400).json({ error: "Metal type must be 'gold' or 'silver'" });
    }

    const categoryKey = `${category}_${metal.toLowerCase()}`;
    const metadataObj = await getDecryptedMetadata(userId);
    
    if (!metadataObj.categoryTotals || !metadataObj.categoryTotals[categoryKey]) {
      return res.json({ 
        metalType: metal.toLowerCase(), 
        categoryName: category,
        purities: [] 
      });
    }

    const categoryData = metadataObj.categoryTotals[categoryKey];
    const purities = [];
    
    for (let purityKey in categoryData.purities || {}) {
      const purityData = categoryData.purities[purityKey];
      purities.push({
        purity: parseFloat(purityKey),
        grossWeight: purityData.grossWeight,
        pureWeight: purityData.pureWeight,
        totalItems: purityData.totalItems
      });
    }

    res.json({ 
      metalType: metal.toLowerCase(),
      categoryName: category,
      purities: purities.sort((a, b) => b.purity - a.purity) // Sort by purity descending
    });
  } catch (err) {
    console.error("Error fetching purities:", err);
    res.status(500).json({ error: "Server error while fetching purities" });
  }
});

// @route GET /api/config/structure/:metal
// @desc Get complete category-purity structure for a metal
// @access Private
router.get("/structure/:metal", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metal } = req.params;
    
    if (!["gold", "silver"].includes(metal.toLowerCase())) {
      return res.status(400).json({ error: "Metal type must be 'gold' or 'silver'" });
    }

    const metadataObj = await getDecryptedMetadata(userId);
    
    if (!metadataObj.categoryTotals) {
      return res.json({ metalType: metal.toLowerCase(), structure: {} });
    }

    const structure = {};
    for (let categoryKey in metadataObj.categoryTotals) {
      const categoryData = metadataObj.categoryTotals[categoryKey];
      if (categoryData.metal === metal.toLowerCase()) {
        const categoryName = categoryData.categoryName;
        structure[categoryName] = [];
        
        for (let purityKey in categoryData.purities || {}) {
          structure[categoryName].push(parseFloat(purityKey));
        }
        
        // Sort purities in descending order
        structure[categoryName].sort((a, b) => b - a);
      }
    }

    res.json({ 
      metalType: metal.toLowerCase(), 
      structure 
    });
  } catch (err) {
    console.error("Error fetching structure:", err);
    res.status(500).json({ error: "Server error while fetching structure" });
  }
});

// @route DELETE /api/config/categories
// @desc Delete a category and all its entries
// @access Private
router.delete("/categories", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, categoryName } = req.body;

    console.log("🗑️ DELETE CATEGORY - Request received:");
    console.log("  userId:", userId);
    console.log("  metalType:", metalType);
    console.log("  categoryName:", categoryName);

    if (!metalType || !categoryName) {
      return res.status(400).json({ error: "Metal type and category name are required" });
    }

    const categoryKey = `${categoryName}_${metalType.toLowerCase()}`;
    console.log("🔑 Category key to delete:", categoryKey);
    
    const metadataObj = await getDecryptedMetadata(userId);
    
    if (!metadataObj.categoryTotals || !metadataObj.categoryTotals[categoryKey]) {
      console.log("❌ Category not found:", categoryKey);
      return res.status(404).json({ error: "Category not found" });
    }

    console.log("🔍 Found category, proceeding with deletion");

    // Delete all entries for this category
    const entries = await Entry.find({ userId });
    const entriesToDelete = [];
    
    for (let entry of entries) {
      const data = decryptData(entry.data);
      if (data.metalType === metalType.toLowerCase() && data.category === categoryName) {
        entriesToDelete.push(entry._id);
      }
    }

    console.log("📝 Entries to delete:", entriesToDelete.length);

    if (entriesToDelete.length > 0) {
      await Entry.deleteMany({ _id: { $in: entriesToDelete } });
      console.log("✅ Deleted entries");
    }

    // Remove category from metadata
    delete metadataObj.categoryTotals[categoryKey];
    
    // Save encrypted metadata
    const saved = await saveEncryptedMetadata(userId, metadataObj);
    if (!saved) {
      return res.status(500).json({ error: "Failed to save metadata changes" });
    }
    console.log("✅ Metadata updated");

    // Only rebuild metadata if there were actual entries deleted
    if (entriesToDelete.length > 0) {
      await updateMetadata(userId);
    }

    res.json({ 
      message: "Category and all its entries deleted successfully",
      deletedEntries: entriesToDelete.length
    });
  } catch (err) {
    console.error("❌ Error deleting category:", err);
    res.status(500).json({ error: "Server error while deleting category" });
  }
});

// @route POST /api/config/categories/rename
// @desc Rename a category
// @access Private
router.post("/categories/rename", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, oldName, newName } = req.body;

    console.log("✏️ RENAME CATEGORY - Request received:");
    console.log("  userId:", userId);
    console.log("  metalType:", metalType);
    console.log("  oldName:", oldName);
    console.log("  newName:", newName);

    if (!metalType || !oldName || !newName) {
      return res.status(400).json({ error: "Metal type, old name, and new name are required" });
    }

    if (!["gold", "silver"].includes(metalType.toLowerCase())) {
      return res.status(400).json({ error: "Metal type must be 'gold' or 'silver'" });
    }

    const trimmedOldName = oldName.trim();
    const trimmedNewName = newName.trim();
    
    if (trimmedNewName.length === 0) {
      return res.status(400).json({ error: "New category name cannot be empty" });
    }

    if (trimmedOldName === trimmedNewName) {
      return res.status(400).json({ error: "New category name must be different from old name" });
    }

    const oldCategoryKey = `${trimmedOldName}_${metalType.toLowerCase()}`;
    const newCategoryKey = `${trimmedNewName}_${metalType.toLowerCase()}`;
    
    console.log("🔑 Old category key:", oldCategoryKey);
    console.log("🔑 New category key:", newCategoryKey);
    
    const metadataObj = await getDecryptedMetadata(userId);
    
    if (!metadataObj.categoryTotals || !metadataObj.categoryTotals[oldCategoryKey]) {
      console.log("❌ Old category not found");
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if new category name already exists (unless it's the same key)
    if (oldCategoryKey !== newCategoryKey && metadataObj.categoryTotals[newCategoryKey]) {
      console.log("❌ New category name already exists");
      return res.status(400).json({ error: "Category with this name already exists" });
    }

    console.log("🔍 Updating entries...");
    // Update all entries with the old category name
    const entries = await Entry.find({ userId });
    let updatedEntries = 0;
    
    for (let entry of entries) {
      const data = decryptData(entry.data);
      if (data.metalType === metalType.toLowerCase() && data.category === trimmedOldName) {
        data.category = trimmedNewName;
        const newEncryptedData = encryptData(data);
        
        // Update the entry
        await Entry.findByIdAndUpdate(entry._id, { data: newEncryptedData });
        updatedEntries++;
      }
    }
    console.log("✅ Updated", updatedEntries, "entries");

    // Rebuild metadata from entries to ensure consistency
    console.log("🔄 Rebuilding metadata...");
    await updateMetadata(userId);

    // Verify the update worked
    const verifyMetadata = await getDecryptedMetadata(userId);
    const newCategoryExists = !!verifyMetadata.categoryTotals[newCategoryKey];
    const oldCategoryExists = !!verifyMetadata.categoryTotals[oldCategoryKey];

    console.log("🔍 Verification results:", {
      newCategoryExists,
      oldCategoryRemoved: !oldCategoryExists,
      updatedEntries
    });

    if (!newCategoryExists) {
      console.error("❌ New category verification failed");
      return res.status(500).json({ error: "Failed to verify category rename" });
    }

    res.json({ 
      message: "Category renamed successfully",
      oldName: trimmedOldName,
      newName: trimmedNewName,
      updatedEntries,
      recalculated: true,
      verification: {
        newCategoryExists,
        oldCategoryRemoved: !oldCategoryExists
      }
    });
  } catch (err) {
    console.error("❌ Error renaming category:", err);
    res.status(500).json({ error: "Server error while renaming category" });
  }
});


// @route POST /api/config/purities/update
// @desc Update purity value (rename purity)
// @access Private
router.post("/purities/update", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, categoryName, oldPurity, newPurity } = req.body;

    console.log("🔄 UPDATE PURITY - Request received:", {
      userId, metalType, categoryName, oldPurity, newPurity
    });

    if (!metalType || !categoryName || typeof oldPurity !== 'number' || typeof newPurity !== 'number') {
      return res.status(400).json({ error: "All fields are required and purities must be numbers" });
    }

    if (newPurity < 0 || newPurity > 100) {
      return res.status(400).json({ error: "New purity must be between 0-100%" });
    }

    if (oldPurity === newPurity) {
      return res.status(400).json({ error: "New purity must be different from old purity" });
    }

    // Check if new purity already exists in this category
    const entries = await Entry.find({ userId });
    let newPurityExists = false;
    
    for (let entry of entries) {
      const data = decryptData(entry.data);
      if (data.metalType === metalType.toLowerCase() && 
          data.category === categoryName && 
          data.purity === newPurity) {
        newPurityExists = true;
        break;
      }
    }

    if (newPurityExists) {
      return res.status(400).json({ error: "New purity level already exists in this category" });
    }

    // Update all entries with the old purity
    let updatedEntries = 0;
    
    for (let entry of entries) {
      const data = decryptData(entry.data);
      if (data.metalType === metalType.toLowerCase() && 
          data.category === categoryName && 
          data.purity === oldPurity) {
        
        // Update purity in the entry data
        data.purity = newPurity;
        
        // Recalculate pure weight with new purity
        const newPureWeight = +(data.weight * (newPurity / 100)).toFixed(3);
        data.pureWeight = newPureWeight;
        
        const newEncryptedData = encryptData(data);
        
        // Update the entry in database
        await Entry.findByIdAndUpdate(entry._id, { data: newEncryptedData });
        updatedEntries++;
        
        console.log(`✅ Updated entry ${entry._id}: ${data.weight}g @ ${oldPurity}% → ${newPurity}% (pure: ${newPureWeight}g)`);
      }
    }

    console.log(`✅ Updated ${updatedEntries} entries with new purity`);

    // Rebuild metadata from entries to recalculate all totals
    console.log("🔄 Rebuilding metadata with recalculated values...");
    await updateMetadata(userId);
    
    // Verify the update worked by checking metadata
    const verifyMetadata = await getDecryptedMetadata(userId);
    const categoryKey = `${categoryName}_${metalType.toLowerCase()}`;
    const newPurityKey = newPurity.toString();
    const oldPurityKey = oldPurity.toString();
    
    const categoryExists = !!verifyMetadata.categoryTotals[categoryKey];
    const newPurityExists_verify = !!verifyMetadata.categoryTotals[categoryKey]?.purities[newPurityKey];
    const oldPurityExists_verify = !!verifyMetadata.categoryTotals[categoryKey]?.purities[oldPurityKey];

    console.log("🔍 Verification results:", {
      categoryExists,
      newPurityExists: newPurityExists_verify,
      oldPurityExists: oldPurityExists_verify,
      updatedEntries
    });

    res.json({ 
      message: "Purity updated successfully with recalculated totals",
      oldPurity,
      newPurity,
      updatedEntries,
      recalculated: true,
      verification: {
        categoryExists,
        newPurityExists: newPurityExists_verify,
        oldPurityRemoved: !oldPurityExists_verify
      }
    });
  } catch (err) {
    console.error("❌ Error updating purity:", err);
    res.status(500).json({ error: "Server error while updating purity" });
  }
});

// @route DELETE /api/config/purities
// @desc Delete all entries with specific purity
// @access Private
router.delete("/purities", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, categoryName, purity } = req.body;

    console.log("🗑️ DELETE PURITY - Request received:", {
      userId, metalType, categoryName, purity
    });

    if (!metalType || !categoryName || typeof purity !== 'number') {
      return res.status(400).json({ error: "Metal type, category name, and purity are required" });
    }

    const categoryKey = `${categoryName}_${metalType.toLowerCase()}`;
    const purityKey = purity.toString();
    
    console.log("🔑 Keys:", { categoryKey, purityKey });
    
    const metadataObj = await getDecryptedMetadata(userId);
    
    if (!metadataObj.categoryTotals || !metadataObj.categoryTotals[categoryKey]) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Initialize purities object if it doesn't exist
    if (!metadataObj.categoryTotals[categoryKey].purities) {
      metadataObj.categoryTotals[categoryKey].purities = {};
    }

    if (!metadataObj.categoryTotals[categoryKey].purities[purityKey]) {
      return res.status(404).json({ error: "Purity level not found" });
    }

    console.log("🔍 Found purity, proceeding with deletion");

    // Delete all entries for this purity level
    const entries = await Entry.find({ userId });
    const entriesToDelete = [];
    
    for (let entry of entries) {
      const data = decryptData(entry.data);
      if (data.metalType === metalType.toLowerCase() && 
          data.category === categoryName && 
          data.purity === purity) {
        entriesToDelete.push(entry._id);
      }
    }

    console.log("📝 Entries to delete:", entriesToDelete.length);

    if (entriesToDelete.length > 0) {
      await Entry.deleteMany({ _id: { $in: entriesToDelete } });
      console.log("✅ Deleted entries");
    }

    // Remove purity from metadata
    delete metadataObj.categoryTotals[categoryKey].purities[purityKey];
    
    // Save encrypted metadata
    const saved = await saveEncryptedMetadata(userId, metadataObj);
    if (!saved) {
      return res.status(500).json({ error: "Failed to save metadata changes" });
    }
    console.log("✅ Metadata updated");

    // Only rebuild metadata if there were actual entries deleted
    if (entriesToDelete.length > 0) {
      await updateMetadata(userId);
    }

    res.json({ 
      message: "Purity level and all its entries deleted successfully",
      deletedEntries: entriesToDelete.length
    });
  } catch (err) {
    console.error("❌ Error deleting purity:", err);
    res.status(500).json({ error: "Server error while deleting purity" });
  }
});

// @route POST /api/config/categories
// @desc Create a new empty category 
// @access Private
router.post("/categories", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, categoryName } = req.body;

    console.log("🚀 CREATE CATEGORY - Request received:");
    console.log("  userId:", userId);
    console.log("  metalType:", metalType);
    console.log("  categoryName:", categoryName);

    if (!metalType || !categoryName) {
      return res.status(400).json({ error: "Metal type and category name are required" });
    }

    if (!["gold", "silver"].includes(metalType.toLowerCase())) {
      return res.status(400).json({ error: "Metal type must be 'gold' or 'silver'" });
    }

    const trimmedCategoryName = categoryName.trim();
    if (trimmedCategoryName.length === 0) {
      return res.status(400).json({ error: "Category name cannot be empty" });
    }

    const categoryKey = `${trimmedCategoryName}_${metalType.toLowerCase()}`;
    console.log("📝 Generated category key:", categoryKey);
    
    // Get current metadata
    const metadataObj = await getDecryptedMetadata(userId);
    console.log("📊 Current metadata loaded");
    
    // Initialize categoryTotals if it doesn't exist
    if (!metadataObj.categoryTotals) {
      metadataObj.categoryTotals = {};
    }

    // Check if category already exists
    if (metadataObj.categoryTotals[categoryKey]) {
      console.log("❌ Category already exists:", categoryKey);
      return res.status(400).json({ error: "Category already exists" });
    }

    console.log("✅ Creating new category structure");
    // Create empty category structure
    metadataObj.categoryTotals[categoryKey] = {
      categoryName: trimmedCategoryName,
      metal: metalType.toLowerCase(),
      grossWeight: 0,
      pureWeight: 0,
      totalItems: 0,
      purities: {}
    };

    console.log("💾 Saving encrypted metadata to database...");
    
    // Save encrypted metadata
    const saved = await saveEncryptedMetadata(userId, metadataObj);
    if (!saved) {
      return res.status(500).json({ error: "Failed to save category to database" });
    }
    console.log("✅ Metadata saved successfully");

    // Verify the save by fetching it back from database
    const verifyMetadata = await getDecryptedMetadata(userId);
    console.log("🔍 Verification - Category exists in DB:", !!verifyMetadata.categoryTotals[categoryKey]);

    if (!verifyMetadata.categoryTotals[categoryKey]) {
      console.error("❌ CRITICAL: Category was not saved to database!");
      return res.status(500).json({ error: "Failed to save category to database" });
    }

    res.json({ 
      message: "Category created successfully",
      categoryName: trimmedCategoryName,
      metalType: metalType.toLowerCase(),
      categoryKey: categoryKey,
      verification: !!verifyMetadata.categoryTotals[categoryKey]
    });
  } catch (err) {
    console.error("❌ Error creating category:", err);
    res.status(500).json({ error: "Server error while creating category" });
  }
});

// @route POST /api/config/purities
// @desc Create a new empty purity level
// @access Private
router.post("/purities", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { metalType, category, purity } = req.body;

    console.log("🚀 CREATE PURITY - Request received:", {
      userId, metalType, category, purity
    });

    if (!metalType || !category || typeof purity !== 'number') {
      return res.status(400).json({ error: "Metal type, category, and purity are required" });
    }

    if (!["gold", "silver"].includes(metalType.toLowerCase())) {
      return res.status(400).json({ error: "Metal type must be 'gold' or 'silver'" });
    }

    if (purity < 0 || purity > 100) {
      return res.status(400).json({ error: "Purity must be between 0-100%" });
    }

    const categoryKey = `${category}_${metalType.toLowerCase()}`;
    const purityKey = purity.toString();
    
    console.log("📝 Generated keys:", { categoryKey, purityKey });
    
    // Get current metadata
    const metadataObj = await getDecryptedMetadata(userId);
    console.log("📊 Current metadata loaded");
    
    // Initialize categoryTotals if it doesn't exist
    if (!metadataObj.categoryTotals) {
      metadataObj.categoryTotals = {};
    }

    // Check if category exists, if not create it
    if (!metadataObj.categoryTotals[categoryKey]) {
      console.log("🆕 Creating new category:", categoryKey);
      metadataObj.categoryTotals[categoryKey] = {
        categoryName: category,
        metal: metalType.toLowerCase(),
        grossWeight: 0,
        pureWeight: 0,
        totalItems: 0,
        purities: {}
      };
    }

    // Initialize purities object if it doesn't exist
    if (!metadataObj.categoryTotals[categoryKey].purities) {
      console.log("🔧 Initializing purities object");
      metadataObj.categoryTotals[categoryKey].purities = {};
    }

    // Check if purity already exists
    if (metadataObj.categoryTotals[categoryKey].purities[purityKey]) {
      console.log("❌ Purity already exists:", purityKey);
      return res.status(400).json({ error: "Purity level already exists" });
    }

    console.log("✅ Creating new purity structure");
    // Create empty purity structure
    metadataObj.categoryTotals[categoryKey].purities[purityKey] = {
      grossWeight: 0,
      pureWeight: 0,
      totalItems: 0
    };

    console.log("💾 Saving encrypted metadata to database...");
    
    // Save encrypted metadata
    const saved = await saveEncryptedMetadata(userId, metadataObj);
    if (!saved) {
      return res.status(500).json({ error: "Failed to save purity to database" });
    }
    console.log("✅ Metadata saved successfully");

    // Verify the save by fetching it back from database
    const verifyMetadata = await getDecryptedMetadata(userId);
    const purityExists = !!verifyMetadata.categoryTotals[categoryKey]?.purities[purityKey];
    console.log("🔍 Verification - Purity exists in DB:", purityExists);

    if (!purityExists) {
      console.error("❌ CRITICAL: Purity was not saved to database!");
      return res.status(500).json({ error: "Failed to save purity to database" });
    }

    res.json({ 
      message: "Purity level created successfully",
      metalType: metalType.toLowerCase(),
      category: category,
      purity: purity,
      verification: purityExists
    });
  } catch (err) {
    console.error("❌ Error creating purity:", err);
    res.status(500).json({ error: "Server error while creating purity" });
  }
});

module.exports = router;