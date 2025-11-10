import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/ui/BackButton';  
import { Card } from '../components/ui/card';
import { Button } from "../components/ui/button";
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart,Line,XAxis, YAxis, CartesianGrid,} from 'recharts'; 
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  Users, 
  Package, 
  FileText,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  PieChart as PieChartIcon, 
  BarChart3 
} from 'lucide-react';

// Convert DD/MM/YYYY to ISO date (YYYY-MM-DD) for API
const formatDateForAPI = (displayDate) => {
  if (!displayDate) return '';
  
  // If it's already in ISO format, return as is
  if (displayDate.includes('-') && displayDate.length === 10) {
    return displayDate;
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const [day, month, year] = displayDate.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// Format date object to DD/MM/YYYY
const formatDateObjectForDisplay = (dateObj) => {
  if (!dateObj) return '';
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

// Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY for display
const formatDateForDisplay = (isoDate) => {
  if (!isoDate) return '';
  
  // If it's already in DD/MM/YYYY format, return as is
  if (isoDate.includes('/') && isoDate.length === 10) {
    return isoDate;
  }
  
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

// Format date from API response for display
const formatAPIDateForDisplay = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return formatDateObjectForDisplay(date);
};


const ReportPage = () => {
  const { user } = useAuth();
  
  // State management
  const [stockData, setStockData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [jsPDFLoaded, setJsPDFLoaded] = useState(false);
  const [loading, setLoading] = useState({
    stock: false,
    sales: false,
    customers: false
  });
  

  
  // Customer report filters
  const [customerFields, setCustomerFields] = useState({
    name: true,
    address: true,
    mobile: true,
    purchaseAmount: true,
    purchaseItems: false  // New field added
  });
  
  // Modal states
  const [downloadModal, setDownloadModal] = useState({
    open: false,
    type: '',
    data: null
  });

  const [categoryData, setCategoryData] = useState({
    gold: [],
    silver: []
  });
  
  const [includeEntries, setIncludeEntries] = useState(false);
  const [error, setError] = useState('');
  

  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', 
    '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1'
  ];
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // Position label outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text 
        x={x} 
        y={y} 
        fill="#374151" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${name}: ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // Load jsPDF library
  const loadJsPDF = () => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existingJsPDF = window.jsPDF || window.jspdf || 
                           (window.jsPDF && window.jsPDF.jsPDF) || 
                           (window.jspdf && window.jspdf.jsPDF);
      
      if (existingJsPDF) {
        console.log('jsPDF already loaded');
        setJsPDFLoaded(true);
        resolve();
        return;
      }
  
      // Remove any existing jsPDF script tags
      const existingScripts = document.querySelectorAll('script[src*="jspdf"]');
      existingScripts.forEach(script => script.remove());
  
      // Create script element with a more reliable CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('jsPDF script loaded');
        
        // Give more time for the library to fully initialize
        setTimeout(() => {
          // Check for jsPDF in various possible locations
          const jsPDFConstructor = window.jsPDF || window.jspdf || 
                                  (window.jsPDF && window.jsPDF.jsPDF) || 
                                  (window.jspdf && window.jspdf.jsPDF);
          
          console.log('Available PDF properties:', Object.keys(window).filter(key => 
            key.toLowerCase().includes('pdf') || key.toLowerCase().includes('jspdf')
          ));
          
          if (jsPDFConstructor) {
            console.log('jsPDF constructor found:', typeof jsPDFConstructor);
            setJsPDFLoaded(true);
            resolve();
          } else {
            console.error('jsPDF constructor not found after loading');
            reject(new Error('jsPDF failed to load properly'));
          }
        }, 500); // Increased timeout to 500ms
      };
      
      script.onerror = (error) => {
        console.error('Failed to load jsPDF script from primary CDN:', error);
        
        // Try alternative CDN
        const altScript = document.createElement('script');
        altScript.src = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
        altScript.async = true;
        altScript.crossOrigin = 'anonymous';
        
        altScript.onload = () => {
          console.log('jsPDF loaded from alternative CDN');
          setTimeout(() => {
            const jsPDFConstructor = window.jsPDF || window.jspdf || 
                                    (window.jsPDF && window.jsPDF.jsPDF) || 
                                    (window.jspdf && window.jspdf.jsPDF);
            
            if (jsPDFConstructor) {
              console.log('jsPDF constructor found from alt CDN');
              setJsPDFLoaded(true);
              resolve();
            } else {
              reject(new Error('jsPDF failed to load from both CDNs'));
            }
          }, 500);
        };
        
        altScript.onerror = () => {
          reject(new Error('Failed to load jsPDF library from both CDNs'));
        };
        
        // Remove the failed script and add the alternative
        script.remove();
        document.head.appendChild(altScript);
      };
      
      document.head.appendChild(script);
    });
  };

  // Initialize jsPDF on component mount
  useEffect(() => {
    loadJsPDF().catch(err => {
      console.error('Failed to load jsPDF:', err);
      setError('PDF library failed to load. PDF downloads may not work.');
    });
  }, []);

  // Fetch stock data
const processStockDataForCharts = (stockData) => {
    const goldCategories = [];
    const silverCategories = [];
  
    // Process gold categories - only add if pureWeight > 0
    if (stockData.gold && stockData.gold.categories) {
      Object.entries(stockData.gold.categories).forEach(([categoryName, categoryData]) => {
        const pureWeight = parseFloat(categoryData.pureWeight) || 0;
        if (pureWeight > 0) {
          goldCategories.push({
            name: categoryName,
            value: pureWeight
          });
        }
      });
    }
  
    // Process silver categories - only add if pureWeight > 0
    if (stockData.silver && stockData.silver.categories) {
      Object.entries(stockData.silver.categories).forEach(([categoryName, categoryData]) => {
        const pureWeight = parseFloat(categoryData.pureWeight) || 0;
        if (pureWeight > 0) {
          silverCategories.push({
            name: categoryName,
            value: pureWeight
          });
        }
      });
    }
  
    console.log('Processed gold categories:', goldCategories);
    console.log('Processed silver categories:', silverCategories);
  
    return {
      gold: goldCategories,
      silver: silverCategories
    };
};

