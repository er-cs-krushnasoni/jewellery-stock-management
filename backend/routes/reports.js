const express = require("express");
const router = express.Router();
const Sales = require("../models/Sales");
const Metadata = require("../models/Metadata");
const Entry = require("../models/Entry");
const requireAuth = require("../middleware/requireAuth");
const { decryptData } = require("../utils/encrypt");
const mongoose = require('mongoose');

// Apply auth middleware to all routes
router.use(requireAuth);

// Helper function to calculate average purity for a category
const calculateCategoryAveragePurity = (category) => {
  if (!category || category.grossWeight === 0) return "0.00";
  return ((category.pureWeight / category.grossWeight) * 100).toFixed(2);
};

// Enhanced Helper Functions for Reports

/**
 * Safely decrypt data with comprehensive error handling
 * @param {string} encryptedData - Encrypted data string
 * @param {string} recordType - Type of record (for logging)
 * @param {string} recordId - ID of record (for logging)
 * @returns {Object} - { success: boolean, data: any, error: string }
 */
const safeDecryptData = (encryptedData, recordType = 'unknown', recordId = 'unknown') => {
  try {
    // Validate input
    if (!encryptedData || typeof encryptedData !== 'string') {
      return {
        success: false,
        data: null,
        error: `Invalid encrypted data: data is null, undefined, or not a string for ${recordType} ${recordId}`
      };
    }

    // Attempt decryption
    const decryptedData = decryptData(encryptedData);
    
    // Validate decrypted data
    if (decryptedData === null || decryptedData === undefined) {
      return {
        success: false,
        data: null,
        error: `Decrypted data is null or undefined for ${recordType} ${recordId}`
      };
    }

    return {
      success: true,
      data: decryptedData,
      error: null
    };
  } catch (error) {
    console.error(`Decryption error for ${recordType} ${recordId}:`, error.message);
    return {
      success: false,
      data: null,
      error: `Decryption failed for ${recordType} ${recordId}: ${error.message}`
    };
  }
};

/**
 * Batch decrypt multiple records with error tracking
 * @param {Array} records - Array of records with encrypted data
 * @param {string} recordType - Type of records
 * @returns {Object} - { successful: Array, failed: Array, summary: Object }
 */
const batchDecryptRecords = (records, recordType = 'record') => {
  const successful = [];
  const failed = [];
  const errors = [];

  records.forEach((record, index) => {
    const result = safeDecryptData(record.data, recordType, record._id || index);
    
    if (result.success) {
      successful.push({
        ...record,
        decryptedData: result.data
      });
    } else {
      failed.push({
        record: record,
        error: result.error
      });
      errors.push(result.error);
    }
  });

  return {
    successful,
    failed,
    summary: {
      totalRecords: records.length,
      successfulDecryptions: successful.length,
      failedDecryptions: failed.length,
      decryptionSuccessRate: records.length > 0 ? (successful.length / records.length * 100).toFixed(2) : 0,
      errors: errors
    }
  };
};

/**
 * Validate number with default value
 * @param {*} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} - Valid number
 */
const safeNumber = (value, defaultValue = 0, decimals = 2) => {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  
  // Round to specified decimals
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier) / multiplier;
};

/**
 * Calculate purity percentage and return as string with 2 decimal places
 * @param {number} numerator - Pure weight
 * @param {number} denominator - Gross weight
 * @returns {string} - Purity percentage as string with 2 decimal places
 */
const safePurity = (numerator, denominator) => {
  if (!denominator || denominator === 0) return "0.00";
  const purity = (numerator / denominator) * 100;
  return purity.toFixed(2);
};

/**
 * Calculate percentage with null safety
 * @param {number} numerator - Numerator
 * @param {number} denominator - Denominator
 * @param {number} precision - Decimal places
 * @returns {number} - Percentage
 */
const safePercentage = (numerator, denominator, precision = 2) => {
  if (!denominator || denominator === 0) return 0;
  const percentage = (numerator / denominator) * 100;
  return Number(percentage.toFixed(precision));
};

/**
 * Create data integrity report
 * @param {Object} stats - Statistics object
 * @returns {Object} - Formatted integrity report
 */
const createDataIntegrityReport = (stats) => {
  return {
    decryptionErrors: stats.decryptionErrors || 0,
    totalRecords: stats.totalRecords || 0,
    successfulDecryptions: stats.successfulDecryptions || 0,
    decryptionSuccessRate: stats.totalRecords > 0 
      ? Number(((stats.successfulDecryptions / stats.totalRecords) * 100).toFixed(2))
      : 0,
    processingErrors: stats.processingErrors || 0,
    skippedRecords: stats.skippedRecords || 0,
    timestamp: new Date().toISOString(),
    errors: stats.errors || []
  };
};

const formatNumber = (value, decimals = 2) => {
  return Number(value).toFixed(decimals);
};

