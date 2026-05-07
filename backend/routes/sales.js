const express = require("express");
const router = express.Router();
const Sales = require("../models/Sales");
const Entry = require("../models/Entry");
const requireAuth = require("../middleware/requireAuth");
const { decryptData, encryptData } = require("../utils/encrypt");
const { updateMetadata } = require("./metadata");

router.use(requireAuth);

// ─── Helpers ────────────────────────────────────────────────────────────────

const decryptSalesData = (sale) => {
  try {
    const decryptedData = decryptData(sale.data);
    return {
      _id: sale._id,
      userId: sale.userId,
      soldAt: sale.soldAt,
      originalEntryId: sale.originalEntryId,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      ...decryptedData,
      encryptedData: sale.data
    };
  } catch (error) {
    throw new Error(`Failed to decrypt sales data for sale ${sale._id}: ${error.message}`);
  }
};

const findMatchingEntries = async (userId, metalType, category, purity) => {
  const entries = await Entry.find({ userId });
  const individualEntries = [];
  const bulkEntries = [];

  for (const entry of entries) {
    try {
      const data = decryptData(entry.data);
      if (
        data.metalType === metalType &&
        data.category === category &&
        data.purity === purity
      ) {
        if (data.isBulk) bulkEntries.push({ entry, data });
        else individualEntries.push({ entry, data });
      }
    } catch (error) {
      console.error("Error parsing entry:", error);
    }
  }
  return { individualEntries, bulkEntries };
};

// ─── Return weight difference back to inventory ───────────────────────────────
// sourceType: "single" | "bulk" | undefined (old sales treated as bulk)
// For "single": restore the FULL old weight as a new single entry,
//               then deduct new weight by single-first-then-bulk rule.
// For "bulk" (or legacy): add the weight DIFFERENCE back to bulk entry.

const returnWeightToInventory = async (userId, sourceType, metalType, category, purity, weight) => {
  const isSingleSource = sourceType === "single";

  if (isSingleSource) {
    // Restore the whole original weight as a new single entry
    const restoredEntry = {
      metalType,
      category,
      purity,
      weight,
      isBulk: false,
      itemCount: 1,
      notes: null
    };
    const encryptedData = encryptData(restoredEntry);
    const newEntry = new Entry({ userId, data: encryptedData });
    await newEntry.save();
  } else {
    // Bulk source — find matching bulk entry and add weight back
    const entries = await Entry.find({ userId });
    let foundBulk = false;

    for (const entry of entries) {
      try {
        const data = decryptData(entry.data);
        if (
          data.metalType === metalType &&
          data.category === category &&
          data.purity === purity &&
          data.isBulk
        ) {
          data.weight = +(data.weight + weight).toFixed(3);
          data.itemCount += 1;
          entry.data = encryptData(data);
          await entry.save();
          foundBulk = true;
          break;
        }
      } catch (err) {
        console.error("Error during bulk return:", err);
      }
    }

    if (!foundBulk) {
      // No bulk entry exists — create one
      const newBulkEntry = {
        metalType,
        category,
        purity,
        weight,
        isBulk: true,
        itemCount: 1,
        notes: null
      };
      const encryptedData = encryptData(newBulkEntry);
      const newEntry = new Entry({ userId, data: encryptedData });
      await newEntry.save();
    }
  }
};

// ─── Deduct weight from inventory (single-first-then-bulk rule) ───────────────
// Returns { sourceType: "single"|"bulk" } so we can store it on the sale.

const deductFromInventory = async (userId, metalType, category, purity, weight, forceBulk = false) => {
  const { individualEntries, bulkEntries } = await findMatchingEntries(userId, metalType, category, purity);

  if (!forceBulk) {
    // Try exact match in single entries first
    const exactMatch = individualEntries.find(({ data }) => Math.abs(data.weight - weight) < 0.001);
    if (exactMatch) {
      await Entry.findByIdAndDelete(exactMatch.entry._id);
      return { sourceType: "single" };
    }
  }

  // Try bulk entry
  const bulkEntry = bulkEntries.find(({ data }) => data.weight >= weight && data.itemCount >= 1);
  if (bulkEntry) {
    bulkEntry.data.weight = +(bulkEntry.data.weight - weight).toFixed(3);
    bulkEntry.data.itemCount -= 1;

    if (bulkEntry.data.weight <= 0 || bulkEntry.data.itemCount <= 0) {
      await Entry.findByIdAndDelete(bulkEntry.entry._id);
    } else {
      bulkEntry.entry.data = encryptData(bulkEntry.data);
      await bulkEntry.entry.save();
    }
    return { sourceType: "bulk" };
  }

  return null; // Not enough stock
};

