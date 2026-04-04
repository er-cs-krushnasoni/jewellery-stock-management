import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/ui/BackButton';  
import { Card } from '../components/ui/card';
import { Button } from "../components/ui/button";
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart,Line,XAxis, YAxis, CartesianGrid,} from 'recharts';
import api from '../config/api'; 
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
  if (displayDate.includes('-') && displayDate.length === 10) return displayDate;
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
  if (isoDate.includes('/') && isoDate.length === 10) return isoDate;
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

// ── Universal download helper ─────────────────────────────────────────────
// Works in browser, Capacitor Android, and Electron
const downloadFile = async (blob, filename) => {
  const isCapacitorApp =
    typeof window !== 'undefined' &&
    typeof window.Capacitor !== 'undefined' &&
    window.Capacitor.isNativePlatform?.();

  if (isCapacitorApp && navigator.share) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
      // fall through to normal download
    }
  }

  // Normal browser / Electron download
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ── Helper: save jsPDF doc (handles Capacitor) ────────────────────────────
const saveDoc = async (doc, filename) => {
  const isCapacitorApp =
    typeof window !== 'undefined' &&
    typeof window.Capacitor !== 'undefined' &&
    window.Capacitor.isNativePlatform?.();

  if (isCapacitorApp && navigator.share) {
    const pdfBlob = doc.output('blob');
    await downloadFile(pdfBlob, filename);
  } else {
    doc.save(filename);
  }
};

// ── Helper: save XLSX workbook (handles Capacitor) ────────────────────────
const saveWorkbook = async (wb, filename) => {
  const isCapacitorApp =
    typeof window !== 'undefined' &&
    typeof window.Capacitor !== 'undefined' &&
    window.Capacitor.isNativePlatform?.();

  if (isCapacitorApp && navigator.share) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    await downloadFile(blob, filename);
  } else {
    XLSX.writeFile(wb, filename);
  }
};

