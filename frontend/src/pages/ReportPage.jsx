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


// ── jsPDF font loader
let jsPDFFontLoaded = false;
let jsPDFFontLoadPromise = null;

const loadJsPDFFont = () => {
  if (jsPDFFontLoaded) return Promise.resolve();
  if (jsPDFFontLoadPromise) return jsPDFFontLoadPromise;

  jsPDFFontLoadPromise = (async () => {
    try {
      const resp = await fetch('/fonts/NotoSansAllIndic.ttf');
      if (!resp.ok) throw new Error(`Font fetch failed: ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      // Store globally so we only fetch once
      window._notoSansBase64 = base64;
      jsPDFFontLoaded = true;
      console.log('NotoSans font loaded for jsPDF');
    } catch (e) {
      console.warn('Font load failed:', e.message);
      jsPDFFontLoadPromise = null;
    }
  })();

  return jsPDFFontLoadPromise;
};

// ── Create a jsPDF instance with NotoSans font embedded
const createJsPDF = async () => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  if (window._notoSansBase64) {
    doc.addFileToVFS('NotoSansAllIndic.ttf', window._notoSansBase64);
    doc.addFont('NotoSansAllIndic.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
  }
  return doc;
};

// ── Gujarati/Indic script detector
const hasIndicScript = (str) => {
  if (!str) return false;
  return /[\u0A80-\u0AFF\u0900-\u097F]/.test(str);
};

// ── Transliterate Gujarati/Hindi to Latin for PDF safety
const transliterateGujarati = (str) => {
  if (!str || !hasIndicScript(str)) return str;
  const map = {
    'ક્ષ':'ksh','જ્ઞ':'gn',
    'અ':'a','આ':'aa','ઇ':'i','ઈ':'ii','ઉ':'u','ઊ':'uu',
    'એ':'e','ઐ':'ai','ઓ':'o','ઔ':'au','ઋ':'ru',
    'ક':'k','ખ':'kh','ગ':'g','ઘ':'gh','ઙ':'ng',
    'ચ':'ch','છ':'chh','જ':'j','ઝ':'jh','ઞ':'ny',
    'ટ':'t','ઠ':'th','ડ':'d','ઢ':'dh','ણ':'n',
    'ત':'t','થ':'th','દ':'d','ધ':'dh','ન':'n',
    'પ':'p','ફ':'ph','બ':'b','ભ':'bh','મ':'m',
    'ય':'y','ર':'r','લ':'l','વ':'v',
    'શ':'sh','ષ':'sh','સ':'s','હ':'h','ળ':'l',
    'ા':'aa','િ':'i','ી':'ii','ુ':'u','ૂ':'uu',
    'ે':'e','ૈ':'ai','ો':'o','ૌ':'au','ૃ':'ru',
    'ં':'n','ઃ':'h','્':'','ઁ':'n',
    '૦':'0','૧':'1','૨':'2','૩':'3','૪':'4',
    '૫':'5','૬':'6','૭':'7','૮':'8','૯':'9',
    'क':'k','ख':'kh','ग':'g','घ':'gh','च':'ch',
    'छ':'chh','ज':'j','झ':'jh','ट':'t','ठ':'th',
    'ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th',
    'द':'d','ध':'dh','न':'n','प':'p','फ':'ph',
    'ब':'b','भ':'bh','म':'m','य':'y','र':'r',
    'ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
    'ा':'aa','ि':'i','ी':'ii','ु':'u','ू':'uu',
    'े':'e','ै':'ai','ो':'o','ौ':'au','ं':'n','ः':'h','्':'',
    'अ':'a','आ':'aa','इ':'i','ई':'ii','उ':'u','ऊ':'uu',
    'ए':'e','ऐ':'ai','ओ':'o','औ':'au',
    '०':'0','१':'1','२':'2','३':'3','४':'4',
    '५':'5','६':'6','७':'7','८':'8','९':'9',
  };
  let result = str;
  Object.entries(map).forEach(([gu, lat]) => {
    result = result.split(gu).join(lat);
  });
  return result;
};

// ── Safe text for PDF (just null guard, keep all Unicode as-is)
const safePdfText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// ── jsPDF document writer helper
// Renders a content array (same shape as before) into a jsPDF doc
const renderContentToJsPDF = (doc, content, startY = 15) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth  = doc.internal.pageSize.getWidth();
  const margin     = 15;
  const maxWidth   = pageWidth - margin * 2;
  let y = startY;

  const checkNewPage = (needed = 8) => {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  };

  const STYLES = {
    header:        { fontSize: 16, fontStyle: 'bold',   gap: 8  },
    subheader:     { fontSize: 12, fontStyle: 'bold',   gap: 6  },
    sectionHeader: { fontSize: 10, fontStyle: 'bold',   gap: 4  },
    normal:        { fontSize: 10, fontStyle: 'normal', gap: 3  },
    small:         { fontSize: 9,  fontStyle: 'normal', gap: 2  },
  };

  content.forEach(item => {
    if (!item) return;

    // Spacer
    if (typeof item === 'object' && item.text === ' ') {
      y += item.margin?.[3] || 4;
      return;
    }

    const text  = safePdfText(typeof item === 'string' ? item : item.text);
    if (!text.trim()) { y += 3; return; }

    const styleName = item.style || 'normal';
    const s = STYLES[styleName] || STYLES.normal;

    doc.setFontSize(s.fontSize);
    // jsPDF doesn't support bold for custom fonts — use size difference instead
    // (NotoSans TTF is one weight; bold is simulated via fontSize bump)
    if (s.fontStyle === 'bold') doc.setFontSize(s.fontSize + 0.5);

    const align     = item.alignment || 'left';
    const leftMargin = margin + (item.margin?.[0] || 0);
    const lines     = doc.splitTextToSize(text, maxWidth - (item.margin?.[0] || 0));

    checkNewPage(lines.length * (s.fontSize * 0.4 + 1) + s.gap);

    lines.forEach(line => {
      checkNewPage(s.fontSize * 0.4 + 2);
      if (align === 'center') {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
      } else {
        doc.text(line, leftMargin, y);
      }
      y += s.fontSize * 0.4 + 1;
    });
    y += s.gap * 0.3;
  });

  return y;
};

// ── Date helpers
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
// ── Indian number format (e.g. 10,00,000)
const formatIndianNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const n = Math.round(Number(num));
  const s = n.toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
};

// ── Platform helpers
const isCapacitorApp = () =>
  typeof window !== 'undefined' &&
  typeof window.Capacitor !== 'undefined' &&
  window.Capacitor.isNativePlatform?.();
const isInIframe = () => {
  try { return window.self !== window.top; } catch (e) { return true; }
};

// ── Universal download helper
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

// ── Save XLSX workbook
const saveWorkbook = async (wb, filename) => {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  await downloadFile(blob, filename);
};


const ReportPage = () => {
  const { user } = useAuth();
  const [stockData, setStockData]         = useState(null);
  const [salesData, setSalesData]         = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [loading, setLoading]             = useState({ stock: false, sales: false, customers: false });
  const [customerFields, setCustomerFields] = useState({
    name: true, address: false, mobile: false,
    purchaseAmount: true, purchaseItems: true
  });
  const [downloadModal, setDownloadModal] = useState({ open: false, type: '', data: null });
  const [categoryData, setCategoryData]   = useState({ gold: [], silver: [] });
  const [includeEntries, setIncludeEntries] = useState(false);
  const [error, setError]                 = useState('');
  const [pieExpanded, setPieExpanded] = useState({});
  const [actualDateRange, setActualDateRange] = useState({ startDate: '', endDate: '' });


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

  // ── Init
  useEffect(() => {
    loadJsPDFFont().catch(err => {
      console.error('Failed to load font:', err);
    });
  }, []);

  // ── Fetch stock data
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
            grossWeight:   grossWeight   || 0,
            pureWeight:    pureWeight    || 0,
            totalItems:    totalItems    || 0,
            averagePurity: averagePurity.toFixed(2),
            purities:      purities      || {}
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

  // ── Filename helper
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

  // ── Handle download
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

  // ── Report title helper
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

  // ── Format purity safely
  const formatPurity = (p) => {
    if (p === null || p === undefined || p === '' || isNaN(Number(p))) return '0.00';
    const num = Number(p);
    return num.toFixed(2);
  };

  // ── Build stock PDF content array for pdfmake
  // KEY FIX: For silver/gold single reports, data comes as stockData.silver or stockData.gold
  // which has: totalGross, totalPure, averagePurity, categories (keyed by displayName)
  // For full report, data comes as the full stockData object with gold{} and silver{} nested.
  const buildStockPDFContent = (content, data, reportType) => {

    // Strip _gold / _silver suffix from category key for display
    const displayCatName = (key) => String(key || '').replace(/_gold$/, '').replace(/_silver$/, '').trim();
  
    const addCategoryRows = (cats) => {
      if (!cats || cats.length === 0) {
        content.push({ text: 'No category data available.', style: 'normal' });
        return;
      }
      cats.forEach(([key, cd]) => {
        if (!cd) return;
        const name = displayCatName(key);
        content.push({ text: name, style: 'sectionHeader' });
        content.push({
          text: `Gross: ${cd.grossWeight || 0}g  |  Pure: ${cd.pureWeight || 0}g  |  Purity: ${formatPurity(cd.averagePurity)}%  |  Items: ${cd.totalItems || 0}`,
          style: 'normal',
          margin: [10, 0, 0, 2]
        });
        if (cd.purities && Object.keys(cd.purities).length > 0) {
          Object.entries(cd.purities).forEach(([purity, pd]) => {
            if (!pd || !pd.totalItems || pd.totalItems <= 0) return;
            content.push({
              text: `    ${purity}%: Gross ${pd.grossWeight || 0}g, Pure ${pd.pureWeight || 0}g, Items ${pd.totalItems || 0}`,
              style: 'small',
              margin: [20, 0, 0, 1]
            });
          });
        }
      });
    };
  
    if (reportType === 'stock-full') {
      // Full report shape: { totalGoldGross, totalGoldPure, goldAveragePurity,
      //                      totalSilverGross, totalSilverPure, silverAveragePurity,
      //                      categories: { "name_gold": {...}, "name_silver": {...} } }
      const allCats    = data.categories || {};
      const goldCats   = Object.entries(allCats).filter(([k]) => k.endsWith('_gold'));
      const silverCats = Object.entries(allCats).filter(([k]) => k.endsWith('_silver'));
  
      content.push({ text: 'GOLD INVENTORY SUMMARY', style: 'subheader' });
      content.push({ text: `Total Gross Weight: ${data.totalGoldGross || 0} g`,         style: 'normal' });
      content.push({ text: `Total Pure Weight: ${data.totalGoldPure || 0} g`,           style: 'normal' });
      content.push({ text: `Average Purity: ${formatPurity(data.goldAveragePurity)}%`,  style: 'normal' });
      content.push({ text: 'GOLD CATEGORY BREAKDOWN:', style: 'subheader' });
      addCategoryRows(goldCats);
  
      content.push({ text: ' ', margin: [0, 8] });
  
      content.push({ text: 'SILVER INVENTORY SUMMARY', style: 'subheader' });
      content.push({ text: `Total Gross Weight: ${data.totalSilverGross || 0} g`,         style: 'normal' });
      content.push({ text: `Total Pure Weight: ${data.totalSilverPure || 0} g`,           style: 'normal' });
      content.push({ text: `Average Purity: ${formatPurity(data.silverAveragePurity)}%`,  style: 'normal' });
      content.push({ text: 'SILVER CATEGORY BREAKDOWN:', style: 'subheader' });
      addCategoryRows(silverCats);
  
    } else {
      // Single metal shape: { totalGross, totalPure, averagePurity,
      //                       categories: { "name_gold": {...} } or { "name_silver": {...} } }
      const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
      const cats      = Object.entries(data.categories || {});
  
      content.push({ text: `${metalType} INVENTORY SUMMARY`, style: 'subheader' });
      content.push({ text: `Total Gross Weight: ${data.totalGross || 0} g`,          style: 'normal' });
      content.push({ text: `Total Pure Weight: ${data.totalPure || 0} g`,            style: 'normal' });
      content.push({ text: `Average Purity: ${formatPurity(data.averagePurity)}%`,   style: 'normal' });
      content.push({ text: `${metalType} CATEGORY BREAKDOWN:`, style: 'subheader' });
  
      if (cats.length > 0) {
        addCategoryRows(cats);
      } else {
        content.push({ text: `No ${metalType.toLowerCase()} category data available.`, style: 'normal' });
      }
    }
  };

// ── Generate stock/inventory PDF using jsPDF
const generatePDFFromData = async (data, reportType, filename) => {
  try {
    await loadJsPDFFont();
    const doc = await createJsPDF();
    const content = [];
    content.push({ text: getReportTitle(reportType), style: 'header', alignment: 'center' });
    content.push({ text: `Generated on: ${new Date().toLocaleDateString('en-GB')}`, style: 'normal', alignment: 'center' });
    content.push({ text: ' ', margin: [0, 0, 0, 6] });
    buildStockPDFContent(content, data, reportType);
    renderContentToJsPDF(doc, content);
    const pdfBlob = doc.output('blob');
    await downloadFile(pdfBlob, filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('PDF generation failed. Please try downloading as Excel format instead.');
    throw error;
  }
};

  // ── Excel from data
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

  // ── Multi-sheet Excel
  const generateMultiSheetExcel = async (data, filename) => {
    try {
      if (typeof XLSX === 'undefined') { await generateFallbackCSV(data, filename); return; }
      const fmtPurity = (p) => formatPurity(p);
      const formatDate = (ds) => {
        if (!ds) return 'N/A';
        const d = new Date(ds);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      };
  
      // Full report shape: flat object with totalGoldGross etc. + categories keyed by _gold/_silver
      const allCats    = data.categories || {};
      const goldCats   = Object.entries(allCats).filter(([k]) => k.endsWith('_gold'));
      const silverCats = Object.entries(allCats).filter(([k]) => k.endsWith('_silver'));
  
      // Build gold-shaped object for sheet generator
      const goldData = {
        totalGross:    data.totalGoldGross    || 0,
        totalPure:     data.totalGoldPure     || 0,
        averagePurity: data.goldAveragePurity || 0,
      };
      const silverData = {
        totalGross:    data.totalSilverGross    || 0,
        totalPure:     data.totalSilverPure     || 0,
        averagePurity: data.silverAveragePurity || 0,
      };
  
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,
        XLSX.utils.aoa_to_sheet(generateGoldSheetData(goldData, goldCats, formatDate, fmtPurity)),
        'Gold Inventory'
      );
      XLSX.utils.book_append_sheet(wb,
        XLSX.utils.aoa_to_sheet(generateSilverSheetData(silverData, silverCats, formatDate, fmtPurity)),
        'Silver Inventory'
      );
      await saveWorkbook(wb, filename);
    } catch (error) {
      console.error('Multi-sheet Excel error:', error);
      await generateFallbackCSV(data, filename);
    }
  };

// Helper to strip _gold/_silver suffix for display
const stripMetalSuffix = (key) => String(key || '').replace(/_gold$/, '').replace(/_silver$/, '').trim();

const generateGoldSheetData = (data, goldCategories, formatDate, fmtPurity) => {
  const rows = [
    ['GOLD INVENTORY REPORT'],
    [`Generated on: ${formatDate(new Date().toISOString())}`],
    [],
    ['GOLD INVENTORY SUMMARY'],
    ['Metric', 'Value'],
    ['Total Gross Weight (g)', data.totalGross    || 0],
    ['Total Pure Weight (g)',  data.totalPure     || 0],
    ['Average Purity (%)',     data.averagePurity || 0],
    []
  ];
  if (goldCategories.length > 0) {
    rows.push(['GOLD CATEGORY BREAKDOWN'], ['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
    goldCategories.forEach(([key, cd]) => rows.push([stripMetalSuffix(key), cd.grossWeight || 0, cd.pureWeight || 0, fmtPurity(cd.averagePurity || 0), cd.totalItems || 0]));
    rows.push([]);
    goldCategories.forEach(([key, cd]) => {
      if (cd.purities && Object.keys(cd.purities).length > 0) {
        rows.push([`${stripMetalSuffix(key)} - Purity Breakdown`], ['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
        Object.entries(cd.purities).forEach(([p, pd]) => { if (pd.totalItems > 0) rows.push([p, pd.grossWeight || 0, pd.pureWeight || 0, pd.totalItems || 0]); });
        rows.push([]);
      }
    });
    const total = data.totalPure || 0;
    if (total > 0) {
      rows.push(['GOLD CATEGORY DISTRIBUTION (By Pure Weight)'], ['Category', 'Pure Weight (g)', 'Percentage (%)']);
      goldCategories.forEach(([key, cd]) => { if (cd.pureWeight > 0) rows.push([stripMetalSuffix(key), cd.pureWeight, Math.round((cd.pureWeight / total) * 10000) / 100]); });
      rows.push([]);
    }
  } else {
    rows.push(['GOLD CATEGORY BREAKDOWN'], ['No gold category data available'], []);
  }
  return rows;
};

const generateSilverSheetData = (data, silverCategories, formatDate, fmtPurity) => {
  const rows = [
    ['SILVER INVENTORY REPORT'],
    [`Generated on: ${formatDate(new Date().toISOString())}`],
    [],
    ['SILVER INVENTORY SUMMARY'],
    ['Metric', 'Value'],
    ['Total Gross Weight (g)', data.totalGross    || 0],
    ['Total Pure Weight (g)',  data.totalPure     || 0],
    ['Average Purity (%)',     data.averagePurity || 0],
    []
  ];
  if (silverCategories.length > 0) {
    rows.push(['SILVER CATEGORY BREAKDOWN'], ['Category', 'Gross Weight (g)', 'Pure Weight (g)', 'Average Purity (%)', 'Total Items']);
    silverCategories.forEach(([key, cd]) => rows.push([stripMetalSuffix(key), cd.grossWeight || 0, cd.pureWeight || 0, fmtPurity(cd.averagePurity || 0), cd.totalItems || 0]));
    rows.push([]);
    silverCategories.forEach(([key, cd]) => {
      if (cd.purities && Object.keys(cd.purities).length > 0) {
        rows.push([`${stripMetalSuffix(key)} - Purity Breakdown`], ['Purity (%)', 'Gross Weight (g)', 'Pure Weight (g)', 'Items']);
        Object.entries(cd.purities).forEach(([p, pd]) => { if (pd.totalItems > 0) rows.push([p, pd.grossWeight || 0, pd.pureWeight || 0, pd.totalItems || 0]); });
        rows.push([]);
      }
    });
    const total = data.totalPure || 0;
    if (total > 0) {
      rows.push(['SILVER CATEGORY DISTRIBUTION (By Pure Weight)'], ['Category', 'Pure Weight (g)', 'Percentage (%)']);
      silverCategories.forEach(([key, cd]) => { if (cd.pureWeight > 0) rows.push([stripMetalSuffix(key), cd.pureWeight, Math.round((cd.pureWeight / total) * 10000) / 100]); });
      rows.push([]);
    }
  } else {
    rows.push(['SILVER CATEGORY BREAKDOWN'], ['No silver category data available'], []);
  }
  return rows;
};

  const generateFallbackCSV = async (data, filename) => {
    const csvContent = formatStockDataForCSV(data, 'stock-full');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    await downloadFile(blob, filename.replace('.xlsx', '.csv'));
  };

  const formatStockDataForCSV = (data, reportType) => {
    const fmtPurity = (p) => formatPurity(p);
    const stripSuffix = (key) => String(key || '').replace(/_gold$/, '').replace(/_silver$/, '').trim();
    const purityCSV = (purities, displayName, metal = '') => {
      if (!purities || Object.keys(purities).length === 0)
        return `${metal ? metal + ' - ' : ''}${displayName} - Purity Breakdown,No purity data\n`;
      let csv = `${metal ? metal + ' - ' : ''}${displayName} - Purity Breakdown\nPurity (%),Gross Weight (g),Pure Weight (g),Items\n`;
      Object.entries(purities).forEach(([p, pd]) => { if (pd.totalItems > 0) csv += `${p},${pd.grossWeight || 0},${pd.pureWeight || 0},${pd.totalItems || 0}\n`; });
      return csv + '\n';
    };
    const today = new Date().toLocaleDateString('en-GB');
  
    if (reportType === 'stock-full') {
      const allCats    = data.categories || {};
      const goldCats   = Object.entries(allCats).filter(([k]) => k.endsWith('_gold'));
      const silverCats = Object.entries(allCats).filter(([k]) => k.endsWith('_silver'));
  
      let csv = `\uFEFFCOMPLETE INVENTORY REPORT\nGenerated on: ${today}\n\n`;
      csv += `GOLD INVENTORY SUMMARY\nMetric,Value\nTotal Gross Weight (g),${data.totalGoldGross || 0}\nTotal Pure Weight (g),${data.totalGoldPure || 0}\nAverage Purity (%),${data.goldAveragePurity || 0}\n\n`;
      if (goldCats.length > 0) {
        csv += 'GOLD CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
        goldCats.forEach(([key, cd]) => { csv += `${stripSuffix(key)},${cd.grossWeight || 0},${cd.pureWeight || 0},${fmtPurity(cd.averagePurity)},${cd.totalItems || 0}\n`; });
        csv += '\n';
        goldCats.forEach(([key, cd]) => { csv += purityCSV(cd.purities, stripSuffix(key), 'Gold'); });
      }
      csv += `SILVER INVENTORY SUMMARY\nMetric,Value\nTotal Gross Weight (g),${data.totalSilverGross || 0}\nTotal Pure Weight (g),${data.totalSilverPure || 0}\nAverage Purity (%),${data.silverAveragePurity || 0}\n\n`;
      if (silverCats.length > 0) {
        csv += 'SILVER CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n';
        silverCats.forEach(([key, cd]) => { csv += `${stripSuffix(key)},${cd.grossWeight || 0},${cd.pureWeight || 0},${fmtPurity(cd.averagePurity)},${cd.totalItems || 0}\n`; });
        csv += '\n';
        silverCats.forEach(([key, cd]) => { csv += purityCSV(cd.purities, stripSuffix(key), 'Silver'); });
      }
      return csv;
    } else {
      // Single metal — data is flat: { totalGross, totalPure, averagePurity, categories }
      const metalType = reportType === 'stock-gold' ? 'GOLD' : 'SILVER';
      const cats      = Object.entries(data.categories || {});
      let csv = `\uFEFF${metalType} INVENTORY REPORT\nGenerated on: ${today}\n\n`;
      csv += `${metalType} INVENTORY SUMMARY\nMetric,Value\nTotal Gross Weight (g),${data.totalGross || 0}\nTotal Pure Weight (g),${data.totalPure || 0}\nAverage Purity (%),${data.averagePurity || 0}\n\n`;
      if (cats.length > 0) {
        csv += `${metalType} CATEGORY BREAKDOWN\nCategory,Gross Weight (g),Pure Weight (g),Average Purity (%),Total Items\n`;
        cats.forEach(([key, cd]) => { csv += `${stripSuffix(key)},${cd.grossWeight || 0},${cd.pureWeight || 0},${fmtPurity(cd.averagePurity)},${cd.totalItems || 0}\n`; });
        csv += '\n';
        cats.forEach(([key, cd]) => { csv += purityCSV(cd.purities, stripSuffix(key)); });
      } else {
        csv += `No ${metalType.toLowerCase()} data available\n\n`;
      }
      return csv;
    }
  };

  // ── Fetch sales data
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
      const report = response.data.salesReport;
      setSalesData(report);
      console.log('dateRange from backend:', report?.dateRange);
console.log('dailyRevenue length:', report?.dailyRevenue?.length);
      // Capture actual date range returned by backend (important for all-time)
      if (report?.dateRange) {
        setActualDateRange({
          startDate: report.dateRange.startDate || '',
          endDate:   report.dateRange.endDate   || ''
        });
      }
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

// ── Sales PDF using jsPDF
const generateSalesPDFReport = async (data, filename) => {
  try {
    await loadJsPDFFont();
    const doc = await createJsPDF();
    const content = [];
    content.push({ text: 'SALES REPORT', style: 'header', alignment: 'center' });
    // Resolve display dates — prefer data.dateRange (from backend), fallback to actualDateRange
    const pdfStart = data.dateRange?.startDate || actualDateRange.startDate;
    const pdfEnd   = data.dateRange?.endDate   || actualDateRange.endDate;
    content.push({
      text: `Period: ${pdfStart ? formatAPIDateForDisplay(pdfStart) : 'All Time (Start)'} to ${pdfEnd ? formatAPIDateForDisplay(pdfEnd) : 'All Time (End)'}`,
      style: 'normal', alignment: 'center'
    });
    content.push({ text: `Generated: ${formatDateObjectForDisplay(new Date())}`, style: 'normal', alignment: 'center' });
    content.push({ text: ' ', margin: [0, 0, 0, 6] });
    if (data.summary) {
      content.push({ text: 'EXECUTIVE SUMMARY', style: 'subheader' });
      content.push({ text: `Total Revenue: Rs. ${(data.summary.totalRevenue || 0).toLocaleString()}`, style: 'normal' });
      content.push({ text: `Total Items Sold: ${data.summary.totalItems || 0}`, style: 'normal' });
      content.push({ text: `Average Sale Value: Rs. ${data.summary.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}`, style: 'normal' });
      // Avg sales per day stats
      const pdfActiveDays = data.dailyRevenue?.length > 0 ? data.dailyRevenue.length : 1;
      const pdfAvgActive  = Math.round(data.summary.totalRevenue / pdfActiveDays);
      let pdfAllDaysCount = pdfActiveDays;
      if (pdfStart && pdfEnd) {
        const diff = Math.round((new Date(pdfEnd) - new Date(pdfStart)) / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) pdfAllDaysCount = diff;
      }
      const pdfAvgAll = pdfAllDaysCount > 0 ? Math.round(data.summary.totalRevenue / pdfAllDaysCount) : 0;
      content.push({ text: `Avg Sales/Day (Active ${pdfActiveDays} days): Rs. ${pdfAvgActive.toLocaleString()}`, style: 'normal' });
      if (pdfAllDaysCount !== pdfActiveDays) {
        content.push({ text: `Avg Sales/Day (All ${pdfAllDaysCount} days incl. inactive): Rs. ${pdfAvgAll.toLocaleString()}`, style: 'normal' });
      }
      content.push({ text: ' ', margin: [0, 0, 0, 4] });
    }
    if (data.byMetal) {
      content.push({ text: 'METAL-WISE PERFORMANCE', style: 'subheader' });
      if (data.byMetal.gold?.totalRevenue > 0) {
        content.push({ text: 'Gold Sales:', style: 'sectionHeader' });
        content.push({ text: `Revenue: Rs. ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()} | Gross: ${data.byMetal.gold.totalWeight || 0}g | Pure: ${data.byMetal.gold.totalPureWeight || 0}g`, style: 'normal' });
      }
      if (data.byMetal.silver?.totalRevenue > 0) {
        content.push({ text: 'Silver Sales:', style: 'sectionHeader' });
        content.push({ text: `Revenue: Rs. ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()} | Gross: ${data.byMetal.silver.totalWeight || 0}g | Pure: ${data.byMetal.silver.totalPureWeight || 0}g`, style: 'normal' });
      }
      content.push({ text: ' ', margin: [0, 0, 0, 4] });
    }
    if (data.topPerformers?.length > 0) {
      content.push({ text: 'TOP REVENUE GENERATORS', style: 'subheader' });
      [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10).forEach((item, i) => {
        content.push({ text: `${i + 1}. ${item.metalType || 'N/A'} - ${item.category || 'N/A'} (${item.purity || 0}% purity)`, style: 'sectionHeader' });
        content.push({ text: `   Revenue: Rs. ${(item.totalSalesAmount || 0).toLocaleString()} | Weight: ${item.totalGrossWeight || 0}g | Items: ${item.totalItems || 0}`, style: 'normal' });
      });
      content.push({ text: ' ', margin: [0, 0, 0, 4] });
      content.push({ text: 'TOP SOLD QUANTITY ITEMS', style: 'subheader' });
      [...data.topPerformers].sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0)).slice(0, 10).forEach((item, i) => {
        content.push({ text: `${i + 1}. ${item.metalType || 'N/A'} - ${item.category || 'N/A'} (${item.purity || 0}% purity)`, style: 'sectionHeader' });
        content.push({ text: `   Items Sold: ${item.totalItems || 0} | Revenue: Rs. ${(item.totalSalesAmount || 0).toLocaleString()}`, style: 'normal' });
      });
      content.push({ text: ' ', margin: [0, 0, 0, 4] });
    }
    if (data.entries?.length > 0) {
      content.push({ text: 'RECENT SALES TRANSACTIONS', style: 'subheader' });
      data.entries.slice(0, 20).forEach((entry, i) => {
        content.push({ text: `${i + 1}. ${formatAPIDateForDisplay(entry.soldAt)} - ${entry.metalType || 'N/A'} ${entry.category || 'N/A'}`, style: 'sectionHeader' });
        content.push({ text: `   Purity: ${entry.purity || 0}% | Weight: ${entry.weight || 0}g | Price: Rs. ${(entry.salesPrice || 0).toLocaleString()}`, style: 'normal' });
        const customer = [entry.customerName, entry.customerMobile, entry.customerAddress].filter(Boolean).join(', ');
        content.push({ text: `   Customer: ${customer || 'Not provided'}`, style: 'normal' });
      });
    }
    content.push({ text: ' ', margin: [0, 0, 0, 8] });
    content.push({ text: 'This report is system generated and contains confidential business information.', style: 'small' });
    content.push({ text: `Report ID: RPT-${Date.now()}`, style: 'small' });
    renderContentToJsPDF(doc, content);
    const pdfBlob = doc.output('blob');
    await downloadFile(pdfBlob, filename);
  } catch (error) {
    console.error('Sales PDF error:', error);
    throw new Error('Failed to generate PDF report');
  }
};

  // ── Sales Excel
  const generateSalesExcel = (data) => {
    const wb = XLSX.utils.book_new();

    // Pre-calculate avg/day values
    const xlsxActiveDays = data.dailyRevenue?.length > 0 ? data.dailyRevenue.length : 1;
    const xlsxStart = data.dateRange?.startDate || actualDateRange.startDate;
    const xlsxEnd   = data.dateRange?.endDate   || actualDateRange.endDate;
    let xlsxAllDays = xlsxActiveDays;
    if (xlsxStart && xlsxEnd) {
      const diff = Math.round((new Date(xlsxEnd) - new Date(xlsxStart)) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) xlsxAllDays = diff;
    }
    const xlsxAvgActive = Math.round((data.summary?.totalRevenue || 0) / xlsxActiveDays);
    const xlsxAvgAll    = Math.round((data.summary?.totalRevenue || 0) / xlsxAllDays);

    const reportStart = xlsxStart ? formatAPIDateForDisplay(xlsxStart) : 'All Time (Start)';
    const reportEnd   = xlsxEnd   ? formatAPIDateForDisplay(xlsxEnd)   : 'All Time (End)';

    const summaryData = [
      ['SALES REPORT'], [''], ['EXECUTIVE SUMMARY'],
      ['Report Period', `${reportStart} to ${reportEnd}`],
      ['Generated on', formatDateObjectForDisplay(new Date())], [''],
      ['Total Revenue',      `Rs. ${(data.summary?.totalRevenue || 0).toLocaleString()}`],
      ['Total Items Sold',   `${data.summary?.totalItems || 0} items`],
      ['Average Sale Value', `Rs. ${data.summary?.totalItems ? Math.round(data.summary.totalRevenue / data.summary.totalItems).toLocaleString() : 0}`],
      ['Avg Sales/Day (Active Days)', `Rs. ${xlsxAvgActive.toLocaleString()} (over ${xlsxActiveDays} active days)`],
      ...(xlsxAllDays !== xlsxActiveDays
        ? [['Avg Sales/Day (All Days)', `Rs. ${xlsxAvgAll.toLocaleString()} (over ${xlsxAllDays} total days)`]]
        : []
      ),
      [''], ['METAL-WISE PERFORMANCE'], ['']
    ];
    if (data.byMetal?.gold?.totalRevenue > 0) {
      const gi = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'gold').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      summaryData.push(['Gold Sales', ''], ['Revenue', `Rs. ${(data.byMetal.gold.totalRevenue || 0).toLocaleString()}`], ['Gross Weight', `${data.byMetal.gold.totalWeight || 0} grams`], ['Pure Weight', `${data.byMetal.gold.totalPureWeight || 0} grams`], ['Total Items Sold', `${gi} items`], ['']);
    }
    if (data.byMetal?.silver?.totalRevenue > 0) {
      const si = data.topPerformers ? data.topPerformers.filter(i => i.metalType === 'silver').reduce((s, i) => s + (i.totalItems || 0), 0) : 0;
      summaryData.push(['Silver Sales', ''], ['Revenue', `Rs. ${(data.byMetal.silver.totalRevenue || 0).toLocaleString()}`], ['Gross Weight', `${data.byMetal.silver.totalWeight || 0} grams`], ['Pure Weight', `${data.byMetal.silver.totalPureWeight || 0} grams`], ['Total Items Sold', `${si} items`], ['']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
    if (data.topPerformers?.length > 0) {
      const rd = [['TOP REVENUE GENERATORS'], [''], ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)', 'Items Sold']];
      [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10)
        .forEach((item, i) => rd.push([i + 1, item.metalType || 'N/A', item.category || 'N/A', item.purity || 0, `Rs. ${(item.totalSalesAmount || 0).toLocaleString()}`, item.totalGrossWeight || 0, item.totalPureWeight || 0, item.totalItems || 0]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rd), 'Top Revenue Generators');
      const qd = [['TOP SOLD QUANTITY ITEMS'], [''], ['Rank', 'Metal Type', 'Category', 'Purity (%)', 'Items Sold', 'Revenue', 'Gross Weight (g)', 'Pure Weight (g)']];
      [...data.topPerformers].sort((a, b) => (b.totalItems || 0) - (a.totalItems || 0)).slice(0, 10)
        .forEach((item, i) => qd.push([i + 1, item.metalType || 'N/A', item.category || 'N/A', item.purity || 0, item.totalItems || 0, `Rs. ${(item.totalSalesAmount || 0).toLocaleString()}`, item.totalGrossWeight || 0, item.totalPureWeight || 0]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qd), 'Top Sold Quantity');
    }
    if (data.entries?.length > 0) {
      const td = [['RECENT SALES TRANSACTIONS'], [''], ['#', 'Date', 'Metal Type', 'Category', 'Purity (%)', 'Weight (g)', 'Price', 'Quantity', 'Customer Name', 'Customer Mobile', 'Customer Address']];
      data.entries.slice(0, 20).forEach((entry, i) => td.push([
        i + 1, formatAPIDateForDisplay(entry.soldAt), entry.metalType || 'N/A', entry.category || 'N/A',
        entry.purity || 0, entry.weight || 0, `Rs. ${(entry.salesPrice || 0).toLocaleString()}`,
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
    csv += `Generated on,${formatDateObjectForDisplay(new Date())}\n\nTotal Revenue,Rs. ${(data.summary?.totalRevenue || 0).toLocaleString()}\nTotal Items Sold,${data.summary?.totalItems || 0} items\n\n`;
    if (data.topPerformers?.length > 0) {
      csv += 'TOP REVENUE GENERATORS\nRank,Metal Type,Category,Purity (%),Revenue,Gross Weight (g),Pure Weight (g),Items Sold\n';
      [...data.topPerformers].sort((a, b) => (b.totalSalesAmount || 0) - (a.totalSalesAmount || 0)).slice(0, 10).forEach((item, i) => {
        csv += `${i + 1},${item.metalType || 'N/A'},${item.category || 'N/A'},${item.purity || 0},Rs. ${(item.totalSalesAmount || 0).toLocaleString()},${item.totalGrossWeight || 0},${item.totalPureWeight || 0},${item.totalItems || 0}\n`;
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

  // ── Fetch customers data
  const fetchCustomersData = async () => {
    setLoading(prev => ({ ...prev, customers: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Authentication token not found. Please login again.'); return; }
      const params = new URLSearchParams();
      params.append('includeName',           customerFields.name.toString());
      params.append('includeAddress',        customerFields.address.toString());
      params.append('includeMobile',         customerFields.mobile.toString());
      params.append('includePurchaseAmount', customerFields.purchaseAmount.toString());
      params.append('includePurchaseItems',  customerFields.purchaseItems.toString());
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

// ── Customer PDF using jsPDF
const generateCustomerPDFReport = async (reportData, filename, selectedFields) => {
  await loadJsPDFFont();
  const doc = await createJsPDF();
  const content = [];
  content.push({ text: 'CUSTOMER REPORT', style: 'header', alignment: 'center' });
  content.push({ text: `Generated: ${new Date().toLocaleDateString('en-GB')}`, style: 'normal', alignment: 'center' });
  content.push({ text: ' ', margin: [0, 0, 0, 6] });
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
      if (selectedFields.name)           parts.push(String(customer.customerName    || ''));
      if (selectedFields.mobile)         parts.push(String(customer.customerMobile  || ''));
      if (selectedFields.address)        parts.push(String(customer.customerAddress || ''));
      if (selectedFields.purchaseAmount) parts.push(`Rs.${customer.totalPurchaseAmount}`);
      content.push({ text: parts.join(' | '), style: 'normal', margin: [0, 0, 0, 1] });
      if (selectedFields.purchaseItems && customer.transactions) {
        content.push({ text: `   Items: ${formatPurchaseItems(customer.transactions)}`, style: 'small', margin: [5, 0, 0, 2] });
      }
    });
  }
  renderContentToJsPDF(doc, content);
  const pdfBlob = doc.output('blob');
  await downloadFile(pdfBlob, filename);
};

  // ── Customer Excel
  const generateCustomerExcelReport = async (reportData, filename, selectedFields) => {
    const XLSX = window.XLSX;
    const wb   = XLSX.utils.book_new();
    const headers = [];
    if (selectedFields.name)           headers.push('Customer Name');
    if (selectedFields.mobile)         headers.push('Mobile Number');
    if (selectedFields.address)        headers.push('Address');
    if (selectedFields.purchaseAmount) headers.push('Total Purchase Amount (Rs.)');
    if (selectedFields.purchaseItems)  headers.push('Purchase Items Details');
    const rows = reportData.customers.filter(c => {
      if (selectedFields.name          && !isValidValue(c.customerName))    return false;
      if (selectedFields.mobile        && !isValidValue(c.customerMobile))  return false;
      if (selectedFields.address       && !isValidValue(c.customerAddress)) return false;
      if (selectedFields.purchaseAmount && (!isValidValue(c.totalPurchaseAmount) || c.totalPurchaseAmount <= 0)) return false;
      if (selectedFields.purchaseItems  && (!c.transactions || c.transactions.length === 0)) return false;
      return true;
    }).map(c => {
      const row = [];
      if (selectedFields.name)           row.push(c.customerName);
      if (selectedFields.mobile)         row.push(c.customerMobile);
      if (selectedFields.address)        row.push(c.customerAddress);
      if (selectedFields.purchaseAmount) row.push(c.totalPurchaseAmount);
      if (selectedFields.purchaseItems)  row.push(formatPurchaseItems(c.transactions));
      return row;
    });
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = [];
    if (selectedFields.name)           colWidths.push({ wch: 25 });
    if (selectedFields.mobile)         colWidths.push({ wch: 15 });
    if (selectedFields.address)        colWidths.push({ wch: 30 });
    if (selectedFields.purchaseAmount) colWidths.push({ wch: 20 });
    if (selectedFields.purchaseItems)  colWidths.push({ wch: 50 });
    sheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, sheet, 'Customer Report');
    await saveWorkbook(wb, filename);
  };

  // ── Lifecycle
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

// ── Avg sales per day helper (place this just before your return statement)
  const avgSalesPerDay = salesData
    ? salesData.dailyRevenue?.length > 0
      ? Math.round(salesData.summary.totalRevenue / salesData.dailyRevenue.length)
      : salesData.summary.totalRevenue > 0 ? salesData.summary.totalRevenue : 0
    : 0;

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
  
        {/* ── STOCK REPORT SECTION ── */}
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
  
              {/* ── GOLD INVENTORY ── */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-3 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-4 sm:mb-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>
                  Gold Inventory
                </h3>
  
                {/* Metric cards — 3 columns always on mobile, compact padding */}
                <div className="grid grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-6">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-1 sm:mb-2 leading-tight">Total Gross Weight</p>
                    <p className="text-sm sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      {stockData.gold.totalGross} g
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-1 sm:mb-2 leading-tight">Total Pure Weight</p>
                    <p className="text-sm sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      {stockData.gold.totalPure} g
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-1 sm:mb-2 leading-tight">Avg Purity</p>
                    <p className="text-sm sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      {stockData.gold.averagePurity}%
                    </p>
                  </div>
                </div>
  
                {/* Category Breakdown — HIDDEN on mobile, visible md+ */}
                {Object.keys(stockData.gold.categories).length > 0 && (
                  <div className="hidden md:block bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">
                      Category Breakdown
                    </h4>
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
                )}
              </div>
  
              {/* ── SILVER INVENTORY ── */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 p-3 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>
                  Silver Inventory
                </h3>
  
                {/* Metric cards — 3 columns always on mobile */}
                <div className="grid grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-6">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-1 sm:mb-2 leading-tight">Total Gross Weight</p>
                    <p className="text-sm sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">{stockData.silver.totalGross} g</p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-1 sm:mb-2 leading-tight">Total Pure Weight</p>
                    <p className="text-sm sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">{stockData.silver.totalPure} g</p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-1 sm:mb-2 leading-tight">Avg Purity</p>
                    <p className="text-sm sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">{stockData.silver.averagePurity}%</p>
                  </div>
                </div>
  
                {/* Category Breakdown — HIDDEN on mobile, visible md+ */}
                {Object.keys(stockData.silver.categories).length > 0 && (
                  <div className="hidden md:block bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                    <h4 className="text-base sm:text-lg md:text-xl font-bold p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">Category Breakdown</h4>
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
                )}
              </div>
  
              {/* ── PIE CHARTS ── */}
              <div className="hidden md:grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">                {[
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
                        <div className="mt-4">
  <button
    onClick={() => {
      const key = `pieExpanded_${i}`;
      setPieExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    }}
    className="w-full flex items-center justify-between px-4 py-2.5 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all duration-200 text-sm font-semibold text-gray-700 dark:text-gray-300"
  >
    <span>Category Breakdown</span>
    <span className="text-xs">{pieExpanded[`pieExpanded_${i}`] ? '▲ Hide' : '▼ Show'}</span>
  </button>
  {pieExpanded[`pieExpanded_${i}`] && (
    <div className="mt-2 grid grid-cols-1 gap-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200/50 dark:border-gray-600/50">
          <div className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{item.name}</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.value.toFixed(2)}g</span>
        </div>
      ))}
    </div>
  )}
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
  
              {/* ── STOCK DOWNLOAD BUTTONS ── */}
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
  
        {/* ── SALES REPORT SECTION ── */}
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
    <input
      type="date"
      value={dateRange.startDate || actualDateRange.startDate}
      onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px]"
    />
  </div>
  <div>
    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">End Date</label>
    <input
      type="date"
      value={dateRange.endDate || actualDateRange.endDate}
      onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px]"
    />
  </div>
</div>
          </div>
  
          {loading.sales ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : salesData ? (
            <div className="space-y-6 md:space-y-8">
  
              {/* ── SALES SUMMARY CARDS — now 4 cards in 2×2 on mobile, 4-col on lg ── */}
              {(() => {
  const activeDays = salesData.dailyRevenue?.length > 0 ? salesData.dailyRevenue.length : 1;
  const avgPerDay  = Math.round(salesData.summary.totalRevenue / activeDays);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-sm p-3 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-green-200/50 dark:border-green-700/50 min-w-0">
        <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-semibold mb-1 sm:mb-2 leading-tight truncate">Total Revenue</p>
        <p className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent truncate">₹{formatIndianNumber(salesData.summary.totalRevenue)}</p>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm p-3 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-blue-200/50 dark:border-blue-700/50 min-w-0">
        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-semibold mb-1 sm:mb-2 leading-tight truncate">Total Items Sold</p>
        <p className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent truncate">{salesData.summary.totalItems}</p>
      </div>
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-3 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50 min-w-0">
        <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-semibold mb-1 sm:mb-2 leading-tight truncate">Avg Revenue/Item</p>
        <p className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent truncate">₹{formatIndianNumber(salesData.summary.averagePricePerItem)}</p>
      </div>
      {(() => {
        let allDaysCount = activeDays;
        const s = actualDateRange.startDate || dateRange.startDate;
        const e = actualDateRange.endDate   || dateRange.endDate;
        if (s && e) {
          const diff = Math.round((new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24)) + 1;
          if (diff > 0) allDaysCount = diff;
        }
        const avgAllDays = allDaysCount > 0 ? Math.round(salesData.summary.totalRevenue / allDaysCount) : 0;
        return (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 backdrop-blur-sm p-3 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-orange-200/50 dark:border-orange-700/50 min-w-0">
            <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 font-semibold mb-1 sm:mb-2 leading-tight truncate">Avg Sales/Day</p>
            <p className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent truncate">₹{formatIndianNumber(avgPerDay)}</p>
            <p className="text-xs text-orange-500 dark:text-orange-400 mt-1 truncate">over {activeDays} active {activeDays === 1 ? 'day' : 'days'}</p>
            {allDaysCount !== activeDays && (
              <div className="mt-2 pt-2 border-t border-orange-200/50 dark:border-orange-700/50">
                <p className="text-xs text-orange-400 dark:text-orange-500 truncate">₹{formatIndianNumber(avgAllDays)} / day</p>
                <p className="text-xs text-orange-400 dark:text-orange-500 truncate">incl. all {allDaysCount} days</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
})()}
  
              {/* ── DAILY REVENUE CHART ── */}
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
  
              {/* ── METAL-WISE BREAKDOWN ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>Gold Sales</h4>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200 truncate">₹{formatIndianNumber(salesData.byMetal.gold.totalRevenue)}</p>
</div>
                      <div><p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Gross Weight</p><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalWeight} g</p></div>
                      <div><p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Pure Weight</p><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalPureWeight} g</p></div>
                      <div><p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Sales Count</p><p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-200">{salesData.byMetal.gold.totalSalesCount}</p></div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>Silver Sales</h4>
                  <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-600/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 truncate">₹{formatIndianNumber(salesData.byMetal.silver.totalRevenue)}</p>
</div>
                      <div><p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Gross Weight</p><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalWeight} g</p></div>
                      <div><p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Pure Weight</p><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalPureWeight} g</p></div>
                      <div><p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Sales Count</p><p className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{salesData.byMetal.silver.totalSalesCount}</p></div>
                    </div>
                  </div>
                </div>
              </div>
  
              {/* ── TOP PERFORMERS ── */}
              {salesData.topPerformers && salesData.topPerformers.length > 0 && (
                <div className="space-y-6 md:space-y-8">
                  {/* Top Revenue */}
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
                              <td className="p-4 text-right font-bold text-green-600 dark:text-green-400">₹{formatIndianNumber(item.totalSalesAmount)}</td>

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
  
                  {/* Top Quantity */}
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
  
                  {/* Weight Leaders */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-yellow-200/50 dark:border-yellow-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                      <h4 className="text-base sm:text-lg md:text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"></div>Gold Weight Leaders</h4>
                      {salesData.goldWeightLeaders && salesData.goldWeightLeaders.length > 0 ? (
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
    {/* Desktop table */}
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
              <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300">₹{formatIndianNumber(item.totalSalesAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* Mobile cards */}
    <div className="block sm:hidden space-y-3 p-3">
      {salesData.goldWeightLeaders.slice(0, 5).map((item, index) => (
        <div key={index} className="bg-yellow-50/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-3 border border-yellow-200/50 dark:border-gray-600/50">
          <h5 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">{item.category}</h5>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
              <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{item.purity}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.totalGrossWeight}g</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{formatIndianNumber(item.totalSalesAmount)}</p>
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
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                      <h4 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2"><div className="w-3 h-3 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full"></div>Silver Weight Leaders</h4>
                      {salesData.silverWeightLeaders && salesData.silverWeightLeaders.length > 0 ? (
  <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 overflow-hidden">
    {/* Desktop table */}
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
              <td className="p-3 md:p-4 text-right text-gray-700 dark:text-gray-300">₹{formatIndianNumber(item.totalSalesAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* Mobile cards */}
    <div className="block sm:hidden space-y-3 p-3">
      {salesData.silverWeightLeaders.slice(0, 5).map((item, index) => (
        <div key={index} className="bg-gray-50/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/50">
          <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-2">{item.category}</h5>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Purity</p>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{item.purity}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Weight</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.totalGrossWeight}g</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Revenue</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{formatIndianNumber(item.totalSalesAmount)}</p>
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
  
              {/* ── SALES DOWNLOAD BUTTON ── */}
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
  
        {/* ── CUSTOMER LIST REPORT SECTION ── */}
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
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">₹{formatIndianNumber(customersData.summary.totalRevenue)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-sm p-4 sm:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
                  <p className="text-sm md:text-base text-purple-700 dark:text-purple-300 font-semibold mb-2">Avg Customer Value</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent">₹{formatIndianNumber(customersData.summary.averageCustomerValue)}</p>
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
                              {customerFields.purchaseAmount && (<><td className="p-4 text-right font-bold text-purple-600 dark:text-purple-400">₹{formatIndianNumber(customer.totalPurchaseAmount || 0)}</td><td className="p-4 text-right text-gray-700 dark:text-gray-300">{customer.transactionCount || 0}</td><td className="p-4 text-right font-semibold text-gray-700 dark:text-gray-300">₹{formatIndianNumber(customer.averagePurchaseValue || 0)}</td></>)}
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
  
        {/* ── DOWNLOAD MODAL ── */}
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