// ─── GET /api/sales/count-range ───────────────────────────────────────────────
router.get("/count-range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate)
      return res.status(400).json({ message: "Start date and end date are required" });

    const count = await Sales.countDocuments({
      userId: req.userId,
      soldAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    res.json({ count });
  } catch (error) {
    console.error("Error counting sales in range:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── DELETE /api/sales/range ──────────────────────────────────────────────────
router.delete("/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate)
      return res.status(400).json({ message: "Start date and end date are required" });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()))
      return res.status(400).json({ message: "Invalid date format" });
    if (start > end)
      return res.status(400).json({ message: "Start date cannot be after end date" });

    const filter = { userId: req.userId, soldAt: { $gte: start, $lte: end } };
    const count = await Sales.countDocuments(filter);
    if (count === 0)
      return res.status(404).json({ message: "No sales found in the selected date range" });

    const result = await Sales.deleteMany(filter);
    res.json({ message: `Successfully deleted ${result.deletedCount} sales`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Error deleting sales range:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── POST /api/sales ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      metalType, category, purity, weight, salesPrice,
      isBulk, itemCount, customerName, customerAddress,
      customerMobile, description, soldAt
    } = req.body;

    if (!metalType || !category || !purity || !weight || !salesPrice)
      return res.status(400).json({ message: "Required fields missing: metalType, category, purity, weight, salesPrice" });

    const normalizedMetalType = metalType.toLowerCase();
    if (!['gold', 'silver'].includes(normalizedMetalType))
      return res.status(400).json({ message: "Metal type must be 'gold' or 'silver'" });

    if (isBulk && (!itemCount || itemCount <= 0))
      return res.status(400).json({ message: "Item count is required for bulk sales" });

    // Validate manual date
    let finalSoldAt = undefined;
    if (soldAt) {
      const providedDate = new Date(soldAt);
      if (isNaN(providedDate.getTime()))
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD format" });
      if (providedDate > new Date())
        return res.status(400).json({ message: "Sale date cannot be in the future" });

      const now = new Date();
      finalSoldAt = new Date(
        providedDate.getFullYear(), providedDate.getMonth(), providedDate.getDate(),
        now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()
      );
    }

    // Deduct from inventory
    const deductResult = await deductFromInventory(
      req.userId, normalizedMetalType, category, parseFloat(purity),
      parseFloat(weight), !!isBulk
    );

    if (!deductResult) {
      return res.status(400).json({
        message: isBulk
          ? "No bulk entry found with sufficient quantity"
          : "No matching entry found - no exact weight match or bulk entry with sufficient quantity"
      });
    }

    // Store sale with sourceType
    const salesData = {
      metalType: normalizedMetalType,
      category,
      purity: parseFloat(purity),
      weight: parseFloat(weight),
      isBulk: !!isBulk,
      itemCount: isBulk ? parseInt(itemCount) : undefined,
      salesPrice: parseFloat(salesPrice),
      customerName: customerName || '',
      customerAddress: customerAddress || '',
      customerMobile: customerMobile || '',
      description: description || '',
      sourceType: deductResult.sourceType  // "single" or "bulk"
    };

    const sale = new Sales({
      userId: req.userId,
      data: encryptData(salesData),
      ...(finalSoldAt && { soldAt: finalSoldAt })
    });
    await sale.save();

    await updateMetadata(req.userId);

    const decryptedSale = decryptSalesData(sale.toObject());
    delete decryptedSale.encryptedData;
    res.status(201).json({ message: "Sale created successfully", sale: decryptedSale });

  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// ─── GET /api/sales ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      startDate, endDate, metalType, category, purity,
      minPrice, maxPrice, customerName, customerAddress
    } = req.query;

    const filter = { userId: req.userId };
    if (startDate || endDate) {
      filter.soldAt = {};
      if (startDate) filter.soldAt.$gte = new Date(startDate);
      if (endDate) filter.soldAt.$lte = new Date(endDate);
    }

    const sales = await Sales.find(filter).sort({ soldAt: -1 }).lean();
    const decryptedSales = [];

    for (const sale of sales) {
      try {
        const decryptedSale = decryptSalesData(sale);
        let include = true;

        if (metalType && decryptedSale.metalType !== metalType.toLowerCase()) include = false;
        if (category && decryptedSale.category !== category) include = false;
        if (purity && decryptedSale.purity !== parseInt(purity)) include = false;
        if (minPrice && decryptedSale.salesPrice < parseFloat(minPrice)) include = false;
        if (maxPrice && decryptedSale.salesPrice > parseFloat(maxPrice)) include = false;
        if (customerName && !decryptedSale.customerName?.toLowerCase().includes(customerName.toLowerCase())) include = false;
        if (customerAddress && !decryptedSale.customerAddress?.toLowerCase().includes(customerAddress.toLowerCase())) include = false;

        if (include) {
          delete decryptedSale.encryptedData;
          decryptedSales.push(decryptedSale);
        }
      } catch (error) {
        console.error("Error decrypting sale:", error);
      }
    }

    res.json({ sales: decryptedSales });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// ─── GET /api/sales/customers/search ─────────────────────────────────────────
router.get("/customers/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") return res.json({ customers: [] });

    const searchTerm = q.trim().toLowerCase();
    const sales = await Sales.find({ userId: req.userId }).sort({ soldAt: -1 }).lean();
    const matchingSales = [];

    for (const sale of sales) {
      try {
        const decryptedSale = decryptSalesData(sale);
        const name = (decryptedSale.customerName || '').toLowerCase();
        const address = (decryptedSale.customerAddress || '').toLowerCase();
        if (name.includes(searchTerm) || address.includes(searchTerm))
          matchingSales.push(decryptedSale);
      } catch (error) {
        console.error("Error decrypting sale for customer search:", error);
      }
    }

    const customerMap = new Map();
    matchingSales.forEach(sale => {
      const key = `${sale.customerName || ''}-${sale.customerAddress || ''}`;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerName: sale.customerName || '',
          customerAddress: sale.customerAddress || '',
          customerMobile: sale.customerMobile || '',
          purchases: [], totalPurchases: 0, totalValue: 0
        });
      }
      const customer = customerMap.get(key);
      customer.purchases.push({
        saleId: sale._id, metalType: sale.metalType, category: sale.category,
        purity: sale.purity, weight: sale.weight, salesPrice: sale.salesPrice,
        soldAt: sale.soldAt, isBulk: sale.isBulk, itemCount: sale.itemCount
      });
      customer.totalPurchases += 1;
      customer.totalValue += sale.salesPrice;
    });

    res.json({ customers: Array.from(customerMap.values()) });
  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// ─── PUT /api/sales/:id ───────────────────────────────────────────────────────