// GET /api/reports/stock - Stock Report (UPDATED VERSION)
router.get("/stock", async (req, res) => {
  try {
    const { metalType } = req.query;
    console.log("=== STOCK REPORT DEBUG ===");
    console.log("UserId:", req.userId);
    console.log("MetalType filter:", metalType);

    // Find metadata for the user
    const metadata = await Metadata.findOne({ userId: req.userId });
    
    if (!metadata) {
      console.log("No metadata found for user");
      return res.json({
        stockReport: {
          gold: {
            totalGross: 0,
            totalPure: 0,
            averagePurity: "0.00",
            categories: {}
          },
          silver: {
            totalGross: 0,
            totalPure: 0,
            averagePurity: "0.00",
            categories: {}
          }
        },
        dataIntegrity: {
          decryptionErrors: 0,
          totalRecords: 0,
          successfulDecryptions: 0
        }
      });
    }

    // Validate and decrypt metadata using safeDecryptData
    const decryptResult = safeDecryptData(metadata.data, 'metadata', metadata._id);
    
    if (!decryptResult.success) {
      console.error("Metadata decryption failed:", decryptResult.error);
      
      // Return empty structure if metadata can't be decrypted
      return res.json({
        stockReport: {
          gold: {
            totalGross: 0,
            totalPure: 0,
            averagePurity: "0.00",
            categories: {}
          },
          silver: {
            totalGross: 0,
            totalPure: 0,
            averagePurity: "0.00",
            categories: {}
          }
        },
        dataIntegrity: {
          decryptionErrors: 1,
          totalRecords: 1,
          successfulDecryptions: 0,
          errors: [decryptResult.error]
        }
      });
    }

    const decryptedMetadata = decryptResult.data;
    console.log("Successfully decrypted metadata");

    // Extract totals with null safety
    const totalGoldGross = safeNumber(decryptedMetadata.totalGoldGross);
    const totalGoldPure = safeNumber(decryptedMetadata.totalGoldPure);
    const totalSilverGross = safeNumber(decryptedMetadata.totalSilverGross);
    const totalSilverPure = safeNumber(decryptedMetadata.totalSilverPure);

    // Calculate averages for each metal using safePurity function
    const goldAvgPurity = safePurity(totalGoldPure, totalGoldGross);
    const silverAvgPurity = safePurity(totalSilverPure, totalSilverGross);

    // Process categories by metal type with enhanced error handling
    const goldCategories = {};
    const silverCategories = {};
    let categoryProcessingErrors = 0;

    // Process categories from categoryTotals with null safety
    if (decryptedMetadata.categoryTotals && typeof decryptedMetadata.categoryTotals === 'object') {
      Object.entries(decryptedMetadata.categoryTotals).forEach(([categoryName, categoryData]) => {
        try {
          // Validate category data structure
          if (!categoryData || typeof categoryData !== 'object') {
            console.warn(`Invalid category data for ${categoryName}:`, categoryData);
            categoryProcessingErrors++;
            return;
          }

          // Safely extract category data with defaults
          const grossWeight = safeNumber(categoryData.grossWeight);
          const pureWeight = safeNumber(categoryData.pureWeight);
          const totalItems = safeNumber(categoryData.totalItems);
          const metal = categoryData.metal;

          // Use safePurity function for consistent formatting
          const averagePurity = safePurity(pureWeight, grossWeight);

          const processedCategory = {
            grossWeight: grossWeight,
            pureWeight: pureWeight,
            totalItems: totalItems,
            averagePurity: averagePurity
          };

          // Categorize by metal type
          if (metal === 'gold') {
            goldCategories[categoryName] = processedCategory;
          } else if (metal === 'silver') {
            silverCategories[categoryName] = processedCategory;
          } else {
            console.warn(`Unknown metal type for category ${categoryName}:`, metal);
            categoryProcessingErrors++;
          }
        } catch (categoryError) {
          console.error(`Error processing category ${categoryName}:`, categoryError.message);
          categoryProcessingErrors++;
        }
      });
    }

    // Build the stock report with proper structure
    const stockReport = {
      gold: {
        totalGross: totalGoldGross,
        totalPure: totalGoldPure,
        averagePurity: goldAvgPurity,
        categories: goldCategories
      },
      silver: {
        totalGross: totalSilverGross,
        totalPure: totalSilverPure,
        averagePurity: silverAvgPurity,
        categories: silverCategories
      }
    };

    // Prepare data integrity report
    const dataIntegrity = {
      decryptionErrors: decryptResult.success ? 0 : 1,
      categoryProcessingErrors: categoryProcessingErrors,
      totalRecords: 1,
      successfulDecryptions: decryptResult.success ? 1 : 0,
      totalCategories: Object.keys(goldCategories).length + Object.keys(silverCategories).length,
      goldCategories: Object.keys(goldCategories).length,
      silverCategories: Object.keys(silverCategories).length
    };

    // Return filtered response based on metalType query parameter
    if (metalType === 'gold') {
      console.log("Returning gold-only stock report");
      return res.json({ 
        stockReport: { gold: stockReport.gold },
        metalType: 'gold',
        dataIntegrity: dataIntegrity
      });
    } else if (metalType === 'silver') {
      console.log("Returning silver-only stock report");
      return res.json({ 
        stockReport: { silver: stockReport.silver },
        metalType: 'silver',
        dataIntegrity: dataIntegrity
      });
    }
    
    // Return complete stock report
    console.log("Returning complete stock report");
    console.log("Data integrity:", dataIntegrity);
    
    res.json({ 
      stockReport,
      dataIntegrity
    });

  } catch (error) {
    console.error("Error generating stock report:", error);
    
    // Return structured error response
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : "Stock report generation failed",
      dataIntegrity: {
        decryptionErrors: 1,
        totalRecords: 0,
        successfulDecryptions: 0,
        errors: [error.message]
      }
    });
  }
});
// GET /api/reports/sales - Sales Report with Enhanced Decryption (UPDATED VERSION)
router.get("/sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    console.log("=== SALES REPORT DEBUG ===");
    console.log("UserId:", req.userId);
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    // Build date filter (only for unencrypted fields)
    const dateFilter = { userId: new mongoose.Types.ObjectId(req.userId) };
    
    if (startDate || endDate) {
      dateFilter.soldAt = {};
      if (startDate) {
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        dateFilter.soldAt.$gte = startDateTime;
        console.log("Parsed start date:", startDateTime);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.soldAt.$lte = endDateTime;
        console.log("Parsed end date:", endDateTime);
      }
    }

    console.log("Date filter:", JSON.stringify(dateFilter, null, 2));

    // Get all matching sales from database
    const salesFromDB = await Sales.find(dateFilter)
      .sort({ soldAt: -1 })
      .lean();

    console.log("Found sales from DB:", salesFromDB.length);

    // Batch decrypt all sales data with enhanced error handling
    const decryptionResult = batchDecryptRecords(salesFromDB, 'sales');
    
    console.log("=== DECRYPTION SUMMARY ===");
    console.log("Total records:", decryptionResult.summary.totalRecords);
    console.log("Successful decryptions:", decryptionResult.summary.successfulDecryptions);
    console.log("Failed decryptions:", decryptionResult.summary.failedDecryptions);
    console.log("Success rate:", decryptionResult.summary.decryptionSuccessRate + "%");
    
    if (decryptionResult.failed.length > 0) {
      console.log("Failed records:", decryptionResult.failed.length);
      decryptionResult.failed.forEach((failure, index) => {
        console.log(`Failure ${index + 1}:`, failure.error);
      });
    }

    // Process successfully decrypted sales
    const decryptedSales = decryptionResult.successful.map(sale => {
      const decryptedData = sale.decryptedData;
      
      return {
        ...sale,
        // Add decrypted fields to top level for processing with safe number conversion
        metalType: decryptedData.metalType || 'unknown',
        category: decryptedData.category || 'unknown',
        purity: safeNumber(decryptedData.purity),
        weight: safeNumber(decryptedData.weight),
        isBulk: Boolean(decryptedData.isBulk),
        itemCount: safeNumber(decryptedData.itemCount, 1),
        salesPrice: safeNumber(decryptedData.salesPrice),
        customerName: decryptedData.customerName || '',
        customerAddress: decryptedData.customerAddress || '',
        customerMobile: decryptedData.customerMobile || ''
      };
    });

    console.log("Successfully processed sales:", decryptedSales.length);

    // Perform aggregation on decrypted data using JavaScript with enhanced error handling
    const salesAggregationMap = new Map();
    let processingErrors = 0;
    
    decryptedSales.forEach((sale, index) => {
      try {
        const key = `${sale.metalType}-${sale.category}-${sale.purity}`;
        
        if (!salesAggregationMap.has(key)) {
          salesAggregationMap.set(key, {
            _id: {
              metalType: sale.metalType,
              category: sale.category,
              purity: sale.purity
            },
            totalSalesAmount: 0,
            totalGrossWeight: 0,
            totalItems: 0,
            salesCount: 0,
            customers: new Set()
          });
        }
        
        const aggregation = salesAggregationMap.get(key);
        aggregation.totalSalesAmount += sale.salesPrice;
        aggregation.totalGrossWeight += sale.weight;
        aggregation.totalItems += sale.isBulk ? sale.itemCount : 1;
        aggregation.salesCount += 1;
        
        if (sale.customerMobile) {
          aggregation.customers.add(sale.customerMobile);
        }
      } catch (error) {
        console.error(`Error processing sale ${index}:`, error.message);
        processingErrors++;
      }
    });

    const salesAggregation = Array.from(salesAggregationMap.values()).map(item => ({
      ...item,
      averagePrice: item.salesCount > 0 ? safeNumber(item.totalSalesAmount / item.salesCount) : 0,
      totalPureWeight: safeNumber(item.totalGrossWeight * (item._id.purity / 100), 0, 3),
      uniqueCustomers: item.customers.size,
      customers: Array.from(item.customers)
    }));

    // Sort by total sales amount
    salesAggregation.sort((a, b) => b.totalSalesAmount - a.totalSalesAmount);

    // Calculate summary statistics with safe math
    const validSales = decryptedSales.filter(sale => sale.salesPrice > 0);
    const allSalesPrices = validSales.map(sale => sale.salesPrice);
    
    const summary = {
      totalRevenue: safeNumber(decryptedSales.reduce((sum, sale) => sum + safeNumber(sale.salesPrice), 0)),
      totalTransactions: decryptedSales.length,
      totalWeight: safeNumber(decryptedSales.reduce((sum, sale) => sum + safeNumber(sale.weight), 0), 0, 3),
      totalItems: decryptedSales.reduce((sum, sale) => sum + (sale.isBulk ? safeNumber(sale.itemCount, 1) : 1), 0),
      uniqueCustomers: new Set(decryptedSales.map(sale => sale.customerMobile).filter(mobile => mobile)).size,
      averageTransactionValue: decryptedSales.length > 0 ? 
        safeNumber(decryptedSales.reduce((sum, sale) => sum + safeNumber(sale.salesPrice), 0) / decryptedSales.length) : 0,
      allSalesPrices: allSalesPrices,
      minSalesPrice: allSalesPrices.length > 0 ? Math.min(...allSalesPrices) : 0,
      maxSalesPrice: allSalesPrices.length > 0 ? Math.max(...allSalesPrices) : 0
    };

    console.log("Summary statistics:", summary);

    // Group by metal type
    const goldSales = salesAggregation.filter(item => item._id.metalType === 'gold');
    const silverSales = salesAggregation.filter(item => item._id.metalType === 'silver');

    // Calculate top performers with safe number formatting
    const topRevenueGenerators = salesAggregation.slice(0, 10).map(item => ({
      metalType: item._id.metalType,
      category: item._id.category,
      purity: Number(item._id.purity.toFixed(2)),
      totalSalesAmount: safeNumber(item.totalSalesAmount),
      totalGrossWeight: safeNumber(item.totalGrossWeight, 0, 3),
      totalPureWeight: safeNumber(item.totalPureWeight, 0, 3),
      totalItems: item.totalItems,
      salesCount: item.salesCount,
      averagePrice: safeNumber(item.averagePrice, 0, 2),
      uniqueCustomers: item.uniqueCustomers
    }));

    // Calculate top quantity items
    const topQuantityItems = [...salesAggregation]
      .sort((a, b) => b.totalItems - a.totalItems)
      .slice(0, 10)
      .map(item => ({
        metalType: item._id.metalType,
        category: item._id.category,
        purity: item._id.purity,
        totalItems: item.totalItems,
        totalGrossWeight: safeNumber(item.totalGrossWeight, 0, 3),
        totalSalesAmount: safeNumber(item.totalSalesAmount),
        salesCount: item.salesCount
      }));

    // Calculate weight leaders
    const goldWeightLeaders = salesAggregation
      .filter(item => item._id.metalType === 'gold')
      .sort((a, b) => b.totalGrossWeight - a.totalGrossWeight)
      .slice(0, 5)
      .map(item => ({
        category: item._id.category,
        purity: item._id.purity,
        totalGrossWeight: safeNumber(item.totalGrossWeight, 0, 3),
        totalSalesAmount: safeNumber(item.totalSalesAmount)
      }));

    const silverWeightLeaders = salesAggregation
      .filter(item => item._id.metalType === 'silver')
      .sort((a, b) => b.totalGrossWeight - a.totalGrossWeight)
      .slice(0, 5)
      .map(item => ({
        category: item._id.category,
        purity: item._id.purity,
        totalGrossWeight: safeNumber(item.totalGrossWeight, 0, 3),
        totalSalesAmount: safeNumber(item.totalSalesAmount)
      }));

    // Calculate customer analytics with error handling
    const customerMap = new Map();
    
    decryptedSales.forEach((sale, index) => {
      try {
        const mobile = sale.customerMobile;
        if (!mobile) return;
        
        if (!customerMap.has(mobile)) {
          customerMap.set(mobile, {
            _id: mobile,
            customerName: sale.customerName || 'N/A',
            customerAddress: sale.customerAddress || 'N/A',
            totalPurchases: 0,
            transactionCount: 0,
            totalWeight: 0,
            lastPurchase: sale.soldAt
          });
        }
        
        const customer = customerMap.get(mobile);
        customer.totalPurchases += safeNumber(sale.salesPrice);
        customer.transactionCount += 1;
        customer.totalWeight += safeNumber(sale.weight);
        
        if (sale.soldAt > customer.lastPurchase) {
          customer.lastPurchase = sale.soldAt;
        }
      } catch (error) {
        console.error(`Error processing customer for sale ${index}:`, error.message);
        processingErrors++;
      }
    });


    const customerAnalytics = Array.from(customerMap.values())
    .map(customer => ({
      ...customer,
      averagePurchaseValue: customer.transactionCount > 0 ? 
        safeNumber(customer.totalPurchases / customer.transactionCount) : 0,
      totalPurchases: safeNumber(customer.totalPurchases),
      totalWeight: safeNumber(customer.totalWeight, 0, 3)
    }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases);

    // Calculate daily revenue with error handling
    const dailyRevenueMap = new Map();
    
    decryptedSales.forEach((sale, index) => {
      try {
        const date = new Date(sale.soldAt);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (!dailyRevenueMap.has(dateKey)) {
          dailyRevenueMap.set(dateKey, {
            date: dateKey,
            revenue: 0,
            transactions: 0,
            weight: 0
          });
        }
        
        const daily = dailyRevenueMap.get(dateKey);
        daily.revenue += safeNumber(sale.salesPrice);
        daily.transactions += 1;
        daily.weight += safeNumber(sale.weight);
      } catch (error) {
        console.error(`Error processing daily revenue for sale ${index}:`, error.message);
        processingErrors++;
      }
    });

    const dailyRevenue = Array.from(dailyRevenueMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(day => ({
        ...day,
        weight: safeNumber(day.weight, 0, 3)
      }));

    // Build final response with same structure as before
    const uniqueCustomerCount = new Set(decryptedSales.map(sale => sale.customerMobile).filter(mobile => mobile)).size;
    
    // For all-time, fetch actual first and last sale dates
    let actualStartDate = startDate || null;
    let actualEndDate = endDate || null;
    if (!startDate && !endDate && decryptedSales.length > 0) {
      const allDates = decryptedSales.map(s => new Date(s.soldAt)).filter(d => !isNaN(d));
      if (allDates.length > 0) {
        actualStartDate = new Date(Math.min(...allDates)).toISOString().split('T')[0];
        actualEndDate = new Date(Math.max(...allDates)).toISOString().split('T')[0];
      }
    }

    const salesReport = {
      dateRange: {
        startDate: actualStartDate,
        endDate: actualEndDate
      },

      summary: {
        totalRevenue: safeNumber(summary.totalRevenue),
        totalTransactions: summary.totalTransactions,
        totalItems: summary.totalItems,
        totalWeight: safeNumber(summary.totalWeight, 0, 3),
        uniqueCustomers: uniqueCustomerCount,
        averageTransactionValue: safeNumber(summary.averageTransactionValue),
        averagePurchasePerCustomer: uniqueCustomerCount > 0 
          ? safeNumber(summary.totalRevenue / uniqueCustomerCount)
          : 0,
        averagePricePerItem: summary.totalItems > 0 
          ? safeNumber(summary.totalRevenue / summary.totalItems)
          : 0
      },
      byMetal: {
        gold: {
          combinations: goldSales.map(item => ({
            category: item._id.category,
            purity: Number(item._id.purity.toFixed(2)),
            totalSalesAmount: safeNumber(item.totalSalesAmount),
            totalGrossWeight: safeNumber(item.totalGrossWeight, 0, 3),
            totalPureWeight: safeNumber(item.totalPureWeight, 0, 3),
            totalItems: item.totalItems,
            salesCount: item.salesCount,
            averagePrice: safeNumber(item.averagePrice, 0, 2),
            uniqueCustomers: item.uniqueCustomers
          })),
          totalRevenue: safeNumber(goldSales.reduce((sum, item) => sum + item.totalSalesAmount, 0)),
          totalWeight: safeNumber(goldSales.reduce((sum, item) => sum + item.totalGrossWeight, 0), 0, 3),
          totalPureWeight: safeNumber(goldSales.reduce((sum, item) => sum + item.totalPureWeight, 0), 0, 3),
          totalSalesCount: goldSales.reduce((sum, item) => sum + item.salesCount, 0)
        },
        silver: {
          combinations: silverSales.map(item => ({
            category: item._id.category,
            purity: item._id.purity,
            totalSalesAmount: safeNumber(item.totalSalesAmount),
            totalGrossWeight: safeNumber(item.totalGrossWeight, 0, 3),
            totalPureWeight: safeNumber(item.totalPureWeight, 0, 3),
            totalItems: item.totalItems,
            salesCount: item.salesCount,
            averagePrice: safeNumber(item.averagePrice, 0, 2),
            uniqueCustomers: item.uniqueCustomers
          })),
          totalRevenue: safeNumber(silverSales.reduce((sum, item) => sum + item.totalSalesAmount, 0)),
          totalWeight: safeNumber(silverSales.reduce((sum, item) => sum + item.totalGrossWeight, 0), 0, 3),
          totalPureWeight: safeNumber(silverSales.reduce((sum, item) => sum + item.totalPureWeight, 0), 0, 3),
          totalSalesCount: silverSales.reduce((sum, item) => sum + item.salesCount, 0)
        }
      },
      topPerformers: topRevenueGenerators,
      topQuantityItems: topQuantityItems,
      goldWeightLeaders: goldWeightLeaders,
      silverWeightLeaders: silverWeightLeaders,
      customerInsights: {
        totalCustomers: customerAnalytics.length,
        topCustomers: customerAnalytics.slice(0, 10).map(customer => ({
          mobile: customer._id,
          name: customer.customerName || 'N/A',
          address: customer.customerAddress || 'N/A',
          totalPurchases: safeNumber(customer.totalPurchases),
          transactionCount: customer.transactionCount,
          averagePurchaseValue: safeNumber(customer.averagePurchaseValue, 0, 2),
          lastPurchase: customer.lastPurchase
        }))
      },
      dailyRevenue: dailyRevenue,
      // Add data integrity information (kept for internal monitoring but not breaking frontend)
      dataIntegrity: createDataIntegrityReport({
        decryptionErrors: decryptionResult.summary.failedDecryptions,
        totalRecords: decryptionResult.summary.totalRecords,
        successfulDecryptions: decryptionResult.summary.successfulDecryptions,
        processingErrors: processingErrors,
        skippedRecords: decryptionResult.summary.failedDecryptions,
        errors: decryptionResult.summary.errors
      })
    };

    // Log final statistics
    console.log("=== FINAL REPORT STATISTICS ===");
    console.log("Total sales processed:", decryptedSales.length);
    console.log("Processing errors:", processingErrors);
    console.log("Data integrity score:", salesReport.dataIntegrity.decryptionSuccessRate + "%");

    res.json({ salesReport });

  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : "Sales report generation failed"
    });
  }
});