const fetchStockData = async (metalType = null) => {
  setLoading(prev => ({ ...prev, stock: true }));
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Fetch from metadata API
    const metadataResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/metadata`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!metadataResponse.ok) {
      throw new Error(`HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`);
    }
    
    const metadataData = await metadataResponse.json();
    
    console.log('Metadata received:', metadataData);
    
    // Process metadata for stock display
    const processedData = {
      gold: {
        totalGross: metadataData.totalGoldGross || 0,
        totalPure: metadataData.totalGoldPure || 0,
        averagePurity: metadataData.totalGoldGross > 0 ? 
          ((metadataData.totalGoldPure / metadataData.totalGoldGross) * 100).toFixed(2) : 0,
        categories: {}
      },
      silver: {
        totalGross: metadataData.totalSilverGross || 0,
        totalPure: metadataData.totalSilverPure || 0,
        averagePurity: metadataData.totalSilverGross > 0 ? 
          ((metadataData.totalSilverPure / metadataData.totalSilverGross) * 100).toFixed(2) : 0,
        categories: {}
      }
    };
    
    // Process category data - THIS IS THE FIX
    const goldCategories = [];
    const silverCategories = [];
    
    if (metadataData.categoryTotals) {
      Object.entries(metadataData.categoryTotals).forEach(([categoryKey, categoryData]) => {
        const { pureWeight, metal, grossWeight, totalItems, categoryName, purities } = categoryData;
        
        // Calculate average purity for this category
        let averagePurity = 0;
        if (grossWeight > 0) {
          averagePurity = (pureWeight / grossWeight) * 100;
        }
        
        const processedCategoryData = {
          grossWeight: grossWeight || 0,
          pureWeight: pureWeight || 0,
          totalItems: totalItems || 0,
          averagePurity: averagePurity.toFixed(2),
          purities: purities || {} // Include the purities data
        };
        
        // Use categoryName instead of the full categoryKey
        const displayName = categoryName || categoryKey.split('_')[0]; // fallback to first part if no categoryName
        
        if (metal === "gold" && pureWeight > 0) {
          goldCategories.push({ name: displayName, value: pureWeight });
          processedData.gold.categories[displayName] = processedCategoryData;
        } else if (metal === "silver" && pureWeight > 0) {
          silverCategories.push({ name: displayName, value: pureWeight });
          processedData.silver.categories[displayName] = processedCategoryData;
        }
      });
    }
    
    // Set the main stock data
    setStockData(processedData);
    
    // Set category data for pie charts
    setCategoryData({
      gold: goldCategories,
      silver: silverCategories
    });
    
    console.log('Processed stock data:', processedData);
    console.log('Category data for charts:', { gold: goldCategories, silver: silverCategories });
    
  } catch (error) {
    setError('Failed to load stock data');
    console.error('Stock data error:', error);
  } finally {
    setLoading(prev => ({ ...prev, stock: false }));
  }
};

// Helper function to generate filename
const getFilename = (reportType, format, timestamp = null) => {
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  
  // Use current date if no timestamp provided, or create date from timestamp
  const date = timestamp ? new Date(timestamp) : new Date();
  
  // Format date to dd/mm/yyyy
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  
  // Replace forward slashes with underscores or dashes for filename safety
  const filenameSafeDate = formattedDate.replace(/\//g, '-');
  
  switch (reportType) {
    case 'stock-gold':
      return `gold_inventory_${filenameSafeDate}.${extension}`;
    case 'stock-silver':
      return `silver_inventory_${filenameSafeDate}.${extension}`;
    case 'stock-full':
      return `full_inventory_${filenameSafeDate}.${extension}`;
    case 'sales':
      return `sales_report_${filenameSafeDate}.${extension}`;
    case 'customers':
      return `customer_list_${filenameSafeDate}.${extension}`;
    default:
      return `report_${filenameSafeDate}.${extension}`;
  }
};

const handleDownload = async (reportType, format) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    setLoading(prev => ({ ...prev, [reportType.split('-')[0]]: true }));

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reportType,
        format,
        includeEntries: includeEntries,
        ...(reportType.startsWith('stock-') && {
          metalType: reportType.split('-')[1]
        }),
        ...(reportType === 'sales' && {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }),
        ...(reportType === 'customers' && {
          fields: customerFields
        })
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download API Error:', errorText);
      throw new Error(`HTTP ${response.status}: Failed to generate report`);
    }

    const data = await response.json();

    if (data.message && !data.downloadReady) {
      throw new Error(data.message);
    }

    if (data.downloadReady && data.downloadData) {
      // Pass current timestamp to getFilename
      const currentTimestamp = new Date().getTime();
      let filename = getFilename(reportType, format, currentTimestamp);
      
      let reportData = data.downloadData.data;
      
      console.log('Report data for download:', reportData);
      
      // Handle different report types
      if (reportType === 'sales') {
        if (format === 'pdf') {
          await generateSalesPDFReport(reportData, filename);
        } else if (format === 'excel') {
          downloadSalesExcel(reportData);
        }
      } else if (reportType === 'customers') {
        // Handle customer reports with selected fields
        if (format === 'pdf') {
          await generateCustomerPDFReport(reportData, filename, customerFields);
        } else if (format === 'excel') {
          generateCustomerExcelReport(reportData, filename, customerFields);
        }
      } else {
        // Handle stock reports
        if (format === 'pdf') {
          await generatePDFFromData(reportData, reportType, filename);
        } else if (format === 'excel') {
          generateExcelFromData(reportData, reportType, filename);
        }
      }
      
      setDownloadModal({ open: false, type: '', data: null });
      alert(`${format.toUpperCase()} report downloaded successfully!`);
      return;
    }
    
  } catch (error) {
    console.error('Download error:', error);
    setError(`Failed to download report: ${error.message}`);
    alert(`Download failed: ${error.message}`);
  } finally {
    setLoading(prev => ({
      ...prev,
      stock: false,
      sales: false,
      customers: false
    }));
  }
};
// Usage
const filename = getFilename('stock-gold', 'pdf', new Date());
const generatePDFFromData = async (data, reportType, filename) => {
    try {
      // Ensure jsPDF is loaded
      if (!jsPDFLoaded) {
        console.log('jsPDF not loaded, attempting to load...');
        await loadJsPDF();
      }
  
      // Try to find jsPDF constructor with extensive checking
      let jsPDFConstructor = null;
      
      // Method 1: Direct window properties
      if (window.jsPDF) {
        jsPDFConstructor = window.jsPDF.jsPDF || window.jsPDF;
      } else if (window.jspdf) {
        jsPDFConstructor = window.jspdf.jsPDF || window.jspdf;
      }
      
      // Method 2: Check global namespace
      if (!jsPDFConstructor && typeof jsPDF !== 'undefined') {
        jsPDFConstructor = jsPDF;
      }
      
      // Method 3: Check for UMD pattern
      if (!jsPDFConstructor && window.jsPDF && typeof window.jsPDF === 'object') {
        jsPDFConstructor = window.jsPDF.jsPDF;
      }
      
      console.log('jsPDF constructor type:', typeof jsPDFConstructor);
      console.log('Available window PDF properties:', Object.keys(window).filter(key => 
        key.toLowerCase().includes('pdf')
      ));
      
      if (!jsPDFConstructor || typeof jsPDFConstructor !== 'function') {
        throw new Error('PDF library could not be loaded. Please check your internet connection and try again.');
      }
  
      // Create PDF document
      const doc = new jsPDFConstructor();
      
      // Set up PDF styling
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      let yPosition = margin;
  
      // Helper function to check if we need a new page
      const checkNewPage = (linesNeeded = 1) => {
        const lineHeight = 6;
        if (yPosition + (linesNeeded * lineHeight) > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };
  
      // Text adding function with better formatting
      const addText = (text, fontSize = 10, isBold = false, align = 'left') => {
        checkNewPage();
        
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const maxWidth = pageWidth - (margin * 2);
        const splitText = doc.splitTextToSize(text.toString(), maxWidth);
        
        let xPosition = margin;
        if (align === 'center') {
          xPosition = pageWidth / 2;
        } else if (align === 'right') {
          xPosition = pageWidth - margin;
        }
        
        doc.text(splitText, xPosition, yPosition, { align: align });
        yPosition += (splitText.length * (fontSize * 0.4)) + 3;
      };
  
      // Add header with better formatting
      addText(getReportTitle(reportType), 16, true, 'center');
      addText(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 10, false, 'center');
      yPosition += 10;
  
      // Generate content based on report type
      switch (reportType) {
        case 'stock-gold':
        case 'stock-silver':
        case 'stock-full':
          generateStockPDF(doc, data, reportType, addText, checkNewPage);
          break;
        case 'sales':
          generateSalesPDF(doc, data, addText, checkNewPage);
          break;
        case 'customers':
          generateCustomerPDF(doc, data, addText, checkNewPage);
          break;
        default:
          addText('Data: ' + JSON.stringify(data, null, 2));
      }
      
      // Save the PDF
      doc.save(filename);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      
      // More specific error handling
      if (error.message.includes('PDF library')) {
        alert('PDF library is not available. Please refresh the page and try again, or download as Excel instead.');
      } else {
        alert('PDF generation failed. Please try downloading as Excel format instead.');
        
        // Fallback: Don't generate text file, just show error
        throw error;
      }
    }
};
// Helper function to get report title
const getReportTitle = (reportType) => {
    switch (reportType) {
      case 'stock-gold':
        return 'GOLD INVENTORY REPORT';
      case 'stock-silver':
        return 'SILVER INVENTORY REPORT';
      case 'stock-full':
        return 'COMPLETE INVENTORY REPORT';
      case 'sales':
        return 'SALES REPORT';
      case 'customers':
        return 'CUSTOMER LIST REPORT';
      default:
        return 'REPORT';
    }
};  
const generateStockPDF = (doc, data, reportType, addText, checkNewPage) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
    // Helper function to format purity to 2 decimal places without rounding
    const formatPurity = (purity) => {
      if (!purity || purity === 0) return '0.00';
      const purityStr = purity.toString();
      const dotIndex = purityStr.indexOf('.');
      
      if (dotIndex === -1) {
        return purityStr + '.00';
      } else {
        return purityStr.substring(0, dotIndex + 3).padEnd(dotIndex + 3, '0');
      }
    };
  
    // Helper function to add purity breakdown for a category
    const addPurityBreakdown = (purities, indent = '    ') => {
      if (!purities || Object.keys(purities).length === 0) {
        addText(`${indent}No purity data available`, 9);
        return;
      }
  
      addText(`${indent}Purity Breakdown:`, 10, true);
      Object.entries(purities).forEach(([purity, purityData]) => {
        if (purityData.totalItems > 0) {
          addText(`${indent}• ${purity}%:`, 9, true);
          addText(`${indent}  - Gross Weight: ${purityData.grossWeight || 0}g`, 9);
          addText(`${indent}  - Pure Weight: ${purityData.pureWeight || 0}g`, 9);
          addText(`${indent}  - Items: ${purityData.totalItems || 0}`, 9);
        }
      });
    };
  
    if (reportType === 'stock-full') {
      // Full inventory report with categories only
      if (data.totalGoldGross > 0 || (data.categories && Object.keys(data.categories).filter(key => key.includes('_gold')).length > 0)) {
        addText('GOLD INVENTORY SUMMARY', 14, true);
        addText(`Total Gross Weight: ${data.totalGoldGross || 0} g`, 11);
        addText(`Total Pure Weight: ${data.totalGoldPure || 0} g`, 11);
        addText(`Average Purity: ${data.goldAveragePurity || 0}%`, 11);
        addText('', 8);
  
        addText('GOLD CATEGORY BREAKDOWN:', 12, true);
        // Filter gold categories
        const goldCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_gold'));
        
        if (goldCategories.length > 0) {
          goldCategories.forEach(([category, categoryData]) => {
            addText(`• ${category}:`, 10, true);
            addText(`  - Gross Weight: ${categoryData.grossWeight || 0}g`, 10);
            addText(`  - Pure Weight: ${categoryData.pureWeight || 0}g`, 10);
            addText(`  - Average Purity: ${formatPurity(categoryData.averagePurity)}%`, 10);
            addText(`  - Total Items: ${categoryData.totalItems || 0}`, 10);
            
            // Add purity breakdown
            addPurityBreakdown(categoryData.purities, '    ');
            addText('', 6);
          });
  
          // Gold Category Distribution (Pie Chart Data)
          addText('GOLD CATEGORY DISTRIBUTION (By Pure Weight):', 12, true);
          const totalPureWeight = data.totalGoldPure || 0;
          goldCategories.forEach(([category, categoryData]) => {
            if (categoryData.pureWeight > 0) {
              const percentage = totalPureWeight > 0 ? 
                Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
              addText(`• ${category}: ${categoryData.pureWeight}g (${percentage}%)`, 10);
            }
          });
        } else {
          addText('No gold category data available', 10);
        }
        addText('', 8);
      }
      
      if (data.totalSilverGross > 0 || (data.categories && Object.keys(data.categories).filter(key => key.includes('_silver')).length > 0)) {
        addText('SILVER INVENTORY SUMMARY', 14, true);
        addText(`Total Gross Weight: ${data.totalSilverGross || 0} g`, 11);
        addText(`Total Pure Weight: ${data.totalSilverPure || 0} g`, 11);
        addText(`Average Purity: ${data.silverAveragePurity || 0}%`, 11);
        addText('', 8);
  
        addText('SILVER CATEGORY BREAKDOWN:', 12, true);
        // Filter silver categories
        const silverCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_silver'));
        
        if (silverCategories.length > 0) {
          silverCategories.forEach(([category, categoryData]) => {
            addText(`• ${category}:`, 10, true);
            addText(`  - Gross Weight: ${categoryData.grossWeight || 0}g`, 10);
            addText(`  - Pure Weight: ${categoryData.pureWeight || 0}g`, 10);
            addText(`  - Average Purity: ${formatPurity(categoryData.averagePurity)}%`, 10);
            addText(`  - Total Items: ${categoryData.totalItems || 0}`, 10);
            
            // Add purity breakdown
            addPurityBreakdown(categoryData.purities, '    ');
            addText('', 6);
          });
  
          // Silver Category Distribution (Pie Chart Data)
          addText('SILVER CATEGORY DISTRIBUTION (By Pure Weight):', 12, true);
          const totalPureWeight = data.totalSilverPure || 0;
          silverCategories.forEach(([category, categoryData]) => {
            if (categoryData.pureWeight > 0) {
              const percentage = totalPureWeight > 0 ? 
                Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
              addText(`• ${category}: ${categoryData.pureWeight}g (${percentage}%)`, 10);
            }
          });
        } else {
          addText('No silver category data available', 10);
        }
        addText('', 8);
      }
      
    } else {
      // Single metal inventory report
      const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
      
      // Categories breakdown
      if (data.categories && Object.keys(data.categories).length > 0) {
        addText(`${metalType} INVENTORY REPORT`, 14, true);
        addText(`Total Gross Weight: ${data.totalGross || 0} g`, 11);
        addText(`Total Pure Weight: ${data.totalPure || 0} g`, 11);
        addText(`Average Purity: ${data.averagePurity || 0}%`, 11);
        addText('', 8);
        
        addText(`${metalType} CATEGORY BREAKDOWN:`, 12, true);
        Object.entries(data.categories).forEach(([category, categoryData]) => {
          addText(`• ${category}:`, 10, true);
          addText(`  - Gross Weight: ${categoryData.grossWeight || 0}g`, 10);
          addText(`  - Pure Weight: ${categoryData.pureWeight || 0}g`, 10);
          addText(`  - Average Purity: ${formatPurity(categoryData.averagePurity)}%`, 10);
          addText(`  - Total Items: ${categoryData.totalItems || 0}`, 10);
          
          // Add purity breakdown
          addPurityBreakdown(categoryData.purities, '    ');
          addText('', 6);
        });
        
        // Category distribution for single metal
        addText(`${metalType} CATEGORY DISTRIBUTION (By Pure Weight):`, 12, true);
        const totalPureWeight = data.totalPure || 0;
        Object.entries(data.categories).forEach(([category, categoryData]) => {
          if (categoryData.pureWeight > 0) {
            const percentage = totalPureWeight > 0 ? 
              Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
            addText(`• ${category}: ${categoryData.pureWeight}g (${percentage}%)`, 10);
          }
        });
      } else {
        addText(`No ${metalType.toLowerCase()} data available`, 10);
      }
    }
};
const generateExcelFromData = (data, reportType, filename) => {
  try {
    // For full inventory report, ALWAYS generate Excel with multiple sheets
    if (reportType === 'stock-full') {
      console.log('Full inventory report requested - generating multi-sheet Excel');
      generateMultiSheetExcel(data, filename);
      return;
    }
    
    // For other reports, generate CSV
    let csvContent = '';
    
    switch (reportType) {
      case 'stock-gold':
      case 'stock-silver':
        csvContent = formatStockDataForCSV(data, reportType);
        break;
      case 'sales':
        csvContent = formatSalesDataForCSV(data);
        break;
      case 'customers':
        csvContent = formatCustomerDataForCSV(data);
        break;
      default:
        csvContent = 'Data\n' + JSON.stringify(data, null, 2);
    }
    
    // Create CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename.replace('.xlsx', '.csv');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
  } catch (error) {
    console.error('Excel generation error:', error);
    // Fallback to JSON download
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const downloadUrl = window.URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename.replace('.xlsx', '.json');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
};
const generateMultiSheetExcel = (data, filename) => {
  console.log('generateMultiSheetExcel called with data:', data);
  
  try {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      console.error('XLSX library not found, falling back to CSV');
      generateFallbackCSV(data, filename);
      return;
    }

    console.log('XLSX library is available, proceeding with Excel generation');

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatPurity = (purity) => {
      if (!purity || purity === 0) return '0.00';
      const purityStr = purity.toString();
      const dotIndex = purityStr.indexOf('.');
      
      if (dotIndex === -1) {
        return purityStr + '.00';
      } else {
        return purityStr.substring(0, dotIndex + 3).padEnd(dotIndex + 3, '0');
      }
    };

    // Create workbook
    const wb = XLSX.utils.book_new();
    console.log('Created new workbook');

    // Filter categories for gold and silver
    const allCategories = data.categories || {};
    const goldCategories = Object.entries(allCategories).filter(([key]) => 
      key.toLowerCase().includes('gold') || key.includes('_gold')
    );
    const silverCategories = Object.entries(allCategories).filter(([key]) => 
      key.toLowerCase().includes('silver') || key.includes('_silver')
    );

    console.log('All categories:', Object.keys(allCategories));
    console.log('Gold categories found:', goldCategories.map(([key]) => key));
    console.log('Silver categories found:', silverCategories.map(([key]) => key));

    // FORCE CREATE GOLD SHEET - No conditions, always create
    console.log('Creating Gold sheet...');
    const goldData = generateGoldSheetData(data, goldCategories, formatDate, formatPurity);
    const goldWs = XLSX.utils.aoa_to_sheet(goldData);
    XLSX.utils.book_append_sheet(wb, goldWs, 'Gold Inventory');
    console.log('Gold sheet created and added to workbook');

    // FORCE CREATE SILVER SHEET - No conditions, always create
    console.log('Creating Silver sheet...');
    const silverData = generateSilverSheetData(data, silverCategories, formatDate, formatPurity);
    const silverWs = XLSX.utils.aoa_to_sheet(silverData);
    XLSX.utils.book_append_sheet(wb, silverWs, 'Silver Inventory');
    console.log('Silver sheet created and added to workbook');

    // Check for mixed categories (neither gold nor silver)
    const mixedCategories = Object.entries(allCategories).filter(([key]) => 
      !key.toLowerCase().includes('gold') && !key.includes('_gold') &&
      !key.toLowerCase().includes('silver') && !key.includes('_silver')
    );

    if (mixedCategories.length > 0) {
      console.log('Creating Mixed Categories sheet for:', mixedCategories.map(([key]) => key));
      const mixedData = generateMixedCategoriesSheetData(data, mixedCategories, formatDate, formatPurity);
      const mixedWs = XLSX.utils.aoa_to_sheet(mixedData);
      XLSX.utils.book_append_sheet(wb, mixedWs, 'Other Categories');
      console.log('Mixed categories sheet created and added to workbook');
    }

    // Verify sheets were created
    console.log('Final workbook contains sheets:', wb.SheetNames);
    console.log('Number of sheets:', wb.SheetNames.length);

    if (wb.SheetNames.length === 0) {
      console.error('ERROR: No sheets were created! This should not happen.');
      throw new Error('No sheets were created in the workbook');
    }

    // Save the file
    console.log('Saving Excel file:', filename);
    XLSX.writeFile(wb, filename);
    console.log('Excel file saved successfully');

  } catch (error) {
    console.error('Multi-sheet Excel generation error:', error);
    console.error('Error stack:', error.stack);
    console.log('Falling back to CSV generation');
    generateFallbackCSV(data, filename);
  }
};
const generateGoldSheetData = (data, goldCategories, formatDate, formatPurity) => {
  console.log('Generating Gold sheet data with categories:', goldCategories.length);
  
  const sheetData = [];
  
  // Header
  sheetData.push(['GOLD INVENTORY REPORT']);
  sheetData.push([`Generated on: ${formatDate(new Date().toISOString())}`]);
  sheetData.push([]);
  
  // Summary Section - Always include, even if zero
  sheetData.push(['GOLD INVENTORY SUMMARY']);
  sheetData.push(['Metric', 'Value']);
  sheetData.push(['Total Gross Weight (g)', data.totalGoldGross || 0]);
  sheetData.push(['Total Pure Weight (g)', data.totalGoldPure || 0]);
  sheetData.push(['Average Purity (%)', data.goldAveragePurity || 0]);
  sheetData.push([]);
  
  // Category Breakdown
  if (goldCategories.length > 0) {
    sheetData.push(['GOLD CATEGORY BREAKDOWN']);
    sheetData.push(['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
    
    goldCategories.forEach(([category, categoryData]) => {
      sheetData.push([
        category,
        categoryData.grossWeight || 0,
        categoryData.pureWeight || 0,
        formatPurity(categoryData.averagePurity || 0),
        categoryData.totalItems || 0
      ]);
    });
    sheetData.push([]);
    
    // Purity Breakdowns
    goldCategories.forEach(([category, categoryData]) => {
      if (categoryData.purities && Object.keys(categoryData.purities).length > 0) {
        sheetData.push([`${category} - Purity Breakdown`]);
        sheetData.push(['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
        
        Object.entries(categoryData.purities).forEach(([purity, purityData]) => {
          if (purityData.totalItems > 0) {
            sheetData.push([
              purity,
              purityData.grossWeight || 0,
              purityData.pureWeight || 0,
              purityData.totalItems || 0
            ]);
          }
        });
        sheetData.push([]);
      }
    });
    
    // Category Distribution
    const totalGoldPureWeight = data.totalGoldPure || 0;
    if (totalGoldPureWeight > 0) {
      sheetData.push(['GOLD CATEGORY DISTRIBUTION (By Pure Weight)']);
      sheetData.push(['Category', 'Pure Weight (g)', 'Percentage (%)']);
      
      goldCategories.forEach(([category, categoryData]) => {
        if (categoryData.pureWeight > 0) {
          const percentage = Math.round((categoryData.pureWeight / totalGoldPureWeight) * 10000) / 100;
          sheetData.push([category, categoryData.pureWeight, percentage]);
        }
      });
      sheetData.push([]);
    }
  } else {
    sheetData.push(['GOLD CATEGORY BREAKDOWN']);
    sheetData.push(['No gold category data available']);
    sheetData.push(['However, summary totals above may still contain gold data']);
    sheetData.push([]);
  }
  
  console.log('Gold sheet data rows:', sheetData.length);
  return sheetData;
};
const generateSilverSheetData = (data, silverCategories, formatDate, formatPurity) => {
  console.log('Generating Silver sheet data with categories:', silverCategories.length);
  
  const sheetData = [];
  
  // Header
  sheetData.push(['SILVER INVENTORY REPORT']);
  sheetData.push([`Generated on: ${formatDate(new Date().toISOString())}`]);
  sheetData.push([]);
  
  // Summary Section - Always include, even if zero
  sheetData.push(['SILVER INVENTORY SUMMARY']);
  sheetData.push(['Metric', 'Value']);
  sheetData.push(['Total Gross Weight (g)', data.totalSilverGross || 0]);
  sheetData.push(['Total Pure Weight (g)', data.totalSilverPure || 0]);
  sheetData.push(['Average Purity (%)', data.silverAveragePurity || 0]);
  sheetData.push([]);
  
  // Category Breakdown
  if (silverCategories.length > 0) {
    sheetData.push(['SILVER CATEGORY BREAKDOWN']);
    sheetData.push(['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
    
    silverCategories.forEach(([category, categoryData]) => {
      sheetData.push([
        category,
        categoryData.grossWeight || 0,
        categoryData.pureWeight || 0,
        formatPurity(categoryData.averagePurity || 0),
        categoryData.totalItems || 0
      ]);
    });
    sheetData.push([]);
    
    // Purity Breakdowns
    silverCategories.forEach(([category, categoryData]) => {
      if (categoryData.purities && Object.keys(categoryData.purities).length > 0) {
        sheetData.push([`${category} - Purity Breakdown`]);
        sheetData.push(['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
        
        Object.entries(categoryData.purities).forEach(([purity, purityData]) => {
          if (purityData.totalItems > 0) {
            sheetData.push([
              purity,
              purityData.grossWeight || 0,
              purityData.pureWeight || 0,
              purityData.totalItems || 0
            ]);
          }
        });
        sheetData.push([]);
      }
    });
    
    // Category Distribution
    const totalSilverPureWeight = data.totalSilverPure || 0;
    if (totalSilverPureWeight > 0) {
      sheetData.push(['SILVER CATEGORY DISTRIBUTION (By Pure Weight)']);
      sheetData.push(['Category', 'Pure Weight (g)', 'Percentage (%)']);
      
      silverCategories.forEach(([category, categoryData]) => {
        if (categoryData.pureWeight > 0) {
          const percentage = Math.round((categoryData.pureWeight / totalSilverPureWeight) * 10000) / 100;
          sheetData.push([category, categoryData.pureWeight, percentage]);
        }
      });
      sheetData.push([]);
    }
  } else {
    sheetData.push(['SILVER CATEGORY BREAKDOWN']);
    sheetData.push(['No silver category data available']);
    sheetData.push(['However, summary totals above may still contain silver data']);
    sheetData.push([]);
  }
  
  console.log('Silver sheet data rows:', sheetData.length);
  return sheetData;
};
const generateMixedCategoriesSheetData = (data, mixedCategories, formatDate, formatPurity) => {
  console.log('Generating Mixed Categories sheet data with categories:', mixedCategories.length);
  
  const sheetData = [];
  
  // Header
  sheetData.push(['OTHER CATEGORIES REPORT']);
  sheetData.push([`Generated on: ${formatDate(new Date().toISOString())}`]);
  sheetData.push([]);
  
  if (mixedCategories.length > 0) {
    sheetData.push(['OTHER CATEGORIES BREAKDOWN']);
    sheetData.push(['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
    
    mixedCategories.forEach(([category, categoryData]) => {
      sheetData.push([
        category,
        categoryData.grossWeight || 0,
        categoryData.pureWeight || 0,
        formatPurity(categoryData.averagePurity || 0),
        categoryData.totalItems || 0
      ]);
    });
    sheetData.push([]);
    
    // Purity Breakdowns
    mixedCategories.forEach(([category, categoryData]) => {
      if (categoryData.purities && Object.keys(categoryData.purities).length > 0) {
        sheetData.push([`${category} - Purity Breakdown`]);
        sheetData.push(['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
        
        Object.entries(categoryData.purities).forEach(([purity, purityData]) => {
          if (purityData.totalItems > 0) {
            sheetData.push([
              purity,
              purityData.grossWeight || 0,
              purityData.pureWeight || 0,
              purityData.totalItems || 0
            ]);
          }
        });
        sheetData.push([]);
      }
    });
  } else {
    sheetData.push(['No other category data available']);
  }
  
  console.log('Mixed categories sheet data rows:', sheetData.length);
  return sheetData;
};
const generateFallbackCSV = (data, filename) => {
  console.log('Generating fallback CSV');
  // Fallback to original CSV format if XLSX library is not available
  const csvContent = formatStockDataForCSV(data, 'stock-full');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename.replace('.xlsx', '.csv');
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};
// Format data as text (fallback)
const formatDataAsText = (data, reportType) => {
  let content = `${getReportTitle(reportType)}\n`;
  content += `Generated on: ${new Date().toLocaleDateString('en-GB')}\n\n`;
  content += JSON.stringify(data, null, 2);
  return content;
};
const formatStockDataForCSV = (data, reportType) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy format
  };

  // Helper function to format purity to 2 decimal places without rounding
  const formatPurity = (purity) => {
    if (!purity || purity === 0) return '0.00';
    const purityStr = purity.toString();
    const dotIndex = purityStr.indexOf('.');
    
    if (dotIndex === -1) {
      return purityStr + '.00';
    } else {
      return purityStr.substring(0, dotIndex + 3).padEnd(dotIndex + 3, '0');
    }
  };

  // Helper function to add purity breakdown section
  const addPurityBreakdownCSV = (purities, categoryName, metalType = '') => {
    if (!purities || Object.keys(purities).length === 0) {
      return `${metalType ? metalType + ' - ' : ''}${categoryName} - Purity Breakdown,No purity data available\n`;
    }

    let csv = '';
    csv += `${metalType ? metalType + ' - ' : ''}${categoryName} - Purity Breakdown\n`;
    csv += 'Purity (%),Gross Weight (g),Pure Weight (g),Items\n';
    
    Object.entries(purities).forEach(([purity, purityData]) => {
      if (purityData.totalItems > 0) {
        csv += `${purity},${purityData.grossWeight || 0},${purityData.pureWeight || 0},${purityData.totalItems || 0}\n`;
      }
    });
    csv += '\n';
    
    return csv;
  };

  if (reportType === 'stock-full') {
    let csv = '';
    
    // Header section
    csv += 'COMPLETE INVENTORY REPORT\n';
    csv += `Generated on: ${formatDate(new Date().toISOString())}\n\n`;
    
    // Gold Section
    if (data.totalGoldGross > 0 || (data.categories && Object.keys(data.categories).filter(key => key.includes('_gold')).length > 0)) {
      csv += 'GOLD INVENTORY SUMMARY\n';
      csv += 'Metric,Value\n';
      csv += `Total Gross Weight (g),${data.totalGoldGross || 0}\n`;
      csv += `Total Pure Weight (g),${data.totalGoldPure || 0}\n`;
      csv += `Average Purity (%),${data.goldAveragePurity || 0}\n\n`;

      // Gold Category Breakdown
      csv += 'GOLD CATEGORY BREAKDOWN\n';
      csv += 'Category,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
      
      const goldCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_gold'));
      
      if (goldCategories.length > 0) {
        goldCategories.forEach(([category, categoryData]) => {
          csv += `${category},${categoryData.grossWeight || 0},${categoryData.pureWeight || 0},${formatPurity(categoryData.averagePurity)},${categoryData.totalItems || 0}\n`;
        });
        csv += '\n';

        // Gold Purity Breakdowns for each category
        goldCategories.forEach(([category, categoryData]) => {
          csv += addPurityBreakdownCSV(categoryData.purities, category, 'Gold');
        });

        // Gold Category Distribution
        csv += 'GOLD CATEGORY DISTRIBUTION (By Pure Weight)\n';
        csv += 'Category,Pure Weight (g),Percentage (%)\n';
        const totalGoldPureWeight = data.totalGoldPure || 0;
        goldCategories.forEach(([category, categoryData]) => {
          if (categoryData.pureWeight > 0) {
            const percentage = totalGoldPureWeight > 0 ? 
              Math.floor((categoryData.pureWeight / totalGoldPureWeight) * 10000) / 100 : 0;
            csv += `${category},${categoryData.pureWeight},${percentage}\n`;
          }
        });
        csv += '\n';
      } else {
        csv += 'No gold category data available\n\n';
      }
    }
    
    // Silver Section
    if (data.totalSilverGross > 0 || (data.categories && Object.keys(data.categories).filter(key => key.includes('_silver')).length > 0)) {
      csv += 'SILVER INVENTORY SUMMARY\n';
      csv += 'Metric,Value\n';
      csv += `Total Gross Weight (g),${data.totalSilverGross || 0}\n`;
      csv += `Total Pure Weight (g),${data.totalSilverPure || 0}\n`;
      csv += `Average Purity (%),${data.silverAveragePurity || 0}\n\n`;

      // Silver Category Breakdown
      csv += 'SILVER CATEGORY BREAKDOWN\n';
      csv += 'Category,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
      
      const silverCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_silver'));
      
      if (silverCategories.length > 0) {
        silverCategories.forEach(([category, categoryData]) => {
          csv += `${category},${categoryData.grossWeight || 0},${categoryData.pureWeight || 0},${formatPurity(categoryData.averagePurity)},${categoryData.totalItems || 0}\n`;
        });
        csv += '\n';

        // Silver Purity Breakdowns for each category
        silverCategories.forEach(([category, categoryData]) => {
          csv += addPurityBreakdownCSV(categoryData.purities, category, 'Silver');
        });

        // Silver Category Distribution
        csv += 'SILVER CATEGORY DISTRIBUTION (By Pure Weight)\n';
        csv += 'Category,Pure Weight (g),Percentage (%)\n';
        const totalSilverPureWeight = data.totalSilverPure || 0;
        silverCategories.forEach(([category, categoryData]) => {
          if (categoryData.pureWeight > 0) {
            const percentage = totalSilverPureWeight > 0 ? 
              Math.floor((categoryData.pureWeight / totalSilverPureWeight) * 10000) / 100 : 0;
            csv += `${category},${categoryData.pureWeight},${percentage}\n`;
          }
        });
        csv += '\n';
      } else {
        csv += 'No silver category data available\n\n';
      }
    }
    
    return csv;
    
  } else {
    // Single metal report
    const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
    let csv = '';
    
    // Header
    csv += `${metalType} INVENTORY REPORT\n`;
    csv += `Generated on: ${formatDate(new Date().toISOString())}\n\n`;
    
    // Summary section
    if (data.categories && Object.keys(data.categories).length > 0) {
      csv += `${metalType} INVENTORY SUMMARY\n`;
      csv += 'Metric,Value\n';
      csv += `Total Gross Weight (g),${data.totalGross || 0}\n`;
      csv += `Total Pure Weight (g),${data.totalPure || 0}\n`;
      csv += `Average Purity (%),${data.averagePurity || 0}\n\n`;

      // Category breakdown
      csv += `${metalType} CATEGORY BREAKDOWN\n`;
      csv += 'Category,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
      
      Object.entries(data.categories).forEach(([category, categoryData]) => {
        csv += `${category},${categoryData.grossWeight || 0},${categoryData.pureWeight || 0},${formatPurity(categoryData.averagePurity)},${categoryData.totalItems || 0}\n`;
      });
      csv += '\n';

      // Purity breakdowns for each category
      Object.entries(data.categories).forEach(([category, categoryData]) => {
        csv += addPurityBreakdownCSV(categoryData.purities, category);
      });

      // Category distribution
      csv += `${metalType} CATEGORY DISTRIBUTION (By Pure Weight)\n`;
      csv += 'Category,Pure Weight (g),Percentage (%)\n';
      const totalPureWeight = data.totalPure || 0;
      Object.entries(data.categories).forEach(([category, categoryData]) => {
        if (categoryData.pureWeight > 0) {
          const percentage = totalPureWeight > 0 ? 
            Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
          csv += `${category},${categoryData.pureWeight},${percentage}\n`;
        }
      });
      csv += '\n';
    } else {
      csv += `No ${metalType.toLowerCase()} data available\n\n`;
    }
    
    return csv;
  }
};



 // Fetch sales data
const fetchSalesData = async (startDate = '', endDate = '') => {
  setLoading(prev => ({ ...prev, sales: true }));
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    const params = new URLSearchParams();
    // Convert display format (DD/MM/YYYY) to API format (YYYY-MM-DD)
    if (startDate) params.append('startDate', formatDateForAPI(startDate));
    if (endDate) params.append('endDate', formatDateForAPI(endDate));
    
    console.log('Date conversion for API:', {
      originalStartDate: startDate,
      originalEndDate: endDate,
      apiStartDate: formatDateForAPI(startDate),
      apiEndDate: formatDateForAPI(endDate)
    });
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/sales?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch sales data');
    
    const data = await response.json();
    
    console.log('Sales API Response:', data);
    console.log('Sales Report Data:', data.salesReport);
    
    setSalesData(data.salesReport);
  } catch (error) {
    setError('Failed to load sales data');
    console.error('Sales data error:', error);
  } finally {
    setLoading(prev => ({ ...prev, sales: false }));
  }
};

const getTodayFormatted = () => {
  const today = new Date();
  return formatDateForAPI(formatDateObjectForDisplay(today));
};

// Initialize your dateRange state with today's date as default
const [dateRange, setDateRange] = useState({
  startDate: getTodayFormatted(),
  endDate: getTodayFormatted()
});

// Initial data fetch on component mount
useEffect(() => {
  fetchSalesData(dateRange.startDate, dateRange.endDate);
}, []); // Empty dependency array - runs once on mount
// Refresh sales data when date range changes (after initial mount)
useEffect(() => {
  if (dateRange.startDate && dateRange.endDate) {
    fetchSalesData(dateRange.startDate, dateRange.endDate);
  } else {
    // For "All Time" selection (empty dates)
    fetchSalesData();
  }
}, [dateRange]); // Runs when dateRange changes
// Handle date range selection
const handleDateRangeChange = (type, value) => {
  setDateRange(prev => ({ ...prev, [type]: value }));
};
// Handle quick date selection
const handleQuickDateSelect = (period) => {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'today':
      const today = new Date();
      startDate = formatDateForAPI(formatDateObjectForDisplay(today)); // Convert to ISO
      endDate = formatDateForAPI(formatDateObjectForDisplay(today));   // Convert to ISO
      break;
    case 'week':
      const weekStart = new Date();
      weekStart.setDate(now.getDate() - 7);
      startDate = formatDateForAPI(formatDateObjectForDisplay(weekStart));
      endDate = formatDateForAPI(formatDateObjectForDisplay(now));
      break;
    case 'month':
      const monthStart = new Date();
      monthStart.setMonth(now.getMonth() - 1);
      startDate = formatDateForAPI(formatDateObjectForDisplay(monthStart));
      endDate = formatDateForAPI(formatDateObjectForDisplay(now));
      break;
    case '6months':
      const sixMonthsStart = new Date();
      sixMonthsStart.setMonth(now.getMonth() - 6);
      startDate = formatDateForAPI(formatDateObjectForDisplay(sixMonthsStart));
      endDate = formatDateForAPI(formatDateObjectForDisplay(now));
      break;
    case 'year':
      const yearStart = new Date();
      yearStart.setFullYear(now.getFullYear() - 1);
      startDate = formatDateForAPI(formatDateObjectForDisplay(yearStart));
      endDate = formatDateForAPI(formatDateObjectForDisplay(now));
      break;
    case 'alltime':
      setDateRange({
        startDate: '',
        endDate: ''
      });
      return;
    default:
      return;
  }
  
  setDateRange({
    startDate: startDate,
    endDate: endDate
  });
};

const generateSalesPDFReport = async (data, filename) => {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 6;
    
    // Simple text function - no complex formatting
    const addText = (text, fontSize = 10, isBold = false, leftMargin = 0) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.text(text, margin + leftMargin, yPosition);
      yPosition += fontSize + 2;
    };
    
    const addSpace = (space = 5) => {
      yPosition += space;
    };
    
    // Generate clean PDF
    generateCleanSalesPDF(doc, data, { addText, addSpace });
    
    // Save the PDF
    doc.save(filename);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF report');
  }
};
// Clean PDF Generation - Updated to use DD/MM/YYYY format
const generateCleanSalesPDF = (doc, data, { addText, addSpace }) => {
  
  // Title
  addText('SALES REPORT', 16, true);
  addSpace(5);
  
  // Date info - Format dates as DD/MM/YYYY
  if (data.dateRange) {
    const startDate = data.dateRange.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start';
    const endDate = data.dateRange.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End';
    addText(`Report Period: ${startDate} to ${endDate}`, 10);
    addText(`Generated on: ${formatDateObjectForDisplay(new Date())}`, 10);
  }
  
  addSpace(10);
  
  // Summary
  if (data.summary) {
    addText('EXECUTIVE SUMMARY', 12, true);
    addSpace(3);
    
    addText(`Total Revenue: Rs ${(data.summary.totalRevenue || 0).toLocaleString()}`, 10);
    addText(`Total Items Sold: ${data.summary.totalItems || 0} items`, 10);
    
    const avgSale = data.summary.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems) : 0;
    addText(`Average Sale Value: Rs ${avgSale.toLocaleString()}`, 10);
  }
  
  addSpace(15);
  
  // Metal Performance
  if (data.byMetal) {
    addText('METAL-WISE PERFORMANCE', 12, true);
    addSpace(5);
    
    // Gold Sales
    if (data.byMetal.gold && data.byMetal.gold.totalRevenue > 0) {
      addText('Gold Sales:', 11, true);
      addText(`Revenue: Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}`, 10);
      addText(`Gross Weight: ${data.byMetal.gold.totalWeight || 0} grams`, 10);
      addText(`Pure Weight: ${data.byMetal.gold.totalPureWeight || 0} grams`, 10);
      
      // Calculate total items sold for gold from topPerformers or use summary data
      let goldItemsSold = 0;
      if (data.topPerformers && data.topPerformers.length > 0) {
        goldItemsSold = data.topPerformers
          .filter(item => item.metalType === 'gold')
          .reduce((sum, item) => sum + (item.totalItems || 0), 0);
      }
      
      // If no topPerformers data, try to calculate from summary
      if (goldItemsSold === 0 && data.summary && data.summary.totalItems) {
        // Estimate based on proportion of gold revenue
        const goldProportion = data.byMetal.gold.totalRevenue / (data.summary.totalRevenue || 1);
        goldItemsSold = Math.round(data.summary.totalItems * goldProportion);
      }
      
      addText(`Total Items Sold: ${goldItemsSold} items`, 10);
      addSpace(8);
    }
    
    // Silver Sales
    if (data.byMetal.silver && data.byMetal.silver.totalRevenue > 0) {
      addText('Silver Sales:', 11, true);
      addText(`Revenue: Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}`, 10);
      addText(`Gross Weight: ${data.byMetal.silver.totalWeight || 0} grams`, 10);
      addText(`Pure Weight: ${data.byMetal.silver.totalPureWeight || 0} grams`, 10);
      
      // Calculate total items sold for silver from topPerformers or use summary data
      let silverItemsSold = 0;
      if (data.topPerformers && data.topPerformers.length > 0) {
        silverItemsSold = data.topPerformers
          .filter(item => item.metalType === 'silver')
          .reduce((sum, item) => sum + (item.totalItems || 0), 0);
      }
      
      // If no topPerformers data, try to calculate from summary
      if (silverItemsSold === 0 && data.summary && data.summary.totalItems) {
        // Estimate based on proportion of silver revenue
        const silverProportion = data.byMetal.silver.totalRevenue / (data.summary.totalRevenue || 1);
        silverItemsSold = Math.round(data.summary.totalItems * silverProportion);
      }
      
      addText(`Total Items Sold: ${silverItemsSold} items`, 10);
      addSpace(8);
    }
  }
  
  addSpace(10);
  
  // Top Revenue Generators
  if (data.topPerformers && data.topPerformers.length > 0) {
    addText('TOP REVENUE GENERATORS', 12, true);
    addSpace(5);
    
    // Sort by revenue and take top 10
    const topRevenueItems = [...data.topPerformers]
      .sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0))
      .slice(0, 10);
    
    topRevenueItems.forEach((item, index) => {
      const itemNum = index + 1;
      const metalType = item.metalType || 'N/A';
      const category = item.category || 'N/A';
      const purity = item.purity || 0;
      const revenue = (item.totalSalesAmount || 0).toLocaleString();
      const grossWeight = item.totalGrossWeight || 0;
      const pureWeight = item.totalPureWeight || 0;
      const totalItems = item.totalItems || 0;
      
      addText(`${itemNum}. ${metalType} ${category} (${purity}% purity)`, 10, true);
      addText(`   Revenue: Rs ${revenue}`, 10);
      addText(`   Weight: ${grossWeight}g gross, ${pureWeight}g pure`, 10);
      addText(`   Items Sold: ${totalItems} items`, 10);
      addSpace(3);
    });
  }
  
  addSpace(15);
  
  // Top Sold Quantity Items
  if (data.topPerformers && data.topPerformers.length > 0) {
    addText('TOP SOLD QUANTITY ITEMS', 12, true);
    addSpace(5);
    
    // Sort by total items sold and take top 10
    const topQuantityItems = [...data.topPerformers]
      .sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0))
      .slice(0, 10);
    
    topQuantityItems.forEach((item, index) => {
      const itemNum = index + 1;
      const metalType = item.metalType || 'N/A';
      const category = item.category || 'N/A';
      const purity = item.purity || 0;
      const totalItems = item.totalItems || 0;
      const revenue = (item.totalSalesAmount || 0).toLocaleString();
      const grossWeight = item.totalGrossWeight || 0;
      const pureWeight = item.totalPureWeight || 0;
      
      addText(`${itemNum}. ${metalType} ${category} (${purity}% purity)`, 10, true);
      addText(`   Items Sold: ${totalItems} items`, 10);
      addText(`   Revenue: Rs ${revenue}`, 10);
      addText(`   Weight: ${grossWeight}g gross, ${pureWeight}g pure`, 10);
      addSpace(3);
    });
  }
  
  addSpace(15);
  
  // Gold Weight Leaders
  if (data.topPerformers && data.topPerformers.length > 0) {
    const goldItems = data.topPerformers.filter(item => item.metalType === 'gold');
    
    if (goldItems.length > 0) {
      addText('GOLD WEIGHT LEADERS', 12, true);
      addSpace(5);
      
      // Sort by gross weight and take top 10
      const goldWeightLeaders = [...goldItems]
        .sort((a, b) => (b.totalGrossWeight || 0) - (a.totalGrossWeight || 0))
        .slice(0, 10);
      
      goldWeightLeaders.forEach((item, index) => {
        const itemNum = index + 1;
        const category = item.category || 'N/A';
        const purity = item.purity || 0;
        const grossWeight = item.totalGrossWeight || 0;
        const pureWeight = item.totalPureWeight || 0;
        const totalItems = item.totalItems || 0;
        const revenue = (item.totalSalesAmount || 0).toLocaleString();
        
        addText(`${itemNum}. ${category} (${purity}% purity)`, 10, true);
        addText(`   Weight: ${grossWeight}g gross, ${pureWeight}g pure`, 10);
        addText(`   Items Sold: ${totalItems} items`, 10);
        addText(`   Revenue: Rs ${revenue}`, 10);
        addSpace(3);
      });
    }
  }
  
  addSpace(15);
  
  // Silver Weight Leaders
  if (data.topPerformers && data.topPerformers.length > 0) {
    const silverItems = data.topPerformers.filter(item => item.metalType === 'silver');
    
    if (silverItems.length > 0) {
      addText('SILVER WEIGHT LEADERS', 12, true);
      addSpace(5);
      
      // Sort by gross weight and take top 10
      const silverWeightLeaders = [...silverItems]
        .sort((a, b) => (b.totalGrossWeight || 0) - (a.totalGrossWeight || 0))
        .slice(0, 10);
      
      silverWeightLeaders.forEach((item, index) => {
        const itemNum = index + 1;
        const category = item.category || 'N/A';
        const purity = item.purity || 0;
        const grossWeight = item.totalGrossWeight || 0;
        const pureWeight = item.totalPureWeight || 0;
        const totalItems = item.totalItems || 0;
        const revenue = (item.totalSalesAmount || 0).toLocaleString();
        
        addText(`${itemNum}. ${category} (${purity}% purity)`, 10, true);
        addText(`   Weight: ${grossWeight}g gross, ${pureWeight}g pure`, 10);
        addText(`   Items Sold: ${totalItems} items`, 10);
        addText(`   Revenue: Rs ${revenue}`, 10);
        addSpace(3);
      });
    }
  }
  
  addSpace(15);
  
  // Recent Sales - Only show if entries are included
  if (data.entries && data.entries.length > 0) {
    addText('RECENT SALES TRANSACTIONS', 12, true);
    addSpace(5);
    
    data.entries.slice(0, 20).forEach((entry, index) => {
      const entryNum = index + 1;
      const date = formatAPIDateForDisplay(entry.soldAt); // Use DD/MM/YYYY format
      const metalType = entry.metalType || 'N/A';
      const category = entry.category || 'N/A';
      const purity = entry.purity || 0;
      const weight = entry.weight || 0;
      const price = (entry.salesPrice || 0).toLocaleString();
      const isBulk = entry.isBulk || false;
      const itemCount = entry.itemCount || 1;
      
      addText(`${entryNum}. ${date} - ${metalType} ${category}`, 10, true);
      addText(`   Purity: ${purity}%, Weight: ${weight}g`, 10);
      addText(`   Price: Rs ${price}`, 10);
      
      // Show quantity sold
      if (isBulk) {
        addText(`   Quantity: ${itemCount} items (Bulk Sale)`, 10);
      } else {
        addText(`   Quantity: 1 item`, 10);
      }
      
      // Customer Information - show all available details
      const customerInfo = [];
      if (entry.customerName) {
        customerInfo.push(`Name: ${entry.customerName}`);
      }
      if (entry.customerMobile) {
        customerInfo.push(`Mobile: ${entry.customerMobile}`);
      }
      if (entry.customerAddress) {
        customerInfo.push(`Address: ${entry.customerAddress}`);
      }
      
      if (customerInfo.length > 0) {
        addText(`   Customer: ${customerInfo.join(', ')}`, 10);
      } else {
        addText(`   Customer: Not provided`, 10);
      }
      
      addSpace(3);
    });
    
    if (data.entries.length > 20) {
      addSpace(5);
      addText(`Note: Showing recent 20 transactions out of ${data.entries.length} total`, 9);
    }
  } else {
    // Show a note when entries are not included
    addText('SALES TRANSACTIONS', 12, true);
    addSpace(5);
    addText('Individual transaction details are not included in this report.', 10);
    addText('To view transaction details, enable "Include Entries" option when generating the report.', 10);
  }
  
  // Footer
  addSpace(15);
  addText('This report is system generated and contains confidential business information.', 8);
  addText(`Report ID: RPT-${Date.now()}`, 8);
};
// Enhanced Excel Generation for Sales Report - Updated with DD/MM/YYYY format
const generateSalesExcel = (data) => {
  const wb = XLSX.utils.book_new();
  
  // Summary Sheet - Matches PDF Executive Summary
  const summaryData = [
    ['SALES REPORT'],
    [''],
    ['EXECUTIVE SUMMARY'],
    ['Report Period', `${data.dateRange?.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start'} to ${data.dateRange?.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End'}`],
    ['Generated on', formatDateObjectForDisplay(new Date())],
    [''],
    ['Total Revenue', `Rs ${(data.summary?.totalRevenue || 0).toLocaleString()}`],
    ['Total Items Sold', `${data.summary?.totalItems || 0} items`],
    ['Average Sale Value', `Rs ${data.summary?.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}`],
    [''],
    ['METAL-WISE PERFORMANCE'],
    ['']
  ];
  
  // Add Gold Sales if exists
  if (data.byMetal?.gold && data.byMetal.gold.totalRevenue > 0) {
    let goldItemsSold = 0;
    if (data.topPerformers && data.topPerformers.length > 0) {
      goldItemsSold = data.topPerformers
        .filter(item => item.metalType === 'gold')
        .reduce((sum, item) => sum + (item.totalItems || 0), 0);
    }
    if (goldItemsSold === 0 && data.summary && data.summary.totalItems) {
      const goldProportion = data.byMetal.gold.totalRevenue / (data.summary.totalRevenue || 1);
      goldItemsSold = Math.round(data.summary.totalItems * goldProportion);
    }
    
    summaryData.push(
      ['Gold Sales', ''],
      ['Revenue', `Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}`],
      ['Gross Weight', `${data.byMetal.gold.totalWeight || 0} grams`],
      ['Pure Weight', `${data.byMetal.gold.totalPureWeight || 0} grams`],
      ['Total Items Sold', `${goldItemsSold} items`],
      ['']
    );
  }
  
  // Add Silver Sales if exists
  if (data.byMetal?.silver && data.byMetal.silver.totalRevenue > 0) {
    let silverItemsSold = 0;
    if (data.topPerformers && data.topPerformers.length > 0) {
      silverItemsSold = data.topPerformers
        .filter(item => item.metalType === 'silver')
        .reduce((sum, item) => sum + (item.totalItems || 0), 0);
    }
    if (silverItemsSold === 0 && data.summary && data.summary.totalItems) {
      const silverProportion = data.byMetal.silver.totalRevenue / (data.summary.totalRevenue || 1);
      silverItemsSold = Math.round(data.summary.totalItems * silverProportion);
    }
    
    summaryData.push(
      ['Silver Sales', ''],
      ['Revenue', `Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}`],
      ['Gross Weight', `${data.byMetal.silver.totalWeight || 0} grams`],
      ['Pure Weight', `${data.byMetal.silver.totalPureWeight || 0} grams`],
      ['Total Items Sold', `${silverItemsSold} items`],
      ['']
    );
  }
  
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
  
  // Top Revenue Generators Sheet - Matches PDF Top Revenue Generators
  if (data.topPerformers && data.topPerformers.length > 0) {
    const topRevenueItems = [...data.topPerformers]
      .sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0))
      .slice(0, 10);
    
    const revenueData = [
      ['TOP REVENUE GENERATORS'],
      [''],
      ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold']
    ];
    
    topRevenueItems.forEach((item, index) => {
      revenueData.push([
        index + 1,
        item.metalType || 'N/A',
        item.category || 'N/A',
        item.purity || 0,
        `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`,
        item.totalGrossWeight || 0,
        item.totalPureWeight || 0,
        item.totalItems || 0
      ]);
    });
    
    const revenueWS = XLSX.utils.aoa_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(wb, revenueWS, 'Top Revenue Generators');
  }
  
  // Top Sold Quantity Items Sheet - Matches PDF Top Sold Quantity Items
  if (data.topPerformers && data.topPerformers.length > 0) {
    const topQuantityItems = [...data.topPerformers]
      .sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0))
      .slice(0, 10);
    
    const quantityData = [
      ['TOP SOLD QUANTITY ITEMS'],
      [''],
      ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Items Sold', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)']
    ];
    
    topQuantityItems.forEach((item, index) => {
      quantityData.push([
        index + 1,
        item.metalType || 'N/A',
        item.category || 'N/A',
        item.purity || 0,
        item.totalItems || 0,
        `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`,
        item.totalGrossWeight || 0,
        item.totalPureWeight || 0
      ]);
    });
    
    const quantityWS = XLSX.utils.aoa_to_sheet(quantityData);
    XLSX.utils.book_append_sheet(wb, quantityWS, 'Top Sold Quantity');
  }
  
  // Gold Weight Leaders Sheet - Matches PDF Gold Weight Leaders
  if (data.topPerformers && data.topPerformers.length > 0) {
    const goldItems = data.topPerformers.filter(item => item.metalType === 'gold');
    
    if (goldItems.length > 0) {
      const goldWeightLeaders = [...goldItems]
        .sort((a, b) => (b.totalGrossWeight || 0) - (a.totalGrossWeight || 0))
        .slice(0, 10);
      
      const goldData = [
        ['GOLD WEIGHT LEADERS'],
        [''],
        ['Rank', 'Category', 'Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold', 'Revenue']
      ];
      
      goldWeightLeaders.forEach((item, index) => {
        goldData.push([
          index + 1,
          item.category || 'N/A',
          item.purity || 0,
          item.totalGrossWeight || 0,
          item.totalPureWeight || 0,
          item.totalItems || 0,
          `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`
        ]);
      });
      
      const goldWS = XLSX.utils.aoa_to_sheet(goldData);
      XLSX.utils.book_append_sheet(wb, goldWS, 'Gold Weight Leaders');
    }
  }
  
  // Silver Weight Leaders Sheet - Matches PDF Silver Weight Leaders
  if (data.topPerformers && data.topPerformers.length > 0) {
    const silverItems = data.topPerformers.filter(item => item.metalType === 'silver');
    
    if (silverItems.length > 0) {
      const silverWeightLeaders = [...silverItems]
        .sort((a, b) => (b.totalGrossWeight || 0) - (a.totalGrossWeight || 0))
        .slice(0, 10);
      
      const silverData = [
        ['SILVER WEIGHT LEADERS'],
        [''],
        ['Rank', 'Category', 'Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold', 'Revenue']
      ];
      
      silverWeightLeaders.forEach((item, index) => {
        silverData.push([
          index + 1,
          item.category || 'N/A',
          item.purity || 0,
          item.totalGrossWeight || 0,
          item.totalPureWeight || 0,
          item.totalItems || 0,
          `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`
        ]);
      });
      
      const silverWS = XLSX.utils.aoa_to_sheet(silverData);
      XLSX.utils.book_append_sheet(wb, silverWS, 'Silver Weight Leaders');
    }
  }
  
  // Recent Sales Transactions Sheet - Matches PDF Recent Sales Transactions
  if (data.entries && data.entries.length > 0) {
    const transactionData = [
      ['RECENT SALES TRANSACTIONS'],
      [''],
      ['#', 'Date', 'Metal Type', 'Category', 'Purity (%)', 'Weight (g)', 'Price', 'Quantity', 'Customer Name', 'Customer Mobile', 'Customer Address']
    ];
    
    data.entries.slice(0, 20).forEach((entry, index) => {
      const date = formatAPIDateForDisplay(entry.soldAt); // Use DD/MM/YYYY format
      const isBulk = entry.isBulk || false;
      const itemCount = entry.itemCount || 1;
      const quantity = isBulk ? `${itemCount} items (Bulk Sale)` : '1 item';
      
      transactionData.push([
        index + 1,
        date,
        entry.metalType || 'N/A',
        entry.category || 'N/A',
        entry.purity || 0,
        entry.weight || 0,
        `Rs ${(entry.salesPrice || 0).toLocaleString()}`,
        quantity,
        entry.customerName || 'Not provided',
        entry.customerMobile || 'Not provided',
        entry.customerAddress || 'Not provided'
      ]);
    });
    
    if (data.entries.length > 20) {
      transactionData.push(['', '', '', '', '', '', '', '', '', '', '']);
      transactionData.push([`Note: Showing recent 20 transactions out of ${data.entries.length} total`, '', '', '', '', '', '', '', '', '', '']);
    }
    
    const transactionWS = XLSX.utils.aoa_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(wb, transactionWS, 'Recent Transactions');
  } else {
    // Show note when entries are not included - matches PDF behavior
    const transactionData = [
      ['SALES TRANSACTIONS'],
      [''],
      ['Individual transaction details are not included in this report.'],
      ['To view transaction details, enable "Include Entries" option when generating the report.']
    ];
    
    const transactionWS = XLSX.utils.aoa_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(wb, transactionWS, 'Transactions Note');
  }
  
  return wb;
};
// Simplified CSV Generation - Removed unused functions
const formatSalesDataForCSV = (data) => {
  let csv = '';
  
  // Add BOM for proper UTF-8 encoding
  csv += '\uFEFF';
  
  // Summary Section - matches PDF structure
  csv += 'SALES REPORT\n';
  csv += '\n';
  csv += 'EXECUTIVE SUMMARY\n';
  csv += `Report Period,${data.dateRange?.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start'} to ${data.dateRange?.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End'}\n`;
  csv += `Generated on,${formatDateObjectForDisplay(new Date())}\n`;
  csv += '\n';
  csv += `Total Revenue,Rs ${(data.summary?.totalRevenue || 0).toLocaleString()}\n`;
  csv += `Total Items Sold,${data.summary?.totalItems || 0} items\n`;
  csv += `Average Sale Value,Rs ${data.summary?.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}\n`;
  csv += '\n';
  
  // Metal-wise Performance
  csv += 'METAL-WISE PERFORMANCE\n';
  csv += '\n';
  
  if (data.byMetal?.gold && data.byMetal.gold.totalRevenue > 0) {
    let goldItemsSold = 0;
    if (data.topPerformers && data.topPerformers.length > 0) {
      goldItemsSold = data.topPerformers
        .filter(item => item.metalType === 'gold')
        .reduce((sum, item) => sum + (item.totalItems || 0), 0);
    }
    if (goldItemsSold === 0 && data.summary && data.summary.totalItems) {
      const goldProportion = data.byMetal.gold.totalRevenue / (data.summary.totalRevenue || 1);
      goldItemsSold = Math.round(data.summary.totalItems * goldProportion);
    }
    
    csv += 'Gold Sales\n';
    csv += `Revenue,Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}\n`;
    csv += `Gross Weight,${data.byMetal.gold.totalWeight || 0} grams\n`;
    csv += `Pure Weight,${data.byMetal.gold.totalPureWeight || 0} grams\n`;
    csv += `Total Items Sold,${goldItemsSold} items\n`;
    csv += '\n';
  }
  
  if (data.byMetal?.silver && data.byMetal.silver.totalRevenue > 0) {
    let silverItemsSold = 0;
    if (data.topPerformers && data.topPerformers.length > 0) {
      silverItemsSold = data.topPerformers
        .filter(item => item.metalType === 'silver')
        .reduce((sum, item) => sum + (item.totalItems || 0), 0);
    }
    if (silverItemsSold === 0 && data.summary && data.summary.totalItems) {
      const silverProportion = data.byMetal.silver.totalRevenue / (data.summary.totalRevenue || 1);
      silverItemsSold = Math.round(data.summary.totalItems * silverProportion);
    }
    
    csv += 'Silver Sales\n';
    csv += `Revenue,Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}\n`;
    csv += `Gross Weight,${data.byMetal.silver.totalWeight || 0} grams\n`;
    csv += `Pure Weight,${data.byMetal.silver.totalPureWeight || 0} grams\n`;
    csv += `Total Items Sold,${silverItemsSold} items\n`;
    csv += '\n';
  }
  
  // Top Revenue Generators
  if (data.topPerformers && data.topPerformers.length > 0) {
    csv += 'TOP REVENUE GENERATORS\n';
    csv += 'Rank,Metal Type,Category,Purity (%),Revenue,Gross Weight (g),Pure Weight (g),Items Sold\n';
    
    const topRevenueItems = [...data.topPerformers]
      .sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0))
      .slice(0, 10);
    
    topRevenueItems.forEach((item, index) => {
      csv += `${index + 1},${item.metalType || 'N/A'},${item.category || 'N/A'},${item.purity || 0},Rs ${(item.totalSalesAmount || 0).toLocaleString()},${item.totalGrossWeight || 0},${item.totalPureWeight || 0},${item.totalItems || 0}\n`;
    });
    csv += '\n';
  }
  
  return csv;
};
// Updated download function with DD/MM/YYYY format
const downloadSalesExcel = (data) => {
  console.log('Excel Download - Input data:', data);
  
  if (!data || !data.summary) {
    console.error('Excel Download - No data available');
    alert('No data available for download');
    return;
  }
  
  try {
    const wb = generateSalesExcel(data);
    console.log('Excel Download - Workbook created with sheets:', wb.SheetNames);
    
    // Format date as DD/MM/YYYY
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    
    XLSX.writeFile(wb, `sales_report_${formattedDate}.xlsx`);
    console.log('Excel Download - File written successfully');
  } catch (error) {
    console.error('Excel Download - Error:', error);
    alert('Error generating Excel file');
  }
};



//   // Fetch customer data
//   const fetchCustomersData = async () => {
//     setLoading(prev => ({ ...prev, customers: true }));
//     try {
//       const token = localStorage.getItem('token');
//       if (!token) {
//         setError('Authentication token not found. Please login again.');
//         return;
//       }
  
//       const params = new URLSearchParams();
//       params.append('includeName', customerFields.name.toString());
//       params.append('includeAddress', customerFields.address.toString());
//       params.append('includeMobile', customerFields.mobile.toString());
//       params.append('includePurchaseAmount', customerFields.purchaseAmount.toString());
//       params.append('includePurchaseItems', customerFields.purchaseItems.toString()); // New field
      
//       const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/customers?${params}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });
      
//       if (!response.ok) throw new Error('Failed to fetch customer data');
      
//       const data = await response.json();
//       setCustomersData(data.customerReport);
//     } catch (error) {
//       setError('Failed to load customer data');
//       console.error('Customer data error:', error);
//     } finally {
//       setLoading(prev => ({ ...prev, customers: false }));
//     }
//   };
// // Customer PDF Generation Function - Simple formatting with selected fields
// const generateCustomerPDFReport = async (reportData, filename, selectedFields) => {
//   const { jsPDF } = window.jspdf;
//   const doc = new jsPDF();
  
//   let yPosition = 20;
//   const pageHeight = doc.internal.pageSize.height;
//   const margin = 20;
  
//   // Helper function to add text - simplified
//   const addCustomerText = (text, fontSize = 10) => {
//     doc.setFontSize(fontSize);
//     doc.setFont("helvetica", "normal");
//     doc.text(text, margin, yPosition);
//     yPosition += fontSize + 3;
//   };
  
//   // Helper function to check if new page is needed
//   const checkCustomerNewPage = (requiredSpace = 10) => {
//     if (yPosition + requiredSpace > pageHeight - margin) {
//       doc.addPage();
//       yPosition = 20;
//     }
//   };
  
//   // Simple Header
//   addCustomerText('Customer Report', 16);
//   addCustomerText(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 10);
//   addCustomerText('', 5);
  
//   // Customer List - only selected fields
//   if (reportData.customers && reportData.customers.length > 0) {
//     reportData.customers.forEach((customer, index) => {
//       checkCustomerNewPage(20);
      
//       let customerLine = `${index + 1}. `;
      
//       // Add only selected fields
//       if (selectedFields.name && customer.customerName) {
//         customerLine += `${customer.customerName} `;
//       }
      
//       if (selectedFields.mobile && customer.customerMobile) {
//         customerLine += `| ${customer.customerMobile} `;
//       }
      
//       if (selectedFields.address && customer.customerAddress) {
//         customerLine += `| ${customer.customerAddress} `;
//       }
      
//       if (selectedFields.purchaseAmount && customer.totalPurchaseAmount) {
//         customerLine += `| Rs.${customer.totalPurchaseAmount} `;
//       }
      
//       if (selectedFields.purchaseItems && customer.transactionCount) {
//         customerLine += `| ${customer.transactionCount} items`;
//       }
      
//       addCustomerText(customerLine, 10);
//     });
//   }
  
//   // Save the PDF
//   doc.save(filename);
// };

// // Customer Excel Generation Function - Only selected fields
// const generateCustomerExcelReport = (reportData, filename, selectedFields) => {
//   const XLSX = window.XLSX;
//   const workbook = XLSX.utils.book_new();
  
//   // Build dynamic headers based on selected fields
//   const customerHeaders = [];
//   if (selectedFields.name) customerHeaders.push('Customer Name');
//   if (selectedFields.mobile) customerHeaders.push('Mobile Number');
//   if (selectedFields.address) customerHeaders.push('Address');
//   if (selectedFields.purchaseAmount) customerHeaders.push('Total Purchase Amount (₹)');
//   if (selectedFields.purchaseItems) customerHeaders.push('Purchase Items Count');
  
//   // Build customer rows with only selected fields
//   const customerRows = reportData.customers.map(customer => {
//     const row = [];
//     if (selectedFields.name) row.push(customer.customerName || 'N/A');
//     if (selectedFields.mobile) row.push(customer.customerMobile || 'N/A');
//     if (selectedFields.address) row.push(customer.customerAddress || 'N/A');
//     if (selectedFields.purchaseAmount) row.push(customer.totalPurchaseAmount || 0);
//     if (selectedFields.purchaseItems) row.push(customer.transactionCount || 0);
//     return row;
//   });
  
//   const customerData = [customerHeaders, ...customerRows];
//   const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
  
//   // Dynamic column widths based on selected fields
//   const columnWidths = [];
//   if (selectedFields.name) columnWidths.push({ wch: 25 });
//   if (selectedFields.mobile) columnWidths.push({ wch: 15 });
//   if (selectedFields.address) columnWidths.push({ wch: 30 });
//   if (selectedFields.purchaseAmount) columnWidths.push({ wch: 20 });
//   if (selectedFields.purchaseItems) columnWidths.push({ wch: 18 });
  
//   customerSheet['!cols'] = columnWidths;
  
//   XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Report');
  
//   // Save the Excel file
//   XLSX.writeFile(workbook, filename);
// };

// // Customer CSV Generation Function (Alternative)
// const generateCustomerCSVReport = (reportData, filename) => {
//   let csvContent = 'Customer Name,Mobile Number,Address,Total Purchase Amount (₹),Transaction Count,Average Purchase Value (₹),Last Purchase Date\n';
  
//   if (reportData.customers && reportData.customers.length > 0) {
//     reportData.customers.forEach(customer => {
//       const row = [
//         `"${customer.customerName || 'N/A'}"`,
//         `"${customer.customerMobile || 'N/A'}"`,
//         `"${customer.customerAddress || 'N/A'}"`,
//         customer.totalPurchaseAmount || 0,
//         customer.transactionCount || 0,
//         customer.averagePurchaseValue || 0,
//         customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString('en-GB') : 'N/A'
//       ];
//       csvContent += row.join(',') + '\n';
//     });
//   }
  
//   // Create and download CSV
//   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//   const link = document.createElement('a');
//   const url = URL.createObjectURL(blob);
//   link.setAttribute('href', url);
//   link.setAttribute('download', filename.replace('.xlsx', '.csv'));
//   link.style.visibility = 'hidden';
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
// };

// // Updated handleDownload function for customer reports with selected fields
// const handleCustomerDownload = async (format, customerFields) => {
//   try {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       setError('Authentication token not found. Please login again.');
//       return;
//     }

//     setLoading(prev => ({ ...prev, customers: true }));

//     // Convert customerFields object to match backend expectation
//     const fieldsToInclude = [];
//     if (customerFields.name) fieldsToInclude.push('customerName');
//     if (customerFields.mobile) fieldsToInclude.push('customerMobile');
//     if (customerFields.address) fieldsToInclude.push('customerAddress');
//     if (customerFields.purchaseAmount) fieldsToInclude.push('totalPurchaseAmount');
//     if (customerFields.purchaseItems) fieldsToInclude.push('transactionCount');

//     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/download`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`
//       },
//       body: JSON.stringify({
//         reportType: 'customers',
//         format,
//         includeEntries: true,
//         fields: fieldsToInclude,
//         // Send field selection for filtering
//         fieldSelection: {
//           includeName: customerFields.name,
//           includeAddress: customerFields.address,
//           includeMobile: customerFields.mobile,
//           includePurchaseAmount: customerFields.purchaseAmount,
//           includePurchaseItems: customerFields.purchaseItems
//         }
//       })
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Customer Download API Error:', errorText);
//       throw new Error(`HTTP ${response.status}: Failed to generate customer report`);
//     }

//     const data = await response.json();

//     if (data.message && !data.downloadReady) {
//       throw new Error(data.message);
//     }

//     if (data.downloadReady && data.downloadData) {
//       const timestamp = new Date().toLocaleDateString('en-GB');
//       const filename = getFilename('customers', format, timestamp);
      
//       const reportData = data.downloadData.data;
      
//       console.log('Customer report data for download:', reportData);
      
//       // Generate customer report based on format with selected fields
//       if (format === 'pdf') {
//         await generateCustomerPDFReport(reportData, filename, customerFields);
//       } else if (format === 'excel') {
//         generateCustomerExcelReport(reportData, filename, customerFields);
//       }
      
//       alert(`Customer ${format.toUpperCase()} report downloaded successfully!`);
//       return;
//     }

//   } catch (error) {
//     console.error('Customer download error:', error);
//     setError(`Failed to download customer report: ${error.message}`);
//     alert(`Customer download failed: ${error.message}`);
//   } finally {
//     setLoading(prev => ({ ...prev, customers: false }));
//   }
// };

// Fetch customer data
// Updated Fetch customer data function
const fetchCustomersData = async () => {
  setLoading(prev => ({ ...prev, customers: true }));
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    const params = new URLSearchParams();
    params.append('includeName', customerFields.name.toString());
    params.append('includeAddress', customerFields.address.toString());
    params.append('includeMobile', customerFields.mobile.toString());
    params.append('includePurchaseAmount', customerFields.purchaseAmount.toString());
    params.append('includePurchaseItems', customerFields.purchaseItems.toString());
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/customers?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch customer data');
    
    const data = await response.json();
    setCustomersData(data.customerReport);
  } catch (error) {
    setError('Failed to load customer data');
    console.error('Customer data error:', error);
  } finally {
    setLoading(prev => ({ ...prev, customers: false }));
  }
};

// Updated handleDownload function for customer reports with detailed transaction data
const handleCustomerDownload = async (format, customerFields) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    setLoading(prev => ({ ...prev, customers: true }));

    // Convert customerFields object to match backend expectation
    const fieldsToInclude = [];
    if (customerFields.name) fieldsToInclude.push('customerName');
    if (customerFields.mobile) fieldsToInclude.push('customerMobile');
    if (customerFields.address) fieldsToInclude.push('customerAddress');
    if (customerFields.purchaseAmount) fieldsToInclude.push('totalPurchaseAmount');
    if (customerFields.purchaseItems) fieldsToInclude.push('transactions'); // Changed to include transaction details

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reportType: 'customers',
        format,
        includeEntries: true,
        fields: fieldsToInclude,
        // Send field selection for filtering
        fieldSelection: {
          includeName: customerFields.name,
          includeAddress: customerFields.address,
          includeMobile: customerFields.mobile,
          includePurchaseAmount: customerFields.purchaseAmount,
          includePurchaseItems: customerFields.purchaseItems
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Customer Download API Error:', errorText);
      throw new Error(`HTTP ${response.status}: Failed to generate customer report`);
    }

    const data = await response.json();

    if (data.message && !data.downloadReady) {
      throw new Error(data.message);
    }

    if (data.downloadReady && data.downloadData) {
      const timestamp = new Date().toLocaleDateString('en-GB');
      const filename = getFilename('customers', format, timestamp);
      
      const reportData = data.downloadData.data;
      
      console.log('Customer report data for download:', reportData);
      
      // Generate customer report based on format with selected fields
      if (format === 'pdf') {
        await generateCustomerPDFReport(reportData, filename, customerFields);
      } else if (format === 'excel') {
        generateCustomerExcelReport(reportData, filename, customerFields);
      } else if (format === 'csv') {
        generateCustomerCSVReport(reportData, filename, customerFields);
      }
      
      alert(`Customer ${format.toUpperCase()} report downloaded successfully!`);
      return;
    }

  } catch (error) {
    console.error('Customer download error:', error);
    setError(`Failed to download customer report: ${error.message}`);
    alert(`Customer download failed: ${error.message}`);
  } finally {
    setLoading(prev => ({ ...prev, customers: false }));
  }
};

// Helper function to check if value is valid (not null, undefined, empty, or "N/A")
const isValidValue = (value) => {
  return value && value !== null && value !== undefined && value !== '' && value !== 'N/A' && value !== 'null';
};

// Helper function to format purchase items for display
const formatPurchaseItems = (transactions) => {
  if (!transactions || transactions.length === 0) return 'No purchases';
  
  const itemSummary = transactions.reduce((acc, transaction) => {
    const key = `${transaction.metalType}-${transaction.category}`;
    if (!acc[key]) {
      acc[key] = {
        metalType: transaction.metalType,
        category: transaction.category,
        count: 0,
        totalWeight: 0,
        totalAmount: 0
      };
    }
    acc[key].count += transaction.itemCount || 1;
    acc[key].totalWeight += transaction.weight || 0;
    acc[key].totalAmount += transaction.amount || 0;
    return acc;
  }, {});

  return Object.values(itemSummary).map(item => 
    `${item.count} ${item.metalType} ${item.category} (${item.totalWeight.toFixed(3)}g)`
  ).join(', ');
};

// Customer PDF Generation Function - Updated with purchase items
const generateCustomerPDFReport = async (reportData, filename, selectedFields) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  
  // Helper function to add text - simplified
  const addCustomerText = (text, fontSize = 10) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.text(text, margin, yPosition);
    yPosition += fontSize + 3;
  };
  
  // Helper function to check if new page is needed
  const checkCustomerNewPage = (requiredSpace = 10) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = 20;
    }
  };
  
  // Simple Header
  addCustomerText('Customer Report', 16);
  addCustomerText(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 10);
  addCustomerText('', 5);
  
  // Customer List - only customers with ALL selected fields having valid data (AND operation)
  if (reportData.customers && reportData.customers.length > 0) {
    let validCustomerIndex = 0;
    
    reportData.customers.forEach((customer) => {
      // Check if customer has ALL selected fields with valid data (AND operation)
      let hasAllSelectedFields = true;
      
      if (selectedFields.name && !isValidValue(customer.customerName)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.mobile && !isValidValue(customer.customerMobile)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.address && !isValidValue(customer.customerAddress)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.purchaseAmount && (!isValidValue(customer.totalPurchaseAmount) || customer.totalPurchaseAmount <= 0)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.purchaseItems && (!customer.transactions || customer.transactions.length === 0)) {
        hasAllSelectedFields = false;
      }
      
      // Only process customer if they have ALL selected fields with valid data
      if (hasAllSelectedFields) {
        checkCustomerNewPage(40); // More space needed for item details
        validCustomerIndex++;
        
        let customerLine = `${validCustomerIndex}. `;
        let isFirstField = true;
        
        // Add all selected fields (we know they all have valid data)
        if (selectedFields.name) {
          customerLine += `${customer.customerName}`;
          isFirstField = false;
        }
        
        if (selectedFields.mobile) {
          customerLine += isFirstField ? `${customer.customerMobile}` : ` | ${customer.customerMobile}`;
          isFirstField = false;
        }
        
        if (selectedFields.address) {
          customerLine += isFirstField ? `${customer.customerAddress}` : ` | ${customer.customerAddress}`;
          isFirstField = false;
        }
        
        if (selectedFields.purchaseAmount) {
          customerLine += isFirstField ? `Rs.${customer.totalPurchaseAmount}` : ` | Rs.${customer.totalPurchaseAmount}`;
          isFirstField = false;
        }
        
        addCustomerText(customerLine, 10);
        
        // Add purchase items details if selected
        if (selectedFields.purchaseItems && customer.transactions) {
          const itemsText = `   Items: ${formatPurchaseItems(customer.transactions)}`;
          addCustomerText(itemsText, 9);
        }
        
        addCustomerText('', 3); // Add some spacing between customers
      }
    });
  }
  
  // Save the PDF
  doc.save(filename);
};

// Customer Excel Generation Function - Updated with purchase items
const generateCustomerExcelReport = (reportData, filename, selectedFields) => {
  const XLSX = window.XLSX;
  const workbook = XLSX.utils.book_new();
  
  // Build dynamic headers based on selected fields
  const customerHeaders = [];
  if (selectedFields.name) customerHeaders.push('Customer Name');
  if (selectedFields.mobile) customerHeaders.push('Mobile Number');
  if (selectedFields.address) customerHeaders.push('Address');
  if (selectedFields.purchaseAmount) customerHeaders.push('Total Purchase Amount (₹)');
  if (selectedFields.purchaseItems) customerHeaders.push('Purchase Items Details');
  
  // Filter customers who have ALL selected fields with valid data (AND operation)
  const validCustomers = reportData.customers.filter(customer => {
    let hasAllSelectedFields = true;
    
    if (selectedFields.name && !isValidValue(customer.customerName)) {
      hasAllSelectedFields = false;
    }
    
    if (selectedFields.mobile && !isValidValue(customer.customerMobile)) {
      hasAllSelectedFields = false;
    }
    
    if (selectedFields.address && !isValidValue(customer.customerAddress)) {
      hasAllSelectedFields = false;
    }
    
    if (selectedFields.purchaseAmount && (!isValidValue(customer.totalPurchaseAmount) || customer.totalPurchaseAmount <= 0)) {
      hasAllSelectedFields = false;
    }
    
    if (selectedFields.purchaseItems && (!customer.transactions || customer.transactions.length === 0)) {
      hasAllSelectedFields = false;
    }
    
    return hasAllSelectedFields;
  });
  
  // Build customer rows with only valid customers
  const customerRows = validCustomers.map(customer => {
    const row = [];
    if (selectedFields.name) row.push(customer.customerName);
    if (selectedFields.mobile) row.push(customer.customerMobile);
    if (selectedFields.address) row.push(customer.customerAddress);
    if (selectedFields.purchaseAmount) row.push(customer.totalPurchaseAmount);
    if (selectedFields.purchaseItems) row.push(formatPurchaseItems(customer.transactions));
    return row;
  });
  
  const customerData = [customerHeaders, ...customerRows];
  const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
  
  // Dynamic column widths based on selected fields
  const columnWidths = [];
  if (selectedFields.name) columnWidths.push({ wch: 25 });
  if (selectedFields.mobile) columnWidths.push({ wch: 15 });
  if (selectedFields.address) columnWidths.push({ wch: 30 });
  if (selectedFields.purchaseAmount) columnWidths.push({ wch: 20 });
  if (selectedFields.purchaseItems) columnWidths.push({ wch: 50 }); // Wider for item details
  
  customerSheet['!cols'] = columnWidths;
  
  XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Report');
  
  // Save the Excel file
  XLSX.writeFile(workbook, filename);
};

// Customer CSV Generation Function - Updated with purchase items
const generateCustomerCSVReport = (reportData, filename, selectedFields) => {
  // Build dynamic headers based on selected fields
  const headers = [];
  if (selectedFields.name) headers.push('Customer Name');
  if (selectedFields.mobile) headers.push('Mobile Number');
  if (selectedFields.address) headers.push('Address');
  if (selectedFields.purchaseAmount) headers.push('Total Purchase Amount (₹)');
  if (selectedFields.purchaseItems) headers.push('Purchase Items Details');
  
  let csvContent = headers.join(',') + '\n';
  
  if (reportData.customers && reportData.customers.length > 0) {
    // Filter customers who have ALL selected fields with valid data (AND operation)
    const validCustomers = reportData.customers.filter(customer => {
      let hasAllSelectedFields = true;
      
      if (selectedFields.name && !isValidValue(customer.customerName)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.mobile && !isValidValue(customer.customerMobile)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.address && !isValidValue(customer.customerAddress)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.purchaseAmount && (!isValidValue(customer.totalPurchaseAmount) || customer.totalPurchaseAmount <= 0)) {
        hasAllSelectedFields = false;
      }
      
      if (selectedFields.purchaseItems && (!customer.transactions || customer.transactions.length === 0)) {
        hasAllSelectedFields = false;
      }
      
      return hasAllSelectedFields;
    });
    
    validCustomers.forEach(customer => {
      const row = [];
      if (selectedFields.name) row.push(`"${customer.customerName}"`);
      if (selectedFields.mobile) row.push(`"${customer.customerMobile}"`);
      if (selectedFields.address) row.push(`"${customer.customerAddress}"`);
      if (selectedFields.purchaseAmount) row.push(customer.totalPurchaseAmount);
      if (selectedFields.purchaseItems) row.push(`"${formatPurchaseItems(customer.transactions)}"`);
      
      csvContent += row.join(',') + '\n';
    });
  }
  
  // Create and download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.replace('.xlsx', '.csv'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};



// Initialize data on component mount  
useEffect(() => {
  fetchStockData();
  fetchSalesData();
  fetchCustomersData();
}, []);



  // Refetch customer data when field selection changes
  useEffect(() => {
    fetchCustomersData();
  }, [customerFields]);

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <AlertCircle className="h-5 w-5" />
      <span>{message}</span>
    </div>
  );

//   return (
//       <div className="max-w-7xl mx-auto p-6 space-y-8">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             {/* <BackButton /> */}
//             <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
//           </div>
//         </div>

//         {error && <ErrorMessage message={error} />}

//         {/* Stock Report Section */}
//         <Card className="p-6">
//   <div className="flex items-center gap-3 mb-6">
//     <Package className="h-6 w-6 text-blue-600" />
//     <h2 className="text-2xl font-semibold">Stock Report</h2>
//   </div>

//   {loading.stock ? (
//     <LoadingSpinner />
//   ) : stockData ? (
//     <div className="space-y-6">
//       {/* Gold Stock */}
//       <div className="bg-yellow-50 p-4 rounded-lg">
//         <h3 className="text-lg font-semibold text-yellow-800 mb-4">Gold Inventory</h3>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Total Gross Weight</p>
//             <p className="text-xl font-bold text-yellow-700">{stockData.gold.totalGross} g</p>
//           </div>
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Total Pure Weight</p>
//             <p className="text-xl font-bold text-yellow-700">{stockData.gold.totalPure} g</p>
//           </div>
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Average Purity</p>
//             <p className="text-xl font-bold text-yellow-700">{stockData.gold.averagePurity}%</p>
//           </div>
//         </div>

//         {/* Gold Categories */}
//         {Object.keys(stockData.gold.categories).length > 0 && (
//           <div className="bg-white rounded-lg overflow-hidden">
//             <h4 className="text-md font-semibold p-3 bg-gray-50">Category Breakdown</h4>
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="bg-gray-100">
//                   <tr>
//                     <th className="text-left p-3">Category</th>
//                     <th className="text-right p-3">Quantity</th>
//                     <th className="text-right p-3">Gross Weight (g)</th>
//                     <th className="text-right p-3">Pure Weight (g)</th>
//                     <th className="text-right p-3">Avg Purity (%)</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {Object.entries(stockData.gold.categories).map(([category, data]) => (
//                     <tr key={category} className="border-b">
//                       <td className="p-3 font-medium">{category}</td>
//                       <td className="p-3 text-right font-semibold text-blue-600">{data.totalItems}</td>
//                       <td className="p-3 text-right">{data.grossWeight}</td>
//                       <td className="p-3 text-right">{data.pureWeight}</td>
//                       <td className="p-3 text-right">{data.averagePurity}%</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Silver Stock */}
//       <div className="bg-gray-50 p-4 rounded-lg">
//         <h3 className="text-lg font-semibold text-gray-800 mb-4">Silver Inventory</h3>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Total Gross Weight</p>
//             <p className="text-xl font-bold text-gray-700">{stockData.silver.totalGross} g</p>
//           </div>
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Total Pure Weight</p>
//             <p className="text-xl font-bold text-gray-700">{stockData.silver.totalPure} g</p>
//           </div>
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Average Purity</p>
//             <p className="text-xl font-bold text-gray-700">{stockData.silver.averagePurity}%</p>
//           </div>
//         </div>

//         {/* Silver Categories */}
//         {Object.keys(stockData.silver.categories).length > 0 && (
//           <div className="bg-white rounded-lg overflow-hidden">
//             <h4 className="text-md font-semibold p-3 bg-gray-50">Category Breakdown</h4>
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="bg-gray-100">
//                   <tr>
//                     <th className="text-left p-3">Category</th>
//                     <th className="text-right p-3">Quantity</th>
//                     <th className="text-right p-3">Gross Weight (g)</th>
//                     <th className="text-right p-3">Pure Weight (g)</th>
//                     <th className="text-right p-3">Avg Purity (%)</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {Object.entries(stockData.silver.categories).map(([category, data]) => (
//                     <tr key={category} className="border-b">
//                       <td className="p-3 font-medium">{category}</td>
//                       <td className="p-3 text-right font-semibold text-blue-600">{data.totalItems}</td>
//                       <td className="p-3 text-right">{data.grossWeight}</td>
//                       <td className="p-3 text-right">{data.pureWeight}</td>
//                       <td className="p-3 text-right">{data.averagePurity}%</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}
//       </div>

// {/* Category Pie Charts */}
// <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
//   {[
//     { title: "Gold Category Distribution (Pure Weight)", data: categoryData.gold, color: "yellow" }, 
//     { title: "Silver Category Distribution (Pure Weight)", data: categoryData.silver, color: "gray" }
//   ].map(({ title, data, color }, i) => (
//     <div key={i} className={`bg-${color === 'yellow' ? 'yellow' : 'gray'}-50 rounded-lg p-4`}>
//       <h4 className={`text-lg font-semibold text-${color === 'yellow' ? 'yellow' : 'gray'}-800 mb-4`}>
//         {title}
//       </h4>
//       {data && data.length > 0 ? (
//         <div>
//           <ResponsiveContainer width="100%" height={300}>
//   <PieChart>
//     <Pie 
//       data={data} 
//       dataKey="value" 
//       nameKey="name" 
//       cx="50%" 
//       cy="50%" 
//       outerRadius={80}
//       label={renderLabel}
//       labelLine={true}
//     >
//       {data.map((_, index) => (
//         <Cell key={index} fill={COLORS[index % COLORS.length]} />
//       ))}
//     </Pie>
//     <Tooltip formatter={(value) => [`${value.toFixed(2)}g`, 'Pure Weight']} />
//   </PieChart>
// </ResponsiveContainer>
//           {/* Add legend below chart */}
//           <div className="mt-4 flex flex-wrap gap-2">
//             {data.map((item, index) => (
//               <div key={index} className="flex items-center gap-2">
//                 <div 
//                   className="w-3 h-3 rounded-full" 
//                   style={{ backgroundColor: COLORS[index % COLORS.length] }}
//                 ></div>
//                 <span className="text-sm">{item.name}: {item.value.toFixed(2)}g</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       ) : (
//         <div className="flex items-center justify-center h-[300px]">
//           <p className="text-sm text-gray-500">No category data available for {color === 'yellow' ? 'gold' : 'silver'}</p>
//         </div>
//       )}
//     </div>
//   ))}
// </div>

//       {/* Download Options */}
//       <div className="flex flex-wrap gap-3">
//         <Button 
//           onClick={() => setDownloadModal({ open: true, type: 'stock-gold', data: stockData.gold })}
//           className="bg-yellow-600 hover:bg-yellow-700"
//         >
//           <Download className="h-4 w-4 mr-2" />
//           Download Gold Report
//         </Button>
//         <Button 
//           onClick={() => setDownloadModal({ open: true, type: 'stock-silver', data: stockData.silver })}
//           className="bg-gray-600 hover:bg-gray-700"
//         >
//           <Download className="h-4 w-4 mr-2" />
//           Download Silver Report
//         </Button>
//         <Button 
//           onClick={() => setDownloadModal({ open: true, type: 'stock-full', data: stockData })}
//           className="bg-blue-600 hover:bg-blue-700"
//         >
//           <Download className="h-4 w-4 mr-2" />
//           Download Full Inventory
//         </Button>
//       </div>
//     </div>
//   ) : (
//     <p className="text-gray-500">No stock data available</p>
//   )}
//         </Card>

//         {/* Sales Report Section */}
//         <Card className="p-6">
//           <div className="flex items-center gap-3 mb-6">
//             <TrendingUp className="h-6 w-6 text-green-600" />
//             <h2 className="text-2xl font-semibold">Sales Report</h2>
//           </div>

//           {/* Date Range Selection */}
//           <div className="bg-gray-50 p-4 rounded-lg mb-6">
//             <h3 className="text-lg font-semibold mb-4">Date Range Selection</h3>
            
//             {/* Quick Date Options */}
// <div className="flex flex-wrap gap-2 mb-4">
//   <Button 
//     variant="outline" 
//     size="sm"
//     onClick={() => handleQuickDateSelect('today')}
//   >
//     Today
//   </Button>
//   <Button 
//     variant="outline" 
//     size="sm"
//     onClick={() => handleQuickDateSelect('week')}
//   >
//     Last Week
//   </Button>
//   <Button 
//     variant="outline" 
//     size="sm"
//     onClick={() => handleQuickDateSelect('month')}
//   >
//     Last Month
//   </Button>
//   <Button 
//     variant="outline" 
//     size="sm"
//     onClick={() => handleQuickDateSelect('6months')}
//   >
//     Last 6 Months
//   </Button>
//   <Button 
//     variant="outline" 
//     size="sm"
//     onClick={() => handleQuickDateSelect('year')}
//   >
//     Last Year
//   </Button>
//   <Button 
//     variant="outline" 
//     size="sm"
//     onClick={() => handleQuickDateSelect('alltime')}
//   >
//     All Time
//   </Button>
// </div>

//             {/* Custom Date Range */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-2">Start Date</label>
//                 <Input
//                   type="date"
//                   value={dateRange.startDate}
//                   onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-2">End Date</label>
//                 <Input
//                   type="date"
//                   value={dateRange.endDate}
//                   onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
//                 />
//               </div>
//             </div>
//           </div>

//           {loading.sales ? (
//             <LoadingSpinner />
//           ) : salesData ? (
//             <div className="space-y-6">
//               {/* Updated Sales Summary Section */}
// <div className="bg-green-50 p-4 rounded-lg">
//   <h3 className="text-lg font-semibold text-green-800 mb-4">Sales Summary</h3>
//   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//     <div className="bg-white p-3 rounded shadow">
//       <p className="text-sm text-gray-600">Total Revenue</p>
//       <p className="text-xl font-bold text-green-700">₹{salesData.summary.totalRevenue.toLocaleString()}</p>
//     </div>
//     <div className="bg-white p-3 rounded shadow">
//       <p className="text-sm text-gray-600">Total Items Sold</p>
//       <p className="text-xl font-bold text-green-700">{salesData.summary.totalItems}</p>
//     </div>
//     {/* <div className="bg-white p-3 rounded shadow">
//       <p className="text-sm text-gray-600">Unique Customers</p>
//       <p className="text-xl font-bold text-green-700">{salesData.summary.uniqueCustomers}</p>
//     </div> */}
//     <div className="bg-white p-3 rounded shadow">
//       <p className="text-sm text-gray-600">Avg Revenue/Item</p>
//       <p className="text-xl font-bold text-green-700">₹{salesData.summary.averagePricePerItem.toLocaleString()}</p>
//     </div>
//   </div>
// </div>
// {/* Revenue Chart */}
// <div className="bg-white rounded-lg border">
//   <h3 className="text-lg font-semibold p-4 bg-gray-50 rounded-t-lg">
//     Daily Revenue Trend
//     {salesData?.dateRange?.startDate && salesData?.dateRange?.endDate && (
//       <span className="text-sm font-normal text-gray-600 ml-2">
//         ({formatAPIDateForDisplay(salesData.dateRange.startDate)} - {formatAPIDateForDisplay(salesData.dateRange.endDate)})
//       </span>
//     )}
//   </h3>
//   <div className="p-4">
//     {salesData?.dailyRevenue?.length > 0 ? (
//       <div className="h-80">
//         <ResponsiveContainer width="100%" height="100%">
//           <LineChart data={salesData.dailyRevenue}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis 
//               dataKey="date" 
//               tick={{ fontSize: 12 }}
//               tickFormatter={(value) => {
//                 const date = new Date(value);
//                 const day = String(date.getDate()).padStart(2, '0');
//                 const month = date.toLocaleDateString('en-IN', { month: 'short' });
//                 return `${day}/${month}`;
//               }}
//             />
//             <YAxis 
//               tick={{ fontSize: 12 }}
//               tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`}
//             />
//             <Tooltip 
//               formatter={(value, name) => {
//                 if (name === 'revenue') return [`₹${value.toLocaleString('en-IN')}`, 'Revenue'];
//                 if (name === 'transactions') return [value, 'Transactions'];
//                 return [value, name];
//               }}
//               labelFormatter={(label) => {
//                 const date = new Date(label);
//                 const day = String(date.getDate()).padStart(2, '0');
//                 const month = String(date.getMonth() + 1).padStart(2, '0');
//                 const year = date.getFullYear();
//                 const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
//                 const monthName = date.toLocaleDateString('en-IN', { month: 'long' });
//                 return `${weekday}, ${day}/${month}/${year} (${day} ${monthName} ${year})`;
//               }}
//             />
//             <Line 
//               type="monotone" 
//               dataKey="revenue" 
//               stroke="#16a34a" 
//               strokeWidth={2}
//               dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
//               activeDot={{ r: 6 }}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>
//     ) : (
//       <div className="h-80 flex items-center justify-center text-gray-500">
//         <div className="text-center">
//           <p className="text-lg">No sales data available</p>
//           <p className="text-sm">for the selected time period</p>
//         </div>
//       </div>
//     )}
//   </div>
// </div>


