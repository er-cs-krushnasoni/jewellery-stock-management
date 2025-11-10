// const express = require("express");
// const router = express.Router();
// const Sales = require("../models/Sales");
// const Entry = require("../models/Entry");
// const requireAuth = require("../middleware/requireAuth");
// const { decryptData, encryptData } = require("../utils/encrypt");
// // ✅ CRITICAL FIX: Import updateMetadata function
// const { updateMetadata } = require("./entries");

// // Apply auth middleware to all routes
// router.use(requireAuth);

// // Helper function to find matching entries in inventory
// const findMatchingEntries = async (userId, metalType, category, purity) => {
//   const entries = await Entry.find({ userId });
//   const individualEntries = [];
//   const bulkEntries = [];

//   for (const entry of entries) {
//     try {
//       const data = decryptData(entry.data);
      
//       if (data.metalType === metalType && 
//           data.category === category && 
//           data.purity === purity) {
        
//         if (data.isBulk) {
//           bulkEntries.push({ entry, data });
//         } else {
//           individualEntries.push({ entry, data });
//         }
//       }
//     } catch (error) {
//       console.error("Error parsing entry:", error);
//     }
//   }

//   return { individualEntries, bulkEntries };
// };


// // GET /api/sales/count-range - Count sales in date range
// router.get("/count-range", async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ message: "Start date and end date are required" });
//     }

//     // Build filter object
//     const filter = { 
//       userId: req.userId,
//       soldAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };

//     // Count sales in the date range
//     const count = await Sales.countDocuments(filter);

//     res.json({ count });
//   } catch (error) {
//     console.error("Error counting sales in range:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // DELETE /api/sales/range - Delete sales in date range
// router.delete("/range", async (req, res) => {
//   try {
//     const { startDate, endDate } = req.body;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ message: "Start date and end date are required" });
//     }

//     // Validate date format and order
//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     if (start > end) {
//       return res.status(400).json({ message: "Start date cannot be after end date" });
//     }

//     // Build filter object
//     const filter = { 
//       userId: req.userId,
//       soldAt: {
//         $gte: start,
//         $lte: end
//       }
//     };

//     // First check if any sales exist in the range
//     const count = await Sales.countDocuments(filter);
    
//     if (count === 0) {
//       return res.status(404).json({ message: "No sales found in the selected date range" });
//     }

//     // Delete sales in the date range
//     const result = await Sales.deleteMany(filter);

//     res.json({ 
//       message: `Successfully deleted ${result.deletedCount} sales`,
//       deletedCount: result.deletedCount 
//     });
//   } catch (error) {
//     console.error("Error deleting sales range:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });


// // POST /api/sales - Create new sale
// router.post("/", async (req, res) => {
//   try {
//     const { 
//       metalType, 
//       category, 
//       purity, 
//       weight, 
//       salesPrice, 
//       isBulk, 
//       itemCount,
//       customerName,
//       customerAddress,
//       customerMobile,
//       soldAt
//     } = req.body;

//     // Validation
//     if (!metalType || !category || !purity || !weight || !salesPrice) {
//       return res.status(400).json({ 
//         message: "Required fields missing: metalType, category, purity, weight, salesPrice" 
//       });
//     }
//     // Validate manual date if provided
// let finalSoldAt = undefined; // Let database default handle it
// if (soldAt) {
//   const providedDate = new Date(soldAt);
//   const today = new Date();
  
//   // Check if date is valid
//   if (isNaN(providedDate.getTime())) {
//     return res.status(400).json({ 
//       message: "Invalid date format. Use YYYY-MM-DD format" 
//     });
//   }
  
//   // Check if date is not in future
//   if (providedDate > today) {
//     return res.status(400).json({ 
//       message: "Sale date cannot be in the future" 
//     });
//   }
  
//   // Set date with current time
//   const currentTime = new Date();
//   finalSoldAt = new Date(
//     providedDate.getFullYear(),
//     providedDate.getMonth(),
//     providedDate.getDate(),
//     currentTime.getHours(),
//     currentTime.getMinutes(),
//     currentTime.getSeconds(),
//     currentTime.getMilliseconds()
//   );
// }

//     // Normalize metalType to lowercase to match Entry system
//     const normalizedMetalType = metalType.toLowerCase();
    
//     if (!['gold', 'silver'].includes(normalizedMetalType)) {
//       return res.status(400).json({ 
//         message: "Metal type must be 'gold' or 'silver'" 
//       });
//     }

//     if (isBulk && (!itemCount || itemCount <= 0)) {
//       return res.status(400).json({ 
//         message: "Item count is required for bulk sales" 
//       });
//     }

//     // Find matching entries in inventory
//     const { individualEntries, bulkEntries } = await findMatchingEntries(
//       req.userId, normalizedMetalType, category, purity
//     );

//     let selectedEntry = null;
//     let selectedData = null;
    
//     if (!isBulk) {
//       // Single item sale - First try exact match in individual entries
//       const exactMatch = individualEntries.find(({ data }) => data.weight === weight);
      
//       if (exactMatch) {
//         selectedEntry = exactMatch.entry;
//         selectedData = exactMatch.data;
//       } else {
//         // No exact match, try bulk entries with sufficient quantity
//         const bulkEntry = bulkEntries.find(({ data }) => 
//           data.weight >= weight && data.itemCount >= 1
//         );
        
//         if (bulkEntry) {
//           selectedEntry = bulkEntry.entry;
//           selectedData = bulkEntry.data;
//         }
//       }
//     } else {
//       // Bulk sale - Only look in bulk entries
//       const bulkEntry = bulkEntries.find(({ data }) => 
//         data.weight >= weight && data.itemCount >= itemCount
//       );
      
//       if (bulkEntry) {
//         selectedEntry = bulkEntry.entry;
//         selectedData = bulkEntry.data;
//       }
//     }
    
//     if (!selectedEntry) {
//       return res.status(400).json({ 
//         message: isBulk 
//           ? "No bulk entry found with sufficient quantity" 
//           : "No matching entry found - no exact weight match or bulk entry with sufficient quantity"
//       });
//     }

