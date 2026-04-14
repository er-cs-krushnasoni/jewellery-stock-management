import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/ui/BackButton';
import { Card } from '../components/ui/card';
import { Button } from "../components/ui/button";
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../config/api';
import {
  Calendar, Download, TrendingUp, Users, Package, FileText,
  Filter, CheckCircle, AlertCircle, Loader2, PieChart as PieChartIcon, BarChart3
} from 'lucide-react';

// ── pdfmake loaded flag 
let pdfMakeLoaded = false;
let unicodeFontLoaded = false;
let unicodeFontLoadPromise = null; // prevents duplicate concurrent fetches
 
// ── Load pdfmake library ──────────────────────────────────────────────────────
const loadPdfMake = () => {
  return new Promise((resolve, reject) => {
    if (pdfMakeLoaded && window.pdfMake) { resolve(); return; }
    const script1 = document.createElement('script');
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
    script1.async = true;
    script1.crossOrigin = 'anonymous';
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';
      script2.async = true;
      script2.crossOrigin = 'anonymous';
      script2.onload = () => { pdfMakeLoaded = true; resolve(); };
      script2.onerror = () => reject(new Error('vfs_fonts failed to load'));
      document.head.appendChild(script2);
    };
    script1.onerror = () => reject(new Error('pdfmake failed to load'));
    document.head.appendChild(script1);
  });
};
 
// ── Load Unicode font (all Indian languages + Latin + Arabic) ─────────────────
// Font covers: Latin, Gujarati, Hindi, Marathi, Bengali, Tamil, Telugu,
//              Kannada, Malayalam, Punjabi, Odia, Arabic/Urdu (5839 glyphs)
// Fetched once on first PDF download, then cached in memory by the browser.
// Font file must be placed at: frontend/public/fonts/NotoSansAllIndic.ttf
const loadUnicodeFont = () => {
  if (!window.pdfMake) return Promise.resolve();
  if (unicodeFontLoaded) return Promise.resolve();
 
  // Prevent multiple concurrent fetches (e.g. user clicks PDF twice fast)
  if (unicodeFontLoadPromise) return unicodeFontLoadPromise;
 
  unicodeFontLoadPromise = (async () => {
    try {
      const resp = await fetch('/fonts/NotoSansAllIndic.ttf');
      if (!resp.ok) throw new Error(`Font fetch failed: ${resp.status}`);
 
      const arrayBuffer = await resp.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
 
      // Convert to base64 in chunks (avoid stack overflow on large files)
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
 
      if (!window.pdfMake.vfs) window.pdfMake.vfs = {};
      window.pdfMake.vfs['NotoSansAllIndic.ttf'] = base64;
      window.pdfMake.fonts = {
        ...window.pdfMake.fonts,
        NotoSans: {
          normal:      'NotoSansAllIndic.ttf',
          bold:        'NotoSansAllIndic.ttf',
          italics:     'NotoSansAllIndic.ttf',
          bolditalics: 'NotoSansAllIndic.ttf',
        }
      };
      unicodeFontLoaded = true;
      console.log('NotoSans All-Indic font loaded ✓ (5839 glyphs, 10 scripts)');
    } catch (e) {
      console.warn('Unicode font load failed, using Roboto fallback:', e.message);
      unicodeFontLoadPromise = null; // allow retry next time
    }
  })();
 
  return unicodeFontLoadPromise;
};
 
// ── Keep old name as alias so no other code needs to change ───────────────────
const loadGujaratiFont = loadUnicodeFont;
 