const ReportPage = () => {
  const { user } = useAuth();
  
  const [stockData, setStockData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [jsPDFLoaded, setJsPDFLoaded] = useState(false);
  const [loading, setLoading] = useState({ stock: false, sales: false, customers: false });
  
  const [customerFields, setCustomerFields] = useState({
    name: true, address: true, mobile: true,
    purchaseAmount: true, purchaseItems: false
  });
  
  const [downloadModal, setDownloadModal] = useState({ open: false, type: '', data: null });
  const [categoryData, setCategoryData] = useState({ gold: [], silver: [] });
  const [includeEntries, setIncludeEntries] = useState(false);
  const [error, setError] = useState('');
  
  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
    '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1'
  ];

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central" fontSize="12" fontWeight="500">
        {`${name}: ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // ── Load jsPDF ────────────────────────────────────────────────────────
  const loadJsPDF = () => {
    return new Promise((resolve, reject) => {
      const existingJsPDF = window.jsPDF || window.jspdf ||
        (window.jsPDF && window.jsPDF.jsPDF) ||
        (window.jspdf && window.jspdf.jsPDF);
      if (existingJsPDF) { setJsPDFLoaded(true); resolve(); return; }

      const existingScripts = document.querySelectorAll('script[src*="jspdf"]');
      existingScripts.forEach(script => script.remove());

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        setTimeout(() => {
          const jsPDFConstructor = window.jsPDF || window.jspdf ||
            (window.jsPDF && window.jsPDF.jsPDF) || (window.jspdf && window.jspdf.jsPDF);
          if (jsPDFConstructor) { setJsPDFLoaded(true); resolve(); }
          else reject(new Error('jsPDF failed to load properly'));
        }, 500);
      };

      script.onerror = () => {
        const altScript = document.createElement('script');
        altScript.src = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
        altScript.async = true;
        altScript.crossOrigin = 'anonymous';
        altScript.onload = () => {
          setTimeout(() => {
            const jsPDFConstructor = window.jsPDF || window.jspdf ||
              (window.jsPDF && window.jsPDF.jsPDF) || (window.jspdf && window.jspdf.jsPDF);
            if (jsPDFConstructor) { setJsPDFLoaded(true); resolve(); }
            else reject(new Error('jsPDF failed to load from both CDNs'));
          }, 500);
        };
        altScript.onerror = () => reject(new Error('Failed to load jsPDF from both CDNs'));
        script.remove();
        document.head.appendChild(altScript);
      };

      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    loadJsPDF().catch(err => {
      console.error('Failed to load jsPDF:', err);
      setError('PDF library failed to load. PDF downloads may not work.');
    });
  }, []);

  // ── Process stock data for charts ─────────────────────────────────────
  const processStockDataForCharts = (stockData) => {
    const goldCategories = [];
    const silverCategories = [];
    if (stockData.gold && stockData.gold.categories) {
      Object.entries(stockData.gold.categories).forEach(([categoryName, categoryData]) => {
        const pureWeight = parseFloat(categoryData.pureWeight) || 0;
        if (pureWeight > 0) goldCategories.push({ name: categoryName, value: pureWeight });
      });
    }
    if (stockData.silver && stockData.silver.categories) {
      Object.entries(stockData.silver.categories).forEach(([categoryName, categoryData]) => {
        const pureWeight = parseFloat(categoryData.pureWeight) || 0;
        if (pureWeight > 0) silverCategories.push({ name: categoryName, value: pureWeight });
      });
    }
    return { gold: goldCategories, silver: silverCategories };
  };

  // ── Fetch stock data ──────────────────────────────────────────────────
  const fetchStockData = async (metalType = null) => {
    setLoading(prev => ({ ...prev, stock: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const metadataResponse = await api.get('/api/metadata', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const metadataData = metadataResponse.data;

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

      const goldCategories = [];
      const silverCategories = [];

      if (metadataData.categoryTotals) {
        Object.entries(metadataData.categoryTotals).forEach(([categoryKey, categoryData]) => {
          const { pureWeight, metal, grossWeight, totalItems, categoryName, purities } = categoryData;
          let averagePurity = grossWeight > 0 ? (pureWeight / grossWeight) * 100 : 0;
          const processedCategoryData = {
            grossWeight: grossWeight || 0, pureWeight: pureWeight || 0,
            totalItems: totalItems || 0, averagePurity: averagePurity.toFixed(2),
            purities: purities || {}
          };
          const displayName = categoryName || categoryKey.split('_')[0];
          if (metal === "gold" && pureWeight > 0) {
            goldCategories.push({ name: displayName, value: pureWeight });
            processedData.gold.categories[displayName] = processedCategoryData;
          } else if (metal === "silver" && pureWeight > 0) {
            silverCategories.push({ name: displayName, value: pureWeight });
            processedData.silver.categories[displayName] = processedCategoryData;
          }
        });
      }

      setStockData(processedData);
      setCategoryData({ gold: goldCategories, silver: silverCategories });
    } catch (error) {
      setError('Failed to load stock data');
      console.error('Stock data error:', error);
    } finally {
      setLoading(prev => ({ ...prev, stock: false }));
    }
  };

  // ── Filename helper ───────────────────────────────────────────────────
  const getFilename = (reportType, format, timestamp = null) => {
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const date = timestamp ? new Date(timestamp) : new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const filenameSafeDate = `${day}-${month}-${year}`;
    switch (reportType) {
      case 'stock-gold':     return `gold_inventory_${filenameSafeDate}.${extension}`;
      case 'stock-silver':   return `silver_inventory_${filenameSafeDate}.${extension}`;
      case 'stock-full':     return `full_inventory_${filenameSafeDate}.${extension}`;
      case 'sales':          return `sales_report_${filenameSafeDate}.${extension}`;
      case 'customers':      return `customer_list_${filenameSafeDate}.${extension}`;
      default:               return `report_${filenameSafeDate}.${extension}`;
    }
  };

  const filename = getFilename('stock-gold', 'pdf', new Date());

  // ── Handle download ───────────────────────────────────────────────────
  const handleDownload = async (reportType, format) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      setLoading(prev => ({ ...prev, [reportType.split('-')[0]]: true }));

      const response = await api.post('/api/reports/download', {
        reportType, format,
        includeEntries: includeEntries,
        ...(reportType.startsWith('stock-') && { metalType: reportType.split('-')[1] }),
        ...(reportType === 'sales' && { startDate: dateRange.startDate, endDate: dateRange.endDate }),
        ...(reportType === 'customers' && { fields: customerFields })
      }, { headers: { 'Authorization': `Bearer ${token}` } });

      const data = response.data;
      if (data.message && !data.downloadReady) throw new Error(data.message);

      if (data.downloadReady && data.downloadData) {
        const currentTimestamp = new Date().getTime();
        let filename = getFilename(reportType, format, currentTimestamp);
        let reportData = data.downloadData.data;

        if (reportType === 'sales') {
          if (format === 'pdf') await generateSalesPDFReport(reportData, filename);
          else if (format === 'excel') await downloadSalesExcel(reportData);
        } else if (reportType === 'customers') {
          if (format === 'pdf') await generateCustomerPDFReport(reportData, filename, customerFields);
          else if (format === 'excel') await generateCustomerExcelReport(reportData, filename, customerFields);
        } else {
          if (format === 'pdf') await generatePDFFromData(reportData, reportType, filename);
          else if (format === 'excel') await generateExcelFromData(reportData, reportType, filename);
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
      setLoading(prev => ({ ...prev, stock: false, sales: false, customers: false }));
    }
  };

  // ── Generate PDF from data ────────────────────────────────────────────
  const generatePDFFromData = async (data, reportType, filename) => {
    try {
      if (!jsPDFLoaded) await loadJsPDF();

      let jsPDFConstructor = null;
      if (window.jsPDF) jsPDFConstructor = window.jsPDF.jsPDF || window.jsPDF;
      else if (window.jspdf) jsPDFConstructor = window.jspdf.jsPDF || window.jspdf;
      if (!jsPDFConstructor && typeof jsPDF !== 'undefined') jsPDFConstructor = jsPDF;

      if (!jsPDFConstructor || typeof jsPDFConstructor !== 'function') {
        throw new Error('PDF library could not be loaded. Please check your internet connection and try again.');
      }

      const doc = new jsPDFConstructor();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      let yPosition = margin;

      const checkNewPage = (linesNeeded = 1) => {
        if (yPosition + (linesNeeded * 6) > pageHeight - margin) {
          doc.addPage(); yPosition = margin; return true;
        }
        return false;
      };

      const addText = (text, fontSize = 10, isBold = false, align = 'left') => {
        checkNewPage();
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const maxWidth = pageWidth - (margin * 2);
        const splitText = doc.splitTextToSize(text.toString(), maxWidth);
        let xPosition = margin;
        if (align === 'center') xPosition = pageWidth / 2;
        else if (align === 'right') xPosition = pageWidth - margin;
        doc.text(splitText, xPosition, yPosition, { align });
        yPosition += (splitText.length * (fontSize * 0.4)) + 3;
      };

      addText(getReportTitle(reportType), 16, true, 'center');
      addText(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 10, false, 'center');
      yPosition += 10;

      switch (reportType) {
        case 'stock-gold': case 'stock-silver': case 'stock-full':
          generateStockPDF(doc, data, reportType, addText, checkNewPage); break;
        case 'sales':
          generateSalesPDF(doc, data, addText, checkNewPage); break;
        case 'customers':
          generateCustomerPDF(doc, data, addText, checkNewPage); break;
        default:
          addText('Data: ' + JSON.stringify(data, null, 2));
      }

      await saveDoc(doc, filename);
    } catch (error) {
      console.error('PDF generation error:', error);
      if (error.message.includes('PDF library')) {
        alert('PDF library is not available. Please refresh the page and try again, or download as Excel instead.');
      } else {
        alert('PDF generation failed. Please try downloading as Excel format instead.');
        throw error;
      }
    }
  };

  // ── Report title helper ───────────────────────────────────────────────
  const getReportTitle = (reportType) => {
    switch (reportType) {
      case 'stock-gold':   return 'GOLD INVENTORY REPORT';
      case 'stock-silver': return 'SILVER INVENTORY REPORT';
      case 'stock-full':   return 'COMPLETE INVENTORY REPORT';
      case 'sales':        return 'SALES REPORT';
      case 'customers':    return 'CUSTOMER LIST REPORT';
      default:             return 'REPORT';
    }
  };

  // ── Generate stock PDF ────────────────────────────────────────────────
  const generateStockPDF = (doc, data, reportType, addText, checkNewPage) => {
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
    };

    const formatPurity = (purity) => {
      if (!purity || purity === 0) return '0.00';
      const purityStr = purity.toString();
      const dotIndex = purityStr.indexOf('.');
      return dotIndex === -1 ? purityStr + '.00' : purityStr.substring(0, dotIndex + 3).padEnd(dotIndex + 3, '0');
    };

    const addPurityBreakdown = (purities, indent = '    ') => {
      if (!purities || Object.keys(purities).length === 0) {
        addText(`${indent}No purity data available`, 9); return;
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
      if (data.totalGoldGross > 0 || (data.categories && Object.keys(data.categories).filter(k => k.includes('_gold')).length > 0)) {
        addText('GOLD INVENTORY SUMMARY', 14, true);
        addText(`Total Gross Weight: ${data.totalGoldGross || 0} g`, 11);
        addText(`Total Pure Weight: ${data.totalGoldPure || 0} g`, 11);
        addText(`Average Purity: ${data.goldAveragePurity || 0}%`, 11);
        addText('', 8);
        addText('GOLD CATEGORY BREAKDOWN:', 12, true);
        const goldCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_gold'));
        if (goldCategories.length > 0) {
          goldCategories.forEach(([category, categoryData]) => {
            addText(`• ${category}:`, 10, true);
            addText(`  - Gross Weight: ${categoryData.grossWeight || 0}g`, 10);
            addText(`  - Pure Weight: ${categoryData.pureWeight || 0}g`, 10);
            addText(`  - Average Purity: ${formatPurity(categoryData.averagePurity)}%`, 10);
            addText(`  - Total Items: ${categoryData.totalItems || 0}`, 10);
            addPurityBreakdown(categoryData.purities, '    ');
            addText('', 6);
          });
          addText('GOLD CATEGORY DISTRIBUTION (By Pure Weight):', 12, true);
          const totalPureWeight = data.totalGoldPure || 0;
          goldCategories.forEach(([category, categoryData]) => {
            if (categoryData.pureWeight > 0) {
              const percentage = totalPureWeight > 0 ? Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
              addText(`• ${category}: ${categoryData.pureWeight}g (${percentage}%)`, 10);
            }
          });
        } else { addText('No gold category data available', 10); }
        addText('', 8);
      }
      if (data.totalSilverGross > 0 || (data.categories && Object.keys(data.categories).filter(k => k.includes('_silver')).length > 0)) {
        addText('SILVER INVENTORY SUMMARY', 14, true);
        addText(`Total Gross Weight: ${data.totalSilverGross || 0} g`, 11);
        addText(`Total Pure Weight: ${data.totalSilverPure || 0} g`, 11);
        addText(`Average Purity: ${data.silverAveragePurity || 0}%`, 11);
        addText('', 8);
        addText('SILVER CATEGORY BREAKDOWN:', 12, true);
        const silverCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_silver'));
        if (silverCategories.length > 0) {
          silverCategories.forEach(([category, categoryData]) => {
            addText(`• ${category}:`, 10, true);
            addText(`  - Gross Weight: ${categoryData.grossWeight || 0}g`, 10);
            addText(`  - Pure Weight: ${categoryData.pureWeight || 0}g`, 10);
            addText(`  - Average Purity: ${formatPurity(categoryData.averagePurity)}%`, 10);
            addText(`  - Total Items: ${categoryData.totalItems || 0}`, 10);
            addPurityBreakdown(categoryData.purities, '    ');
            addText('', 6);
          });
          addText('SILVER CATEGORY DISTRIBUTION (By Pure Weight):', 12, true);
          const totalPureWeight = data.totalSilverPure || 0;
          silverCategories.forEach(([category, categoryData]) => {
            if (categoryData.pureWeight > 0) {
              const percentage = totalPureWeight > 0 ? Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
              addText(`• ${category}: ${categoryData.pureWeight}g (${percentage}%)`, 10);
            }
          });
        } else { addText('No silver category data available', 10); }
        addText('', 8);
      }
    } else {
      const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
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
          addPurityBreakdown(categoryData.purities, '    ');
          addText('', 6);
        });
        addText(`${metalType} CATEGORY DISTRIBUTION (By Pure Weight):`, 12, true);
        const totalPureWeight = data.totalPure || 0;
        Object.entries(data.categories).forEach(([category, categoryData]) => {
          if (categoryData.pureWeight > 0) {
            const percentage = totalPureWeight > 0 ? Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
            addText(`• ${category}: ${categoryData.pureWeight}g (${percentage}%)`, 10);
          }
        });
      } else { addText(`No ${metalType.toLowerCase()} data available`, 10); }
    }
  };

  // ── Generate Excel from data ──────────────────────────────────────────
  const generateExcelFromData = async (data, reportType, filename) => {
    try {
      if (reportType === 'stock-full') {
        await generateMultiSheetExcel(data, filename); return;
      }
      let csvContent = '';
      switch (reportType) {
        case 'stock-gold': case 'stock-silver':
          csvContent = formatStockDataForCSV(data, reportType); break;
        case 'sales':      csvContent = formatSalesDataForCSV(data); break;
        case 'customers':  csvContent = formatCustomerDataForCSV(data); break;
        default:           csvContent = 'Data\n' + JSON.stringify(data, null, 2);
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(blob, filename.replace('.xlsx', '.csv'));
    } catch (error) {
      console.error('Excel generation error:', error);
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      await downloadFile(jsonBlob, filename.replace('.xlsx', '.json'));
    }
  };

  // ── Multi-sheet Excel ─────────────────────────────────────────────────
  const generateMultiSheetExcel = async (data, filename) => {
    try {
      if (typeof XLSX === 'undefined') { generateFallbackCSV(data, filename); return; }

      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
      };
      const formatPurity = (purity) => {
        if (!purity || purity === 0) return '0.00';
        const s = purity.toString(); const dot = s.indexOf('.');
        return dot === -1 ? s + '.00' : s.substring(0, dot + 3).padEnd(dot + 3, '0');
      };

      const wb = XLSX.utils.book_new();
      const allCategories = data.categories || {};
      const goldCategories = Object.entries(allCategories).filter(([key]) => key.toLowerCase().includes('gold') || key.includes('_gold'));
      const silverCategories = Object.entries(allCategories).filter(([key]) => key.toLowerCase().includes('silver') || key.includes('_silver'));

      const goldWs = XLSX.utils.aoa_to_sheet(generateGoldSheetData(data, goldCategories, formatDate, formatPurity));
      XLSX.utils.book_append_sheet(wb, goldWs, 'Gold Inventory');

      const silverWs = XLSX.utils.aoa_to_sheet(generateSilverSheetData(data, silverCategories, formatDate, formatPurity));
      XLSX.utils.book_append_sheet(wb, silverWs, 'Silver Inventory');

      const mixedCategories = Object.entries(allCategories).filter(([key]) =>
        !key.toLowerCase().includes('gold') && !key.includes('_gold') &&
        !key.toLowerCase().includes('silver') && !key.includes('_silver')
      );
      if (mixedCategories.length > 0) {
        const mixedWs = XLSX.utils.aoa_to_sheet(generateMixedCategoriesSheetData(data, mixedCategories, formatDate, formatPurity));
        XLSX.utils.book_append_sheet(wb, mixedWs, 'Other Categories');
      }

      await saveWorkbook(wb, filename);
    } catch (error) {
      console.error('Multi-sheet Excel error:', error);
      await generateFallbackCSV(data, filename);
    }
  };

  const generateGoldSheetData = (data, goldCategories, formatDate, formatPurity) => {
    const sheetData = [];
    sheetData.push(['GOLD INVENTORY REPORT']);
    sheetData.push([`Generated on: ${formatDate(new Date().toISOString())}`]);
    sheetData.push([]);
    sheetData.push(['GOLD INVENTORY SUMMARY']);
    sheetData.push(['Metric', 'Value']);
    sheetData.push(['Total Gross Weight (g)', data.totalGoldGross || 0]);
    sheetData.push(['Total Pure Weight (g)', data.totalGoldPure || 0]);
    sheetData.push(['Average Purity (%)', data.goldAveragePurity || 0]);
    sheetData.push([]);
    if (goldCategories.length > 0) {
      sheetData.push(['GOLD CATEGORY BREAKDOWN']);
      sheetData.push(['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
      goldCategories.forEach(([category, categoryData]) => {
        sheetData.push([category, categoryData.grossWeight || 0, categoryData.pureWeight || 0, formatPurity(categoryData.averagePurity || 0), categoryData.totalItems || 0]);
      });
      sheetData.push([]);
      goldCategories.forEach(([category, categoryData]) => {
        if (categoryData.purities && Object.keys(categoryData.purities).length > 0) {
          sheetData.push([`${category} - Purity Breakdown`]);
          sheetData.push(['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
          Object.entries(categoryData.purities).forEach(([purity, purityData]) => {
            if (purityData.totalItems > 0) sheetData.push([purity, purityData.grossWeight || 0, purityData.pureWeight || 0, purityData.totalItems || 0]);
          });
          sheetData.push([]);
        }
      });
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
      sheetData.push([]);
    }
    return sheetData;
  };

  const generateSilverSheetData = (data, silverCategories, formatDate, formatPurity) => {
    const sheetData = [];
    sheetData.push(['SILVER INVENTORY REPORT']);
    sheetData.push([`Generated on: ${formatDate(new Date().toISOString())}`]);
    sheetData.push([]);
    sheetData.push(['SILVER INVENTORY SUMMARY']);
    sheetData.push(['Metric', 'Value']);
    sheetData.push(['Total Gross Weight (g)', data.totalSilverGross || 0]);
    sheetData.push(['Total Pure Weight (g)', data.totalSilverPure || 0]);
    sheetData.push(['Average Purity (%)', data.silverAveragePurity || 0]);
    sheetData.push([]);
    if (silverCategories.length > 0) {
      sheetData.push(['SILVER CATEGORY BREAKDOWN']);
      sheetData.push(['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
      silverCategories.forEach(([category, categoryData]) => {
        sheetData.push([category, categoryData.grossWeight || 0, categoryData.pureWeight || 0, formatPurity(categoryData.averagePurity || 0), categoryData.totalItems || 0]);
      });
      sheetData.push([]);
      silverCategories.forEach(([category, categoryData]) => {
        if (categoryData.purities && Object.keys(categoryData.purities).length > 0) {
          sheetData.push([`${category} - Purity Breakdown`]);
          sheetData.push(['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
          Object.entries(categoryData.purities).forEach(([purity, purityData]) => {
            if (purityData.totalItems > 0) sheetData.push([purity, purityData.grossWeight || 0, purityData.pureWeight || 0, purityData.totalItems || 0]);
          });
          sheetData.push([]);
        }
      });
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
      sheetData.push([]);
    }
    return sheetData;
  };

  const generateMixedCategoriesSheetData = (data, mixedCategories, formatDate, formatPurity) => {
    const sheetData = [];
    sheetData.push(['OTHER CATEGORIES REPORT']);
    sheetData.push([`Generated on: ${formatDate(new Date().toISOString())}`]);
    sheetData.push([]);
    if (mixedCategories.length > 0) {
      sheetData.push(['OTHER CATEGORIES BREAKDOWN']);
      sheetData.push(['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
      mixedCategories.forEach(([category, categoryData]) => {
        sheetData.push([category, categoryData.grossWeight || 0, categoryData.pureWeight || 0, formatPurity(categoryData.averagePurity || 0), categoryData.totalItems || 0]);
      });
      sheetData.push([]);
      mixedCategories.forEach(([category, categoryData]) => {
        if (categoryData.purities && Object.keys(categoryData.purities).length > 0) {
          sheetData.push([`${category} - Purity Breakdown`]);
          sheetData.push(['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
          Object.entries(categoryData.purities).forEach(([purity, purityData]) => {
            if (purityData.totalItems > 0) sheetData.push([purity, purityData.grossWeight || 0, purityData.pureWeight || 0, purityData.totalItems || 0]);
          });
          sheetData.push([]);
        }
      });
    } else {
      sheetData.push(['No other category data available']);
    }
    return sheetData;
  };

  const generateFallbackCSV = async (data, filename) => {
    const csvContent = formatStockDataForCSV(data, 'stock-full');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    await downloadFile(blob, filename.replace('.xlsx', '.csv'));
  };

  const formatStockDataForCSV = (data, reportType) => {
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-GB');
    };
    const formatPurity = (purity) => {
      if (!purity || purity === 0) return '0.00';
      const s = purity.toString(); const dot = s.indexOf('.');
      return dot === -1 ? s + '.00' : s.substring(0, dot + 3).padEnd(dot + 3, '0');
    };
    const addPurityBreakdownCSV = (purities, categoryName, metalType = '') => {
      if (!purities || Object.keys(purities).length === 0) return `${metalType ? metalType + ' - ' : ''}${categoryName} - Purity Breakdown,No purity data available\n`;
      let csv = `${metalType ? metalType + ' - ' : ''}${categoryName} - Purity Breakdown\n`;
      csv += 'Purity (%),Gross Weight (g),Pure Weight (g),Items\n';
      Object.entries(purities).forEach(([purity, purityData]) => {
        if (purityData.totalItems > 0) csv += `${purity},${purityData.grossWeight || 0},${purityData.pureWeight || 0},${purityData.totalItems || 0}\n`;
      });
      csv += '\n';
      return csv;
    };

    if (reportType === 'stock-full') {
      let csv = 'COMPLETE INVENTORY REPORT\n';
      csv += `Generated on: ${formatDate(new Date().toISOString())}\n\n`;
      if (data.totalGoldGross > 0 || (data.categories && Object.keys(data.categories).filter(k => k.includes('_gold')).length > 0)) {
        csv += 'GOLD INVENTORY SUMMARY\nMetric,Value\n';
        csv += `Total Gross Weight (g),${data.totalGoldGross || 0}\nTotal Pure Weight (g),${data.totalGoldPure || 0}\nAverage Purity (%),${data.goldAveragePurity || 0}\n\n`;
        csv += 'GOLD CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
        const goldCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_gold'));
        if (goldCategories.length > 0) {
          goldCategories.forEach(([category, categoryData]) => {
            csv += `${category},${categoryData.grossWeight || 0},${categoryData.pureWeight || 0},${formatPurity(categoryData.averagePurity)},${categoryData.totalItems || 0}\n`;
          });
          csv += '\n';
          goldCategories.forEach(([category, categoryData]) => { csv += addPurityBreakdownCSV(categoryData.purities, category, 'Gold'); });
          csv += 'GOLD CATEGORY DISTRIBUTION (By Pure Weight)\nCategory,Pure Weight (g),Percentage (%)\n';
          const totalGoldPureWeight = data.totalGoldPure || 0;
          goldCategories.forEach(([category, categoryData]) => {
            if (categoryData.pureWeight > 0) {
              const percentage = totalGoldPureWeight > 0 ? Math.floor((categoryData.pureWeight / totalGoldPureWeight) * 10000) / 100 : 0;
              csv += `${category},${categoryData.pureWeight},${percentage}\n`;
            }
          });
          csv += '\n';
        } else { csv += 'No gold category data available\n\n'; }
      }
      if (data.totalSilverGross > 0 || (data.categories && Object.keys(data.categories).filter(k => k.includes('_silver')).length > 0)) {
        csv += 'SILVER INVENTORY SUMMARY\nMetric,Value\n';
        csv += `Total Gross Weight (g),${data.totalSilverGross || 0}\nTotal Pure Weight (g),${data.totalSilverPure || 0}\nAverage Purity (%),${data.silverAveragePurity || 0}\n\n`;
        csv += 'SILVER CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
        const silverCategories = Object.entries(data.categories || {}).filter(([key]) => key.includes('_silver'));
        if (silverCategories.length > 0) {
          silverCategories.forEach(([category, categoryData]) => {
            csv += `${category},${categoryData.grossWeight || 0},${categoryData.pureWeight || 0},${formatPurity(categoryData.averagePurity)},${categoryData.totalItems || 0}\n`;
          });
          csv += '\n';
          silverCategories.forEach(([category, categoryData]) => { csv += addPurityBreakdownCSV(categoryData.purities, category, 'Silver'); });
          csv += 'SILVER CATEGORY DISTRIBUTION (By Pure Weight)\nCategory,Pure Weight (g),Percentage (%)\n';
          const totalSilverPureWeight = data.totalSilverPure || 0;
          silverCategories.forEach(([category, categoryData]) => {
            if (categoryData.pureWeight > 0) {
              const percentage = totalSilverPureWeight > 0 ? Math.floor((categoryData.pureWeight / totalSilverPureWeight) * 10000) / 100 : 0;
              csv += `${category},${categoryData.pureWeight},${percentage}\n`;
            }
          });
          csv += '\n';
        } else { csv += 'No silver category data available\n\n'; }
      }
      return csv;
    } else {
      const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
      let csv = `${metalType} INVENTORY REPORT\nGenerated on: ${formatDate(new Date().toISOString())}\n\n`;
      if (data.categories && Object.keys(data.categories).length > 0) {
        csv += `${metalType} INVENTORY SUMMARY\nMetric,Value\n`;
        csv += `Total Gross Weight (g),${data.totalGross || 0}\nTotal Pure Weight (g),${data.totalPure || 0}\nAverage Purity (%),${data.averagePurity || 0}\n\n`;
        csv += `${metalType} CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n`;
        Object.entries(data.categories).forEach(([category, categoryData]) => {
          csv += `${category},${categoryData.grossWeight || 0},${categoryData.pureWeight || 0},${formatPurity(categoryData.averagePurity)},${categoryData.totalItems || 0}\n`;
        });
        csv += '\n';
        Object.entries(data.categories).forEach(([category, categoryData]) => { csv += addPurityBreakdownCSV(categoryData.purities, category); });
        csv += `${metalType} CATEGORY DISTRIBUTION (By Pure Weight)\nCategory,Pure Weight (g),Percentage (%)\n`;
        const totalPureWeight = data.totalPure || 0;
        Object.entries(data.categories).forEach(([category, categoryData]) => {
          if (categoryData.pureWeight > 0) {
            const percentage = totalPureWeight > 0 ? Math.floor((categoryData.pureWeight / totalPureWeight) * 10000) / 100 : 0;
            csv += `${category},${categoryData.pureWeight},${percentage}\n`;
          }
        });
        csv += '\n';
      } else { csv += `No ${metalType.toLowerCase()} data available\n\n`; }
      return csv;
    }
  };

  // ── Fetch sales data ──────────────────────────────────────────────────
  const fetchSalesData = async (startDate = '', endDate = '') => {
    setLoading(prev => ({ ...prev, sales: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', formatDateForAPI(startDate));
      if (endDate) params.append('endDate', formatDateForAPI(endDate));
      const response = await api.get(`/api/reports/sales?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSalesData(response.data.salesReport);
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

  const [dateRange, setDateRange] = useState({ startDate: getTodayFormatted(), endDate: getTodayFormatted() });

  useEffect(() => { fetchSalesData(dateRange.startDate, dateRange.endDate); }, []);
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) fetchSalesData(dateRange.startDate, dateRange.endDate);
    else fetchSalesData();
  }, [dateRange]);

  const handleDateRangeChange = (type, value) => setDateRange(prev => ({ ...prev, [type]: value }));

  const handleQuickDateSelect = (period) => {
    const now = new Date();
    let startDate, endDate;
    switch (period) {
      case 'today':
        startDate = endDate = formatDateForAPI(formatDateObjectForDisplay(now)); break;
      case 'week':
        const weekStart = new Date(); weekStart.setDate(now.getDate() - 7);
        startDate = formatDateForAPI(formatDateObjectForDisplay(weekStart));
        endDate = formatDateForAPI(formatDateObjectForDisplay(now)); break;
      case 'month':
        const monthStart = new Date(); monthStart.setMonth(now.getMonth() - 1);
        startDate = formatDateForAPI(formatDateObjectForDisplay(monthStart));
        endDate = formatDateForAPI(formatDateObjectForDisplay(now)); break;
      case '6months':
        const sixMonthsStart = new Date(); sixMonthsStart.setMonth(now.getMonth() - 6);
        startDate = formatDateForAPI(formatDateObjectForDisplay(sixMonthsStart));
        endDate = formatDateForAPI(formatDateObjectForDisplay(now)); break;
      case 'year':
        const yearStart = new Date(); yearStart.setFullYear(now.getFullYear() - 1);
        startDate = formatDateForAPI(formatDateObjectForDisplay(yearStart));
        endDate = formatDateForAPI(formatDateObjectForDisplay(now)); break;
      case 'alltime':
        setDateRange({ startDate: '', endDate: '' }); return;
      default: return;
    }
    setDateRange({ startDate, endDate });
  };

  // ── Sales PDF ─────────────────────────────────────────────────────────
  const generateSalesPDFReport = async (data, filename) => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;

      const addText = (text, fontSize = 10, isBold = false, leftMargin = 0) => {
        if (yPosition > pageHeight - 30) { doc.addPage(); yPosition = 20; }
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.text(text, margin + leftMargin, yPosition);
        yPosition += fontSize + 2;
      };
      const addSpace = (space = 5) => { yPosition += space; };

      generateCleanSalesPDF(doc, data, { addText, addSpace });
      await saveDoc(doc, filename);
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF report');
    }
  };

  const generateCleanSalesPDF = (doc, data, { addText, addSpace }) => {
    addText('SALES REPORT', 16, true);
    addSpace(5);
    if (data.dateRange) {
      const startDate = data.dateRange.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start';
      const endDate = data.dateRange.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End';
      addText(`Report Period: ${startDate} to ${endDate}`, 10);
      addText(`Generated on: ${formatDateObjectForDisplay(new Date())}`, 10);
    }
    addSpace(10);
    if (data.summary) {
      addText('EXECUTIVE SUMMARY', 12, true);
      addSpace(3);
      addText(`Total Revenue: Rs ${(data.summary.totalRevenue || 0).toLocaleString()}`, 10);
      addText(`Total Items Sold: ${data.summary.totalItems || 0} items`, 10);
      const avgSale = data.summary.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems) : 0;
      addText(`Average Sale Value: Rs ${avgSale.toLocaleString()}`, 10);
    }
    addSpace(15);
    if (data.byMetal) {
      addText('METAL-WISE PERFORMANCE', 12, true);
      addSpace(5);
      if (data.byMetal.gold && data.byMetal.gold.totalRevenue > 0) {
        let goldItemsSold = 0;
        if (data.topPerformers) goldItemsSold = data.topPerformers.filter(i => i.metalType === 'gold').reduce((s, i) => s + (i.totalItems || 0), 0);
        if (goldItemsSold === 0 && data.summary) goldItemsSold = Math.round(data.summary.totalItems * (data.byMetal.gold.totalRevenue / (data.summary.totalRevenue || 1)));
        addText('Gold Sales:', 11, true);
        addText(`Revenue: Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}`, 10);
        addText(`Gross Weight: ${data.byMetal.gold.totalWeight || 0} grams`, 10);
        addText(`Pure Weight: ${data.byMetal.gold.totalPureWeight || 0} grams`, 10);
        addText(`Total Items Sold: ${goldItemsSold} items`, 10);
        addSpace(8);
      }
      if (data.byMetal.silver && data.byMetal.silver.totalRevenue > 0) {
        let silverItemsSold = 0;
        if (data.topPerformers) silverItemsSold = data.topPerformers.filter(i => i.metalType === 'silver').reduce((s, i) => s + (i.totalItems || 0), 0);
        if (silverItemsSold === 0 && data.summary) silverItemsSold = Math.round(data.summary.totalItems * (data.byMetal.silver.totalRevenue / (data.summary.totalRevenue || 1)));
        addText('Silver Sales:', 11, true);
        addText(`Revenue: Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}`, 10);
        addText(`Gross Weight: ${data.byMetal.silver.totalWeight || 0} grams`, 10);
        addText(`Pure Weight: ${data.byMetal.silver.totalPureWeight || 0} grams`, 10);
        addText(`Total Items Sold: ${silverItemsSold} items`, 10);
        addSpace(8);
      }
    }
    addSpace(10);
    if (data.topPerformers && data.topPerformers.length > 0) {
      addText('TOP REVENUE GENERATORS', 12, true);
      addSpace(5);
      [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10).forEach((item, index) => {
        addText(`${index + 1}. ${item.metalType || 'N/A'} ${item.category || 'N/A'} (${item.purity || 0}% purity)`, 10, true);
        addText(`   Revenue: Rs ${(item.totalSalesAmount || 0).toLocaleString()}`, 10);
        addText(`   Weight: ${item.totalGrossWeight || 0}g gross, ${item.totalPureWeight || 0}g pure`, 10);
        addText(`   Items Sold: ${item.totalItems || 0} items`, 10);
        addSpace(3);
      });
    }
    addSpace(15);
    if (data.topPerformers && data.topPerformers.length > 0) {
      addText('TOP SOLD QUANTITY ITEMS', 12, true);
      addSpace(5);
      [...data.topPerformers].sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0)).slice(0, 10).forEach((item, index) => {
        addText(`${index + 1}. ${item.metalType || 'N/A'} ${item.category || 'N/A'} (${item.purity || 0}% purity)`, 10, true);
        addText(`   Items Sold: ${item.totalItems || 0} items`, 10);
        addText(`   Revenue: Rs ${(item.totalSalesAmount || 0).toLocaleString()}`, 10);
        addText(`   Weight: ${item.totalGrossWeight || 0}g gross, ${item.totalPureWeight || 0}g pure`, 10);
        addSpace(3);
      });
    }
    addSpace(15);
    if (data.entries && data.entries.length > 0) {
      addText('RECENT SALES TRANSACTIONS', 12, true);
      addSpace(5);
      data.entries.slice(0, 20).forEach((entry, index) => {
        const date = formatAPIDateForDisplay(entry.soldAt);
        const quantity = entry.isBulk ? `${entry.itemCount || 1} items (Bulk Sale)` : '1 item';
        addText(`${index + 1}. ${date} - ${entry.metalType || 'N/A'} ${entry.category || 'N/A'}`, 10, true);
        addText(`   Purity: ${entry.purity || 0}%, Weight: ${entry.weight || 0}g`, 10);
        addText(`   Price: Rs ${(entry.salesPrice || 0).toLocaleString()}`, 10);
        addText(`   Quantity: ${quantity}`, 10);
        const customerInfo = [];
        if (entry.customerName) customerInfo.push(`Name: ${entry.customerName}`);
        if (entry.customerMobile) customerInfo.push(`Mobile: ${entry.customerMobile}`);
        if (entry.customerAddress) customerInfo.push(`Address: ${entry.customerAddress}`);
        addText(`   Customer: ${customerInfo.length > 0 ? customerInfo.join(', ') : 'Not provided'}`, 10);
        addSpace(3);
      });
      if (data.entries.length > 20) { addSpace(5); addText(`Note: Showing recent 20 transactions out of ${data.entries.length} total`, 9); }
    } else {
      addText('SALES TRANSACTIONS', 12, true);
      addSpace(5);
      addText('Individual transaction details are not included in this report.', 10);
      addText('To view transaction details, enable "Include Entries" option when generating the report.', 10);
    }
    addSpace(15);
    addText('This report is system generated and contains confidential business information.', 8);
    addText(`Report ID: RPT-${Date.now()}`, 8);
  };

  // ── Sales Excel ───────────────────────────────────────────────────────
  const generateSalesExcel = (data) => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ['SALES REPORT'], [''],
      ['EXECUTIVE SUMMARY'],
      ['Report Period', `${data.dateRange?.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start'} to ${data.dateRange?.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End'}`],
      ['Generated on', formatDateObjectForDisplay(new Date())], [''],
      ['Total Revenue', `Rs ${(data.summary?.totalRevenue || 0).toLocaleString()}`],
      ['Total Items Sold', `${data.summary?.totalItems || 0} items`],
      ['Average Sale Value', `Rs ${data.summary?.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}`],
      [''], ['METAL-WISE PERFORMANCE'], ['']
    ];
    if (data.byMetal?.gold && data.byMetal.gold.totalRevenue > 0) {
      let goldItemsSold = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'gold').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      summaryData.push(['Gold Sales', ''], ['Revenue', `Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}`], ['Gross Weight', `${data.byMetal.gold.totalWeight || 0} grams`], ['Pure Weight', `${data.byMetal.gold.totalPureWeight || 0} grams`], ['Total Items Sold', `${goldItemsSold} items`], ['']);
    }
    if (data.byMetal?.silver && data.byMetal.silver.totalRevenue > 0) {
      let silverItemsSold = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'silver').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      summaryData.push(['Silver Sales', ''], ['Revenue', `Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}`], ['Gross Weight', `${data.byMetal.silver.totalWeight || 0} grams`], ['Pure Weight', `${data.byMetal.silver.totalPureWeight || 0} grams`], ['Total Items Sold', `${silverItemsSold} items`], ['']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

    if (data.topPerformers && data.topPerformers.length > 0) {
      const topRevenueData = [['TOP REVENUE GENERATORS'], [''], ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold']];
      [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10).forEach((item, i) => {
        topRevenueData.push([i + 1, item.metalType || 'N/A', item.category || 'N/A', item.purity || 0, `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`, item.totalGrossWeight || 0, item.totalPureWeight || 0, item.totalItems || 0]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topRevenueData), 'Top Revenue Generators');

      const topQuantityData = [['TOP SOLD QUANTITY ITEMS'], [''], ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Items Sold', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)']];
      [...data.topPerformers].sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0)).slice(0, 10).forEach((item, i) => {
        topQuantityData.push([i + 1, item.metalType || 'N/A', item.category || 'N/A', item.purity || 0, item.totalItems || 0, `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`, item.totalGrossWeight || 0, item.totalPureWeight || 0]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topQuantityData), 'Top Sold Quantity');

      const goldItems = data.topPerformers.filter(i => i.metalType === 'gold');
      if (goldItems.length > 0) {
        const goldData = [['GOLD WEIGHT LEADERS'], [''], ['Rank', 'Category', 'Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold', 'Revenue']];
        [...goldItems].sort((a, b) => (b.totalGrossWeight || 0) - (a.totalGrossWeight || 0)).slice(0, 10).forEach((item, i) => {
          goldData.push([i + 1, item.category || 'N/A', item.purity || 0, item.totalGrossWeight || 0, item.totalPureWeight || 0, item.totalItems || 0, `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(goldData), 'Gold Weight Leaders');
      }

      const silverItems = data.topPerformers.filter(i => i.metalType === 'silver');
      if (silverItems.length > 0) {
        const silverData = [['SILVER WEIGHT LEADERS'], [''], ['Rank', 'Category', 'Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold', 'Revenue']];
        [...silverItems].sort((a, b) => (b.totalGrossWeight || 0) - (a.totalGrossWeight || 0)).slice(0, 10).forEach((item, i) => {
          silverData.push([i + 1, item.category || 'N/A', item.purity || 0, item.totalGrossWeight || 0, item.totalPureWeight || 0, item.totalItems || 0, `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(silverData), 'Silver Weight Leaders');
      }
    }

    if (data.entries && data.entries.length > 0) {
      const transactionData = [['RECENT SALES TRANSACTIONS'], [''], ['#', 'Date', 'Metal Type', 'Category', 'Purity (%)', 'Weight (g)', 'Price', 'Quantity', 'Customer Name', 'Customer Mobile', 'Customer Address']];
      data.entries.slice(0, 20).forEach((entry, i) => {
        transactionData.push([i + 1, formatAPIDateForDisplay(entry.soldAt), entry.metalType || 'N/A', entry.category || 'N/A', entry.purity || 0, entry.weight || 0, `Rs ${(entry.salesPrice || 0).toLocaleString()}`, entry.isBulk ? `${entry.itemCount || 1} items (Bulk Sale)` : '1 item', entry.customerName || 'Not provided', entry.customerMobile || 'Not provided', entry.customerAddress || 'Not provided']);
      });
      if (data.entries.length > 20) transactionData.push(['', '', '', '', '', '', '', '', '', '', `Note: Showing 20 of ${data.entries.length} total`]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transactionData), 'Recent Transactions');
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['SALES TRANSACTIONS'], [''], ['Individual transaction details are not included in this report.']]), 'Transactions Note');
    }
    return wb;
  };

  const formatSalesDataForCSV = (data) => {
    let csv = '\uFEFF';
    csv += 'SALES REPORT\n\nEXECUTIVE SUMMARY\n';
    csv += `Report Period,${data.dateRange?.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start'} to ${data.dateRange?.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End'}\n`;
    csv += `Generated on,${formatDateObjectForDisplay(new Date())}\n\n`;
    csv += `Total Revenue,Rs ${(data.summary?.totalRevenue || 0).toLocaleString()}\nTotal Items Sold,${data.summary?.totalItems || 0} items\nAverage Sale Value,Rs ${data.summary?.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}\n\n`;
    csv += 'METAL-WISE PERFORMANCE\n\n';
    if (data.byMetal?.gold && data.byMetal.gold.totalRevenue > 0) {
      let goldItemsSold = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'gold').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      csv += `Gold Sales\nRevenue,Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}\nGross Weight,${data.byMetal.gold.totalWeight || 0} grams\nPure Weight,${data.byMetal.gold.totalPureWeight || 0} grams\nTotal Items Sold,${goldItemsSold} items\n\n`;
    }
    if (data.byMetal?.silver && data.byMetal.silver.totalRevenue > 0) {
      let silverItemsSold = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'silver').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      csv += `Silver Sales\nRevenue,Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}\nGross Weight,${data.byMetal.silver.totalWeight || 0} grams\nPure Weight,${data.byMetal.silver.totalPureWeight || 0} grams\nTotal Items Sold,${silverItemsSold} items\n\n`;
    }
    if (data.topPerformers && data.topPerformers.length > 0) {
      csv += 'TOP REVENUE GENERATORS\nRank,Metal Type,Category,Purity (%),Revenue,Gross Weight (g),Pure Weight (g),Items Sold\n';
      [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10).forEach((item, i) => {
        csv += `${i + 1},${item.metalType || 'N/A'},${item.category || 'N/A'},${item.purity || 0},Rs ${(item.totalSalesAmount || 0).toLocaleString()},${item.totalGrossWeight || 0},${item.totalPureWeight || 0},${item.totalItems || 0}\n`;
      });
      csv += '\n';
    }
    return csv;
  };

  const downloadSalesExcel = async (data) => {
    if (!data || !data.summary) { alert('No data available for download'); return; }
    try {
      const wb = generateSalesExcel(data);
      const date = new Date();
      const formattedDate = `${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${date.getFullYear()}`;
      await saveWorkbook(wb, `sales_report_${formattedDate}.xlsx`);
    } catch (error) {
      console.error('Excel Download Error:', error);
      alert('Error generating Excel file');
    }
  };

  // ── Fetch customers data ──────────────────────────────────────────────
  const fetchCustomersData = async () => {
    setLoading(prev => ({ ...prev, customers: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      const params = new URLSearchParams();
      params.append('includeName', customerFields.name.toString());
      params.append('includeAddress', customerFields.address.toString());
      params.append('includeMobile', customerFields.mobile.toString());
      params.append('includePurchaseAmount', customerFields.purchaseAmount.toString());
      params.append('includePurchaseItems', customerFields.purchaseItems.toString());
      const response = await api.get(`/api/reports/customers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCustomersData(response.data.customerReport);
    } catch (error) {
      setError('Failed to load customer data');
      console.error('Customer data error:', error);
    } finally {
      setLoading(prev => ({ ...prev, customers: false }));
    }
  };

  // ── Customer download ─────────────────────────────────────────────────
  const handleCustomerDownload = async (format, customerFields) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      setLoading(prev => ({ ...prev, customers: true }));
      const fieldsToInclude = [];
      if (customerFields.name) fieldsToInclude.push('customerName');
      if (customerFields.mobile) fieldsToInclude.push('customerMobile');
      if (customerFields.address) fieldsToInclude.push('customerAddress');
      if (customerFields.purchaseAmount) fieldsToInclude.push('totalPurchaseAmount');
      if (customerFields.purchaseItems) fieldsToInclude.push('transactions');
      const response = await api.post('/api/reports/download', {
        reportType: 'customers', format, includeEntries: true, fields: fieldsToInclude,
        fieldSelection: { includeName: customerFields.name, includeAddress: customerFields.address, includeMobile: customerFields.mobile, includePurchaseAmount: customerFields.purchaseAmount, includePurchaseItems: customerFields.purchaseItems }
      }, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = response.data;
      if (data.message && !data.downloadReady) throw new Error(data.message);
      if (data.downloadReady && data.downloadData) {
        const filename = getFilename('customers', format, new Date().getTime());
        const reportData = data.downloadData.data;
        if (format === 'pdf') await generateCustomerPDFReport(reportData, filename, customerFields);
        else if (format === 'excel') await generateCustomerExcelReport(reportData, filename, customerFields);
        else if (format === 'csv') await generateCustomerCSVReport(reportData, filename, customerFields);
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

  const isValidValue = (value) => value && value !== null && value !== undefined && value !== '' && value !== 'N/A' && value !== 'null';

  const formatPurchaseItems = (transactions) => {
    if (!transactions || transactions.length === 0) return 'No purchases';
    const itemSummary = transactions.reduce((acc, transaction) => {
      const key = `${transaction.metalType}-${transaction.category}`;
      if (!acc[key]) acc[key] = { metalType: transaction.metalType, category: transaction.category, count: 0, totalWeight: 0, totalAmount: 0 };
      acc[key].count += transaction.itemCount || 1;
      acc[key].totalWeight += transaction.weight || 0;
      acc[key].totalAmount += transaction.amount || 0;
      return acc;
    }, {});
    return Object.values(itemSummary).map(item => `${item.count} ${item.metalType} ${item.category} (${item.totalWeight.toFixed(3)}g)`).join(', ');
  };

  // ── Customer PDF ──────────────────────────────────────────────────────
  const generateCustomerPDFReport = async (reportData, filename, selectedFields) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    const addCustomerText = (text, fontSize = 10) => {
      doc.setFontSize(fontSize); doc.setFont("helvetica", "normal");
      doc.text(text, margin, yPosition); yPosition += fontSize + 3;
    };
    const checkCustomerNewPage = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) { doc.addPage(); yPosition = 20; }
    };

    addCustomerText('Customer Report', 16);
    addCustomerText(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 10);
    addCustomerText('', 5);

    if (reportData.customers && reportData.customers.length > 0) {
      let validCustomerIndex = 0;
      reportData.customers.forEach((customer) => {
        let hasAllSelectedFields = true;
        if (selectedFields.name && !isValidValue(customer.customerName)) hasAllSelectedFields = false;
        if (selectedFields.mobile && !isValidValue(customer.customerMobile)) hasAllSelectedFields = false;
        if (selectedFields.address && !isValidValue(customer.customerAddress)) hasAllSelectedFields = false;
        if (selectedFields.purchaseAmount && (!isValidValue(customer.totalPurchaseAmount) || customer.totalPurchaseAmount <= 0)) hasAllSelectedFields = false;
        if (selectedFields.purchaseItems && (!customer.transactions || customer.transactions.length === 0)) hasAllSelectedFields = false;
        if (hasAllSelectedFields) {
          checkCustomerNewPage(40);
          validCustomerIndex++;
          let customerLine = `${validCustomerIndex}. `;
          let isFirstField = true;
          if (selectedFields.name) { customerLine += customer.customerName; isFirstField = false; }
          if (selectedFields.mobile) { customerLine += isFirstField ? customer.customerMobile : ` | ${customer.customerMobile}`; isFirstField = false; }
          if (selectedFields.address) { customerLine += isFirstField ? customer.customerAddress : ` | ${customer.customerAddress}`; isFirstField = false; }
          if (selectedFields.purchaseAmount) { customerLine += isFirstField ? `Rs.${customer.totalPurchaseAmount}` : ` | Rs.${customer.totalPurchaseAmount}`; isFirstField = false; }
          addCustomerText(customerLine, 10);
          if (selectedFields.purchaseItems && customer.transactions) addCustomerText(`   Items: ${formatPurchaseItems(customer.transactions)}`, 9);
          addCustomerText('', 3);
        }
      });
    }
    await saveDoc(doc, filename);
  };

  // ── Customer Excel ────────────────────────────────────────────────────
  const generateCustomerExcelReport = async (reportData, filename, selectedFields) => {
    const XLSX = window.XLSX;
    const workbook = XLSX.utils.book_new();
    const customerHeaders = [];
    if (selectedFields.name) customerHeaders.push('Customer Name');
    if (selectedFields.mobile) customerHeaders.push('Mobile Number');
    if (selectedFields.address) customerHeaders.push('Address');
    if (selectedFields.purchaseAmount) customerHeaders.push('Total Purchase Amount (₹)');
    if (selectedFields.purchaseItems) customerHeaders.push('Purchase Items Details');

    const validCustomers = reportData.customers.filter(customer => {
      if (selectedFields.name && !isValidValue(customer.customerName)) return false;
      if (selectedFields.mobile && !isValidValue(customer.customerMobile)) return false;
      if (selectedFields.address && !isValidValue(customer.customerAddress)) return false;
      if (selectedFields.purchaseAmount && (!isValidValue(customer.totalPurchaseAmount) || customer.totalPurchaseAmount <= 0)) return false;
      if (selectedFields.purchaseItems && (!customer.transactions || customer.transactions.length === 0)) return false;
      return true;
    });

    const customerRows = validCustomers.map(customer => {
      const row = [];
      if (selectedFields.name) row.push(customer.customerName);
      if (selectedFields.mobile) row.push(customer.customerMobile);
      if (selectedFields.address) row.push(customer.customerAddress);
      if (selectedFields.purchaseAmount) row.push(customer.totalPurchaseAmount);
      if (selectedFields.purchaseItems) row.push(formatPurchaseItems(customer.transactions));
      return row;
    });

    const customerSheet = XLSX.utils.aoa_to_sheet([customerHeaders, ...customerRows]);
    const columnWidths = [];
    if (selectedFields.name) columnWidths.push({ wch: 25 });
    if (selectedFields.mobile) columnWidths.push({ wch: 15 });
    if (selectedFields.address) columnWidths.push({ wch: 30 });
    if (selectedFields.purchaseAmount) columnWidths.push({ wch: 20 });
    if (selectedFields.purchaseItems) columnWidths.push({ wch: 50 });
    customerSheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Report');
    await saveWorkbook(workbook, filename);
  };

  // ── Customer CSV ──────────────────────────────────────────────────────
  const generateCustomerCSVReport = async (reportData, filename, selectedFields) => {
    const headers = [];
    if (selectedFields.name) headers.push('Customer Name');
    if (selectedFields.mobile) headers.push('Mobile Number');
    if (selectedFields.address) headers.push('Address');
    if (selectedFields.purchaseAmount) headers.push('Total Purchase Amount (₹)');
    if (selectedFields.purchaseItems) headers.push('Purchase Items Details');

    let csvContent = headers.join(',') + '\n';

    if (reportData.customers && reportData.customers.length > 0) {
      reportData.customers.filter(customer => {
        if (selectedFields.name && !isValidValue(customer.customerName)) return false;
        if (selectedFields.mobile && !isValidValue(customer.customerMobile)) return false;
        if (selectedFields.address && !isValidValue(customer.customerAddress)) return false;
        if (selectedFields.purchaseAmount && (!isValidValue(customer.totalPurchaseAmount) || customer.totalPurchaseAmount <= 0)) return false;
        if (selectedFields.purchaseItems && (!customer.transactions || customer.transactions.length === 0)) return false;
        return true;
      }).forEach(customer => {
        const row = [];
        if (selectedFields.name) row.push(`"${customer.customerName}"`);
        if (selectedFields.mobile) row.push(`"${customer.customerMobile}"`);
        if (selectedFields.address) row.push(`"${customer.customerAddress}"`);
        if (selectedFields.purchaseAmount) row.push(customer.totalPurchaseAmount);
        if (selectedFields.purchaseItems) row.push(`"${formatPurchaseItems(customer.transactions)}"`);
        csvContent += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    await downloadFile(blob, filename.replace('.xlsx', '.csv'));
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => { fetchStockData(); fetchSalesData(); fetchCustomersData(); }, []);
  useEffect(() => { fetchCustomersData(); }, [customerFields]);

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