//     // Create sales record
//     const sale = new Sales({
//       userId: req.userId,
//       metalType: normalizedMetalType,
//       category,
//       purity,
//       weight,
//       isBulk,
//       itemCount: isBulk ? itemCount : undefined,
//       salesPrice,
//       customerName,
//       customerAddress,
//       customerMobile,
//       originalEntryId: selectedEntry._id,
//       ...(finalSoldAt && { soldAt: finalSoldAt }) // Add this line
//     });

//     await sale.save();

//     // Update inventory
//     if (!isBulk && !selectedData.isBulk) {
//       // Single to single - remove entire entry
//       await Entry.findByIdAndDelete(selectedEntry._id);
//     } else if (selectedData.isBulk) {
//       // Deduct from bulk entry
//       selectedData.weight -= weight;
//       selectedData.itemCount -= (isBulk ? itemCount : 1);

//       if (selectedData.weight <= 0 || selectedData.itemCount <= 0) {
//         // Remove entry if no quantity left
//         await Entry.findByIdAndDelete(selectedEntry._id);
//       } else {
//         // Update entry with new quantities
//         const encryptedData = encryptData(selectedData);
//         await Entry.findByIdAndUpdate(selectedEntry._id, { data: encryptedData });
//       }
//     }

//     // ✅ CRITICAL FIX: Update metadata after inventory changes
//     await updateMetadata(req.userId);

//     res.status(201).json({
//       message: "Sale created successfully",
//       sale
//     });

//   } catch (error) {
//     console.error("Error creating sale:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // GET /api/sales - Get sales history with filters
// router.get("/", async (req, res) => {
//   try {
//     const {
//       startDate,
//       endDate,
//       metalType,
//       category,
//       purity,
//       minPrice,
//       maxPrice,
//       customerName,
//       customerAddress
//     } = req.query;

//     // Build filter object
//     const filter = { userId: req.userId };

//     // Date filter
//     if (startDate || endDate) {
//       filter.soldAt = {};
//       if (startDate) filter.soldAt.$gte = new Date(startDate);
//       if (endDate) filter.soldAt.$lte = new Date(endDate);
//     }

//     // Other filters - normalize metalType if provided
//     if (metalType) filter.metalType = metalType.toLowerCase();
//     if (category) filter.category = category;
//     if (purity) filter.purity = parseInt(purity);

//     // Price range filter
//     if (minPrice || maxPrice) {
//       filter.salesPrice = {};
//       if (minPrice) filter.salesPrice.$gte = parseFloat(minPrice);
//       if (maxPrice) filter.salesPrice.$lte = parseFloat(maxPrice);
//     }

//     // Customer name filter
//     if (customerName) {
//       filter.customerName = { $regex: customerName, $options: 'i' };
//     }
//     // Customer address filter
// if (customerAddress) {
//   filter.customerAddress = { $regex: customerAddress, $options: 'i' };
// }

//     const sales = await Sales.find(filter)
//       .sort({ soldAt: -1 })
//       .lean();

//     res.json({ sales });

//   } catch (error) {
//     console.error("Error fetching sales:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // GET /api/sales/customers/search - Search customers and their purchase history
// router.get("/customers/search", async (req, res) => {
//   try {
//     const { q } = req.query;

//     if (!q || q.trim() === "") {
//       return res.json({ customers: [] });
//     }

//     const searchTerm = q.trim();
    
//     // Search in both customerName and customerAddress
//     const sales = await Sales.find({
//       userId: req.userId,
//       $or: [
//         { customerName: { $regex: searchTerm, $options: 'i' } },
//         { customerAddress: { $regex: searchTerm, $options: 'i' } }
//       ]
//     }).sort({ soldAt: -1 }).lean();

//     // Group sales by customer
//     const customerMap = new Map();

//     sales.forEach(sale => {
//       const key = `${sale.customerName || ''}-${sale.customerAddress || ''}`;
      
//       if (!customerMap.has(key)) {
//         customerMap.set(key, {
//           customerName: sale.customerName || '',
//           customerAddress: sale.customerAddress || '',
//           customerMobile: sale.customerMobile || '',
//           purchases: [],
//           totalPurchases: 0,
//           totalValue: 0
//         });
//       }

//       const customer = customerMap.get(key);
//       customer.purchases.push({
//         saleId: sale._id,
//         metalType: sale.metalType,
//         category: sale.category,
//         purity: sale.purity,
//         weight: sale.weight,
//         salesPrice: sale.salesPrice,
//         soldAt: sale.soldAt,
//         isBulk: sale.isBulk,
//         itemCount: sale.itemCount
//       });
//       customer.totalPurchases += 1;
//       customer.totalValue += sale.salesPrice;
//     });

//     const customers = Array.from(customerMap.values());

//     res.json({ customers });

//   } catch (error) {
//     console.error("Error searching customers:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // PUT /api/sales/:id - Edit sale (price and customer info only)
// router.put("/:id", async (req, res) => {
//   try {
//     const { salesPrice, customerName, customerAddress, customerMobile } = req.body;

//     if (!salesPrice || salesPrice <= 0) {
//       return res.status(400).json({ message: "Valid sales price is required" });
//     }

//     const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

//     if (!sale) {
//       return res.status(404).json({ message: "Sale not found" });
//     }

//     // Update only allowed fields
//     sale.salesPrice = salesPrice;
//     sale.customerName = customerName || '';
//     sale.customerAddress = customerAddress || '';
//     sale.customerMobile = customerMobile || '';
//     sale.soldAt = new Date(); // Update timestamp

//     await sale.save();

//     res.json({
//       message: "Sale updated successfully",
//       sale
//     });

//   } catch (error) {
//     console.error("Error updating sale:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // DELETE /api/sales/:id - Delete sale record
// router.delete("/:id", async (req, res) => {
//   try {
//     const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

//     if (!sale) {
//       return res.status(404).json({ message: "Sale not found" });
//     }

//     await Sales.findByIdAndDelete(req.params.id);

//     res.json({ message: "Sale deleted successfully" });

//   } catch (error) {
//     console.error("Error deleting sale:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // POST /api/sales/:id/return - Return sale to inventory
// router.post("/:id/return", async (req, res) => {
//   try {
//     const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

//     if (!sale) {
//       return res.status(404).json({ message: "Sale not found" });
//     }

//     // Create entry data object
//     const entryData = {
//       metalType: sale.metalType,
//       category: sale.category,
//       purity: sale.purity,
//       weight: sale.weight,
//       isBulk: sale.isBulk
//     };