//               {/* Metal-wise Breakdown */}
//               <div className="bg-white rounded-lg border">
//   <h3 className="text-lg font-semibold p-4 bg-gray-50 rounded-t-lg">Metal-wise Breakdown</h3>
//   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
//     <div className="bg-yellow-50 p-3 rounded">
//       <h4 className="font-semibold text-yellow-800 mb-2">Gold Sales</h4>
//       <p className="text-sm">Revenue: ₹{salesData.byMetal.gold.totalRevenue.toLocaleString()}</p>
//       <p className="text-sm">Gross Weight: {salesData.byMetal.gold.totalWeight} g</p>
//       <p className="text-sm">Pure Weight: {salesData.byMetal.gold.totalPureWeight} g</p>
//       <p className="text-sm">Sales Count: {salesData.byMetal.gold.totalSalesCount}</p>
//     </div>
//     <div className="bg-gray-50 p-3 rounded">
//       <h4 className="font-semibold text-gray-800 mb-2">Silver Sales</h4>
//       <p className="text-sm">Revenue: ₹{salesData.byMetal.silver.totalRevenue.toLocaleString()}</p>
//       <p className="text-sm">Gross Weight: {salesData.byMetal.silver.totalWeight} g</p>
//       <p className="text-sm">Pure Weight: {salesData.byMetal.silver.totalPureWeight} g</p>
//       <p className="text-sm">Sales Count: {salesData.byMetal.silver.totalSalesCount}</p>
//     </div>
//   </div>
//               </div>