// GET /api/reports/customers - Customer List Report
router.get("/customers", async (req, res) => {
  try {
    const { 
      includeName = 'true', 
      includeAddress = 'true', 
      includeMobile = 'true', 
      includePurchaseAmount = 'true',
      includePurchaseItems = 'false'
    } = req.query;

    // Convert string booleans to actual booleans
    const includeFields = {
      name: includeName.toLowerCase() === 'true',
      address: includeAddress.toLowerCase() === 'true',
      mobile: includeMobile.toLowerCase() === 'true',
      purchaseAmount: includePurchaseAmount.toLowerCase() === 'true',
      purchaseItems: includePurchaseItems.toLowerCase() === 'true'
    };

    console.log("Customer report include fields:", includeFields);

    // Get all sales for the user
    const allSalesFromDB = await Sales.find({ userId: req.userId })
      .sort({ soldAt: -1 })
      .lean();

    console.log("Found sales from DB:", allSalesFromDB.length);

    if (!allSalesFromDB || allSalesFromDB.length === 0) {
      return res.json({
        customerReport: {
          totalCustomers: 0,
          fieldsIncluded: includeFields,
          customers: [],
          summary: {
            totalRevenue: 0,
            averageCustomerValue: 0,
            totalTransactions: 0
          },
          dataIntegrity: createDataIntegrityReport({
            totalRecords: 0,
            successfulDecryptions: 0,
            decryptionErrors: 0
          })
        }
      });
    }

    // Use safe batch decryption
    const decryptionResults = batchDecryptRecords(allSalesFromDB, 'sales');
    console.log("Decryption summary:", decryptionResults.summary);

    // Process successfully decrypted sales
    const allSales = decryptionResults.successful.map(sale => ({
      ...sale,
      // Add decrypted fields to top level with safe defaults
      metalType: sale.decryptedData.metalType || '',
      category: sale.decryptedData.category || '',
      purity: safeNumber(sale.decryptedData.purity, 0),
      weight: safeNumber(sale.decryptedData.weight, 0),
      isBulk: Boolean(sale.decryptedData.isBulk),
      itemCount: safeNumber(sale.decryptedData.itemCount, 1),
      salesPrice: safeNumber(sale.decryptedData.salesPrice, 0),
      customerName: (sale.decryptedData.customerName || '').toString().trim(),
      customerAddress: (sale.decryptedData.customerAddress || '').toString().trim(),
      customerMobile: (sale.decryptedData.customerMobile || '').toString().trim()
    }));

    console.log("Successfully processed sales:", allSales.length);

    // Enhanced deduplication logic with better customer identification
    const customerMap = new Map();
    let processingErrors = 0;

    allSales.forEach(sale => {
      try {
        // Create a unique key for customer identification with enhanced logic
        let customerKey = '';
        let keyPriority = 0; // Higher number = higher priority
        
        // Priority 1: Use mobile number if available and not empty (highest priority)
        if (sale.customerMobile && sale.customerMobile.length > 0) {
          // Normalize mobile number (remove spaces, dashes, etc.)
          const normalizedMobile = sale.customerMobile.replace(/[\s\-\(\)]/g, '');
          if (normalizedMobile.length >= 10) { // Minimum valid mobile length
            customerKey = `mobile_${normalizedMobile}`;
            keyPriority = 3;
          }
        }
        
        // Priority 2: Use name + address combination if no mobile or mobile is invalid
        if (!customerKey && sale.customerName && sale.customerName.length > 0) {
          const normalizedName = sale.customerName.toLowerCase().trim();
          const normalizedAddress = sale.customerAddress ? sale.customerAddress.toLowerCase().trim() : '';
          customerKey = `name_${normalizedName}_${normalizedAddress}`;
          keyPriority = 2;
        }
        
        // Priority 3: Use address only if no name or mobile (lowest priority)
        if (!customerKey && sale.customerAddress && sale.customerAddress.length > 0) {
          const normalizedAddress = sale.customerAddress.toLowerCase().trim();
          customerKey = `address_${normalizedAddress}`;
          keyPriority = 1;
        }

        // Skip if no customer identification available
        if (!customerKey) {
          return;
        }

        // Check if customer already exists or if we found a better key
        let existingCustomer = customerMap.get(customerKey);
        let shouldMerge = false;

        // Check for potential duplicates with different keys but same customer
        if (!existingCustomer) {
          // Look for existing customers that might be the same person
          for (let [existingKey, existingCustomerData] of customerMap) {
            if (couldBeSameCustomer(sale, existingCustomerData, keyPriority)) {
              // Merge with existing customer using the higher priority key
              if (keyPriority > existingCustomerData.keyPriority) {
                // Update to use the new, higher priority key
                customerMap.delete(existingKey);
                existingCustomer = existingCustomerData;
                shouldMerge = true;
                break;
              } else {
                // Use existing customer
                existingCustomer = existingCustomerData;
                customerKey = existingKey;
                shouldMerge = true;
                break;
              }
            }
          }
        } else {
          shouldMerge = true;
        }

        if (shouldMerge && existingCustomer) {
          // Update existing customer
          existingCustomer.totalPurchaseAmount += sale.salesPrice;
          existingCustomer.transactionCount += 1;
          existingCustomer.totalWeight += sale.weight;
          existingCustomer.totalItems += sale.isBulk ? sale.itemCount : 1;
          existingCustomer.purchases.push(sale);
          
          // Update customer info with most complete data
          if (!existingCustomer.customerName && sale.customerName) {
            existingCustomer.customerName = sale.customerName;
          }
          if (!existingCustomer.customerAddress && sale.customerAddress) {
            existingCustomer.customerAddress = sale.customerAddress;
          }
          if (!existingCustomer.customerMobile && sale.customerMobile) {
            existingCustomer.customerMobile = sale.customerMobile;
          }
          
          // Update dates
          if (sale.soldAt < existingCustomer.firstPurchase) {
            existingCustomer.firstPurchase = sale.soldAt;
          }
          if (sale.soldAt > existingCustomer.lastPurchase) {
            existingCustomer.lastPurchase = sale.soldAt;
          }

          customerMap.set(customerKey, existingCustomer);
        } else {
          // Create new customer entry
          customerMap.set(customerKey, {
            customerName: sale.customerName,
            customerAddress: sale.customerAddress,
            customerMobile: sale.customerMobile,
            totalPurchaseAmount: sale.salesPrice,
            transactionCount: 1,
            totalWeight: sale.weight,
            totalItems: sale.isBulk ? sale.itemCount : 1,
            firstPurchase: sale.soldAt,
            lastPurchase: sale.soldAt,
            purchases: [sale],
            keyPriority: keyPriority
          });
        }
      } catch (error) {
        console.error("Error processing sale for customer grouping:", error);
        processingErrors++;
      }
    });

    // Convert map to array and apply enhanced filtering
    let customers = Array.from(customerMap.values());
    console.log("Total unique customers before filtering:", customers.length);

    // Enhanced filtering logic - Only show customers who have the selected fields
    customers = customers.filter(customer => {
      // Check if customer has all the required fields that are selected
      if (includeFields.name && (!customer.customerName || customer.customerName.length === 0)) {
        return false;
      }
      if (includeFields.address && (!customer.customerAddress || customer.customerAddress.length === 0)) {
        return false;
      }
      if (includeFields.mobile && (!customer.customerMobile || customer.customerMobile.length === 0)) {
        return false;
      }
      // Note: purchaseAmount is always available from sales data, so we don't filter it out
      return true;
    });

    console.log("Customers after filtering:", customers.length);

    // Map customers to include only selected fields with safe data handling
    customers = customers.map(customer => {
      const result = {};

      if (includeFields.name) {
        result.customerName = customer.customerName || '';
      }
      
      if (includeFields.address) {
        result.customerAddress = customer.customerAddress || '';
      }
      
      if (includeFields.mobile) {
        result.customerMobile = customer.customerMobile || '';
      }
      
      if (includeFields.purchaseAmount) {
        result.totalPurchaseAmount = Math.round(customer.totalPurchaseAmount * 100) / 100;
        result.transactionCount = customer.transactionCount;
        result.totalWeight = Math.round(customer.totalWeight * 1000) / 1000;
        result.totalItems = customer.totalItems;
        result.averagePurchaseValue = customer.transactionCount > 0 
          ? Math.round((customer.totalPurchaseAmount / customer.transactionCount) * 100) / 100
          : 0;
        result.firstPurchase = customer.firstPurchase;
        result.lastPurchase = customer.lastPurchase;
      }

      if (includeFields.purchaseItems) {
        // Create detailed purchase items list with safe data access
        result.purchaseItems = customer.purchases.map(purchase => {
          const metalType = purchase.metalType ? 
            purchase.metalType.charAt(0).toUpperCase() + purchase.metalType.slice(1) : 
            'Unknown';
          const category = purchase.category || 'Unknown';
          const weight = purchase.weight || 0;
          const purity = purchase.purity || 0;
          const itemCount = purchase.isBulk && purchase.itemCount > 1 ? 
            ` (${purchase.itemCount} items)` : '';
          
          return `${metalType}_${category}, W: ${weight}gm, P: ${purity}%${itemCount}`;
        });
      }

      return result;
    });

    // Sort by total purchase amount (descending) with safe comparison
    customers.sort((a, b) => {
      const amountA = safeNumber(a.totalPurchaseAmount, 0);
      const amountB = safeNumber(b.totalPurchaseAmount, 0);
      return amountB - amountA;
    });

    // Calculate summary statistics with safe math
    const totalRevenue = customers.reduce((sum, c) => sum + safeNumber(c.totalPurchaseAmount, 0), 0);
    const totalTransactions = customers.reduce((sum, c) => sum + safeNumber(c.transactionCount, 0), 0);

    const customerReport = {
      totalCustomers: customers.length,
      fieldsIncluded: includeFields,
      customers: customers,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageCustomerValue: customers.length > 0 
          ? Math.round((totalRevenue / customers.length) * 100) / 100
          : 0,
        totalTransactions: totalTransactions
      },
      dataIntegrity: createDataIntegrityReport({
        totalRecords: allSalesFromDB.length,
        successfulDecryptions: decryptionResults.successful.length,
        decryptionErrors: decryptionResults.failed.length,
        processingErrors: processingErrors,
        skippedRecords: decryptionResults.failed.length,
        errors: decryptionResults.summary.errors
      })
    };

    console.log("Customer report summary:", customerReport.summary);
    console.log("Data integrity:", customerReport.dataIntegrity);

    res.json({ customerReport });

  } catch (error) {
    console.error("Error generating customer report:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message,
      dataIntegrity: createDataIntegrityReport({
        totalRecords: 0,
        successfulDecryptions: 0,
        decryptionErrors: 1,
        errors: [error.message]
      })
    });
  }
});