//     if (sale.isBulk) {
//       entryData.itemCount = sale.itemCount;
//     }

//     if (!sale.isBulk) {
//       // Single entry sale - create new single entry
//       const encryptedData = encryptData(entryData);
      
//       const newEntry = new Entry({
//         userId: req.userId,
//         data: encryptedData
//       });

//       await newEntry.save();
//     } else {
//       // Bulk entry sale - find existing bulk entry and add back
//       const entries = await Entry.find({ userId: req.userId });
//       let bulkEntry = null;

//       for (const entry of entries) {
//         try {
//           const data = decryptData(entry.data);
//           if (data.metalType === sale.metalType && 
//               data.category === sale.category && 
//               data.purity === sale.purity && 
//               data.isBulk) {
//             bulkEntry = { entry, data };
//             break;
//           }
//         } catch (error) {
//           console.error("Error parsing entry during return:", error);
//         }
//       }

//       if (bulkEntry) {
//         // Add back to existing bulk entry
//         bulkEntry.data.weight += sale.weight;
//         bulkEntry.data.itemCount += sale.itemCount;
        
//         const encryptedData = encryptData(bulkEntry.data);
//         await Entry.findByIdAndUpdate(bulkEntry.entry._id, { data: encryptedData });
//       } else {
//         // Create new bulk entry if none exists
//         const encryptedData = encryptData(entryData);
        
//         const newEntry = new Entry({
//           userId: req.userId,
//           data: encryptedData
//         });

//         await newEntry.save();
//       }
//     }

//     // Remove sale record
//     await Sales.findByIdAndDelete(req.params.id);

//     // ✅ CRITICAL FIX: Update metadata after returning to inventory
//     await updateMetadata(req.userId);

//     res.json({ message: "Sale returned to inventory successfully" });

//   } catch (error) {
//     console.error("Error returning sale to inventory:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// module.exports = router;





// // FILE: routes/sales.js
// // CHAIN POSITION: 7/11

// const express = require("express");
// const router = express.Router();
// const Sales = require("../models/Sales");
// const Entry = require("../models/Entry");
// const requireAuth = require("../middleware/requireAuth");
// const { decryptData, encryptData } = require("../utils/encrypt");
// // ✅ CRITICAL FIX: Import updateMetadata function
// const metadataRouter = require("./metadata");
// const updateMetadata = metadataRouter.updateMetadata;

// // Apply auth middleware to all routes
// router.use(requireAuth);

// // Helper function to decrypt sales data
// const decryptSalesData = (sale) => {
//   try {
//     console.log("🔍 Decrypting sale data for sale ID:", sale._id);
//     console.log("🔍 Raw encrypted data length:", sale.data?.length);
    
//     const decryptedData = decryptData(sale.data);
//     console.log("🔍 Successfully decrypted data:", decryptedData);
    
//     const result = {
//       ...sale,
//       decryptedData,
//       // Add decrypted fields to top level for easy access
//       metalType: decryptedData.metalType,
//       category: decryptedData.category,
//       purity: decryptedData.purity,
//       weight: decryptedData.weight,
//       isBulk: decryptedData.isBulk,
//       itemCount: decryptedData.itemCount,
//       salesPrice: decryptedData.salesPrice,
//       customerName: decryptedData.customerName,
//       customerAddress: decryptedData.customerAddress,
//       customerMobile: decryptedData.customerMobile
//     };
    
//     console.log("🔍 Final decrypted sale object keys:", Object.keys(result));
//     return result;
//   } catch (error) {
//     console.error("❌ Error decrypting sales data:", error);
//     console.error("❌ Sale object:", sale);
//     throw new Error("Failed to decrypt sales data");
//   }
// };

// // Helper function to find matching entries in inventory
// const findMatchingEntries = async (userId, metalType, category, purity) => {
//   const entries = await Entry.find({ userId });
//   const individualEntries = [];
//   const bulkEntries = [];

//   for (const entry of entries) {
//     try {
//       const data = decryptData(entry.data);
      
//       if (data.metalType === metalType && 
//           data.category === category && 
//           data.purity === purity) {
        
//         if (data.isBulk) {
//           bulkEntries.push({ entry, data });
//         } else {
//           individualEntries.push({ entry, data });
//         }
//       }
//     } catch (error) {
//       console.error("Error parsing entry:", error);
//     }
//   }

//   return { individualEntries, bulkEntries };
// };

// // GET /api/sales/count-range - Count sales in date range
// router.get("/count-range", async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ message: "Start date and end date are required" });
//     }

//     // Build filter object
//     const filter = { 
//       userId: req.userId,
//       soldAt: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };

//     // Count sales in the date range
//     const count = await Sales.countDocuments(filter);

//     res.json({ count });
//   } catch (error) {
//     console.error("Error counting sales in range:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // DELETE /api/sales/range - Delete sales in date range
// router.delete("/range", async (req, res) => {
//   try {
//     const { startDate, endDate } = req.body;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ message: "Start date and end date are required" });
//     }

//     // Validate date format and order
//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     if (start > end) {
//       return res.status(400).json({ message: "Start date cannot be after end date" });
//     }

//     // Build filter object
//     const filter = { 
//       userId: req.userId,
//       soldAt: {
//         $gte: start,
//         $lte: end
//       }
//     };

//     // First check if any sales exist in the range
//     const count = await Sales.countDocuments(filter);
    
//     if (count === 0) {
//       return res.status(404).json({ message: "No sales found in the selected date range" });
//     }

//     // Delete sales in the date range
//     const result = await Sales.deleteMany(filter);

//     res.json({ 
//       message: `Successfully deleted ${result.deletedCount} sales`,
//       deletedCount: result.deletedCount 
//     });
//   } catch (error) {
//     console.error("Error deleting sales range:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // POST /api/sales - Create new sale
// router.post("/", async (req, res) => {
//   try {
//     const { 
//       metalType, 
//       category, 
//       purity, 
//       weight, 
//       salesPrice, 
//       isBulk, 
//       itemCount,
//       customerName,
//       customerAddress,
//       customerMobile,
//       soldAt
//     } = req.body;