//               {/* Top Performers Section */}
// {salesData.topPerformers.length > 0 && (
//   <div className="space-y-6">
//     {/* Top Revenue Generators */}
//     <div className="bg-white rounded-lg border">
//       <h3 className="text-lg font-semibold p-4 bg-gray-50 rounded-t-lg">Top Revenue Generators</h3>
//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="text-left p-3">Metal</th>
//               <th className="text-left p-3">Category</th>
//               <th className="text-right p-3">Purity</th>
//               <th className="text-right p-3">Revenue</th>
//               <th className="text-right p-3">Weight</th>
//               <th className="text-right p-3">Quantity</th>
//             </tr>
//           </thead>
//           <tbody>
//             {salesData.topPerformers.slice(0, 10).map((item, index) => (
//               <tr key={index} className="border-b">
//                 <td className="p-3 capitalize">{item.metalType}</td>
//                 <td className="p-3">{item.category}</td>
//                 <td className="p-3 text-right">{item.purity}%</td>
//                 <td className="p-3 text-right">₹{item.totalSalesAmount.toLocaleString()}</td>
//                 <td className="p-3 text-right">{item.totalGrossWeight} g</td>
//                 <td className="p-3 text-right">{item.totalItems}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>

//     {/* Top Sold Quantity Items */}
//     <div className="bg-white rounded-lg border">
//       <h3 className="text-lg font-semibold p-4 bg-gray-50 rounded-t-lg">Top Sold Quantity Items</h3>
//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="text-left p-3">Metal</th>
//               <th className="text-left p-3">Category</th>
//               <th className="text-right p-3">Purity</th>
//               <th className="text-right p-3">Quantity</th>
//               <th className="text-right p-3">Weight</th>
//               <th className="text-right p-3">Revenue</th>
//             </tr>
//           </thead>
//           <tbody>
//             {salesData.topQuantityItems.slice(0, 10).map((item, index) => (
//               <tr key={index} className="border-b">
//                 <td className="p-3 capitalize">{item.metalType}</td>
//                 <td className="p-3">{item.category}</td>
//                 <td className="p-3 text-right">{item.purity}%</td>
//                 <td className="p-3 text-right">{item.totalItems}</td>
//                 <td className="p-3 text-right">{item.totalGrossWeight} g</td>
//                 <td className="p-3 text-right">₹{item.totalSalesAmount.toLocaleString()}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>