/**
 * Helper function to determine if two customer records could be the same person
 * @param {Object} sale - New sale record
 * @param {Object} existingCustomer - Existing customer record
 * @param {number} newKeyPriority - Priority of the new key
 * @returns {boolean} - True if they could be the same customer
 */
function couldBeSameCustomer(sale, existingCustomer, newKeyPriority) {
  // If we have mobile numbers, they must match
  if (sale.customerMobile && existingCustomer.customerMobile) {
    const normalizedSaleMobile = sale.customerMobile.replace(/[\s\-\(\)]/g, '');
    const normalizedExistingMobile = existingCustomer.customerMobile.replace(/[\s\-\(\)]/g, '');
    return normalizedSaleMobile === normalizedExistingMobile;
  }
  
  // If we have names, check for similarity
  if (sale.customerName && existingCustomer.customerName) {
    const normalizedSaleName = sale.customerName.toLowerCase().trim();
    const normalizedExistingName = existingCustomer.customerName.toLowerCase().trim();
    
    // Exact match
    if (normalizedSaleName === normalizedExistingName) {
      return true;
    }
    
    // Check if addresses also match (for same name different address scenario)
    if (sale.customerAddress && existingCustomer.customerAddress) {
      const normalizedSaleAddress = sale.customerAddress.toLowerCase().trim();
      const normalizedExistingAddress = existingCustomer.customerAddress.toLowerCase().trim();
      return normalizedSaleAddress === normalizedExistingAddress;
    }
  }
  
  // If we only have addresses, they must match exactly
  if (sale.customerAddress && existingCustomer.customerAddress && 
      !sale.customerName && !existingCustomer.customerName && 
      !sale.customerMobile && !existingCustomer.customerMobile) {
    const normalizedSaleAddress = sale.customerAddress.toLowerCase().trim();
    const normalizedExistingAddress = existingCustomer.customerAddress.toLowerCase().trim();
    return normalizedSaleAddress === normalizedExistingAddress;
  }
  
  return false;
}