//     // Validation
//     if (!metalType || !category || !purity || !weight || !salesPrice) {
//       return res.status(400).json({ 
//         message: "Required fields missing: metalType, category, purity, weight, salesPrice" 
//       });
//     }

//     // Validate manual date if provided
//     let finalSoldAt = undefined; // Let database default handle it
//     if (soldAt) {
//       const providedDate = new Date(soldAt);
//       const today = new Date();
      
//       // Check if date is valid
//       if (isNaN(providedDate.getTime())) {
//         return res.status(400).json({ 
//           message: "Invalid date format. Use YYYY-MM-DD format" 
//         });
//       }
      
//       // Check if date is not in future
//       if (providedDate > today) {
//         return res.status(400).json({ 
//           message: "Sale date cannot be in the future" 
//         });
//       }
      
//       // Set date with current time
//       const currentTime = new Date();
//       finalSoldAt = new Date(
//         providedDate.getFullYear(),
//         providedDate.getMonth(),
//         providedDate.getDate(),
//         currentTime.getHours(),
//         currentTime.getMinutes(),
//         currentTime.getSeconds(),
//         currentTime.getMilliseconds()
//       );
//     }

//     // Normalize metalType to lowercase to match Entry system
//     const normalizedMetalType = metalType.toLowerCase();
    
//     if (!['gold', 'silver'].includes(normalizedMetalType)) {
//       return res.status(400).json({ 
//         message: "Metal type must be 'gold' or 'silver'" 
//       });
//     }

//     if (isBulk && (!itemCount || itemCount <= 0)) {
//       return res.status(400).json({ 
//         message: "Item count is required for bulk sales" 
//       });
//     }

//     // Find matching entries in inventory
//     const { individualEntries, bulkEntries } = await findMatchingEntries(
//       req.userId, normalizedMetalType, category, purity
//     );

//     let selectedEntry = null;
//     let selectedData = null;
    
//     if (!isBulk) {
//       // Single item sale - First try exact match in individual entries
//       const exactMatch = individualEntries.find(({ data }) => data.weight === weight);
      
//       if (exactMatch) {
//         selectedEntry = exactMatch.entry;
//         selectedData = exactMatch.data;
//       } else {
//         // No exact match, try bulk entries with sufficient quantity
//         const bulkEntry = bulkEntries.find(({ data }) => 
//           data.weight >= weight && data.itemCount >= 1
//         );
        
//         if (bulkEntry) {
//           selectedEntry = bulkEntry.entry;
//           selectedData = bulkEntry.data;
//         }
//       }
//     } else {
//       // Bulk sale - Only look in bulk entries
//       const bulkEntry = bulkEntries.find(({ data }) => 
//         data.weight >= weight && data.itemCount >= itemCount
//       );
      
//       if (bulkEntry) {
//         selectedEntry = bulkEntry.entry;
//         selectedData = bulkEntry.data;
//       }
//     }
    
//     if (!selectedEntry) {
//       return res.status(400).json({ 
//         message: isBulk 
//           ? "No bulk entry found with sufficient quantity" 
//           : "No matching entry found - no exact weight match or bulk entry with sufficient quantity"
//       });
//     }

//     // Create encrypted sales data
//     const salesData = {
//       metalType: normalizedMetalType,
//       category,
//       purity,
//       weight,
//       isBulk,
//       itemCount: isBulk ? itemCount : undefined,
//       salesPrice,
//       customerName: customerName || '',
//       customerAddress: customerAddress || '',
//       customerMobile: customerMobile || ''
//     };

//     const encryptedSalesData = encryptData(salesData);

//     // Create sales record
//     const sale = new Sales({
//       userId: req.userId,
//       data: encryptedSalesData,
//       originalEntryId: selectedEntry._id,
//       ...(finalSoldAt && { soldAt: finalSoldAt })
//     });

//     await sale.save();

//     // Update inventory
//     if (!isBulk && !selectedData.isBulk) {
//       // Single to single - remove entire entry
//       await Entry.findByIdAndDelete(selectedEntry._id);
//     } else if (selectedData.isBulk) {
//       // Deduct from bulk entry
//       selectedData.weight -= weight;
//       selectedData.itemCount -= (isBulk ? itemCount : 1);

//       if (selectedData.weight <= 0 || selectedData.itemCount <= 0) {
//         // Remove entry if no quantity left
//         await Entry.findByIdAndDelete(selectedEntry._id);
//       } else {
//         // Update entry with new quantities
//         const encryptedData = encryptData(selectedData);
//         await Entry.findByIdAndUpdate(selectedEntry._id, { data: encryptedData });
//       }
//     }

//     // ✅ CRITICAL FIX: Update metadata after inventory changes
//     await updateMetadata(req.userId);

//     // Return decrypted sale data for response
//     const decryptedSale = decryptSalesData(sale);

//     res.status(201).json({
//       message: "Sale created successfully",
//       sale: decryptedSale
//     });

//   } catch (error) {
//     console.error("Error creating sale:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // GET /api/sales - Get sales history with filters
// router.get("/", async (req, res) => {
//   try {
//     console.log("🔍 Sales GET request received");
//     console.log("🔍 User ID:", req.userId);
//     console.log("🔍 Query params:", req.query);
    
//     const {
//       startDate,
//       endDate,
//       metalType,
//       category,
//       purity,
//       minPrice,
//       maxPrice,
//       customerName,
//       customerAddress
//     } = req.query;

//     // Build filter object (only for unencrypted fields)
//     const filter = { userId: req.userId };

//     // Date filter
//     if (startDate || endDate) {
//       filter.soldAt = {};
//       if (startDate) filter.soldAt.$gte = new Date(startDate);
//       if (endDate) filter.soldAt.$lte = new Date(endDate);
//     }

//     console.log("🔍 MongoDB filter:", filter);

//     // Get all sales and decrypt for filtering
//     const sales = await Sales.find(filter)
//       .sort({ soldAt: -1 })
//       .lean();

//     console.log("🔍 Found sales count:", sales.length);

//     // Decrypt and filter sales
//     const decryptedSales = [];
    
//     for (const sale of sales) {
//       try {
//         console.log("🔍 Processing sale ID:", sale._id);
//         const decryptedSale = decryptSalesData(sale);
//         console.log("🔍 Decrypted sale data:", {
//           metalType: decryptedSale.metalType,
//           category: decryptedSale.category,
//           purity: decryptedSale.purity,
//           weight: decryptedSale.weight,
//           salesPrice: decryptedSale.salesPrice
//         });
        