// ── Get best available font for pdfmake ───────────────────────────────────────
const getBestFont = () => {
  if (unicodeFontLoaded && window.pdfMake?.fonts?.NotoSans) return 'NotoSans';
  return 'Roboto';
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const formatDateForAPI = (displayDate) => {
  if (!displayDate) return '';
  if (displayDate.includes('-') && displayDate.length === 10) return displayDate;
  const [day, month, year] = displayDate.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const formatDateObjectForDisplay = (dateObj) => {
  if (!dateObj) return '';
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateForDisplay = (isoDate) => {
  if (!isoDate) return '';
  if (isoDate.includes('/') && isoDate.length === 10) return isoDate;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const formatAPIDateForDisplay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return formatDateObjectForDisplay(date);
};

// ── Platform helpers ──────────────────────────────────────────────────────────
const isCapacitorApp = () =>
  typeof window !== 'undefined' &&
  typeof window.Capacitor !== 'undefined' &&
  window.Capacitor.isNativePlatform?.();

const isInIframe = () => {
  try { return window.self !== window.top; } catch (e) { return true; }
};

// ── Universal download helper ─────────────────────────────────────────────────
const downloadFile = async (blob, filename) => {
  if (isCapacitorApp() && isInIframe()) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const array = Array.from(uint8Array);
      window.parent.postMessage({
        type: 'DOWNLOAD_FILE',
        filename,
        mimeType: blob.type,
        data: array
      }, '*');
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    } catch (err) {
      console.error('postMessage download failed:', err);
    }
  }
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ── Save XLSX workbook — always use array+Blob for proper Unicode encoding ─────
const saveWorkbook = async (wb, filename) => {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  await downloadFile(blob, filename);
};

// ── pdfmake doc styles ────────────────────────────────────────────────────────
const PDF_STYLES = {
  header:        { fontSize: 16, bold: true,  margin: [0, 0,  0, 5]  },
  subheader:     { fontSize: 12, bold: true,  margin: [0, 10, 0, 5]  },
  sectionHeader: { fontSize: 10, bold: true,  margin: [0, 6,  0, 2]  },
  normal:        { fontSize: 10,              margin: [0, 1,  0, 1]  },
  small:         { fontSize: 9,               margin: [0, 1,  0, 1]  },
};

const ReportPage = () => {
  const { user } = useAuth();
  const [stockData, setStockData]       = useState(null);
  const [salesData, setSalesData]       = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [loading, setLoading]           = useState({ stock: false, sales: false, customers: false });
  const [customerFields, setCustomerFields] = useState({
    name: true, address: true, mobile: true,
    purchaseAmount: true, purchaseItems: false
  });
  const [downloadModal, setDownloadModal] = useState({ open: false, type: '', data: null });
  const [categoryData, setCategoryData] = useState({ gold: [], silver: [] });
  const [includeEntries, setIncludeEntries] = useState(false);
  const [error, setError]               = useState('');

  const COLORS = [
    '#8884d8','#82ca9d','#ffc658','#ff7300','#00ff00',
    '#0088fe','#00c49f','#ffbb28','#ff8042','#8dd1e1'
  ];

  const renderLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
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

  // ── Init: load pdfmake + Unicode font ──────────────────────────────────────
  useEffect(() => {
    loadPdfMake()
      .then(() => loadGujaratiFont())
      .catch(err => {
        console.error('Failed to load PDF library:', err);
        setError('PDF library failed to load. PDF downloads may not work.');
      });
  }, []);

  // ── Fetch stock data ────────────────────────────────────────────────────────
  const fetchStockData = async () => {
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
          averagePurity: metadataData.totalGoldGross > 0
            ? ((metadataData.totalGoldPure / metadataData.totalGoldGross) * 100).toFixed(2) : 0,
          categories: {}
        },
        silver: {
          totalGross: metadataData.totalSilverGross || 0,
          totalPure: metadataData.totalSilverPure || 0,
          averagePurity: metadataData.totalSilverGross > 0
            ? ((metadataData.totalSilverPure / metadataData.totalSilverGross) * 100).toFixed(2) : 0,
          categories: {}
        }
      };
      const goldCategories   = [];
      const silverCategories = [];
      if (metadataData.categoryTotals) {
        Object.entries(metadataData.categoryTotals).forEach(([categoryKey, categoryData]) => {
          const { pureWeight, metal, grossWeight, totalItems, categoryName, purities } = categoryData;
          const averagePurity = grossWeight > 0 ? (pureWeight / grossWeight) * 100 : 0;
          const processedCategoryData = {
            grossWeight:  grossWeight  || 0,
            pureWeight:   pureWeight   || 0,
            totalItems:   totalItems   || 0,
            averagePurity: averagePurity.toFixed(2),
            purities:     purities     || {}
          };
          const displayName = categoryName || categoryKey.split('_')[0];
          if (metal === 'gold' && pureWeight > 0) {
            goldCategories.push({ name: displayName, value: pureWeight });
            processedData.gold.categories[displayName] = processedCategoryData;
          } else if (metal === 'silver' && pureWeight > 0) {
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

  // ── Filename helper ─────────────────────────────────────────────────────────
  const getFilename = (reportType, format, timestamp = null) => {
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const date = timestamp ? new Date(timestamp) : new Date();
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    const d = `${day}-${month}-${year}`;
    switch (reportType) {
      case 'stock-gold':   return `gold_inventory_${d}.${extension}`;
      case 'stock-silver': return `silver_inventory_${d}.${extension}`;
      case 'stock-full':   return `full_inventory_${d}.${extension}`;
      case 'sales':        return `sales_report_${d}.${extension}`;
      case 'customers':    return `customer_list_${d}.${extension}`;
      default:             return `report_${d}.${extension}`;
    }
  };

  // ── Handle download ─────────────────────────────────────────────────────────
  const handleDownload = async (reportType, format) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      setLoading(prev => ({ ...prev, [reportType.split('-')[0]]: true }));
      const response = await api.post('/api/reports/download', {
        reportType, format, includeEntries,
        ...(reportType.startsWith('stock-') && { metalType: reportType.split('-')[1] }),
        ...(reportType === 'sales'     && { startDate: dateRange.startDate, endDate: dateRange.endDate }),
        ...(reportType === 'customers' && { fields: customerFields })
      }, { headers: { 'Authorization': `Bearer ${token}` } });

      const data = response.data;
      if (data.message && !data.downloadReady) throw new Error(data.message);

      if (data.downloadReady && data.downloadData) {
        const filename   = getFilename(reportType, format, new Date().getTime());
        const reportData = data.downloadData.data;
        if (reportType === 'sales') {
          if (format === 'pdf')   await generateSalesPDFReport(reportData, filename);
          else                    await downloadSalesExcel(reportData);
        } else if (reportType === 'customers') {
          if (format === 'pdf')   await generateCustomerPDFReport(reportData, filename, customerFields);
          else                    await generateCustomerExcelReport(reportData, filename, customerFields);
        } else {
          if (format === 'pdf')   await generatePDFFromData(reportData, reportType, filename);
          else                    await generateExcelFromData(reportData, reportType, filename);
        }
        setDownloadModal({ open: false, type: '', data: null });
        if (!isCapacitorApp()) alert(`${format.toUpperCase()} report downloaded successfully!`);
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

  // ── Report title helper ─────────────────────────────────────────────────────
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

  // ── Build stock PDF content array for pdfmake ───────────────────────────────
  const buildStockPDFContent = (content, data, reportType) => {
    const formatPurity = (p) => {
      if (!p || p === 0) return '0.00';
      const s = p.toString(); const d = s.indexOf('.');
      return d === -1 ? s + '.00' : s.substring(0, d + 3).padEnd(d + 3, '0');
    };

    const addCategoryRows = (cats) => {
      cats.forEach(([cat, cd]) => {
        content.push({ text: `• ${cat}`, style: 'sectionHeader' });
        content.push({
          text: `  Gross: ${cd.grossWeight || 0}g  |  Pure: ${cd.pureWeight || 0}g  |  Purity: ${formatPurity(cd.averagePurity)}%  |  Items: ${cd.totalItems || 0}`,
          style: 'normal', margin: [10, 0, 0, 2]
        });
        if (cd.purities && Object.keys(cd.purities).length > 0) {
          Object.entries(cd.purities).forEach(([purity, pd]) => {
            if (pd.totalItems > 0) {
              content.push({
                text: `    ${purity}%: Gross ${pd.grossWeight || 0}g, Pure ${pd.pureWeight || 0}g, Items ${pd.totalItems || 0}`,
                style: 'small', margin: [20, 0, 0, 1]
              });
            }
          });
        }
      });
    };

    if (reportType === 'stock-full') {
      const goldCats   = Object.entries(data.categories || {}).filter(([k]) => k.includes('_gold'));
      const silverCats = Object.entries(data.categories || {}).filter(([k]) => k.includes('_silver'));

      if (data.totalGoldGross > 0 || goldCats.length > 0) {
        content.push({ text: 'GOLD INVENTORY SUMMARY', style: 'subheader' });
        content.push({ text: `Total Gross Weight: ${data.totalGoldGross || 0} g`, style: 'normal' });
        content.push({ text: `Total Pure Weight: ${data.totalGoldPure || 0} g`, style: 'normal' });
        content.push({ text: `Average Purity: ${data.goldAveragePurity || 0}%`, style: 'normal' });
        content.push({ text: 'GOLD CATEGORY BREAKDOWN:', style: 'subheader' });
        addCategoryRows(goldCats);
        content.push({ text: ' ', margin: [0, 5] });
      }
      if (data.totalSilverGross > 0 || silverCats.length > 0) {
        content.push({ text: 'SILVER INVENTORY SUMMARY', style: 'subheader' });
        content.push({ text: `Total Gross Weight: ${data.totalSilverGross || 0} g`, style: 'normal' });
        content.push({ text: `Total Pure Weight: ${data.totalSilverPure || 0} g`, style: 'normal' });
        content.push({ text: `Average Purity: ${data.silverAveragePurity || 0}%`, style: 'normal' });
        content.push({ text: 'SILVER CATEGORY BREAKDOWN:', style: 'subheader' });
        addCategoryRows(silverCats);
      }
    } else {
      const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
      const cats = Object.entries(data.categories || {});
      content.push({ text: `${metalType} INVENTORY SUMMARY`, style: 'subheader' });
      content.push({ text: `Total Gross Weight: ${data.totalGross || 0} g`, style: 'normal' });
      content.push({ text: `Total Pure Weight: ${data.totalPure || 0} g`, style: 'normal' });
      content.push({ text: `Average Purity: ${data.averagePurity || 0}%`, style: 'normal' });
      content.push({ text: `${metalType} CATEGORY BREAKDOWN:`, style: 'subheader' });
      if (cats.length > 0) {
        addCategoryRows(cats);
      } else {
        content.push({ text: `No ${metalType.toLowerCase()} data available`, style: 'normal' });
      }
    }
  };

  // ── Generate stock/inventory PDF using pdfmake ──────────────────────────────
  const generatePDFFromData = async (data, reportType, filename) => {
    try {
      if (!pdfMakeLoaded) await loadPdfMake();
      await loadGujaratiFont();
      const defaultFont = getBestFont();
      const content = [];
      content.push({ text: getReportTitle(reportType), style: 'header', alignment: 'center' });
      content.push({ text: `Generated on: ${new Date().toLocaleDateString('en-GB')}`, style: 'normal', alignment: 'center' });
      content.push({ text: ' ', margin: [0, 10] });
      buildStockPDFContent(content, data, reportType);
      const docDefinition = {
        defaultStyle: { font: defaultFont, fontSize: 10 },
        styles: PDF_STYLES,
        content
      };
      const pdfBlob = await new Promise((resolve) => {
        window.pdfMake.createPdf(docDefinition).getBlob(resolve);
      });
      await downloadFile(pdfBlob, filename);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF generation failed. Please try downloading as Excel format instead.');
      throw error;
    }
  };

  // ── Excel from data ─────────────────────────────────────────────────────────
  const generateExcelFromData = async (data, reportType, filename) => {
    try {
      if (reportType === 'stock-full') { await generateMultiSheetExcel(data, filename); return; }
      let csvContent = '';
      switch (reportType) {
        case 'stock-gold':
        case 'stock-silver': csvContent = formatStockDataForCSV(data, reportType); break;
        case 'sales':        csvContent = formatSalesDataForCSV(data);             break;
        default:             csvContent = 'Data\n' + JSON.stringify(data, null, 2);
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(blob, filename.replace('.xlsx', '.csv'));
    } catch (error) {
      console.error('Excel generation error:', error);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      await downloadFile(blob, filename.replace('.xlsx', '.json'));
    }
  };

  // ── Multi-sheet Excel ───────────────────────────────────────────────────────
  const generateMultiSheetExcel = async (data, filename) => {
    try {
      if (typeof XLSX === 'undefined') { await generateFallbackCSV(data, filename); return; }
      const formatPurity = (p) => {
        if (!p || p === 0) return '0.00';
        const s = p.toString(); const d = s.indexOf('.');
        return d === -1 ? s + '.00' : s.substring(0, d + 3).padEnd(d + 3, '0');
      };
      const formatDate = (ds) => {
        if (!ds) return 'N/A';
        const d = new Date(ds);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      };
      const wb      = XLSX.utils.book_new();
      const allCats = data.categories || {};
      const goldCats   = Object.entries(allCats).filter(([k]) => k.toLowerCase().includes('gold')   || k.includes('_gold'));
      const silverCats = Object.entries(allCats).filter(([k]) => k.toLowerCase().includes('silver') || k.includes('_silver'));

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(generateGoldSheetData(data, goldCats, formatDate, formatPurity)),   'Gold Inventory');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(generateSilverSheetData(data, silverCats, formatDate, formatPurity)), 'Silver Inventory');

      const mixedCats = Object.entries(allCats).filter(([k]) =>
        !k.toLowerCase().includes('gold')   && !k.includes('_gold') &&
        !k.toLowerCase().includes('silver') && !k.includes('_silver')
      );
      if (mixedCats.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(generateMixedCategoriesSheetData(data, mixedCats, formatDate, formatPurity)), 'Other Categories');
      }
      await saveWorkbook(wb, filename);
    } catch (error) {
      console.error('Multi-sheet Excel error:', error);
      await generateFallbackCSV(data, filename);
    }
  };

  const generateGoldSheetData = (data, goldCategories, formatDate, formatPurity) => {
    const rows = [
      ['GOLD INVENTORY REPORT'],
      [`Generated on: ${formatDate(new Date().toISOString())}`],
      [],
      ['GOLD INVENTORY SUMMARY'],
      ['Metric', 'Value'],
      ['Total Gross Weight (g)', data.totalGoldGross || 0],
      ['Total Pure Weight (g)',  data.totalGoldPure  || 0],
      ['Average Purity (%)',     data.goldAveragePurity || 0],
      []
    ];
    if (goldCategories.length > 0) {
      rows.push(['GOLD CATEGORY BREAKDOWN'], ['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
      goldCategories.forEach(([cat, cd]) => rows.push([cat, cd.grossWeight || 0, cd.pureWeight || 0, formatPurity(cd.averagePurity || 0), cd.totalItems || 0]));
      rows.push([]);
      goldCategories.forEach(([cat, cd]) => {
        if (cd.purities && Object.keys(cd.purities).length > 0) {
          rows.push([`${cat} - Purity Breakdown`], ['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
          Object.entries(cd.purities).forEach(([p, pd]) => { if (pd.totalItems > 0) rows.push([p, pd.grossWeight || 0, pd.pureWeight || 0, pd.totalItems || 0]); });
          rows.push([]);
        }
      });
      const total = data.totalGoldPure || 0;
      if (total > 0) {
        rows.push(['GOLD CATEGORY DISTRIBUTION (By Pure Weight)'], ['Category', 'Pure Weight (g)', 'Percentage (%)']);
        goldCategories.forEach(([cat, cd]) => { if (cd.pureWeight > 0) rows.push([cat, cd.pureWeight, Math.round((cd.pureWeight / total) * 10000) / 100]); });
        rows.push([]);
      }
    } else {
      rows.push(['GOLD CATEGORY BREAKDOWN'], ['No gold category data available'], []);
    }
    return rows;
  };

  const generateSilverSheetData = (data, silverCategories, formatDate, formatPurity) => {
    const rows = [
      ['SILVER INVENTORY REPORT'],
      [`Generated on: ${formatDate(new Date().toISOString())}`],
      [],
      ['SILVER INVENTORY SUMMARY'],
      ['Metric', 'Value'],
      ['Total Gross Weight (g)', data.totalSilverGross || 0],
      ['Total Pure Weight (g)',  data.totalSilverPure  || 0],
      ['Average Purity (%)',     data.silverAveragePurity || 0],
      []
    ];
    if (silverCategories.length > 0) {
      rows.push(['SILVER CATEGORY BREAKDOWN'], ['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
      silverCategories.forEach(([cat, cd]) => rows.push([cat, cd.grossWeight || 0, cd.pureWeight || 0, formatPurity(cd.averagePurity || 0), cd.totalItems || 0]));
      rows.push([]);
      silverCategories.forEach(([cat, cd]) => {
        if (cd.purities && Object.keys(cd.purities).length > 0) {
          rows.push([`${cat} - Purity Breakdown`], ['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
          Object.entries(cd.purities).forEach(([p, pd]) => { if (pd.totalItems > 0) rows.push([p, pd.grossWeight || 0, pd.pureWeight || 0, pd.totalItems || 0]); });
          rows.push([]);
        }
      });
      const total = data.totalSilverPure || 0;
      if (total > 0) {
        rows.push(['SILVER CATEGORY DISTRIBUTION (By Pure Weight)'], ['Category', 'Pure Weight (g)', 'Percentage (%)']);
        silverCategories.forEach(([cat, cd]) => { if (cd.pureWeight > 0) rows.push([cat, cd.pureWeight, Math.round((cd.pureWeight / total) * 10000) / 100]); });
        rows.push([]);
      }
    } else {
      rows.push(['SILVER CATEGORY BREAKDOWN'], ['No silver category data available'], []);
    }
    return rows;
  };

  const generateMixedCategoriesSheetData = (data, mixedCategories, formatDate, formatPurity) => {
    const rows = [['OTHER CATEGORIES REPORT'], [`Generated on: ${formatDate(new Date().toISOString())}`], []];
    if (mixedCategories.length > 0) {
      rows.push(['OTHER CATEGORIES BREAKDOWN'], ['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
      mixedCategories.forEach(([cat, cd]) => rows.push([cat, cd.grossWeight || 0, cd.pureWeight || 0, formatPurity(cd.averagePurity || 0), cd.totalItems || 0]));
      rows.push([]);
    } else {
      rows.push(['No other category data available']);
    }
    return rows;
  };

  const generateFallbackCSV = async (data, filename) => {
    const csvContent = formatStockDataForCSV(data, 'stock-full');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    await downloadFile(blob, filename.replace('.xlsx', '.csv'));
  };

  const formatStockDataForCSV = (data, reportType) => {
    const formatPurity = (p) => {
      if (!p || p === 0) return '0.00';
      const s = p.toString(); const d = s.indexOf('.');
      return d === -1 ? s + '.00' : s.substring(0, d + 3).padEnd(d + 3, '0');
    };
    const purityCSV = (purities, cat, metal = '') => {
      if (!purities || Object.keys(purities).length === 0)
        return `${metal ? metal + ' - ' : ''}${cat} - Purity Breakdown,No purity data\n`;
      let csv = `${metal ? metal + ' - ' : ''}${cat} - Purity Breakdown\nPurity (%),Gross Weight (g),Pure Weight (g),Items\n`;
      Object.entries(purities).forEach(([p, pd]) => { if (pd.totalItems > 0) csv += `${p},${pd.grossWeight || 0},${pd.pureWeight || 0},${pd.totalItems || 0}\n`; });
      return csv + '\n';
    };
    const today = new Date().toLocaleDateString('en-GB');
    if (reportType === 'stock-full') {
      let csv = `\uFEFFCOMPLETE INVENTORY REPORT\nGenerated on: ${today}\n\n`;
      const goldCats   = Object.entries(data.categories || {}).filter(([k]) => k.includes('_gold'));
      const silverCats = Object.entries(data.categories || {}).filter(([k]) => k.includes('_silver'));
      if (data.totalGoldGross > 0 || goldCats.length > 0) {
        csv += `GOLD INVENTORY SUMMARY\nMetric,Value\nTotal Gross Weight (g),${data.totalGoldGross || 0}\nTotal Pure Weight (g),${data.totalGoldPure || 0}\nAverage Purity (%),${data.goldAveragePurity || 0}\n\n`;
        csv += 'GOLD CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
        goldCats.forEach(([cat, cd]) => { csv += `${cat},${cd.grossWeight || 0},${cd.pureWeight || 0},${formatPurity(cd.averagePurity)},${cd.totalItems || 0}\n`; });
        csv += '\n';
        goldCats.forEach(([cat, cd]) => { csv += purityCSV(cd.purities, cat, 'Gold'); });
      }
      if (data.totalSilverGross > 0 || silverCats.length > 0) {
        csv += `SILVER INVENTORY SUMMARY\nMetric,Value\nTotal Gross Weight (g),${data.totalSilverGross || 0}\nTotal Pure Weight (g),${data.totalSilverPure || 0}\nAverage Purity (%),${data.silverAveragePurity || 0}\n\n`;
        csv += 'SILVER CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
        silverCats.forEach(([cat, cd]) => { csv += `${cat},${cd.grossWeight || 0},${cd.pureWeight || 0},${formatPurity(cd.averagePurity)},${cd.totalItems || 0}\n`; });
        csv += '\n';
        silverCats.forEach(([cat, cd]) => { csv += purityCSV(cd.purities, cat, 'Silver'); });
      }
      return csv;
    } else {
      const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
      let csv = `\uFEFF${metalType} INVENTORY REPORT\nGenerated on: ${today}\n\n`;
      if (data.categories && Object.keys(data.categories).length > 0) {
        csv += `${metalType} INVENTORY SUMMARY\nMetric,Value\nTotal Gross Weight (g),${data.totalGross || 0}\nTotal Pure Weight (g),${data.totalPure || 0}\nAverage Purity (%),${data.averagePurity || 0}\n\n`;
        csv += `${metalType} CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n`;
        Object.entries(data.categories).forEach(([cat, cd]) => { csv += `${cat},${cd.grossWeight || 0},${cd.pureWeight || 0},${formatPurity(cd.averagePurity)},${cd.totalItems || 0}\n`; });
        csv += '\n';
        Object.entries(data.categories).forEach(([cat, cd]) => { csv += purityCSV(cd.purities, cat); });
      } else {
        csv += `No ${metalType.toLowerCase()} data available\n\n`;
      }
      return csv;
    }
  };

  // ── Fetch sales data ────────────────────────────────────────────────────────
  const fetchSalesData = async (startDate = '', endDate = '') => {
    setLoading(prev => ({ ...prev, sales: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', formatDateForAPI(startDate));
      if (endDate)   params.append('endDate',   formatDateForAPI(endDate));
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

  const getTodayFormatted = () => formatDateForAPI(formatDateObjectForDisplay(new Date()));
  const [dateRange, setDateRange] = useState({ startDate: getTodayFormatted(), endDate: getTodayFormatted() });

  useEffect(() => { fetchSalesData(dateRange.startDate, dateRange.endDate); }, []);
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) fetchSalesData(dateRange.startDate, dateRange.endDate);
    else fetchSalesData();
  }, [dateRange]);

  const handleDateRangeChange = (type, value) => setDateRange(prev => ({ ...prev, [type]: value }));
  const handleQuickDateSelect = (period) => {
    const now = new Date();
    if (period === 'alltime') { setDateRange({ startDate: '', endDate: '' }); return; }
    let start = new Date();
    if      (period === 'week')    start.setDate(now.getDate() - 7);
    else if (period === 'month')   start.setMonth(now.getMonth() - 1);
    else if (period === '6months') start.setMonth(now.getMonth() - 6);
    else if (period === 'year')    start.setFullYear(now.getFullYear() - 1);
    setDateRange({
      startDate: formatDateForAPI(formatDateObjectForDisplay(start)),
      endDate:   formatDateForAPI(formatDateObjectForDisplay(now))
    });
  };

  // ── Sales PDF using pdfmake ─────────────────────────────────────────────────
  const generateSalesPDFReport = async (data, filename) => {
    try {
      if (!pdfMakeLoaded) await loadPdfMake();
      await loadGujaratiFont();
      const defaultFont = getBestFont();
      const content = [];

      content.push({ text: 'SALES REPORT', style: 'header', alignment: 'center' });
      if (data.dateRange) {
        content.push({
          text: `Period: ${data.dateRange.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start'} to ${data.dateRange.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End'}`,
          style: 'normal', alignment: 'center'
        });
      }
      content.push({ text: `Generated: ${formatDateObjectForDisplay(new Date())}`, style: 'normal', alignment: 'center' });
      content.push({ text: ' ', margin: [0, 8] });

      if (data.summary) {
        content.push({ text: 'EXECUTIVE SUMMARY', style: 'subheader' });
        content.push({ text: `Total Revenue: Rs ${(data.summary.totalRevenue || 0).toLocaleString()}`, style: 'normal' });
        content.push({ text: `Total Items Sold: ${data.summary.totalItems || 0}`, style: 'normal' });
        content.push({ text: `Average Sale Value: Rs ${data.summary.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}`, style: 'normal' });
        content.push({ text: ' ', margin: [0, 5] });
      }

      if (data.byMetal) {
        content.push({ text: 'METAL-WISE PERFORMANCE', style: 'subheader' });
        if (data.byMetal.gold?.totalRevenue > 0) {
          const goldItems = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'gold').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
          content.push({ text: 'Gold Sales:', style: 'sectionHeader' });
          content.push({ text: `Revenue: Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()} | Gross: ${data.byMetal.gold.totalWeight || 0}g | Pure: ${data.byMetal.gold.totalPureWeight || 0}g | Items: ${goldItems}`, style: 'normal' });
        }
        if (data.byMetal.silver?.totalRevenue > 0) {
          const silverItems = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'silver').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
          content.push({ text: 'Silver Sales:', style: 'sectionHeader' });
          content.push({ text: `Revenue: Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()} | Gross: ${data.byMetal.silver.totalWeight || 0}g | Pure: ${data.byMetal.silver.totalPureWeight || 0}g | Items: ${silverItems}`, style: 'normal' });
        }
        content.push({ text: ' ', margin: [0, 5] });
      }

      if (data.topPerformers?.length > 0) {
        content.push({ text: 'TOP REVENUE GENERATORS', style: 'subheader' });
        [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10).forEach((item, i) => {
          content.push({ text: `${i + 1}. ${item.metalType || 'N/A'} - ${item.category || 'N/A'} (${item.purity || 0}% purity)`, style: 'sectionHeader' });
          content.push({ text: `   Revenue: Rs ${(item.totalSalesAmount || 0).toLocaleString()} | Weight: ${item.totalGrossWeight || 0}g | Items: ${item.totalItems || 0}`, style: 'normal' });
        });
        content.push({ text: ' ', margin: [0, 5] });

        content.push({ text: 'TOP SOLD QUANTITY ITEMS', style: 'subheader' });
        [...data.topPerformers].sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0)).slice(0, 10).forEach((item, i) => {
          content.push({ text: `${i + 1}. ${item.metalType || 'N/A'} - ${item.category || 'N/A'} (${item.purity || 0}% purity)`, style: 'sectionHeader' });
          content.push({ text: `   Items Sold: ${item.totalItems || 0} | Revenue: Rs ${(item.totalSalesAmount || 0).toLocaleString()}`, style: 'normal' });
        });
        content.push({ text: ' ', margin: [0, 5] });
      }

      if (data.entries?.length > 0) {
        content.push({ text: 'RECENT SALES TRANSACTIONS', style: 'subheader' });
        data.entries.slice(0, 20).forEach((entry, i) => {
          content.push({ text: `${i + 1}. ${formatAPIDateForDisplay(entry.soldAt)} - ${entry.metalType || 'N/A'} ${entry.category || 'N/A'}`, style: 'sectionHeader' });
          content.push({ text: `   Purity: ${entry.purity || 0}% | Weight: ${entry.weight || 0}g | Price: Rs ${(entry.salesPrice || 0).toLocaleString()}`, style: 'normal' });
          const customer = [entry.customerName, entry.customerMobile, entry.customerAddress].filter(Boolean).join(', ');
          content.push({ text: `   Customer: ${customer || 'Not provided'}`, style: 'normal' });
        });
      }

      content.push({ text: ' ', margin: [0, 10] });
      content.push({ text: 'This report is system generated and contains confidential business information.', style: 'small' });
      content.push({ text: `Report ID: RPT-${Date.now()}`, style: 'small' });

      const docDefinition = {
        defaultStyle: { font: defaultFont, fontSize: 10 },
        styles: PDF_STYLES,
        content
      };
      const pdfBlob = await new Promise((resolve) => {
        window.pdfMake.createPdf(docDefinition).getBlob(resolve);
      });
      await downloadFile(pdfBlob, filename);
    } catch (error) {
      console.error('Sales PDF error:', error);
      throw new Error('Failed to generate PDF report');
    }
  };

  // ── Sales Excel ─────────────────────────────────────────────────────────────
  const generateSalesExcel = (data) => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ['SALES REPORT'], [''], ['EXECUTIVE SUMMARY'],
      ['Report Period', `${data.dateRange?.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start'} to ${data.dateRange?.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End'}`],
      ['Generated on', formatDateObjectForDisplay(new Date())], [''],
      ['Total Revenue',      `Rs ${(data.summary?.totalRevenue || 0).toLocaleString()}`],
      ['Total Items Sold',   `${data.summary?.totalItems || 0} items`],
      ['Average Sale Value', `Rs ${data.summary?.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}`],
      [''], ['METAL-WISE PERFORMANCE'], ['']
    ];
    if (data.byMetal?.gold?.totalRevenue > 0) {
      const gi = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'gold').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      summaryData.push(['Gold Sales', ''], ['Revenue', `Rs ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}`], ['Gross Weight', `${data.byMetal.gold.totalWeight || 0} grams`], ['Pure Weight', `${data.byMetal.gold.totalPureWeight || 0} grams`], ['Total Items Sold', `${gi} items`], ['']);
    }
    if (data.byMetal?.silver?.totalRevenue > 0) {
      const si = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'silver').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      summaryData.push(['Silver Sales', ''], ['Revenue', `Rs ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}`], ['Gross Weight', `${data.byMetal.silver.totalWeight || 0} grams`], ['Pure Weight', `${data.byMetal.silver.totalPureWeight || 0} grams`], ['Total Items Sold', `${si} items`], ['']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

    if (data.topPerformers?.length > 0) {
      const rd = [['TOP REVENUE GENERATORS'], [''], ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold']];
      [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10)
        .forEach((item, i) => rd.push([i + 1, item.metalType || 'N/A', item.category || 'N/A', item.purity || 0, `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`, item.totalGrossWeight || 0, item.totalPureWeight || 0, item.totalItems || 0]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rd), 'Top Revenue Generators');

      const qd = [['TOP SOLD QUANTITY ITEMS'], [''], ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Items Sold', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)']];
      [...data.topPerformers].sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0)).slice(0, 10)
        .forEach((item, i) => qd.push([i + 1, item.metalType || 'N/A', item.category || 'N/A', item.purity || 0, item.totalItems || 0, `Rs ${(item.totalSalesAmount || 0).toLocaleString()}`, item.totalGrossWeight || 0, item.totalPureWeight || 0]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qd), 'Top Sold Quantity');
    }

    if (data.entries?.length > 0) {
      const td = [['RECENT SALES TRANSACTIONS'], [''], ['#', 'Date', 'Metal Type', 'Category', 'Purity (%)', 'Weight (g)', 'Price', 'Quantity', 'Customer Name', 'Customer Mobile', 'Customer Address']];
      data.entries.slice(0, 20).forEach((entry, i) => td.push([
        i + 1, formatAPIDateForDisplay(entry.soldAt), entry.metalType || 'N/A', entry.category || 'N/A',
        entry.purity || 0, entry.weight || 0, `Rs ${(entry.salesPrice || 0).toLocaleString()}`,
        entry.isBulk ? `${entry.itemCount || 1} items (Bulk)` : '1 item',
        entry.customerName || 'Not provided', entry.customerMobile || 'Not provided', entry.customerAddress || 'Not provided'
      ]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(td), 'Recent Transactions');
    }
    return wb;
  };

  const formatSalesDataForCSV = (data) => {
    let csv = '\uFEFFSALES REPORT\n\nEXECUTIVE SUMMARY\n';
    csv += `Report Period,${data.dateRange?.startDate ? formatAPIDateForDisplay(data.dateRange.startDate) : 'Start'} to ${data.dateRange?.endDate ? formatAPIDateForDisplay(data.dateRange.endDate) : 'End'}\n`;
    csv += `Generated on,${formatDateObjectForDisplay(new Date())}\n\nTotal Revenue,Rs ${(data.summary?.totalRevenue || 0).toLocaleString()}\nTotal Items Sold,${data.summary?.totalItems || 0} items\n\n`;
    if (data.topPerformers?.length > 0) {
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
      const wb   = generateSalesExcel(data);
      const date = new Date();
      const d    = `${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${date.getFullYear()}`;
      await saveWorkbook(wb, `sales_report_${d}.xlsx`);
    } catch (error) {
      console.error('Excel Download Error:', error);
      alert('Error generating Excel file');
    }
  };

  // ── Fetch customers data ────────────────────────────────────────────────────
  const fetchCustomersData = async () => {
    setLoading(prev => ({ ...prev, customers: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      const params = new URLSearchParams();
      params.append('includeName',          customerFields.name.toString());
      params.append('includeAddress',       customerFields.address.toString());
      params.append('includeMobile',        customerFields.mobile.toString());
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

  const isValidValue = (value) =>
    value && value !== null && value !== undefined &&
    value !== '' && value !== 'N/A' && value !== 'null';

  const formatPurchaseItems = (transactions) => {
    if (!transactions || transactions.length === 0) return 'No purchases';
    const summary = transactions.reduce((acc, t) => {
      const key = `${t.metalType}-${t.category}`;
      if (!acc[key]) acc[key] = { metalType: t.metalType, category: t.category, count: 0, totalWeight: 0 };
      acc[key].count       += t.itemCount || 1;
      acc[key].totalWeight += t.weight    || 0;
      return acc;
    }, {});
    return Object.values(summary).map(i => `${i.count} ${i.metalType} ${i.category} (${i.totalWeight.toFixed(3)}g)`).join(', ');
  };

  // ── Customer PDF using pdfmake ──────────────────────────────────────────────
  const generateCustomerPDFReport = async (reportData, filename, selectedFields) => {
    if (!pdfMakeLoaded) await loadPdfMake();
    await loadGujaratiFont();
    const defaultFont = getBestFont();
    const content = [];

    content.push({ text: 'CUSTOMER REPORT', style: 'header', alignment: 'center' });
    content.push({ text: `Generated: ${new Date().toLocaleDateString('en-GB')}`, style: 'normal', alignment: 'center' });
    content.push({ text: ' ', margin: [0, 8] });

    if (reportData.customers?.length > 0) {
      let idx = 0;
      reportData.customers.forEach((customer) => {
        let valid = true;
        if (selectedFields.name          && !isValidValue(customer.customerName))    valid = false;
        if (selectedFields.mobile        && !isValidValue(customer.customerMobile))  valid = false;
        if (selectedFields.address       && !isValidValue(customer.customerAddress)) valid = false;
        if (selectedFields.purchaseAmount && (!isValidValue(customer.totalPurchaseAmount) || customer.totalPurchaseAmount <= 0)) valid = false;
        if (selectedFields.purchaseItems  && (!customer.transactions || customer.transactions.length === 0)) valid = false;
        if (!valid) return;
        idx++;
        const parts = [`${idx}.`];
        if (selectedFields.name)          parts.push(customer.customerName);
        if (selectedFields.mobile)        parts.push(customer.customerMobile);
        if (selectedFields.address)       parts.push(customer.customerAddress);
        if (selectedFields.purchaseAmount) parts.push(`Rs.${customer.totalPurchaseAmount}`);
        content.push({ text: parts.join(' | '), style: 'normal', margin: [0, 2] });
        if (selectedFields.purchaseItems && customer.transactions) {
          content.push({ text: `   Items: ${formatPurchaseItems(customer.transactions)}`, style: 'small', margin: [10, 0, 0, 3] });
        }
      });
    }

    const docDefinition = {
      defaultStyle: { font: defaultFont, fontSize: 10 },
      styles: PDF_STYLES,
      content
    };
    const pdfBlob = await new Promise((resolve) => {
      window.pdfMake.createPdf(docDefinition).getBlob(resolve);
    });
    await downloadFile(pdfBlob, filename);
  };

  // ── Customer Excel ──────────────────────────────────────────────────────────
  const generateCustomerExcelReport = async (reportData, filename, selectedFields) => {
    const XLSX = window.XLSX;
    const wb   = XLSX.utils.book_new();
    const headers = [];
    if (selectedFields.name)          headers.push('Customer Name');
    if (selectedFields.mobile)        headers.push('Mobile Number');
    if (selectedFields.address)       headers.push('Address');
    if (selectedFields.purchaseAmount) headers.push('Total Purchase Amount (₹)');
    if (selectedFields.purchaseItems) headers.push('Purchase Items Details');

    const rows = reportData.customers.filter(c => {
      if (selectedFields.name          && !isValidValue(c.customerName))    return false;
      if (selectedFields.mobile        && !isValidValue(c.customerMobile))  return false;
      if (selectedFields.address       && !isValidValue(c.customerAddress)) return false;
      if (selectedFields.purchaseAmount && (!isValidValue(c.totalPurchaseAmount) || c.totalPurchaseAmount <= 0)) return false;
      if (selectedFields.purchaseItems  && (!c.transactions || c.transactions.length === 0)) return false;
      return true;
    }).map(c => {
      const row = [];
      if (selectedFields.name)          row.push(c.customerName);
      if (selectedFields.mobile)        row.push(c.customerMobile);
      if (selectedFields.address)       row.push(c.customerAddress);
      if (selectedFields.purchaseAmount) row.push(c.totalPurchaseAmount);
      if (selectedFields.purchaseItems) row.push(formatPurchaseItems(c.transactions));
      return row;
    });

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = [];
    if (selectedFields.name)          colWidths.push({ wch: 25 });
    if (selectedFields.mobile)        colWidths.push({ wch: 15 });
    if (selectedFields.address)       colWidths.push({ wch: 30 });
    if (selectedFields.purchaseAmount) colWidths.push({ wch: 20 });
    if (selectedFields.purchaseItems) colWidths.push({ wch: 50 });
    sheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, sheet, 'Customer Report');
    await saveWorkbook(wb, filename);
  };

  const generateCustomerCSVReport = async (reportData, filename, selectedFields) => {
    const headers = [];
    if (selectedFields.name)          headers.push('Customer Name');
    if (selectedFields.mobile)        headers.push('Mobile Number');
    if (selectedFields.address)       headers.push('Address');
    if (selectedFields.purchaseAmount) headers.push('Total Purchase Amount (₹)');
    if (selectedFields.purchaseItems) headers.push('Purchase Items Details');
    let csv = '\uFEFF' + headers.join(',') + '\n';
    if (reportData.customers) {
      reportData.customers.filter(c => {
        if (selectedFields.name          && !isValidValue(c.customerName))    return false;
        if (selectedFields.mobile        && !isValidValue(c.customerMobile))  return false;
        if (selectedFields.address       && !isValidValue(c.customerAddress)) return false;
        if (selectedFields.purchaseAmount && (!isValidValue(c.totalPurchaseAmount) || c.totalPurchaseAmount <= 0)) return false;
        if (selectedFields.purchaseItems  && (!c.transactions || c.transactions.length === 0)) return false;
        return true;
      }).forEach(c => {
        const row = [];
        if (selectedFields.name)          row.push(`"${c.customerName}"`);
        if (selectedFields.mobile)        row.push(`"${c.customerMobile}"`);
        if (selectedFields.address)       row.push(`"${c.customerAddress}"`);
        if (selectedFields.purchaseAmount) row.push(c.totalPurchaseAmount);
        if (selectedFields.purchaseItems) row.push(`"${formatPurchaseItems(c.transactions)}"`);
        csv += row.join(',') + '\n';
      });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    await downloadFile(blob, filename.replace('.xlsx', '.csv'));
  };

  // ── Lifecycle ───────────────────────────────────────────────────────────────
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
              {Object.keys(stockData.gold.categories).length > 0 && (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">
                    Category Breakdown
                  </h4>
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
                  <div className="block md:hidden space-y-3 p-4">
                    {Object.entries(stockData.gold.categories).map(([category, data]) => (
                      <div key={category} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{category}</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p><p className="text-sm font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.averagePurity}%</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Gross Weight</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.grossWeight}g</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Pure Weight</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.pureWeight}g</p></div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Gross Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">{stockData.silver.totalGross} g</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Total Pure Weight</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">{stockData.silver.totalPure} g</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50 sm:col-span-2 lg:col-span-1">
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium mb-2">Average Purity</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">{stockData.silver.averagePurity}%</p>
                </div>
              </div>
              {Object.keys(stockData.silver.categories).length > 0 && (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">Category Breakdown</h4>
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
                  <div className="block md:hidden space-y-3 p-4">
                    {Object.entries(stockData.silver.categories).map(([category, data]) => (
                      <div key={category} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{category}</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p><p className="text-sm font-bold text-blue-600 dark:text-blue-400">{data.totalItems}</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.averagePurity}%</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Gross Weight</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.grossWeight}g</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Pure Weight</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.pureWeight}g</p></div>
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
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={renderLabel} labelLine={true}>
                              {data.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value.toFixed(2)}g`, 'Pure Weight']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {data.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200/50 dark:border-gray-600/50">
                            <div className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
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
              <button onClick={() => setDownloadModal({ open: true, type: 'stock-gold', data: stockData.gold })} className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]">
                <Download className="h-5 w-5" /><span>Download Gold Report</span>
              </button>
              <button onClick={() => setDownloadModal({ open: true, type: 'stock-silver', data: stockData.silver })} className="w-full bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]">
                <Download className="h-5 w-5" /><span>Download Silver Report</span>
              </button>
              <button onClick={() => setDownloadModal({ open: true, type: 'stock-full', data: stockData })} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]">
                <Download className="h-5 w-5" /><span>Download Full Inventory</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <p className="text-gray-500 dark:text-gray-400 text-lg text-center px-4">No stock data available</p>
          </div>
        )}
      </div>

      {/* Sales Report Section */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 md:mb-6">
            {['today','week','month','6months','year','alltime'].map((period, i) => (
              <button key={period} className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 font-medium px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" onClick={() => handleQuickDateSelect(period)}>
                {['Today','Last Week','Last Month','Last 6 Months','Last Year','All Time'][i]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
              <input type="date" value={dateRange.startDate} onChange={(e) => handleDateRangeChange('startDate', e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px]" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">End Date</label>
              <input type="date" value={dateRange.endDate} onChange={(e) => handleDateRangeChange('endDate', e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px]" />
            </div>
          </div>
        </div>
        {loading.sales ? (
          <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
        ) : salesData ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-green-200/50 dark:border-green-700/50">
                <p className="text-sm md:text-base text-green-700 dark:text-green-300 font-semibold mb-2">Total Revenue</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">₹{salesData.summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-blue-200/50 dark:border-blue-700/50">
                <p className="text-sm md:text-base text-blue-700 dark:text-blue-300 font-semibold mb-2">Total Items Sold</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">{salesData.summary.totalItems}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50 sm:col-span-2 lg:col-span-1">
                <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Avg Revenue/Item</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">₹{salesData.summary.averagePricePerItem.toLocaleString()}</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-200 mb-6 flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"></div>
                Daily Revenue Trend
              </h3>
              {salesData?.dailyRevenue?.length > 0 ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <div className="h-[250px] sm:h-[300px] md:h-[350px] overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={salesData.dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value) => { const date = new Date(value); return `${String(date.getDate()).padStart(2,'0')}/${date.toLocaleDateString('en-IN', { month: 'short' })}`; }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                        <Tooltip formatter={(value, name) => { if (name === 'revenue') return [`₹${value.toLocaleString('en-IN')}`, 'Revenue']; if (name === 'transactions') return [value, 'Transactions']; return [value, name]; }} labelFormatter={(label) => { const date = new Date(label); return `${date.toLocaleDateString('en-IN', { weekday: 'long' })}, ${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`; }} />
                        <Line type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2} dot={{ fill: '#1d4ed8', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400">No sales data available for the selected time period</p>
                </div>
              )}
            </div>

            {/* Metal-wise Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>Gold Sales</h4>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Revenue</p><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">₹{salesData.byMetal.gold.totalRevenue.toLocaleString()}</p></div>
                    <div><p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Gross Weight</p><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalWeight} g</p></div>
                    <div><p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Pure Weight</p><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalPureWeight} g</p></div>
                    <div><p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Sales Count</p><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalSalesCount}</p></div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>Silver Sales</h4>
                <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-600/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Revenue</p><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">₹{salesData.byMetal.silver.totalRevenue.toLocaleString()}</p></div>
                    <div><p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Gross Weight</p><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalWeight} g</p></div>
                    <div><p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Pure Weight</p><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalPureWeight} g</p></div>
                    <div><p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Sales Count</p><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalSalesCount}</p></div>
                  </div>
                </div>
              </div>
            </div>

            {salesData.topPerformers && salesData.topPerformers.length > 0 && (
              <div className="space-y-6 md:space-y-8">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>Top Revenue Generators</h4>
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
                  <div className="block md:hidden space-y-3 p-4">
                    {salesData.topPerformers.slice(0, 10).map((item, index) => (
                      <div key={index} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3 capitalize">{item.metalType} - {item.category}</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p><p className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.purity}%</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p><p className="text-sm font-bold text-green-600 dark:text-green-400">₹{item.totalSalesAmount.toLocaleString()}</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.totalGrossWeight} g</p></div>
                          <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.totalItems}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {salesData.topQuantityItems && salesData.topQuantityItems.length > 0 && (
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>Top Sold Quantity Items</h4>
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
                    <div className="block md:hidden space-y-3 p-4">
                      {salesData.topQuantityItems.slice(0, 10).map((item, index) => (
                        <div key={index} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                          <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3 capitalize">{item.metalType} - {item.category}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p><p className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.purity}%</p></div>
                            <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantity</p><p className="text-sm font-bold text-purple-600 dark:text-purple-400">{item.totalItems}</p></div>
                            <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.totalGrossWeight} g</p></div>
                            <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{item.totalSalesAmount.toLocaleString()}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>Gold Weight Leaders</h4>
                    {salesData.goldWeightLeaders && salesData.goldWeightLeaders.length > 0 ? (
                      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
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
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">No gold weight data available</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>Silver Weight Leaders</h4>
                    {salesData.silverWeightLeaders && salesData.silverWeightLeaders.length > 0 ? (
                      <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 overflow-hidden">
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

            <div className="flex flex-col gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <button onClick={() => setDownloadModal({ open: true, type: 'sales', data: salesData })} className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]">
                <Download className="h-5 w-5" /><span>Download Sales Report</span>
              </button>
              <label className="flex items-center justify-center gap-3 cursor-pointer p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
                <input type="checkbox" checked={includeEntries} onChange={(e) => setIncludeEntries(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
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
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl mb-6 md:mb-8 border border-purple-200/50 dark:border-purple-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-800 dark:text-purple-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>Select Fields to Include</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {Object.entries(customerFields).map(([field, checked]) => (
              <label key={field} className="flex items-center gap-2 cursor-pointer group p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
                <input type="checkbox" checked={checked} onChange={(e) => setCustomerFields(prev => ({ ...prev, [field]: e.target.checked }))} className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <span className="text-sm font-semibold capitalize text-gray-700 group-hover:text-gray-900 transition-colors duration-200 dark:text-gray-300 dark:group-hover:text-gray-100">
                  {field === 'purchaseAmount' ? 'Purchase Amount' : field === 'purchaseItems' ? 'Purchase Items' : field}
                </span>
              </label>
            ))}
          </div>
        </div>
        {loading.customers ? (
          <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
        ) : customersData ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
                <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Total Customers</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">{customersData.totalCustomers}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
                <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Total Revenue</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">₹{customersData.summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
                <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Avg Customer Value</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">₹{customersData.summary.averageCustomerValue.toLocaleString()}</p>
              </div>
            </div>
            {customersData.customers.length > 0 && (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>Customer List</h4>
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm md:text-base min-w-[700px]">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                        <tr>
                          {customerFields.name && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Name</th>}
                          {customerFields.mobile && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Mobile</th>}
                          {customerFields.address && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Address</th>}
                          {customerFields.purchaseAmount && (<><th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Total Purchase</th><th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Transactions</th><th className="text-right p-4 font-semibold text-gray-900 dark:text-gray-100">Avg Purchase</th></>)}
                          {customerFields.purchaseItems && <th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Purchase Items</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {customersData.customers.slice(0, 50).map((customer, index) => (
                          <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-200">
                            {customerFields.name && <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">{customer.customerName || 'N/A'}</td>}
                            {customerFields.mobile && <td className="p-4 text-gray-900 dark:text-gray-100">{customer.customerMobile || 'N/A'}</td>}
                            {customerFields.address && <td className="p-4 text-gray-900 dark:text-gray-100">{customer.customerAddress || 'N/A'}</td>}
                            {customerFields.purchaseAmount && (<><td className="p-4 text-right font-bold text-purple-600 dark:text-purple-400">₹{customer.totalPurchaseAmount?.toLocaleString() || 0}</td><td className="p-4 text-right text-gray-700 dark:text-gray-300">{customer.transactionCount || 0}</td><td className="p-4 text-right font-semibold text-gray-700 dark:text-gray-300">₹{customer.averagePurchaseValue?.toLocaleString() || 0}</td></>)}
                            {customerFields.purchaseItems && (
                              <td className="p-4">
                                <div className="max-w-xs">
                                  {customer.purchaseItems && customer.purchaseItems.length > 0 ? (
                                    <div className="space-y-1">{customer.purchaseItems.map((item, itemIndex) => (<div key={itemIndex} className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-2 rounded-lg border border-purple-200/50 dark:border-purple-700/50 text-purple-700 dark:text-purple-300">{item}</div>))}</div>
                                  ) : (<span className="text-gray-500 dark:text-gray-400">No items</span>)}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="block md:hidden space-y-3 p-4">
                  {customersData.customers.slice(0, 50).map((customer, index) => (
                    <div key={index} className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                      <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{customer.customerName || 'Unknown Customer'}</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {customerFields.mobile && <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Mobile</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{customer.customerMobile || 'N/A'}</p></div>}
                        {customerFields.purchaseAmount && <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Purchase</p><p className="text-sm font-bold text-purple-600 dark:text-purple-400">₹{customer.totalPurchaseAmount?.toLocaleString() || 0}</p></div>}
                        {customerFields.purchaseAmount && <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Transactions</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{customer.transactionCount || 0}</p></div>}
                        {customerFields.purchaseAmount && <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Avg Purchase</p><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{customer.averagePurchaseValue?.toLocaleString() || 0}</p></div>}
                      </div>
                      {customerFields.address && <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50"><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Address</p><p className="text-sm text-gray-700 dark:text-gray-300">{customer.customerAddress || 'N/A'}</p></div>}
                      {customerFields.purchaseItems && customer.purchaseItems && customer.purchaseItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">Purchase Items</p>
                          <div className="flex flex-wrap gap-1">
                            {customer.purchaseItems.slice(0, 3).map((item, itemIndex) => (<div key={itemIndex} className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm px-2 py-1 rounded-lg border border-purple-200/50 dark:border-purple-700/50 text-purple-700 dark:text-purple-300">{item}</div>))}
                            {customer.purchaseItems.length > 3 && <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-400">+{customer.purchaseItems.length - 3} more</div>}
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
            <div className="flex flex-col gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <button onClick={() => setDownloadModal({ open: true, type: 'customers', data: customersData })} className="w-full bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 min-h-[48px]">
                <Download className="h-5 w-5" /><span>Download Customer List</span>
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
      <Modal isOpen={downloadModal.open} onClose={() => setDownloadModal({ open: false, type: '', data: null })} title="Download Report">
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
            <button onClick={() => handleDownload(downloadModal.type, 'pdf')} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />Download PDF
            </button>
            <button onClick={() => handleDownload(downloadModal.type, 'excel')} className="flex-1 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />Download Excel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  </div>
);  

};

export default ReportPage;