//     {/* Gold and Silver Weight Leaders - Side by Side */}
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//       {/* Gold Weight Leaders */}
//       <div className="bg-white rounded-lg border">
//         <h3 className="text-lg font-semibold p-4 bg-yellow-50 rounded-t-lg text-yellow-800">Gold Weight Leaders</h3>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="text-left p-3">Category</th>
//                 <th className="text-right p-3">Purity</th>
//                 <th className="text-right p-3">Weight</th>
//                 <th className="text-right p-3">Revenue</th>
//               </tr>
//             </thead>
//             <tbody>
//               {salesData.goldWeightLeaders.slice(0, 5).map((item, index) => (
//                 <tr key={index} className="border-b">
//                   <td className="p-3">{item.category}</td>
//                   <td className="p-3 text-right">{item.purity}%</td>
//                   <td className="p-3 text-right">{item.totalGrossWeight} g</td>
//                   <td className="p-3 text-right">₹{item.totalSalesAmount.toLocaleString()}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Silver Weight Leaders */}
//       <div className="bg-white rounded-lg border">
//         <h3 className="text-lg font-semibold p-4 bg-gray-50 rounded-t-lg text-gray-800">Silver Weight Leaders</h3>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="text-left p-3">Category</th>
//                 <th className="text-right p-3">Purity</th>
//                 <th className="text-right p-3">Weight</th>
//                 <th className="text-right p-3">Revenue</th>
//               </tr>
//             </thead>
//             <tbody>
//               {salesData.silverWeightLeaders.slice(0, 5).map((item, index) => (
//                 <tr key={index} className="border-b">
//                   <td className="p-3">{item.category}</td>
//                   <td className="p-3 text-right">{item.purity}%</td>
//                   <td className="p-3 text-right">{item.totalGrossWeight} g</td>
//                   <td className="p-3 text-right">₹{item.totalSalesAmount.toLocaleString()}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   </div>
// )}