// Full edit: inventory is rebalanced, date is editable
router.put("/:id", async (req, res) => {
  try {
    const {
      metalType, category, purity, weight, salesPrice,
      isBulk, itemCount, customerName, customerAddress,
      customerMobile, description, soldAt
    } = req.body;

    // Validation
    if (!metalType || !category || !purity || !weight || !salesPrice)
      return res.status(400).json({ message: "metalType, category, purity, weight, and salesPrice are required" });
    if (parseFloat(weight) <= 0)
      return res.status(400).json({ message: "Weight must be greater than 0" });
    if (parseFloat(salesPrice) <= 0)
      return res.status(400).json({ message: "Sales price must be greater than 0" });

    const normalizedMetalType = metalType.toLowerCase();
    if (!['gold', 'silver'].includes(normalizedMetalType))
      return res.status(400).json({ message: "Metal type must be 'gold' or 'silver'" });
    if (isBulk && (!itemCount || itemCount <= 0))
      return res.status(400).json({ message: "Item count is required for bulk sales" });

    // Validate new date if provided
    let newSoldAt = undefined;
    if (soldAt) {
      const providedDate = new Date(soldAt);
      if (isNaN(providedDate.getTime()))
        return res.status(400).json({ message: "Invalid date format" });
      if (providedDate > new Date())
        return res.status(400).json({ message: "Sale date cannot be in the future" });

      const now = new Date();
      newSoldAt = new Date(
        providedDate.getFullYear(), providedDate.getMonth(), providedDate.getDate(),
        now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()
      );
    }

    // Fetch existing sale
    const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const existingData = decryptData(sale.data);

    // Read old values
    const oldMetal    = existingData.metalType;
    const oldCategory = existingData.category;
    const oldPurity   = existingData.purity;
    const oldWeight   = existingData.weight;
    // sourceType: default "bulk" for legacy sales that don't have it
    const oldSourceType = existingData.sourceType || "bulk";

    const newMetal    = normalizedMetalType;
    const newCategory = category;
    const newPurity   = parseFloat(purity);
    const newWeight   = parseFloat(weight);

    const metalChanged    = oldMetal    !== newMetal;
    const categoryChanged = oldCategory !== newCategory;
    const purityChanged   = oldPurity   !== newPurity;
    const weightChanged   = Math.abs(oldWeight - newWeight) >= 0.001;
    const attributesChanged = metalChanged || categoryChanged || purityChanged;

    // ── Step 1: Return old weight to inventory ────────────────────────────────
    if (oldSourceType === "single") {
      // Restore the full old weight as a single entry
      await returnWeightToInventory(req.userId, "single", oldMetal, oldCategory, oldPurity, oldWeight);
    } else {
      // Bulk source — return old weight to bulk
      await returnWeightToInventory(req.userId, "bulk", oldMetal, oldCategory, oldPurity, oldWeight);
    }

    // ── Step 2: Deduct new weight from inventory ──────────────────────────────
    const deductResult = await deductFromInventory(
      req.userId, newMetal, newCategory, newPurity, newWeight, !!isBulk
    );

    if (!deductResult) {
      // Rollback: re-deduct the old weight we just returned
      await deductFromInventory(req.userId, oldMetal, oldCategory, oldPurity, oldWeight, oldSourceType === "bulk");
      return res.status(400).json({
        message: "Insufficient stock for the updated sale details. No changes were made."
      });
    }

    // ── Step 3: Update sale record ────────────────────────────────────────────
    const updatedData = {
      ...existingData,
      metalType: newMetal,
      category: newCategory,
      purity: newPurity,
      weight: newWeight,
      salesPrice: parseFloat(salesPrice),
      isBulk: !!isBulk,
      itemCount: isBulk ? parseInt(itemCount) : undefined,
      customerName: customerName || '',
      customerAddress: customerAddress || '',
      customerMobile: customerMobile || '',
      description: description || '',
      sourceType: deductResult.sourceType  // update sourceType to reflect new deduction
    };

    sale.data = encryptData(updatedData);
    if (newSoldAt) sale.soldAt = newSoldAt;
    await sale.save();

    await updateMetadata(req.userId);

    const decryptedSale = decryptSalesData(sale.toObject());
    delete decryptedSale.encryptedData;

    res.json({ message: "Sale updated successfully", sale: decryptedSale });

  } catch (error) {
    console.error("Error updating sale:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// ─── DELETE /api/sales/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    await Sales.findByIdAndDelete(req.params.id);
    res.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error("Error deleting sale:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// ─── POST /api/sales/:id/return ───────────────────────────────────────────────
router.post("/:id/return", async (req, res) => {
  try {
    const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const salesData = decryptData(sale.data);
    const sourceType = salesData.sourceType || "bulk";

    await returnWeightToInventory(
      req.userId, sourceType,
      salesData.metalType, salesData.category, salesData.purity, salesData.weight
    );

    await Sales.findByIdAndDelete(req.params.id);
    await updateMetadata(req.userId);

    res.json({ message: "Sale returned to inventory successfully" });
  } catch (error) {
    console.error("Error returning sale to inventory:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;