//         // Apply filters on decrypted data
//         let includeInResults = true;
        
//         if (metalType && decryptedSale.metalType !== metalType.toLowerCase()) {
//           console.log("🔍 Filtered out by metalType:", decryptedSale.metalType, "vs", metalType.toLowerCase());
//           includeInResults = false;
//         }
        
//         if (category && decryptedSale.category !== category) {
//           console.log("🔍 Filtered out by category:", decryptedSale.category, "vs", category);
//           includeInResults = false;
//         }
        
//         if (purity && decryptedSale.purity !== parseInt(purity)) {
//           console.log("🔍 Filtered out by purity:", decryptedSale.purity, "vs", parseInt(purity));
//           includeInResults = false;
//         }
        
//         if (minPrice && decryptedSale.salesPrice < parseFloat(minPrice)) {
//           console.log("🔍 Filtered out by minPrice:", decryptedSale.salesPrice, "vs", parseFloat(minPrice));
//           includeInResults = false;
//         }
        
//         if (maxPrice && decryptedSale.salesPrice > parseFloat(maxPrice)) {
//           console.log("🔍 Filtered out by maxPrice:", decryptedSale.salesPrice, "vs", parseFloat(maxPrice));
//           includeInResults = false;
//         }
        
//         if (customerName && !decryptedSale.customerName.toLowerCase().includes(customerName.toLowerCase())) {
//           console.log("🔍 Filtered out by customerName");
//           includeInResults = false;
//         }
        
//         if (customerAddress && !decryptedSale.customerAddress.toLowerCase().includes(customerAddress.toLowerCase())) {
//           console.log("🔍 Filtered out by customerAddress");
//           includeInResults = false;
//         }
        
//         if (includeInResults) {
//           console.log("🔍 Including sale in results");
//           decryptedSales.push(decryptedSale);
//         }
//       } catch (error) {
//         console.error("❌ Error decrypting sale:", error);
//         console.error("❌ Sale data:", sale);
//         // Skip corrupted sales
//       }
//     }

//     console.log("🔍 Final decrypted sales count:", decryptedSales.length);
//     console.log("🔍 Returning sales to frontend");

//     res.json({ sales: decryptedSales });

//   } catch (error) {
//     console.error("❌ Error fetching sales:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // GET /api/sales/customers/search - Search customers and their purchase history
// router.get("/customers/search", async (req, res) => {
//   try {
//     const { q } = req.query;

//     if (!q || q.trim() === "") {
//       return res.json({ customers: [] });
//     }

//     const searchTerm = q.trim().toLowerCase();
    
//     // Get all sales for the user
//     const sales = await Sales.find({ userId: req.userId })
//       .sort({ soldAt: -1 })
//       .lean();

//     // Decrypt and search in customer data
//     const matchingSales = [];
    
//     for (const sale of sales) {
//       try {
//         const decryptedSale = decryptSalesData(sale);
        
//         // Search in customerName and customerAddress
//         const customerName = (decryptedSale.customerName || '').toLowerCase();
//         const customerAddress = (decryptedSale.customerAddress || '').toLowerCase();
        
//         if (customerName.includes(searchTerm) || customerAddress.includes(searchTerm)) {
//           matchingSales.push(decryptedSale);
//         }
//       } catch (error) {
//         console.error("Error decrypting sale for customer search:", error);
//         // Skip corrupted sales
//       }
//     }

//     // Group sales by customer
//     const customerMap = new Map();

//     matchingSales.forEach(sale => {
//       const key = `${sale.customerName || ''}-${sale.customerAddress || ''}`;
      
//       if (!customerMap.has(key)) {
//         customerMap.set(key, {
//           customerName: sale.customerName || '',
//           customerAddress: sale.customerAddress || '',
//           customerMobile: sale.customerMobile || '',
//           purchases: [],
//           totalPurchases: 0,
//           totalValue: 0
//         });
//       }

//       const customer = customerMap.get(key);
//       customer.purchases.push({
//         saleId: sale._id,
//         metalType: sale.metalType,
//         category: sale.category,
//         purity: sale.purity,
//         weight: sale.weight,
//         salesPrice: sale.salesPrice,
//         soldAt: sale.soldAt,
//         isBulk: sale.isBulk,
//         itemCount: sale.itemCount
//       });
//       customer.totalPurchases += 1;
//       customer.totalValue += sale.salesPrice;
//     });

//     const customers = Array.from(customerMap.values());

//     res.json({ customers });

//   } catch (error) {
//     console.error("Error searching customers:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // PUT /api/sales/:id - Edit sale (price and customer info only)
// router.put("/:id", async (req, res) => {
//   try {
//     const { salesPrice, customerName, customerAddress, customerMobile } = req.body;

//     if (!salesPrice || salesPrice <= 0) {
//       return res.status(400).json({ message: "Valid sales price is required" });
//     }

//     const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

//     if (!sale) {
//       return res.status(404).json({ message: "Sale not found" });
//     }

//     // Decrypt existing data
//     const existingData = decryptData(sale.data);

//     // Update only allowed fields
//     const updatedData = {
//       ...existingData,
//       salesPrice,
//       customerName: customerName || '',
//       customerAddress: customerAddress || '',
//       customerMobile: customerMobile || ''
//     };

//     // Encrypt updated data
//     const encryptedData = encryptData(updatedData);

//     // Update sale
//     sale.data = encryptedData;
//     sale.soldAt = new Date(); // Update timestamp

//     await sale.save();

//     // Return decrypted sale data for response
//     const decryptedSale = decryptSalesData(sale);

//     res.json({
//       message: "Sale updated successfully",
//       sale: decryptedSale
//     });

//   } catch (error) {
//     console.error("Error updating sale:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // DELETE /api/sales/:id - Delete sale record
// router.delete("/:id", async (req, res) => {
//   try {
//     const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

//     if (!sale) {
//       return res.status(404).json({ message: "Sale not found" });
//     }

//     await Sales.findByIdAndDelete(req.params.id);

//     res.json({ message: "Sale deleted successfully" });

//   } catch (error) {
//     console.error("Error deleting sale:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // POST /api/sales/:id/return - Return sale to inventory
// router.post("/:id/return", async (req, res) => {
//   try {
//     const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