//               {/* Download Options */}
//               <div className="flex flex-wrap gap-3 items-center">
//                 <Button 
//                   onClick={() => setDownloadModal({ open: true, type: 'sales', data: salesData })}
//                   className="bg-green-600 hover:bg-green-700"
//                 >
//                   <Download className="h-4 w-4 mr-2" />
//                   Download Sales Report
//                 </Button>
//                 <label className="flex items-center gap-2">
//                   <input
//                     type="checkbox"
//                     checked={includeEntries}
//                     onChange={(e) => setIncludeEntries(e.target.checked)}
//                     className="rounded"
//                   />
//                   <span className="text-sm">Include Related Entries</span>
//                 </label>
//               </div>
//             </div>
//           ) : (
//             <p className="text-gray-500">No sales data available</p>
//           )}
//         </Card>

//         {/* Customer List Report Section */}
//         <Card className="p-6">
//   <div className="flex items-center gap-3 mb-6">
//     <Users className="h-6 w-6 text-purple-600" />
//     <h2 className="text-2xl font-semibold">Customer List Report</h2>
//   </div>

//   {/* Field Selection */}
//   <div className="bg-gray-50 p-4 rounded-lg mb-6">
//     <h3 className="text-lg font-semibold mb-4">Select Fields to Include</h3>
//     <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
//       {Object.entries(customerFields).map(([field, checked]) => (
//         <label key={field} className="flex items-center gap-2">
//           <input
//             type="checkbox"
//             checked={checked}
//             onChange={(e) => setCustomerFields(prev => ({
//               ...prev,
//               [field]: e.target.checked
//             }))}
//             className="rounded"
//           />
//           <span className="text-sm capitalize">
//             {field === 'purchaseAmount' ? 'Purchase Amount' : 
//              field === 'purchaseItems' ? 'Purchase Items' : field}
//           </span>
//         </label>
//       ))}
//     </div>
//   </div>

//   {loading.customers ? (
//     <LoadingSpinner />
//   ) : customersData ? (
//     <div className="space-y-6">
//       {/* Summary */}
//       <div className="bg-purple-50 p-4 rounded-lg">
//         <h3 className="text-lg font-semibold text-purple-800 mb-4">Customer Summary</h3>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Total Customers</p>
//             <p className="text-xl font-bold text-purple-700">{customersData.totalCustomers}</p>
//           </div>
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Total Revenue</p>
//             <p className="text-xl font-bold text-purple-700">₹{customersData.summary.totalRevenue.toLocaleString()}</p>
//           </div>
//           <div className="bg-white p-3 rounded shadow">
//             <p className="text-sm text-gray-600">Avg Customer Value</p>
//             <p className="text-xl font-bold text-purple-700">₹{customersData.summary.averageCustomerValue.toLocaleString()}</p>
//           </div>
//         </div>
//       </div>

//       {/* Customer List */}
//       {customersData.customers.length > 0 && (
//         <div className="bg-white rounded-lg border">
//           <h3 className="text-lg font-semibold p-4 bg-gray-50 rounded-t-lg">Customer List</h3>
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="bg-gray-100">
//                 <tr>
//                   {customerFields.name && <th className="text-left p-3">Name</th>}
//                   {customerFields.mobile && <th className="text-left p-3">Mobile</th>}
//                   {customerFields.address && <th className="text-left p-3">Address</th>}
//                   {customerFields.purchaseAmount && (
//                     <>
//                       <th className="text-right p-3">Total Purchase</th>
//                       <th className="text-right p-3">Transactions</th>
//                       <th className="text-right p-3">Avg Purchase</th>
//                     </>
//                   )}
//                   {customerFields.purchaseItems && <th className="text-left p-3">Purchase Items</th>}
//                 </tr>
//               </thead>
//               <tbody>
//                 {customersData.customers.slice(0, 50).map((customer, index) => (
//                   <tr key={index} className="border-b">
//                     {customerFields.name && (
//                       <td className="p-3">{customer.customerName || 'N/A'}</td>
//                     )}
//                     {customerFields.mobile && (
//                       <td className="p-3">{customer.customerMobile || 'N/A'}</td>
//                     )}
//                     {customerFields.address && (
//                       <td className="p-3">{customer.customerAddress || 'N/A'}</td>
//                     )}
//                     {customerFields.purchaseAmount && (
//                       <>
//                         <td className="p-3 text-right">₹{customer.totalPurchaseAmount?.toLocaleString() || 0}</td>
//                         <td className="p-3 text-right">{customer.transactionCount || 0}</td>
//                         <td className="p-3 text-right">₹{customer.averagePurchaseValue?.toLocaleString() || 0}</td>
//                       </>
//                     )}
//                     {customerFields.purchaseItems && (
//                       <td className="p-3">
//                         <div className="max-w-xs">
//                           {customer.purchaseItems && customer.purchaseItems.length > 0 ? (
//                             <div className="space-y-1">
//                               {customer.purchaseItems.map((item, itemIndex) => (
//                                 <div key={itemIndex} className="text-xs bg-gray-100 p-1 rounded">
//                                   {item}
//                                 </div>
//                               ))}
//                             </div>
//                           ) : (
//                             <span className="text-gray-500">No items</span>
//                           )}
//                         </div>
//                       </td>
//                     )}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           {customersData.customers.length > 50 && (
//             <div className="p-4 text-center text-gray-500">
//               Showing first 50 customers. Download Excel for complete list.
//             </div>
//           )}
//         </div>
//       )}

//       {/* Download Options */}
//       <div className="flex justify-start">
//         <Button 
//           onClick={() => setDownloadModal({ open: true, type: 'customers', data: customersData })}
//           className="bg-purple-600 hover:bg-purple-700"
//         >
//           <Download className="h-4 w-4 mr-2" />
//           Download Customer List
//         </Button>
//       </div>
//     </div>
//   ) : (
//     <p className="text-gray-500">No customer data available</p>
//   )}
//         </Card>

//         {/* Download Modal */}
//         <Modal 
//           isOpen={downloadModal.open} 
//           onClose={() => setDownloadModal({ open: false, type: '', data: null })}
//           title="Download Report"
//         >
//           <div className="space-y-4">
//             <p className="text-gray-600">Choose download format:</p>
//             {downloadModal.type.startsWith('stock') && (
//   <div className="mb-4 p-3 bg-gray-50 rounded">
//     <p className="text-sm text-gray-600">
//       {downloadModal.type === 'stock-gold' && "Gold inventory report will include gold categories with gross weight, pure weight, and average purity."}
//       {downloadModal.type === 'stock-silver' && "Silver inventory report will include silver categories with gross weight, pure weight, and average purity."}
//       {downloadModal.type === 'stock-full' && "Complete inventory report will include both gold and silver with all category breakdowns."}
//     </p>
//   </div>
// )}
//             <div className="flex gap-3">
//               <Button 
//                 onClick={() => handleDownload(downloadModal.type, 'pdf')}
//                 className="flex-1"
//               >
//                 <FileText className="h-4 w-4 mr-2" />
//                 Download PDF
//               </Button>
//               <Button 
//                 onClick={() => handleDownload(downloadModal.type, 'excel')}
//                 variant="outline"
//                 className="flex-1"
//               >
//                 <FileText className="h-4 w-4 mr-2" />
//                 Download Excel
//               </Button>
//             </div>
//           </div>
//         </Modal>
//       </div>
//   );



// return (
//   <div className="w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6 lg:space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
//     {/* Header Section - Modern with gradient background */}
//     <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4 md:p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl">
//       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
//         <div className="flex items-center gap-3 md:gap-4">
//           <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
//             Reports Dashboard
//           </h1>
//         </div>
//       </div>
//     </div>

//     {/* Error Message - Modern styling */}
//     {error && (
//       <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-2 border-red-200 dark:border-red-700/50 rounded-2xl p-4 md:p-6 shadow-lg">
//         <ErrorMessage message={error} />
//       </div>
//     )}

//     {/* Stock Report Section - Glassmorphism card */}
//     <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300">
//       <div className="flex items-center gap-3 mb-6 md:mb-8">
//         <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg">
//           <Package className="h-6 w-6 text-white" />
//         </div>
//         <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Report</h2>
//       </div>

//       {loading.stock ? (
//         <div className="flex items-center justify-center py-12">
//           <LoadingSpinner />
//         </div>
//       ) : stockData ? (
//         <div className="space-y-6 md:space-y-8">
//           {/* Gold Stock Section - Modern gradient background */}
//           <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 md:p-6 lg:p-8 rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
//             <h3 className="text-lg md:text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2">
//               <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
//               Gold Inventory
//             </h3>

//             {/* Gold Stats Cards - Modern glass effect */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
//               <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
//                 <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Gross Weight</p>
//                 <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
//                   {stockData.gold.totalGross} g
//                 </p>
//               </div>
//               <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
//                 <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Pure Weight</p>
//                 <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
//                   {stockData.gold.totalPure} g
//                 </p>
//               </div>
//               <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
//                 <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Average Purity</p>
//                 <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
//                   {stockData.gold.averagePurity}%
//                 </p>
//               </div>
//             </div>

//             {/* Gold Categories Table - Modern styling */}
//             {Object.keys(stockData.gold.categories).length > 0 && (
//               <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
//                 <h4 className="text-base md:text-lg font-bold p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">
//                   Category Breakdown
//                 </h4>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm md:text-base min-w-[600px]">
//                     <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
//                       <tr>
//                         <th className="text-left p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
//                         <th className="text-center p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
//                         <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Gross Weight (g)</th>
//                         <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Pure Weight (g)</th>
//                         <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Avg Purity (%)</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {Object.entries(stockData.gold.categories).map(([category, data]) => (
//                         <tr key={category} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
//                           <td className="p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">{category}</td>
//                           <td className="p-3 md:p-4 text-center font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{data.grossWeight}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{data.pureWeight}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{data.averagePurity}%</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Silver Stock Section - Modern gradient background */}
//           <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 p-4 md:p-6 lg:p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
//             <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
//               <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>
//               Silver Inventory
//             </h3>

//             {/* Silver Stats Cards - Modern glass effect */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
//               <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
//                 <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Gross Weight</p>
//                 <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
//                   {stockData.silver.totalGross} g
//                 </p>
//               </div>
//               <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
//                 <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Pure Weight</p>
//                 <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
//                   {stockData.silver.totalPure} g
//                 </p>
//               </div>
//               <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
//                 <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Average Purity</p>
//                 <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
//                   {stockData.silver.averagePurity}%
//                 </p>
//               </div>
//             </div>

//             {/* Silver Categories Table - Modern styling */}
//             {Object.keys(stockData.silver.categories).length > 0 && (
//               <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
//                 <h4 className="text-base md:text-lg font-bold p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">
//                   Category Breakdown
//                 </h4>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm md:text-base min-w-[600px]">
//                     <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
//                       <tr>
//                         <th className="text-left p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
//                         <th className="text-center p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
//                         <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Gross Weight (g)</th>
//                         <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Pure Weight (g)</th>
//                         <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Avg Purity (%)</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {Object.entries(stockData.silver.categories).map(([category, data]) => (
//                         <tr key={category} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
//                           <td className="p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">{category}</td>
//                           <td className="p-3 md:p-4 text-center font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{data.grossWeight}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{data.pureWeight}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{data.averagePurity}%</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Category Pie Charts - Modern card layout */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
//             {[
//               { title: "Gold Category Distribution (Pure Weight)", data: categoryData.gold, color: "yellow" }, 
//               { title: "Silver Category Distribution (Pure Weight)", data: categoryData.silver, color: "gray" }
//             ].map(({ title, data, color }, i) => (
//               <div key={i} className={`bg-gradient-to-br ${color === 'yellow' ? 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20' : 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20'} backdrop-blur-sm rounded-2xl p-4 md:p-6 lg:p-8 border ${color === 'yellow' ? 'border-yellow-200/50 dark:border-yellow-700/50' : 'border-gray-200/50 dark:border-gray-700/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
//                 <h4 className={`text-base md:text-lg lg:text-xl font-bold ${color === 'yellow' ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-800 dark:text-gray-200'} mb-6 flex items-center gap-2`}>
//                   <div className={`w-3 h-3 bg-gradient-to-r ${color === 'yellow' ? 'from-yellow-400 to-amber-500' : 'from-gray-400 to-slate-500'} rounded-full`}></div>
//                   {title}
//                 </h4>
//                 {data && data.length > 0 ? (
//                   <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
//                     <div className="h-[300px] md:h-[350px]">
//                       <ResponsiveContainer width="100%" height="100%">
//                         <PieChart>
//                           <Pie 
//                             data={data} 
//                             dataKey="value" 
//                             nameKey="name" 
//                             cx="50%" 
//                             cy="50%" 
//                             outerRadius="70%"
//                             label={renderLabel}
//                             labelLine={true}
//                           >
//                             {data.map((_, index) => (
//                               <Cell key={index} fill={COLORS[index % COLORS.length]} />
//                             ))}
//                           </Pie>
//                           <Tooltip formatter={(value) => [`${value.toFixed(2)}g`, 'Pure Weight']} />
//                         </PieChart>
//                       </ResponsiveContainer>
//                     </div>
                    
//                     {/* Improved mobile-friendly legend */}
//                     <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
//                       {data.map((item, index) => (
//                         <div key={index} className="flex items-center gap-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200/50 dark:border-gray-600/50">
//                           <div 
//                             className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" 
//                             style={{ backgroundColor: COLORS[index % COLORS.length] }}
//                           ></div>
//                           <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{item.name}</span>
//                           <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.value.toFixed(2)}g</span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="flex items-center justify-center h-[300px] bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
//                     <p className="text-sm text-gray-500 dark:text-gray-400">No category data available for {color === 'yellow' ? 'gold' : 'silver'}</p>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>

//           {/* Download Options - Modern button styling */}
//           <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-6 md:pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
//             <button 
//               onClick={() => setDownloadModal({ open: true, type: 'stock-gold', data: stockData.gold })}
//               className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
//             >
//               <Download className="h-4 w-4" />
//               Download Gold Report
//             </button>
//             <button 
//               onClick={() => setDownloadModal({ open: true, type: 'stock-silver', data: stockData.silver })}
//               className="bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
//             >
//               <Download className="h-4 w-4" />
//               Download Silver Report
//             </button>
//             <button 
//               onClick={() => setDownloadModal({ open: true, type: 'stock-full', data: stockData })}
//               className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
//             >
//               <Download className="h-4 w-4" />
//               Download Full Inventory
//             </button>
//           </div>
//         </div>
//       ) : (
//         <div className="flex items-center justify-center py-12 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
//           <p className="text-gray-500 dark:text-gray-400 text-lg">No stock data available</p>
//         </div>
//       )}
//     </div>