// POST /api/reports/download
router.post("/download", async (req, res) => {
  try {
    const { reportType, format, includeEntries = false, startDate, endDate, fields, fieldSelection } = req.body;
    
    // Validate inputs
    if (!reportType || !format) {
      return res.status(400).json({ 
        message: "Report type and format are required" 
      });
    }
    
    const validReportTypes = ['stock-gold', 'stock-silver', 'stock-full', 'sales', 'customers'];
    const validFormats = ['pdf', 'excel'];
    
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ 
        message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}` 
      });
    }
    
    if (!validFormats.includes(format)) {
      return res.status(400).json({ 
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}` 
      });
    }

    // Initialize statistics tracking
    const stats = {
      totalRecords: 0,
      successfulDecryptions: 0,
      decryptionErrors: 0,
      processingErrors: 0,
      skippedRecords: 0,
      errors: []
    };

    // Get data based on report type
    let reportData = {};
    let reportTitle = '';
    
    switch (reportType) {
      case 'stock-gold':
      case 'stock-silver':
      case 'stock-full':
        try {
          const metadata = await Metadata.findOne({ userId: req.userId });
          
          if (!metadata) {
            return res.status(404).json({ message: "No stock data found" });
          }
          
          stats.totalRecords++;
          
          // Decrypt metadata with error handling
          const metadataDecryption = safeDecryptData(metadata.data, 'metadata', metadata._id);
          if (!metadataDecryption.success) {
            stats.decryptionErrors++;
            stats.errors.push(metadataDecryption.error);
            return res.status(500).json({ 
              message: "Failed to decrypt metadata", 
              error: metadataDecryption.error 
            });
          }
          
          stats.successfulDecryptions++;
          const decryptedMetadata = metadataDecryption.data;
          
          // Get detailed entries if requested
          let goldEntries = [];
          let silverEntries = [];
          
          if (includeEntries) {
            try {
              const entries = await Entry.find({ userId: req.userId }).sort({ createdAt: -1 });
              
              if (entries.length > 0) {
                const entriesDecryption = batchDecryptRecords(entries, 'entry');
                stats.totalRecords += entriesDecryption.summary.totalRecords;
                stats.successfulDecryptions += entriesDecryption.summary.successfulDecryptions;
                stats.decryptionErrors += entriesDecryption.summary.failedDecryptions;
                stats.errors.push(...entriesDecryption.summary.errors);
                
                // Process successfully decrypted entries
                const decryptedEntries = entriesDecryption.successful.map((e) => ({
                  _id: e._id,
                  createdAt: e.createdAt,
                  ...e.decryptedData
                }));
                
                goldEntries = decryptedEntries.filter(entry => entry.metalType === 'gold');
                silverEntries = decryptedEntries.filter(entry => entry.metalType === 'silver');
              }
            } catch (entriesError) {
              console.error("Error fetching entries:", entriesError);
              stats.processingErrors++;
              stats.errors.push(`Failed to fetch entries: ${entriesError.message}`);
            }
          }
          
          // Build categories with original keys and safe number handling
          const categories = {};
          if (decryptedMetadata.categoryTotals) {
            Object.entries(decryptedMetadata.categoryTotals).forEach(([categoryKey, categoryData]) => {
              const grossWeight = safeNumber(categoryData.grossWeight, 0);
              const pureWeight = safeNumber(categoryData.pureWeight, 0);
              const totalItems = safeNumber(categoryData.totalItems, 0);
              
              categories[categoryKey] = {
                grossWeight,
                pureWeight,
                totalItems,
                averagePurity: grossWeight > 0 
                  ? safePercentage(pureWeight, grossWeight)
                  : 0,
                purities: categoryData.purities || {}
              };
            });
          }
          
          // Build report data based on type with memory-efficient approach
          if (reportType === 'stock-gold') {
            // Filter only gold categories
            const goldCategories = {};
            Object.entries(categories).forEach(([key, data]) => {
              if (key.includes('_gold')) {
                goldCategories[key] = data;
              }
            });
            
            const totalGoldGross = safeNumber(decryptedMetadata.totalGoldGross, 0);
            const totalGoldPure = safeNumber(decryptedMetadata.totalGoldPure, 0);
            
            reportData = {
              totalGross: totalGoldGross,
              totalPure: totalGoldPure,
              averagePurity: totalGoldGross > 0 
                ? safePercentage(totalGoldPure, totalGoldGross)
                : 0,
              categories: goldCategories,
              entries: goldEntries
            };
            reportTitle = 'Gold Stock Report';
            
          } else if (reportType === 'stock-silver') {
            // Filter only silver categories
            const silverCategories = {};
            Object.entries(categories).forEach(([key, data]) => {
              if (key.includes('_silver')) {
                silverCategories[key] = data;
              }
            });
            
            const totalSilverGross = safeNumber(decryptedMetadata.totalSilverGross, 0);
            const totalSilverPure = safeNumber(decryptedMetadata.totalSilverPure, 0);
            
            reportData = {
              totalGross: totalSilverGross,
              totalPure: totalSilverPure,
              averagePurity: totalSilverGross > 0 
                ? safePercentage(totalSilverPure, totalSilverGross)
                : 0,
              categories: silverCategories,
              entries: silverEntries
            };
            reportTitle = 'Silver Stock Report';
            
          } else {
            // Full report - all categories
            const totalGoldGross = safeNumber(decryptedMetadata.totalGoldGross, 0);
            const totalGoldPure = safeNumber(decryptedMetadata.totalGoldPure, 0);
            const totalSilverGross = safeNumber(decryptedMetadata.totalSilverGross, 0);
            const totalSilverPure = safeNumber(decryptedMetadata.totalSilverPure, 0);
            
            reportData = {
              totalGoldGross,
              totalGoldPure,
              totalSilverGross,
              totalSilverPure,
              goldAveragePurity: totalGoldGross > 0 
                ? safePercentage(totalGoldPure, totalGoldGross)
                : 0,
              silverAveragePurity: totalSilverGross > 0 
                ? safePercentage(totalSilverPure, totalSilverGross)
                : 0,
              categories: categories,
              entries: [...goldEntries, ...silverEntries]
            };
            reportTitle = 'Complete Stock Report';
          }
          
          // Clear large arrays from memory if not needed
          if (!includeEntries) {
            goldEntries = null;
            silverEntries = null;
          }
          
        } catch (stockError) {
          console.error("Error generating stock report:", stockError);
          stats.processingErrors++;
          stats.errors.push(`Stock report generation failed: ${stockError.message}`);
          return res.status(500).json({ 
            message: "Error generating stock report", 
            error: stockError.message 
          });
        }
        break;
      
      case 'sales':
        try {
          // Build date filter
          const dateFilter = { userId: new mongoose.Types.ObjectId(req.userId) };
          
          if (startDate || endDate) {
            dateFilter.soldAt = {};
            if (startDate) {
              const startDateTime = new Date(startDate);
              startDateTime.setHours(0, 0, 0, 0);
              dateFilter.soldAt.$gte = startDateTime;
            }
            if (endDate) {
              const endDateTime = new Date(endDate);
              endDateTime.setHours(23, 59, 59, 999);
              dateFilter.soldAt.$lte = endDateTime;
            }
          }
          
          // Get all matching sales from database
          const salesFromDB = await Sales.find(dateFilter)
            .sort({ soldAt: -1 })
            .lean();
          
          if (salesFromDB.length === 0) {
            return res.status(404).json({ message: "No sales data found for the specified criteria" });
          }
          
          // Batch decrypt sales data
          const salesDecryption = batchDecryptRecords(salesFromDB, 'sale');
          stats.totalRecords += salesDecryption.summary.totalRecords;
          stats.successfulDecryptions += salesDecryption.summary.successfulDecryptions;
          stats.decryptionErrors += salesDecryption.summary.failedDecryptions;
          stats.errors.push(...salesDecryption.summary.errors);
          
          if (salesDecryption.successful.length === 0) {
            return res.status(500).json({ 
              message: "No valid sales data could be decrypted",
              dataIntegrity: createDataIntegrityReport(stats)
            });
          }
          
          // Process decrypted sales with safe number handling
          // Process decrypted sales with safe number handling
const decryptedSales = salesDecryption.successful.map(sale => ({
  ...sale,
  metalType: sale.decryptedData.metalType || 'unknown',
  category: sale.decryptedData.category || 'unknown',
  purity: safeNumber(sale.decryptedData.purity, 0, 2), // ✅ FIXED
  weight: safeNumber(sale.decryptedData.weight, 0),
  isBulk: Boolean(sale.decryptedData.isBulk),
  itemCount: safeNumber(sale.decryptedData.itemCount, 1),
  salesPrice: safeNumber(sale.decryptedData.salesPrice, 0),
  customerName: sale.decryptedData.customerName || '',
  customerAddress: sale.decryptedData.customerAddress || '',
  customerMobile: sale.decryptedData.customerMobile || ''
}));
          
          // Perform aggregation on decrypted data using JavaScript
          const salesAggregationMap = new Map();
          
          decryptedSales.forEach(sale => {
            const key = `${sale.metalType}-${sale.category}-${sale.purity}`;
            
            if (!salesAggregationMap.has(key)) {
              salesAggregationMap.set(key, {
                _id: {
                  metalType: sale.metalType,
                  category: sale.category,
                  purity: sale.purity
                },
                totalSalesAmount: 0,
                totalGrossWeight: 0,
                totalItems: 0,
                salesCount: 0
              });
            }
            
            const aggregation = salesAggregationMap.get(key);
            aggregation.totalSalesAmount += sale.salesPrice;
            aggregation.totalGrossWeight += sale.weight;
            aggregation.totalItems += sale.isBulk ? sale.itemCount : 1;
            aggregation.salesCount += 1;
          });
          
          // Convert map to array and calculate additional fields
          const salesAggregation = Array.from(salesAggregationMap.values()).map(item => ({
            ...item,
            averagePrice: item.salesCount > 0 ? safeNumber(item.totalSalesAmount / item.salesCount, 0) : 0,
            totalPureWeight: safeNumber(item.totalGrossWeight * (item._id.purity / 100), 0)
          }));
          
          // Sort by total sales amount
          salesAggregation.sort((a, b) => b.totalSalesAmount - a.totalSalesAmount);
          
          // Calculate summary with safe number handling
          const summary = {
            totalRevenue: decryptedSales.reduce((sum, sale) => sum + sale.salesPrice, 0),
            totalItems: decryptedSales.reduce((sum, sale) => sum + (sale.isBulk ? sale.itemCount : 1), 0),
            totalWeight: decryptedSales.reduce((sum, sale) => sum + sale.weight, 0)
          };
          
          // Separate gold and silver sales
          const goldSales = salesAggregation.filter(item => item._id.metalType === 'gold');
          const silverSales = salesAggregation.filter(item => item._id.metalType === 'silver');
          
          // Build report data structure
          // For all-time, compute actual date range from the data
          let dlActualStart = startDate || null;
          let dlActualEnd = endDate || null;
          if (!startDate && !endDate && decryptedSales.length > 0) {
            const allDates = decryptedSales.map(s => new Date(s.soldAt)).filter(d => !isNaN(d));
            if (allDates.length > 0) {
              dlActualStart = new Date(Math.min(...allDates)).toISOString().split('T')[0];
              dlActualEnd = new Date(Math.max(...allDates)).toISOString().split('T')[0];
            }
          }

          reportData = {
            dateRange: {
              startDate: dlActualStart,
              endDate: dlActualEnd
            },
            summary: {
              totalRevenue: summary.totalRevenue,
              totalItems: summary.totalItems,
              totalWeight: Number(summary.totalWeight.toFixed(3))
            },
            byMetal: {
              gold: {
                totalRevenue: goldSales.reduce((sum, item) => sum + item.totalSalesAmount, 0),
                totalWeight: Number(goldSales.reduce((sum, item) => sum + item.totalGrossWeight, 0).toFixed(3)),
                totalPureWeight: Number(goldSales.reduce((sum, item) => sum + item.totalPureWeight, 0).toFixed(3))
              },
              silver: {
                totalRevenue: silverSales.reduce((sum, item) => sum + item.totalSalesAmount, 0),
                totalWeight: Number(silverSales.reduce((sum, item) => sum + item.totalGrossWeight, 0).toFixed(3)),
                totalPureWeight: Number(silverSales.reduce((sum, item) => sum + item.totalPureWeight, 0).toFixed(3))
              }
            },
            topPerformers: salesAggregation.map(item => ({
              metalType: item._id.metalType,
              category: item._id.category,
              purity: item._id.purity,
              totalSalesAmount: item.totalSalesAmount,
              totalGrossWeight: Number(item.totalGrossWeight.toFixed(3)),
              totalPureWeight: Number(item.totalPureWeight.toFixed(3)),
              totalItems: item.totalItems,
              salesCount: item.salesCount,
              averagePrice: Number(item.averagePrice.toFixed(2))
            })),
            entries: includeEntries ? decryptedSales : []
          };
          
          reportTitle = 'Sales Report';
          
          // Clear large arrays from memory
          if (!includeEntries) {
            salesAggregationMap.clear();
          }
          
        } catch (salesError) {
          console.error("Error generating sales report:", salesError);
          stats.processingErrors++;
          stats.errors.push(`Sales report generation failed: ${salesError.message}`);
          return res.status(500).json({ 
            message: "Error generating sales report", 
            error: salesError.message 
          });
        }
        break;
        
      case 'customers':
        try {
          // Get all sales data to build customer information
          const allSalesFromDB = await Sales.find({ userId: req.userId })
            .sort({ soldAt: -1 })
            .lean();
          
          if (allSalesFromDB.length === 0) {
            return res.status(404).json({ message: "No sales data found to generate customer report" });
          }
          
          // Batch decrypt sales data
          const customerSalesDecryption = batchDecryptRecords(allSalesFromDB, 'sale');
          stats.totalRecords += customerSalesDecryption.summary.totalRecords;
          stats.successfulDecryptions += customerSalesDecryption.summary.successfulDecryptions;
          stats.decryptionErrors += customerSalesDecryption.summary.failedDecryptions;
          stats.errors.push(...customerSalesDecryption.summary.errors);
          
          if (customerSalesDecryption.successful.length === 0) {
            return res.status(500).json({ 
              message: "No valid sales data could be decrypted for customer report",
              dataIntegrity: createDataIntegrityReport(stats)
            });
          }
          
          // Process decrypted sales for customer analysis
          const allSales = customerSalesDecryption.successful.map(sale => ({
            ...sale,
            metalType: sale.decryptedData.metalType || 'unknown',
            category: sale.decryptedData.category || 'unknown',
            purity: safeNumber(sale.decryptedData.purity, 0),
            weight: safeNumber(sale.decryptedData.weight, 0),
            isBulk: Boolean(sale.decryptedData.isBulk),
            itemCount: safeNumber(sale.decryptedData.itemCount, 1),
            salesPrice: safeNumber(sale.decryptedData.salesPrice, 0),
            customerName: (sale.decryptedData.customerName || '').trim(),
            customerAddress: (sale.decryptedData.customerAddress || '').trim(),
            customerMobile: (sale.decryptedData.customerMobile || '').trim()
          }));
          
          // Group customers manually with improved logic
          const customerMap = new Map();
          
          allSales.forEach(sale => {
            // Skip sales with no customer information
            if (!sale.customerName && !sale.customerAddress && !sale.customerMobile) {
              stats.skippedRecords++;
              return;
            }
            
            // Create a unique key for customer identification
            let customerKey = '';
            
            // Priority 1: Use mobile number if available and not empty
            if (sale.customerMobile && sale.customerMobile !== '') {
              customerKey = `mobile_${sale.customerMobile}`;
            } 
            // Priority 2: Use name + address combination if no mobile
            else if (sale.customerName && sale.customerName !== '') {
              customerKey = `name_${sale.customerName}_${sale.customerAddress}`;
            }
            // Priority 3: Use address only if no name or mobile
            else if (sale.customerAddress && sale.customerAddress !== '') {
              customerKey = `address_${sale.customerAddress}`;
            }
            // Skip if no customer identification available
            else {
              stats.skippedRecords++;
              return;
            }
            
            if (customerMap.has(customerKey)) {
              // Update existing customer
              const existing = customerMap.get(customerKey);
              existing.totalPurchaseAmount += sale.salesPrice;
              existing.transactionCount += 1;
              existing.totalWeight += sale.weight;
              existing.totalItems += sale.isBulk ? sale.itemCount : 1;
              existing.transactions.push({
                date: sale.soldAt,
                amount: sale.salesPrice,
                metalType: sale.metalType,
                category: sale.category,
                weight: sale.weight,
                purity: sale.purity,
                itemCount: sale.isBulk ? sale.itemCount : 1,
                isBulk: sale.isBulk,
                description: `${sale.metalType}_${sale.category}, W: ${sale.weight}gm, P: ${sale.purity}%`
              });
              
              // Update dates
              if (sale.soldAt > existing.lastPurchaseDate) {
                existing.lastPurchaseDate = sale.soldAt;
              }
            } else {
              // Create new customer entry
              customerMap.set(customerKey, {
                customerName: sale.customerName || '',
                customerAddress: sale.customerAddress || '',
                customerMobile: sale.customerMobile || '',
                totalPurchaseAmount: sale.salesPrice,
                transactionCount: 1,
                totalWeight: sale.weight,
                totalItems: sale.isBulk ? sale.itemCount : 1,
                lastPurchaseDate: sale.soldAt,
                transactions: [{
                  date: sale.soldAt,
                  amount: sale.salesPrice,
                  metalType: sale.metalType,
                  category: sale.category,
                  weight: sale.weight,
                  purity: sale.purity,
                  itemCount: sale.isBulk ? sale.itemCount : 1,
                  isBulk: sale.isBulk,
                  description: `${sale.metalType}_${sale.category}, W: ${sale.weight}gm, P: ${sale.purity}%`
                }]
              });
            }
          });
          
          // Convert map to array and filter based on fieldSelection
          let customers = Array.from(customerMap.values()).map(customer => {
            const customerData = {};
            
            // Always include basic data but filter based on fieldSelection
            if (!fieldSelection || fieldSelection.includeName) {
              customerData.customerName = customer.customerName || 'N/A';
            }
            if (!fieldSelection || fieldSelection.includeMobile) {
              customerData.customerMobile = customer.customerMobile || 'N/A';
            }
            if (!fieldSelection || fieldSelection.includeAddress) {
              customerData.customerAddress = customer.customerAddress || 'N/A';
            }
            if (!fieldSelection || fieldSelection.includePurchaseAmount) {
              customerData.totalPurchaseAmount = customer.totalPurchaseAmount || 0;
            }
            if (!fieldSelection || fieldSelection.includePurchaseItems) {
              customerData.transactions = customer.transactions || [];
              customerData.transactionCount = customer.transactionCount || 0;
            }
            
            // Always include for calculations with safe number handling
            customerData.averagePurchaseValue = customer.transactionCount > 0 
              ? Number((customer.totalPurchaseAmount / customer.transactionCount).toFixed(2))
              : 0;
            customerData.lastPurchaseDate = customer.lastPurchaseDate || null;
            
            return customerData;
          });
          
          // Sort by total purchase amount (descending)
          customers.sort((a, b) => (b.totalPurchaseAmount || 0) - (a.totalPurchaseAmount || 0));
          
          // Calculate summary statistics with safe number handling
          const summary = {
            totalCustomers: customers.length,
            totalRevenue: customers.reduce((sum, customer) => sum + (customer.totalPurchaseAmount || 0), 0),
            averageCustomerValue: customers.length > 0 
              ? Number((customers.reduce((sum, customer) => sum + (customer.totalPurchaseAmount || 0), 0) / customers.length).toFixed(2))
              : 0,
            topSpendingCustomer: customers.length > 0 ? customers[0] : null,
            averageTransactionsPerCustomer: customers.length > 0
              ? Number((customers.reduce((sum, customer) => sum + (customer.transactionCount || 0), 0) / customers.length).toFixed(2))
              : 0,
            totalTransactions: customers.reduce((sum, customer) => sum + (customer.transactionCount || 0), 0),
            totalItemsPurchased: customers.reduce((sum, customer) => {
              if (customer.transactions) {
                return sum + customer.transactions.reduce((itemSum, transaction) => itemSum + (transaction.itemCount || 1), 0);
              }
              return sum;
            }, 0)
          };
          
          reportData = {
            summary: summary,
            customers: customers,
            metadata: {
              totalRecords: customers.length,
              generatedAt: new Date().toISOString(),
              requestedFields: fields || ['all'],
              fieldSelection: fieldSelection || {},
              dataSource: 'sales_transactions'
            }
          };
          reportTitle = 'Customer Report';
          
          // Clear large maps from memory
          customerMap.clear();
          
        } catch (customerError) {
          console.error('Error generating customer report:', customerError);
          stats.processingErrors++;
          stats.errors.push(`Customer report generation failed: ${customerError.message}`);
          return res.status(500).json({ 
            message: "Error generating customer report", 
            error: customerError.message 
          });
        }
        break;
        
      default:
        return res.status(400).json({ message: "Invalid report type" });
    }
    
    // Create download data with data integrity report
    const downloadData = {
      reportTitle,
      reportType,
      format,
      generatedAt: new Date().toLocaleDateString('en-GB'),
      data: reportData,
      metadata: {
        userId: req.userId,
        includeEntries: includeEntries,
        totalRecords: Array.isArray(reportData.entries) ? reportData.entries.length : 0,
        dataIntegrity: createDataIntegrityReport(stats)
      }
    };
    
    // Log data integrity issues if any
    if (stats.decryptionErrors > 0 || stats.processingErrors > 0) {
      console.warn(`Report generated with issues:`, {
        reportType,
        userId: req.userId,
        ...stats
      });
    }
    
    res.json({
      message: "Report data prepared for download",
      downloadReady: true,
      downloadData: downloadData,
      instructions: "Use the downloadData object to generate the file on the frontend using libraries like jsPDF for PDF or xlsx for Excel"
    });
    
  } catch (error) {
    console.error("Error preparing download:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

module.exports = router;