//     if (!sale) {
//       return res.status(404).json({ message: "Sale not found" });
//     }

//     // Decrypt sales data
//     const salesData = decryptData(sale.data);

//     // Create entry data object
//     const entryData = {
//       metalType: salesData.metalType,
//       category: salesData.category,
//       purity: salesData.purity,
//       weight: salesData.weight,
//       isBulk: salesData.isBulk
//     };

//     if (salesData.isBulk) {
//       entryData.itemCount = salesData.itemCount;
//     }

//     if (!salesData.isBulk) {
//       // Single entry sale - create new single entry
//       const encryptedData = encryptData(entryData);
      
//       const newEntry = new Entry({
//         userId: req.userId,
//         data: encryptedData
//       });

//       await newEntry.save();
//     } else {
//       // Bulk entry sale - find existing bulk entry and add back
//       const entries = await Entry.find({ userId: req.userId });
//       let bulkEntry = null;

//       for (const entry of entries) {
//         try {
//           const data = decryptData(entry.data);
//           if (data.metalType === salesData.metalType && 
//               data.category === salesData.category && 
//               data.purity === salesData.purity && 
//               data.isBulk) {
//             bulkEntry = { entry, data };
//             break;
//           }
//         } catch (error) {
//           console.error("Error parsing entry during return:", error);
//         }
//       }

//       if (bulkEntry) {
//         // Add back to existing bulk entry
//         bulkEntry.data.weight += salesData.weight;
//         bulkEntry.data.itemCount += salesData.itemCount;
        
//         const encryptedData = encryptData(bulkEntry.data);
//         await Entry.findByIdAndUpdate(bulkEntry.entry._id, { data: encryptedData });
//       } else {
//         // Create new bulk entry if none exists
//         const encryptedData = encryptData(entryData);
        
//         const newEntry = new Entry({
//           userId: req.userId,
//           data: encryptedData
//         });

//         await newEntry.save();
//       }
//     }

//     // Remove sale record
//     await Sales.findByIdAndDelete(req.params.id);

//     // ✅ CRITICAL FIX: Update metadata after returning to inventory
//     await updateMetadata(req.userId);

//     res.json({ message: "Sale returned to inventory successfully" });

//   } catch (error) {
//     console.error("Error returning sale to inventory:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// module.exports = router;



// FILE: routes/sales.js
// CHAIN POSITION: 7/11 (FIXED FOR NEW ENCRYPTION)

const express = require("express");
const router = express.Router();
const Sales = require("../models/Sales");
const Entry = require("../models/Entry");
const requireAuth = require("../middleware/requireAuth");
const { decryptData, encryptData } = require("../utils/encrypt");
// ✅ CRITICAL FIX: Import updateMetadata function correctly
const { updateMetadata } = require("./metadata");

// Apply auth middleware to all routes
router.use(requireAuth);

// Helper function to decrypt sales data with error handling
const decryptSalesData = (sale) => {
  try {
    console.log("🔍 Decrypting sale data for sale ID:", sale._id);
    console.log("🔍 Raw encrypted data preview:", sale.data?.substring(0, 50) + "...");
    
    const decryptedData = decryptData(sale.data);
    console.log("🔍 Successfully decrypted data:", decryptedData);
    
    // Return the sale object with decrypted data mixed in
    const result = {
      _id: sale._id,
      userId: sale.userId,
      soldAt: sale.soldAt,
      originalEntryId: sale.originalEntryId,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      // Mix in decrypted fields
      ...decryptedData,
      // Keep original encrypted data for debugging
      encryptedData: sale.data
    };
    
    console.log("🔍 Final decrypted sale object keys:", Object.keys(result));
    return result;
  } catch (error) {
    console.error("❌ Error decrypting sales data:", error);
    console.error("❌ Sale ID:", sale._id);
    console.error("❌ Encrypted data preview:", sale.data?.substring(0, 100));
    throw new Error(`Failed to decrypt sales data for sale ${sale._id}: ${error.message}`);
  }
};

// Helper function to find matching entries in inventory
const findMatchingEntries = async (userId, metalType, category, purity) => {
  const entries = await Entry.find({ userId });
  const individualEntries = [];
  const bulkEntries = [];

  for (const entry of entries) {
    try {
      const data = decryptData(entry.data);
      
      if (data.metalType === metalType && 
          data.category === category && 
          data.purity === purity) {
        
        if (data.isBulk) {
          bulkEntries.push({ entry, data });
        } else {
          individualEntries.push({ entry, data });
        }
      }
    } catch (error) {
      console.error("Error parsing entry:", error);
    }
  }

  return { individualEntries, bulkEntries };
};