//     {/* Modern Sales Report Card */}
//     <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300">
//       <div className="flex items-center gap-3 mb-6">
//         <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
//           <TrendingUp className="h-6 w-6 text-white" />
//         </div>
//         <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Report</h2>
//       </div>

//       {/* Date Range Selection */}
//       <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4 md:p-6 rounded-xl mb-6 border border-gray-200/50 dark:border-gray-600/50">
//         <h3 className="text-base md:text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Date Range Selection</h3>
        
//         {/* Quick Date Options */}
//         <div className="flex flex-wrap gap-2 mb-6">
//           <button 
//             className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 md:px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 text-sm"
//             onClick={() => handleQuickDateSelect('today')}
//           >
//             Today
//           </button>
//           <button 
//             className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 md:px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 text-sm"
//             onClick={() => handleQuickDateSelect('week')}
//           >
//             Last Week
//           </button>
//           <button 
//             className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 md:px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 text-sm"
//             onClick={() => handleQuickDateSelect('month')}
//           >
//             Last Month
//           </button>
//           <button 
//             className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 md:px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 text-sm"
//             onClick={() => handleQuickDateSelect('6months')}
//           >
//             Last 6 Months
//           </button>
//           <button 
//             className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 md:px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 text-sm"
//             onClick={() => handleQuickDateSelect('year')}
//           >
//             Last Year
//           </button>
//           <button 
//             className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 md:px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 text-sm"
//             onClick={() => handleQuickDateSelect('alltime')}
//           >
//             All Time
//           </button>
//         </div>

//         {/* Custom Date Range */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
//             <input
//               type="date"
//               value={dateRange.startDate}
//               onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
//               className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">End Date</label>
//             <input
//               type="date"
//               value={dateRange.endDate}
//               onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
//               className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
//             />
//           </div>
//         </div>
//       </div>

//       {loading.sales ? (
//         <LoadingSpinner />
//       ) : salesData ? (
//         <div className="space-y-6 md:space-y-8">
//           {/* Sales Summary Section */}
//           <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 md:p-6 rounded-xl border border-green-200/50 dark:border-green-700/50">
//             <h3 className="text-base md:text-lg font-semibold text-green-800 dark:text-green-200 mb-4">Sales Summary</h3>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//               <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/50">
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
//                 <p className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400">₹{salesData.summary.totalRevenue.toLocaleString()}</p>
//               </div>
//               <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/50">
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Total Items Sold</p>
//                 <p className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400">{salesData.summary.totalItems}</p>
//               </div>
//               <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/50">
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Avg Revenue/Item</p>
//                 <p className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400">₹{salesData.summary.averagePricePerItem.toLocaleString()}</p>
//               </div>
//             </div>
//           </div>

//           {/* Revenue Chart */}
//           <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
//             <h3 className="text-base md:text-lg font-semibold p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-xl border-b border-gray-200/50 dark:border-gray-600/50 text-gray-900 dark:text-gray-100">
//               Daily Revenue Trend
//               {salesData?.dateRange?.startDate && salesData?.dateRange?.endDate && (
//                 <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
//                   ({formatAPIDateForDisplay(salesData.dateRange.startDate)} - {formatAPIDateForDisplay(salesData.dateRange.endDate)})
//                 </span>
//               )}
//             </h3>
//             <div className="p-4 md:p-6">
//               {salesData?.dailyRevenue?.length > 0 ? (
//                 <div className="h-64 md:h-80">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <LineChart data={salesData.dailyRevenue}>
//                       <CartesianGrid strokeDasharray="3 3" />
//                       <XAxis 
//                         dataKey="date" 
//                         tick={{ fontSize: 12 }}
//                         tickFormatter={(value) => {
//                           const date = new Date(value);
//                           const day = String(date.getDate()).padStart(2, '0');
//                           const month = date.toLocaleDateString('en-IN', { month: 'short' });
//                           return `${day}/${month}`;
//                         }}
//                       />
//                       <YAxis 
//                         tick={{ fontSize: 12 }}
//                         tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`}
//                       />
//                       <Tooltip 
//                         formatter={(value, name) => {
//                           if (name === 'revenue') return [`₹${value.toLocaleString('en-IN')}`, 'Revenue'];
//                           if (name === 'transactions') return [value, 'Transactions'];
//                           return [value, name];
//                         }}
//                         labelFormatter={(label) => {
//                           const date = new Date(label);
//                           const day = String(date.getDate()).padStart(2, '0');
//                           const month = String(date.getMonth() + 1).padStart(2, '0');
//                           const year = date.getFullYear();
//                           const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
//                           const monthName = date.toLocaleDateString('en-IN', { month: 'long' });
//                           return `${weekday}, ${day}/${month}/${year} (${day} ${monthName} ${year})`;
//                         }}
//                       />
//                       <Line 
//                         type="monotone" 
//                         dataKey="revenue" 
//                         stroke="#16a34a" 
//                         strokeWidth={2}
//                         dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
//                         activeDot={{ r: 6 }}
//                       />
//                     </LineChart>
//                   </ResponsiveContainer>
//                 </div>
//               ) : (
//                 <div className="h-64 md:h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
//                   <div className="text-center">
//                     <p className="text-lg">No sales data available</p>
//                     <p className="text-sm">for the selected time period</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Metal-wise Breakdown */}
//           <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
//             <h3 className="text-base md:text-lg font-semibold p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-xl border-b border-gray-200/50 dark:border-gray-600/50 text-gray-900 dark:text-gray-100">Metal-wise Breakdown</h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6">
//               <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 rounded-xl border border-yellow-200/50 dark:border-yellow-700/50">
//                 <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">Gold Sales</h4>
//                 <div className="space-y-2">
//                   <p className="text-sm text-yellow-700 dark:text-yellow-300">Revenue: ₹{salesData.byMetal.gold.totalRevenue.toLocaleString()}</p>
//                   <p className="text-sm text-yellow-700 dark:text-yellow-300">Gross Weight: {salesData.byMetal.gold.totalWeight} g</p>
//                   <p className="text-sm text-yellow-700 dark:text-yellow-300">Pure Weight: {salesData.byMetal.gold.totalPureWeight} g</p>
//                   <p className="text-sm text-yellow-700 dark:text-yellow-300">Sales Count: {salesData.byMetal.gold.totalSalesCount}</p>
//                 </div>
//               </div>
//               <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 p-4 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
//                 <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Silver Sales</h4>
//                 <div className="space-y-2">
//                   <p className="text-sm text-gray-700 dark:text-gray-300">Revenue: ₹{salesData.byMetal.silver.totalRevenue.toLocaleString()}</p>
//                   <p className="text-sm text-gray-700 dark:text-gray-300">Gross Weight: {salesData.byMetal.silver.totalWeight} g</p>
//                   <p className="text-sm text-gray-700 dark:text-gray-300">Pure Weight: {salesData.byMetal.silver.totalPureWeight} g</p>
//                   <p className="text-sm text-gray-700 dark:text-gray-300">Sales Count: {salesData.byMetal.silver.totalSalesCount}</p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Top Performers Section */}
//           {salesData.topPerformers.length > 0 && (
//             <div className="space-y-6 md:space-y-8">
//               {/* Top Revenue Generators */}
//               <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
//                 <h3 className="text-base md:text-lg font-semibold p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-xl border-b border-gray-200/50 dark:border-gray-600/50 text-gray-900 dark:text-gray-100">Top Revenue Generators</h3>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm min-w-[700px]">
//                     <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
//                       <tr>
//                         <th className="text-left p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Metal</th>
//                         <th className="text-left p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Category</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Purity</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Revenue</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Weight</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Quantity</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {salesData.topPerformers.slice(0, 10).map((item, index) => (
//                         <tr key={index} className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
//                           <td className="p-3 md:p-4 capitalize text-gray-900 dark:text-gray-100">{item.metalType}</td>
//                           <td className="p-3 md:p-4 text-gray-900 dark:text-gray-100">{item.category}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">{item.purity}%</td>
//                           <td className="p-3 md:p-4 text-right font-medium text-gray-900 dark:text-gray-100">₹{item.totalSalesAmount.toLocaleString()}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">{item.totalGrossWeight} g</td>
//                           <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">{item.totalItems}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               {/* Top Sold Quantity Items */}
//               <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
//                 <h3 className="text-base md:text-lg font-semibold p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-xl border-b border-gray-200/50 dark:border-gray-600/50 text-gray-900 dark:text-gray-100">Top Sold Quantity Items</h3>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm min-w-[700px]">
//                     <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
//                       <tr>
//                         <th className="text-left p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Metal</th>
//                         <th className="text-left p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Category</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Purity</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Quantity</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Weight</th>
//                         <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Revenue</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {salesData.topQuantityItems.slice(0, 10).map((item, index) => (
//                         <tr key={index} className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
//                           <td className="p-3 md:p-4 capitalize text-gray-900 dark:text-gray-100">{item.metalType}</td>
//                           <td className="p-3 md:p-4 text-gray-900 dark:text-gray-100">{item.category}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">{item.purity}%</td>
//                           <td className="p-3 md:p-4 text-right font-medium text-gray-900 dark:text-gray-100">{item.totalItems}</td>
//                           <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">{item.totalGrossWeight} g</td>
//                           <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">₹{item.totalSalesAmount.toLocaleString()}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               {/* Gold and Silver Weight Leaders - Side by Side */}
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                 {/* Gold Weight Leaders */}
//                 <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
//                   <h3 className="text-base md:text-lg font-semibold p-4 md:p-6 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-t-xl border-b border-yellow-200/50 dark:border-yellow-700/50 text-yellow-800 dark:text-yellow-200">Gold Weight Leaders</h3>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm min-w-[500px]">
//                       <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
//                         <tr>
//                           <th className="text-left p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Category</th>
//                           <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Purity</th>
//                           <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Weight</th>
//                           <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Revenue</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {salesData.goldWeightLeaders.slice(0, 5).map((item, index) => (
//                           <tr key={index} className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
//                             <td className="p-3 md:p-4 text-gray-900 dark:text-gray-100">{item.category}</td>
//                             <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">{item.purity}%</td>
//                             <td className="p-3 md:p-4 text-right font-medium text-gray-900 dark:text-gray-100">{item.totalGrossWeight} g</td>
//                             <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">₹{item.totalSalesAmount.toLocaleString()}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* Silver Weight Leaders */}
//                 <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
//                   <h3 className="text-base md:text-lg font-semibold p-4 md:p-6 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700 rounded-t-xl border-b border-gray-200/50 dark:border-gray-600/50 text-gray-800 dark:text-gray-200">Silver Weight Leaders</h3>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm min-w-[500px]">
//                       <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
//                         <tr>
//                           <th className="text-left p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Category</th>
//                           <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Purity</th>
//                           <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Weight</th>
//                           <th className="text-right p-3 md:p-4 font-medium text-gray-900 dark:text-gray-100">Revenue</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {salesData.silverWeightLeaders.slice(0, 5).map((item, index) => (
//                           <tr key={index} className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
//                             <td className="p-3 md:p-4 text-gray-900 dark:text-gray-100">{item.category}</td>
//                             <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">{item.purity}%</td>
//                             <td className="p-3 md:p-4 text-right font-medium text-gray-900 dark:text-gray-100">{item.totalGrossWeight} g</td>
//                             <td className="p-3 md:p-4 text-right text-gray-900 dark:text-gray-100">₹{item.totalSalesAmount.toLocaleString()}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Download Options */}
//           <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
//             <button 
//               onClick={() => setDownloadModal({ open: true, type: 'sales', data: salesData })}
//               className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 w-full sm:w-auto"
//             >
//               <Download className="h-4 w-4" />
//               Download Sales Report
//             </button>
//             <label className="flex items-center gap-3 cursor-pointer">
//               <input
//                 type="checkbox"
//                 checked={includeEntries}
//                 onChange={(e) => setIncludeEntries(e.target.checked)}
//                 className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//               />
//               <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Related Entries</span>
//             </label>
//           </div>
//         </div>
//       ) : (
//         <div className="text-center py-12">
//           <p className="text-gray-500 dark:text-gray-400 text-lg">No sales data available</p>
//         </div>
//       )}
//     </div>

//     {/* Customer List Report Section */}
//     <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300">
//       <div className="flex items-center gap-3 mb-6">
//         <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
//         <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Customer List Report</h2>
//       </div>

//       {/* Field Selection */}
//       <div className="bg-gray-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl mb-6 border border-gray-200/50 dark:bg-gray-800/50 dark:border-gray-700/50">
//         <h3 className="text-base md:text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Select Fields to Include</h3>
//         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
//           {Object.entries(customerFields).map(([field, checked]) => (
//             <label key={field} className="flex items-center gap-2 cursor-pointer group">
//               <input
//                 type="checkbox"
//                 checked={checked}
//                 onChange={(e) => setCustomerFields(prev => ({
//                   ...prev,
//                   [field]: e.target.checked
//                 }))}
//                 className="rounded-md border-2 border-gray-300 text-purple-600 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 dark:border-gray-600 dark:bg-gray-700"
//               />
//               <span className="text-sm capitalize text-gray-700 group-hover:text-gray-900 transition-colors duration-200 dark:text-gray-300 dark:group-hover:text-gray-100">
//                 {field === 'purchaseAmount' ? 'Purchase Amount' : 
//                  field === 'purchaseItems' ? 'Purchase Items' : field}
//               </span>
//             </label>
//           ))}
//         </div>
//       </div>

//       {loading.customers ? (
//         <LoadingSpinner />
//       ) : customersData ? (
//         <div className="space-y-6">
//           {/* Summary */}
//           <div className="bg-gradient-to-r from-purple-50 to-purple-100/80 p-4 md:p-6 rounded-xl border border-purple-200/50 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-700/50">
//             <h3 className="text-base md:text-lg font-semibold text-purple-800 mb-4 dark:text-purple-300">Customer Summary</h3>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//               <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 dark:bg-gray-800/90 dark:border-gray-700/50">
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
//                 <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{customersData.totalCustomers}</p>
//               </div>
//               <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 dark:bg-gray-800/90 dark:border-gray-700/50">
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
//                 <p className="text-xl font-bold text-purple-700 dark:text-purple-400">₹{customersData.summary.totalRevenue.toLocaleString()}</p>
//               </div>
//               <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 dark:bg-gray-800/90 dark:border-gray-700/50">
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Avg Customer Value</p>
//                 <p className="text-xl font-bold text-purple-700 dark:text-purple-400">₹{customersData.summary.averageCustomerValue.toLocaleString()}</p>
//               </div>
//             </div>
//           </div>

//           {/* Customer List */}
//           {customersData.customers.length > 0 && (
//             <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden shadow-lg dark:bg-gray-800/90 dark:border-gray-700/50">
//               <h3 className="text-base md:text-lg font-semibold p-4 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200/50 text-gray-900 dark:bg-gray-800/80 dark:border-gray-700/50 dark:text-gray-100">Customer List</h3>
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm min-w-[700px]">
//                   <thead className="bg-gray-100/80 backdrop-blur-sm dark:bg-gray-700/80">
//                     <tr>
//                       {customerFields.name && <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Name</th>}
//                       {customerFields.mobile && <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Mobile</th>}
//                       {customerFields.address && <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Address</th>}
//                       {customerFields.purchaseAmount && (
//                         <>
//                           <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">Total Purchase</th>
//                           <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">Transactions</th>
//                           <th className="text-right p-3 font-medium text-gray-700 dark:text-gray-300">Avg Purchase</th>
//                         </>
//                       )}
//                       {customerFields.purchaseItems && <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Purchase Items</th>}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {customersData.customers.slice(0, 50).map((customer, index) => (
//                       <tr key={index} className="border-b border-gray-200/50 hover:bg-gray-50/50 transition-colors duration-200 dark:border-gray-700/50 dark:hover:bg-gray-700/30">
//                         {customerFields.name && (
//                           <td className="p-3 text-gray-900 dark:text-gray-100">{customer.customerName || 'N/A'}</td>
//                         )}
//                         {customerFields.mobile && (
//                           <td className="p-3 text-gray-900 dark:text-gray-100">{customer.customerMobile || 'N/A'}</td>
//                         )}
//                         {customerFields.address && (
//                           <td className="p-3 text-gray-900 dark:text-gray-100">{customer.customerAddress || 'N/A'}</td>
//                         )}
//                         {customerFields.purchaseAmount && (
//                           <>
//                             <td className="p-3 text-right font-medium text-gray-900 dark:text-gray-100">₹{customer.totalPurchaseAmount?.toLocaleString() || 0}</td>
//                             <td className="p-3 text-right text-gray-900 dark:text-gray-100">{customer.transactionCount || 0}</td>
//                             <td className="p-3 text-right font-medium text-gray-900 dark:text-gray-100">₹{customer.averagePurchaseValue?.toLocaleString() || 0}</td>
//                           </>
//                         )}
//                         {customerFields.purchaseItems && (
//                           <td className="p-3">
//                             <div className="max-w-xs">
//                               {customer.purchaseItems && customer.purchaseItems.length > 0 ? (
//                                 <div className="space-y-1">
//                                   {customer.purchaseItems.map((item, itemIndex) => (
//                                     <div key={itemIndex} className="text-xs bg-gray-100/80 backdrop-blur-sm p-2 rounded-lg border border-gray-200/50 text-gray-700 dark:bg-gray-700/80 dark:border-gray-600/50 dark:text-gray-300">
//                                       {item}
//                                     </div>
//                                   ))}
//                                 </div>
//                               ) : (
//                                 <span className="text-gray-500 dark:text-gray-400">No items</span>
//                               )}
//                             </div>
//                           </td>
//                         )}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               {customersData.customers.length > 50 && (
//                 <div className="p-4 text-center text-gray-500 bg-gray-50/50 border-t border-gray-200/50 dark:bg-gray-800/50 dark:border-gray-700/50 dark:text-gray-400">
//                   Showing first 50 customers. Download Excel for complete list.
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Download Options */}
//           <div className="flex justify-start">
//             <button 
//               onClick={() => setDownloadModal({ open: true, type: 'customers', data: customersData })}
//               className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700"
//             >
//               <Download className="h-4 w-4 mr-2" />
//               Download Customer List
//             </button>
//           </div>
//         </div>
//       ) : (
//         <p className="text-gray-500 dark:text-gray-400 text-center py-8">No customer data available</p>
//       )}
//     </div>

//     {/* Download Modal */}
//     <Modal 
//       isOpen={downloadModal.open} 
//       onClose={() => setDownloadModal({ open: false, type: '', data: null })}
//       title="Download Report"
//     >
//       <div className="space-y-6">
//         <p className="text-gray-700 dark:text-gray-300 font-medium">Choose download format:</p>
        
//         {downloadModal.type.startsWith('stock') && (
//           <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
//             <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
//               {downloadModal.type === 'stock-gold' && "Gold inventory report will include gold categories with gross weight, pure weight, and average purity."}
//               {downloadModal.type === 'stock-silver' && "Silver inventory report will include silver categories with gross weight, pure weight, and average purity."}
//               {downloadModal.type === 'stock-full' && "Complete inventory report will include both gold and silver with all category breakdowns."}
//             </p>
//           </div>
//         )}
        
//         <div className="flex flex-col sm:flex-row gap-3">
//           <button 
//             onClick={() => handleDownload(downloadModal.type, 'pdf')}
//             className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
//           >
//             <FileText className="h-4 w-4 mr-2" />
//             Download PDF
//           </button>
//           <button 
//             onClick={() => handleDownload(downloadModal.type, 'excel')}
//             className="flex-1 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
//           >
//             <FileText className="h-4 w-4 mr-2" />
//             Download Excel
//           </button>
//         </div>
//       </div>
//     </Modal>

//   </div>
// );


return (
  <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8">
      
      {/* Header Section */}
      <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 transition-all duration-300 hover:shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Reports Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-2 border-red-200 dark:border-red-700/50 rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-lg">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Stock Report Section */}
      <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Stock Report</h2>
        </div>

        {loading.stock ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : stockData ? (
          <div className="space-y-6 md:space-y-8">
            
            {/* Gold Stock Section */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
                Gold Inventory
              </h3>

              {/* Gold Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Gross Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                    {stockData.gold.totalGross} g
                  </p>
                </div>
                
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Pure Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                    {stockData.gold.totalPure} g
                  </p>
                </div>
                
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50 sm:col-span-2 lg:col-span-1">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Average Purity</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                    {stockData.gold.averagePurity}%
                  </p>
                </div>
              </div>

              {/* Gold Categories Table */}
              {Object.keys(stockData.gold.categories).length > 0 && (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">
                    Category Breakdown
                  </h4>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm md:text-base">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                        <tr>
                          <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                          <th className="text-center p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Gross Weight (g)</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Pure Weight (g)</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Avg Purity (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stockData.gold.categories).map(([category, data]) => (
                          <tr key={category} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                            <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">{category}</td>
                            <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{data.grossWeight}</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{data.pureWeight}</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{data.averagePurity}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-3 p-4">
                    {Object.entries(stockData.gold.categories).map(([category, data]) => (
                      <div key={category} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{category}</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.averagePurity}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Gross Weight</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.grossWeight}g</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Pure Weight</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.pureWeight}g</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Silver Stock Section */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>
                Silver Inventory
              </h3>

              {/* Silver Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Gross Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
                    {stockData.silver.totalGross} g
                  </p>
                </div>
                
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Pure Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
                    {stockData.silver.totalPure} g
                  </p>
                </div>
                
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50 sm:col-span-2 lg:col-span-1">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Average Purity</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
                    {stockData.silver.averagePurity}%
                  </p>
                </div>
              </div>

              {/* Silver Categories Table */}
              {Object.keys(stockData.silver.categories).length > 0 && (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">
                    Category Breakdown
                  </h4>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm md:text-base">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                        <tr>
                          <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                          <th className="text-center p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Gross Weight (g)</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Pure Weight (g)</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Avg Purity (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stockData.silver.categories).map(([category, data]) => (
                          <tr key={category} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                            <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">{category}</td>
                            <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{data.grossWeight}</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{data.pureWeight}</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{data.averagePurity}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-3 p-4">
                    {Object.entries(stockData.silver.categories).map(([category, data]) => (
                      <div key={category} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{category}</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.averagePurity}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Gross Weight</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.grossWeight}g</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Pure Weight</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.pureWeight}g</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category Pie Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
              {[
                { title: "Gold Category Distribution (Pure Weight)", data: categoryData.gold, color: "yellow" }, 
                { title: "Silver Category Distribution (Pure Weight)", data: categoryData.silver, color: "gray" }
              ].map(({ title, data, color }, i) => (
                <div key={i} className={`bg-gradient-to-br ${color === 'yellow' ? 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20' : 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20'} backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border ${color === 'yellow' ? 'border-yellow-200/50 dark:border-yellow-700/50' : 'border-gray-200/50 dark:border-gray-700/50'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                  <h4 className={`text-base sm:text-lg md:text-xl font-bold ${color === 'yellow' ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-800 dark:text-gray-200'} mb-6 flex items-center gap-2`}>
                    <div className={`w-3 h-3 bg-gradient-to-r ${color === 'yellow' ? 'from-yellow-400 to-amber-500' : 'from-gray-400 to-slate-500'} rounded-full`}></div>
                    {title}
                  </h4>
                  {data && data.length > 0 ? (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                      <div className="h-[300px] sm:h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={data} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              outerRadius="70%"
                              label={renderLabel}
                              labelLine={true}
                            >
                              {data.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value.toFixed(2)}g`, 'Pure Weight']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {data.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200/50 dark:border-gray-600/50">
                            <div 
                              className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{item.name}</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.value.toFixed(2)}g</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">No category data available for {color === 'yellow' ? 'gold' : 'silver'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Download Options */}
            <div className="flex flex-col gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <button 
                onClick={() => setDownloadModal({ open: true, type: 'stock-gold', data: stockData.gold })}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Download className="h-5 w-5" />
                <span>Download Gold Report</span>
              </button>
              <button 
                onClick={() => setDownloadModal({ open: true, type: 'stock-silver', data: stockData.silver })}
                className="w-full bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Download className="h-5 w-5" />
                <span>Download Silver Report</span>
              </button>
              <button 
                onClick={() => setDownloadModal({ open: true, type: 'stock-full', data: stockData })}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Download className="h-5 w-5" />
                <span>Download Full Inventory</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <p className="text-gray-500 dark:text-gray-400 text-lg text-center px-4">No stock data available</p>
          </div>
        )}
      </div>

      {/* Modern Sales Report Card */}
      <div className="w-full max-w-7xl mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-2 sm:p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3 mb-6 md:mb-8">
          <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl shadow-lg">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Sales Report</h2>
        </div>

        {/* Date Range Selection */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl mb-6 md:mb-8 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6 flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
            Date Range Selection
          </h3>
          
          {/* Quick Date Options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 md:mb-6">
            <button 
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 font-medium px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              onClick={() => handleQuickDateSelect('today')}
            >
              Today
            </button>
            <button 
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 font-medium px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              onClick={() => handleQuickDateSelect('week')}
            >
              Last Week
            </button>
            <button 
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 font-medium px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              onClick={() => handleQuickDateSelect('month')}
            >
              Last Month
            </button>
            <button 
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 font-medium px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              onClick={() => handleQuickDateSelect('6months')}
            >
              Last 6 Months
            </button>
            <button 
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 font-medium px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              onClick={() => handleQuickDateSelect('year')}
            >
              Last Year
            </button>
            <button 
              className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 font-medium px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
              onClick={() => handleQuickDateSelect('alltime')}
            >
              All Time
            </button>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {loading.sales ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : salesData ? (
          <div className="space-y-6 md:space-y-8">
            {/* Sales Summary Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-green-200/50 dark:border-green-700/50">
                <p className="text-sm md:text-base text-green-700 dark:text-green-300 font-semibold mb-2">Total Revenue</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                  ₹{salesData.summary.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-blue-200/50 dark:border-blue-700/50">
                <p className="text-sm md:text-base text-blue-700 dark:text-blue-300 font-semibold mb-2">Total Items Sold</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  {salesData.summary.totalItems}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50 sm:col-span-2 lg:col-span-1">
                <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Avg Revenue/Item</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">
                  ₹{salesData.summary.averagePricePerItem.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-200 mb-6 flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"></div>
                Daily Revenue Trend
                {salesData?.dateRange?.startDate && salesData?.dateRange?.endDate && (
                  <span className="text-sm font-normal text-blue-600 dark:text-blue-400 ml-2 hidden sm:inline">
                    ({formatAPIDateForDisplay(salesData.dateRange.startDate)} - {formatAPIDateForDisplay(salesData.dateRange.endDate)})
                  </span>
                )}
              </h3>
              
              {salesData?.dailyRevenue?.length > 0 ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  
                  <div className="h-[250px] sm:h-[300px] md:h-[350px] overflow-hidden">
  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
    <LineChart data={salesData.dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = date.toLocaleDateString('en-IN', { month: 'short' });
                            return `${day}/${month}`;
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'revenue') return [`₹${value.toLocaleString('en-IN')}`, 'Revenue'];
                            if (name === 'transactions') return [value, 'Transactions'];
                            return [value, name];
                          }}
                          labelFormatter={(label) => {
                            const date = new Date(label);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
                            const monthName = date.toLocaleDateString('en-IN', { month: 'long' });
                            return `${weekday}, ${day}/${month}/${year} (${day} ${monthName} ${year})`;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#1d4ed8" 
                          strokeWidth={2}
                          dot={{ fill: '#1d4ed8', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                  <div className="text-center">
                    <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400">No sales data available</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">for the selected time period</p>
                  </div>
                </div>
              )}
            </div>

            {/* Metal-wise Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
                  Gold Sales
                </h4>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Revenue</p>
                      <p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">₹{salesData.byMetal.gold.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Gross Weight</p>
                      <p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalWeight} g</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Pure Weight</p>
                      <p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalPureWeight} g</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Sales Count</p>
                      <p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalSalesCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>
                  Silver Sales
                </h4>
                <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-600/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Revenue</p>
                      <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">₹{salesData.byMetal.silver.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Gross Weight</p>
                      <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalWeight} g</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Pure Weight</p>
                      <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalPureWeight} g</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Sales Count</p>
                      <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalSalesCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performers Section */}
            {salesData.topPerformers && salesData.topPerformers.length > 0 && (
              <div className="space-y-6 md:space-y-8">
                {/* Top Revenue Generators */}
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                    Top Revenue Generators
                  </h4>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm md:text-base">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                        <tr>
                          <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Metal</th>
                          <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                          <th className="text-center p-4 font-semibold text-gray-900 dark:text-gray-100">Purity</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Revenue</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Weight</th>
                          <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.topPerformers.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                            <td className="p-4 capitalize font-semibold text-gray-900 dark:text-gray-100">{item.metalType}</td>
                            <td className="p-4 text-gray-900 dark:text-gray-100">{item.category}</td>
                            <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">{item.purity}%</td>
                            <td className="p-4 text-right font-bold text-green-600 dark:text-green-400">₹{item.totalSalesAmount.toLocaleString()}</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{item.totalGrossWeight} g</td>
                            <td className="p-4 text-right text-gray-700 dark:text-gray-300">{item.totalItems}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-3 p-4">
                    {salesData.topPerformers.slice(0, 10).map((item, index) => (
                      <div key={index} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3 capitalize">{item.metalType} - {item.category}</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.purity}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p>
                            <p className="text-sm font-bold text-green-600 dark:text-green-400">₹{item.totalSalesAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.totalGrossWeight} g</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.totalItems}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Sold Quantity Items */}
                {salesData.topQuantityItems && salesData.topQuantityItems.length > 0 && (
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
                      Top Sold Quantity Items
                    </h4>
                    
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <table className="w-full text-sm md:text-base">
                        <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                          <tr>
                            <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Metal</th>
                            <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                            <th className="text-center p-4 font-semibold text-gray-900 dark:text-gray-100">Purity</th>
                            <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
                            <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Weight</th>
                            <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesData.topQuantityItems.slice(0, 10).map((item, index) => (
                            <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                              <td className="p-4 capitalize font-semibold text-gray-900 dark:text-gray-100">{item.metalType}</td>
                              <td className="p-4 text-gray-900 dark:text-gray-100">{item.category}</td>
                              <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">{item.purity}%</td>
                              <td className="p-4 text-right font-bold text-purple-600 dark:text-purple-400">{item.totalItems}</td>
                              <td className="p-4 text-right text-gray-700 dark:text-gray-300">{item.totalGrossWeight} g</td>
                              <td className="p-4 text-right text-gray-700 dark:text-gray-300">₹{item.totalSalesAmount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-3 p-4">
                      {salesData.topQuantityItems.slice(0, 10).map((item, index) => (
                        <div key={index} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                          <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3 capitalize">{item.metalType} - {item.category}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.purity}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p>
                              <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{item.totalItems}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.totalGrossWeight} g</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{item.totalSalesAmount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gold and Silver Weight Leaders - Side by Side */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                  {/* Gold Weight Leaders */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
                      Gold Weight Leaders
                    </h4>
                    
                    {salesData.goldWeightLeaders && salesData.goldWeightLeaders.length > 0 ? (
                      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden sm:block">
                          <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                              <tr>
                                <th className="text-left p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                                <th className="text-center p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Purity</th>
                                <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Weight</th>
                                <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salesData.goldWeightLeaders.slice(0, 5).map((item, index) => (
                                <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                                  <td className="p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">{item.category}</td>
                                  <td className="p-3 md:p-4 text-center font-bold text-yellow-600 dark:text-yellow-400">{item.purity}%</td>
                                  <td className="p-3 md:p-4 text-right font-bold text-amber-600 dark:text-amber-400">{item.totalGrossWeight} g</td>
                                  <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300">₹{item.totalSalesAmount.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="block sm:hidden space-y-3 p-4">
                          {salesData.goldWeightLeaders.slice(0, 5).map((item, index) => (
                            <div key={index} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/50">
                              <h6 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{item.category}</h6>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
                                  <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{item.purity}%</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p>
                                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.totalGrossWeight} g</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p>
                                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{item.totalSalesAmount.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">No gold weight data available</p>
                      </div>
                    )}
                  </div>

                  {/* Silver Weight Leaders */}
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>
                      Silver Weight Leaders
                    </h4>
                    
                    {salesData.silverWeightLeaders && salesData.silverWeightLeaders.length > 0 ? (
                      <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden sm:block">
                          <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                              <tr>
                                <th className="text-left p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                                <th className="text-center p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Purity</th>
                                <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Weight</th>
                                <th className="text-right p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salesData.silverWeightLeaders.slice(0, 5).map((item, index) => (
                                <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                                  <td className="p-3 md:p-4 font-semibold text-gray-900 dark:text-gray-100">{item.category}</td>
                                  <td className="p-3 md:p-4 text-center font-bold text-gray-600 dark:text-gray-400">{item.purity}%</td>
                                  <td className="p-3 md:p-4 text-right font-bold text-slate-600 dark:text-slate-400">{item.totalGrossWeight} g</td>
                                  <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300">₹{item.totalSalesAmount.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="block sm:hidden space-y-3 p-4">
                          {salesData.silverWeightLeaders.slice(0, 5).map((item, index) => (
                            <div key={index} className="bg-white/60 dark:bg-gray-600/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 dark:border-gray-500/50">
                              <h6 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{item.category}</h6>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
                                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{item.purity}%</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p>
                                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.totalGrossWeight} g</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p>
                                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{item.totalSalesAmount.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">No silver weight data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Download Options */}
            <div className="flex flex-col gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <button 
                onClick={() => setDownloadModal({ open: true, type: 'sales', data: salesData })}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Download className="h-5 w-5" />
                <span>Download Sales Report</span>
              </button>
              
              <label className="flex items-center justify-center gap-3 cursor-pointer p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={includeEntries}
                  onChange={(e) => setIncludeEntries(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Include Related Entries</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <p className="text-gray-500 dark:text-gray-400 text-lg text-center px-4">No sales data available</p>
          </div>
        )}
      </div>
      
      {/* Customer List Report Section */}
<div className="w-full max-w-7xl mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-2 sm:p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300">
  <div className="flex items-center gap-2 sm:gap-3 mb-6 md:mb-8">
    <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-r from-purple-600 to-pink-700 rounded-xl shadow-lg">
      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
    </div>
    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Customer List Report</h2>
  </div>

  {/* Field Selection */}
  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl mb-6 md:mb-8 border border-purple-200/50 dark:border-purple-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-800 dark:text-purple-200 mb-6 flex items-center gap-2">
      <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
      Select Fields to Include
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {Object.entries(customerFields).map(([field, checked]) => (
        <label key={field} className="flex items-center gap-2 cursor-pointer group p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setCustomerFields(prev => ({
              ...prev,
              [field]: e.target.checked
            }))}
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-sm font-semibold capitalize text-gray-700 group-hover:text-gray-900 transition-colors duration-200 dark:text-gray-300 dark:group-hover:text-gray-100">
            {field === 'purchaseAmount' ? 'Purchase Amount' : 
             field === 'purchaseItems' ? 'Purchase Items' : field}
          </span>
        </label>
      ))}
    </div>
  </div>

  {loading.customers ? (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner />
    </div>
  ) : customersData ? (
    <div className="space-y-6 md:space-y-8">
      
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
          <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Total Customers</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">
            {customersData.totalCustomers}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
          <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Total Revenue</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">
            ₹{customersData.summary.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
          <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Avg Customer Value</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">
            ₹{customersData.summary.averageCustomerValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Customer List */}
      {customersData.customers.length > 0 && (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
            Customer List
          </h4>
          
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base min-w-[700px]">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                  <tr>
                    {customerFields.name && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Name</th>}
                    {customerFields.mobile && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Mobile</th>}
                    {customerFields.address && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Address</th>}
                    {customerFields.purchaseAmount && (
                      <>
                        <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Total Purchase</th>
                        <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Transactions</th>
                        <th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Avg Purchase</th>
                      </>
                    )}
                    {customerFields.purchaseItems && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Purchase Items</th>}
                  </tr>
                </thead>
                <tbody>
                  {customersData.customers.slice(0, 50).map((customer, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                      {customerFields.name && (
                        <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">{customer.customerName || 'N/A'}</td>
                      )}
                      {customerFields.mobile && (
                        <td className="p-4 text-gray-900 dark:text-gray-100">{customer.customerMobile || 'N/A'}</td>
                      )}
                      {customerFields.address && (
                        <td className="p-4 text-gray-900 dark:text-gray-100">{customer.customerAddress || 'N/A'}</td>
                      )}
                      {customerFields.purchaseAmount && (
                        <>
                          <td className="p-4 text-right font-bold text-purple-600 dark:text-purple-400">₹{customer.totalPurchaseAmount?.toLocaleString() || 0}</td>
                          <td className="p-4 text-right text-gray-700 dark:text-gray-300">{customer.transactionCount || 0}</td>
                          <td className="p-4 text-right font-semibold text-gray-700 dark:text-gray-300">₹{customer.averagePurchaseValue?.toLocaleString() || 0}</td>
                        </>
                      )}
                      {customerFields.purchaseItems && (
                        <td className="p-4">
                          <div className="max-w-xs">
                            {customer.purchaseItems && customer.purchaseItems.length > 0 ? (
                              <div className="space-y-1">
                                {customer.purchaseItems.map((item, itemIndex) => (
                                  <div key={itemIndex} className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-2 rounded-lg border border-purple-200/50 dark:border-purple-700/50 text-purple-700 dark:text-purple-300">
                                    {item}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">No items</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3 p-4">
            {customersData.customers.slice(0, 50).map((customer, index) => (
              <div key={index} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{customer.customerName || 'Unknown Customer'}</h5>
                <div className="grid grid-cols-2 gap-3">
                  {customerFields.mobile && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Mobile</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{customer.customerMobile || 'N/A'}</p>
                    </div>
                  )}
                  {customerFields.purchaseAmount && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Purchase</p>
                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400">₹{customer.totalPurchaseAmount?.toLocaleString() || 0}</p>
                    </div>
                  )}
                  {customerFields.purchaseAmount && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Transactions</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{customer.transactionCount || 0}</p>
                    </div>
                  )}
                  {customerFields.purchaseAmount && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Avg Purchase</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{customer.averagePurchaseValue?.toLocaleString() || 0}</p>
                    </div>
                  )}
                </div>
                {customerFields.address && (
                  <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Address</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{customer.customerAddress || 'N/A'}</p>
                  </div>
                )}
                {customerFields.purchaseItems && customer.purchaseItems && customer.purchaseItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">Purchase Items</p>
                    <div className="flex flex-wrap gap-1">
                      {customer.purchaseItems.slice(0, 3).map((item, itemIndex) => (
                        <div key={itemIndex} className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm px-2 py-1 rounded-lg border border-purple-200/50 dark:border-purple-700/50 text-purple-700 dark:text-purple-300">
                          {item}
                        </div>
                      ))}
                      {customer.purchaseItems.length > 3 && (
                        <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-400">
                          +{customer.purchaseItems.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {customersData.customers.length > 50 && (
            <div className="p-4 text-center text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-t border-gray-200/50 dark:border-gray-700/50 dark:text-gray-400">
              Showing first 50 customers. Download Excel for complete list.
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
        <button 
          onClick={() => setDownloadModal({ open: true, type: 'customers', data: customersData })}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Download className="h-5 w-5" />
          <span>Download Customer List</span>
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center py-12 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
      <p className="text-gray-500 dark:text-gray-400 text-lg text-center px-4">No customer data available</p>
    </div>
  )}
</div>

{/* Download Modal */}
<Modal 
  isOpen={downloadModal.open} 
  onClose={() => setDownloadModal({ open: false, type: '', data: null })}
  title="Download Report"
>
  <div className="space-y-6">
    <p className="text-gray-700 dark:text-gray-300 font-medium">Choose download format:</p>
    
    {downloadModal.type.startsWith('stock') && (
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
          {downloadModal.type === 'stock-gold' && "Gold inventory report will include gold categories with gross weight, pure weight, and average purity."}
          {downloadModal.type === 'stock-silver' && "Silver inventory report will include silver categories with gross weight, pure weight, and average purity."}
          {downloadModal.type === 'stock-full' && "Complete inventory report will include both gold and silver with all category breakdowns."}
        </p>
      </div>
    )}
    
    <div className="flex flex-col sm:flex-row gap-3">
      <button 
        onClick={() => handleDownload(downloadModal.type, 'pdf')}
        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Download PDF
      </button>
      <button 
        onClick={() => handleDownload(downloadModal.type, 'excel')}
        className="flex-1 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Download Excel
      </button>
    </div>
  </div>
</Modal>

    </div>
  </div>
);


};
export default ReportPage;