// GET /api/sales/count-range - Count sales in date range
router.get("/count-range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    // Build filter object (only for unencrypted fields)
    const filter = { 
      userId: req.userId,
      soldAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Count sales in the date range
    const count = await Sales.countDocuments(filter);

    res.json({ count });
  } catch (error) {
    console.error("Error counting sales in range:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/sales/range - Delete sales in date range
router.delete("/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    // Validate date format and order
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (start > end) {
      return res.status(400).json({ message: "Start date cannot be after end date" });
    }

    // Build filter object (only for unencrypted fields)
    const filter = { 
      userId: req.userId,
      soldAt: {
        $gte: start,
        $lte: end
      }
    };

    // First check if any sales exist in the range
    const count = await Sales.countDocuments(filter);
    
    if (count === 0) {
      return res.status(404).json({ message: "No sales found in the selected date range" });
    }

    // Delete sales in the date range
    const result = await Sales.deleteMany(filter);

    res.json({ 
      message: `Successfully deleted ${result.deletedCount} sales`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error("Error deleting sales range:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/sales - Create new sale
router.post("/", async (req, res) => {
  try {
    const { 
      metalType, 
      category, 
      purity, 
      weight, 
      salesPrice, 
      isBulk, 
      itemCount,
      customerName,
      customerAddress,
      customerMobile,
      soldAt
    } = req.body;

    console.log("🔍 Creating new sale with data:", req.body);

    // Validation
    if (!metalType || !category || !purity || !weight || !salesPrice) {
      return res.status(400).json({ 
        message: "Required fields missing: metalType, category, purity, weight, salesPrice" 
      });
    }

    // Validate manual date if provided
    let finalSoldAt = undefined; // Let database default handle it
    if (soldAt) {
      const providedDate = new Date(soldAt);
      const today = new Date();
      
      // Check if date is valid
      if (isNaN(providedDate.getTime())) {
        return res.status(400).json({ 
          message: "Invalid date format. Use YYYY-MM-DD format" 
        });
      }
      
      // Check if date is not in future
      if (providedDate > today) {
        return res.status(400).json({ 
          message: "Sale date cannot be in the future" 
        });
      }
      
      // Set date with current time
      const currentTime = new Date();
      finalSoldAt = new Date(
        providedDate.getFullYear(),
        providedDate.getMonth(),
        providedDate.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds(),
        currentTime.getMilliseconds()
      );
    }

    // Normalize metalType to lowercase to match Entry system
    const normalizedMetalType = metalType.toLowerCase();
    
    if (!['gold', 'silver'].includes(normalizedMetalType)) {
      return res.status(400).json({ 
        message: "Metal type must be 'gold' or 'silver'" 
      });
    }

    if (isBulk && (!itemCount || itemCount <= 0)) {
      return res.status(400).json({ 
        message: "Item count is required for bulk sales" 
      });
    }

    // Find matching entries in inventory
    const { individualEntries, bulkEntries } = await findMatchingEntries(
      req.userId, normalizedMetalType, category, purity
    );

    let selectedEntry = null;
    let selectedData = null;
    
    if (!isBulk) {
      // Single item sale - First try exact match in individual entries
      const exactMatch = individualEntries.find(({ data }) => data.weight === weight);
      
      if (exactMatch) {
        selectedEntry = exactMatch.entry;
        selectedData = exactMatch.data;
      } else {
        // No exact match, try bulk entries with sufficient quantity
        const bulkEntry = bulkEntries.find(({ data }) => 
          data.weight >= weight && data.itemCount >= 1
        );
        
        if (bulkEntry) {
          selectedEntry = bulkEntry.entry;
          selectedData = bulkEntry.data;
        }
      }
    } else {
      // Bulk sale - Only look in bulk entries
      const bulkEntry = bulkEntries.find(({ data }) => 
        data.weight >= weight && data.itemCount >= itemCount
      );
      
      if (bulkEntry) {
        selectedEntry = bulkEntry.entry;
        selectedData = bulkEntry.data;
      }
    }
    
    if (!selectedEntry) {
      return res.status(400).json({ 
        message: isBulk 
          ? "No bulk entry found with sufficient quantity" 
          : "No matching entry found - no exact weight match or bulk entry with sufficient quantity"
      });
    }

    // Create encrypted sales data
    const salesData = {
      metalType: normalizedMetalType,
      category,
      purity,
      weight,
      isBulk,
      itemCount: isBulk ? itemCount : undefined,
      salesPrice,
      customerName: customerName || '',
      customerAddress: customerAddress || '',
      customerMobile: customerMobile || ''
    };

    console.log("🔍 Encrypting sales data:", salesData);
    const encryptedSalesData = encryptData(salesData);
    console.log("🔍 Encrypted data preview:", encryptedSalesData.substring(0, 50) + "...");

    // Create sales record
    const sale = new Sales({
      userId: req.userId,
      data: encryptedSalesData,
      originalEntryId: selectedEntry._id,
      ...(finalSoldAt && { soldAt: finalSoldAt })
    });

    await sale.save();
    console.log("🔍 Sale saved successfully with ID:", sale._id);

    // Update inventory
    if (!isBulk && !selectedData.isBulk) {
      // Single to single - remove entire entry
      await Entry.findByIdAndDelete(selectedEntry._id);
    } else if (selectedData.isBulk) {
      // Deduct from bulk entry
      selectedData.weight -= weight;
      selectedData.itemCount -= (isBulk ? itemCount : 1);

      if (selectedData.weight <= 0 || selectedData.itemCount <= 0) {
        // Remove entry if no quantity left
        await Entry.findByIdAndDelete(selectedEntry._id);
      } else {
        // Update entry with new quantities
        const encryptedData = encryptData(selectedData);
        await Entry.findByIdAndUpdate(selectedEntry._id, { data: encryptedData });
      }
    }

    // Update metadata after inventory changes
    await updateMetadata(req.userId);

    // Return decrypted sale data for response
    const decryptedSale = decryptSalesData(sale.toObject());

    res.status(201).json({
      message: "Sale created successfully",
      sale: decryptedSale
    });

  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// GET /api/sales - Get sales history with filters
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Sales GET request received");
    console.log("🔍 User ID:", req.userId);
    console.log("🔍 Query params:", req.query);
    
    const {
      startDate,
      endDate,
      metalType,
      category,
      purity,
      minPrice,
      maxPrice,
      customerName,
      customerAddress
    } = req.query;

    // Build filter object (only for unencrypted fields)
    const filter = { userId: req.userId };

    // Date filter (can be done at database level since soldAt is unencrypted)
    if (startDate || endDate) {
      filter.soldAt = {};
      if (startDate) filter.soldAt.$gte = new Date(startDate);
      if (endDate) filter.soldAt.$lte = new Date(endDate);
    }

    console.log("🔍 MongoDB filter:", filter);

    // Get all sales matching the basic filter
    const sales = await Sales.find(filter)
      .sort({ soldAt: -1 })
      .lean();

    console.log("🔍 Found sales count:", sales.length);

    // Decrypt and filter sales
    const decryptedSales = [];
    
    for (const sale of sales) {
      try {
        console.log("🔍 Processing sale ID:", sale._id);
        const decryptedSale = decryptSalesData(sale);
        
        // Apply filters on decrypted data
        let includeInResults = true;
        
        if (metalType && decryptedSale.metalType !== metalType.toLowerCase()) {
          includeInResults = false;
        }
        
        if (category && decryptedSale.category !== category) {
          includeInResults = false;
        }
        
        if (purity && decryptedSale.purity !== parseInt(purity)) {
          includeInResults = false;
        }
        
        if (minPrice && decryptedSale.salesPrice < parseFloat(minPrice)) {
          includeInResults = false;
        }
        
        if (maxPrice && decryptedSale.salesPrice > parseFloat(maxPrice)) {
          includeInResults = false;
        }
        
        if (customerName && !decryptedSale.customerName.toLowerCase().includes(customerName.toLowerCase())) {
          includeInResults = false;
        }
        
        if (customerAddress && !decryptedSale.customerAddress.toLowerCase().includes(customerAddress.toLowerCase())) {
          includeInResults = false;
        }
        
        if (includeInResults) {
          // Remove the encrypted data from the response
          delete decryptedSale.encryptedData;
          decryptedSales.push(decryptedSale);
        }
      } catch (error) {
        console.error("❌ Error decrypting sale:", error);
        console.error("❌ Sale ID:", sale._id);
        // Skip corrupted sales but log them
      }
    }

    console.log("🔍 Final decrypted sales count:", decryptedSales.length);

    res.json({ sales: decryptedSales });

  } catch (error) {
    console.error("❌ Error fetching sales:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// GET /api/sales/customers/search - Search customers and their purchase history
router.get("/customers/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.json({ customers: [] });
    }

    const searchTerm = q.trim().toLowerCase();
    
    // Get all sales for the user
    const sales = await Sales.find({ userId: req.userId })
      .sort({ soldAt: -1 })
      .lean();

    // Decrypt and search in customer data
    const matchingSales = [];
    
    for (const sale of sales) {
      try {
        const decryptedSale = decryptSalesData(sale);
        
        // Search in customerName and customerAddress
        const customerName = (decryptedSale.customerName || '').toLowerCase();
        const customerAddress = (decryptedSale.customerAddress || '').toLowerCase();
        
        if (customerName.includes(searchTerm) || customerAddress.includes(searchTerm)) {
          matchingSales.push(decryptedSale);
        }
      } catch (error) {
        console.error("Error decrypting sale for customer search:", error);
        // Skip corrupted sales
      }
    }

    // Group sales by customer
    const customerMap = new Map();

    matchingSales.forEach(sale => {
      const key = `${sale.customerName || ''}-${sale.customerAddress || ''}`;
      
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerName: sale.customerName || '',
          customerAddress: sale.customerAddress || '',
          customerMobile: sale.customerMobile || '',
          purchases: [],
          totalPurchases: 0,
          totalValue: 0
        });
      }

      const customer = customerMap.get(key);
      customer.purchases.push({
        saleId: sale._id,
        metalType: sale.metalType,
        category: sale.category,
        purity: sale.purity,
        weight: sale.weight,
        salesPrice: sale.salesPrice,
        soldAt: sale.soldAt,
        isBulk: sale.isBulk,
        itemCount: sale.itemCount
      });
      customer.totalPurchases += 1;
      customer.totalValue += sale.salesPrice;
    });

    const customers = Array.from(customerMap.values());

    res.json({ customers });

  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// PUT /api/sales/:id - Edit sale (price and customer info only)
router.put("/:id", async (req, res) => {
  try {
    const { salesPrice, customerName, customerAddress, customerMobile } = req.body;

    if (!salesPrice || salesPrice <= 0) {
      return res.status(400).json({ message: "Valid sales price is required" });
    }

    const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Decrypt existing data
    const existingData = decryptData(sale.data);

    // Update only allowed fields
    const updatedData = {
      ...existingData,
      salesPrice,
      customerName: customerName || '',
      customerAddress: customerAddress || '',
      customerMobile: customerMobile || ''
    };

    // Encrypt updated data
    const encryptedData = encryptData(updatedData);

    // Update sale
    sale.data = encryptedData;
    sale.soldAt = new Date(); // Update timestamp

    await sale.save();

    // Return decrypted sale data for response
    const decryptedSale = decryptSalesData(sale.toObject());
    delete decryptedSale.encryptedData;

    res.json({
      message: "Sale updated successfully",
      sale: decryptedSale
    });

  } catch (error) {
    console.error("Error updating sale:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// DELETE /api/sales/:id - Delete sale record
router.delete("/:id", async (req, res) => {
  try {
    const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    await Sales.findByIdAndDelete(req.params.id);

    res.json({ message: "Sale deleted successfully" });

  } catch (error) {
    console.error("Error deleting sale:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// POST /api/sales/:id/return - Return sale to inventory
router.post("/:id/return", async (req, res) => {
  try {
    const sale = await Sales.findOne({ _id: req.params.id, userId: req.userId });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Decrypt sales data
    const salesData = decryptData(sale.data);

    // Create entry data object
    const entryData = {
      metalType: salesData.metalType,
      category: salesData.category,
      purity: salesData.purity,
      weight: salesData.weight,
      isBulk: salesData.isBulk
    };

    if (salesData.isBulk) {
      entryData.itemCount = salesData.itemCount;
    }

    if (!salesData.isBulk) {
      // Single entry sale - create new single entry
      const encryptedData = encryptData(entryData);
      
      const newEntry = new Entry({
        userId: req.userId,
        data: encryptedData
      });

      await newEntry.save();
    } else {
      // Bulk entry sale - find existing bulk entry and add back
      const entries = await Entry.find({ userId: req.userId });
      let bulkEntry = null;

      for (const entry of entries) {
        try {
          const data = decryptData(entry.data);
          if (data.metalType === salesData.metalType && 
              data.category === salesData.category && 
              data.purity === salesData.purity && 
              data.isBulk) {
            bulkEntry = { entry, data };
            break;
          }
        } catch (error) {
          console.error("Error parsing entry during return:", error);
        }
      }

      if (bulkEntry) {
        // Add back to existing bulk entry
        bulkEntry.data.weight += salesData.weight;
        bulkEntry.data.itemCount += salesData.itemCount;
        
        const encryptedData = encryptData(bulkEntry.data);
        await Entry.findByIdAndUpdate(bulkEntry.entry._id, { data: encryptedData });
      } else {
        // Create new bulk entry if none exists
        const encryptedData = encryptData(entryData);
        
        const newEntry = new Entry({
          userId: req.userId,
          data: encryptedData
        });

        await newEntry.save();
      }
    }

    // Remove sale record
    await Sales.findByIdAndDelete(req.params.id);

    // Update metadata after returning to inventory
    await updateMetadata(req.userId);

    res.json({ message: "Sale returned to inventory successfully" });

  } catch (error) {
    console.error("Error returning sale to inventory:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;