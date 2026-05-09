import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../config/api";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Filter, 
  Plus, 
  Search, 
  X, 
  ShoppingCart,
  Edit,
  Trash2,
  RotateCcw,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Weight
} from "lucide-react";
// Custom Select Component
const CustomSelect = ({ value, onValueChange, children, disabled = false, className = "" }) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    disabled={disabled}
    className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 ${
      disabled 
        ? 'bg-gray-100 cursor-not-allowed opacity-60 dark:bg-gray-700' 
        : 'hover:border-gray-300 dark:hover:border-gray-500'
    } ${className}`}
  >
    {children}
  </select>
);
// Custom Modal Component
const CustomModal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 dark:bg-gray-800/95 dark:border-gray-700/50`}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
// Custom Toggle Component  
const CustomToggle = ({ checked, onChange, label, id }) => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div
        onClick={() => onChange({ target: { checked: !checked } })}
        className={`w-12 h-6 rounded-full cursor-pointer transition-all duration-300 shadow-inner focus:ring-4 focus:ring-blue-500/20 ${
          checked 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg' 
            : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          } mt-0.5 ring-2 ring-white/20`}
        />
      </div>
    </div>
    <label 
      htmlFor={id} 
      className="text-sm font-medium cursor-pointer text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
    >
      {label}
    </label>
  </div>
);
const validateMobileNumber = (number) => {
  const cleanNumber = number.replace(/\D/g, '');
  return cleanNumber.slice(0, 10);
};
const sortSales = (sales) => {
  return [...sales].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
};
export default function SalesPage() {
  const { t } = useTranslation();
  
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── NEW: loading states for category & purity dropdowns ────────────────────
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isEditCategoryLoading, setIsEditCategoryLoading] = useState(false);
  const [isFilterCategoryLoading, setIsFilterCategoryLoading] = useState(false);
  const [isPurityLoading, setIsPurityLoading] = useState(false);
  const [isEditPurityLoading, setIsEditPurityLoading] = useState(false);
  const [isFilterPurityLoading, setIsFilterPurityLoading] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDeleteRangeModalOpen, setIsDeleteRangeModalOpen] = useState(false);
  // Entry search for Add Sale
  const [isEntrySearchOpen, setIsEntrySearchOpen] = useState(false);
  const [entrySearchResults, setEntrySearchResults] = useState([]);
  const [entrySearchLoading, setEntrySearchLoading] = useState(false);
  // Entry search for Edit Sale
  const [isEditEntrySearchOpen, setIsEditEntrySearchOpen] = useState(false);
  const [editEntrySearchResults, setEditEntrySearchResults] = useState([]);
  const [editEntrySearchLoading, setEditEntrySearchLoading] = useState(false);
  const [deleteRangeForm, setDeleteRangeForm] = useState({ startDate: "", endDate: "" });
  
  // ── CHANGED: metalType now starts as "" (no default) ───────────────────────
  const [saleForm, setSaleForm] = useState({
    metalType: "",
    category: "",
    purity: "",
    weight: "",
    salesPrice: "",
    isBulk: false,
    itemCount: "",
    customerName: "",
    customerAddress: "",
    customerMobile: "",
    description: "",
    showCustomerInfo: false,
    manualSoldDate: false,
    soldDate: ""
  });
  const [editForm, setEditForm] = useState({
    metalType: "gold",
    category: "",
    purity: "",
    weight: "",
    salesPrice: "",
    isBulk: false,
    itemCount: "",
    customerName: "",
    customerAddress: "",
    customerMobile: "",
    description: "",
    soldDate: ""
  });
  const [editCategories, setEditCategories] = useState([]);
  const [editPurities, setEditPurities] = useState([]);
  const [editingSale, setEditingSale] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);
  
  const [filters, setFilters] = useState({
    startDate: "", endDate: "", metalType: "", category: "",
    purity: "", minPrice: "", maxPrice: "", customerName: "", customerAddress: "" 
  });
  const [activeFilters, setActiveFilters] = useState({});
  
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availablePurities, setAvailablePurities] = useState([]);
  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchSales = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/api/sales?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSales(sortSales(response.data.sales || []));
    } catch (err) {
      console.error("Error fetching sales:", err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchCategories = async (metalType) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/api/metadata`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.categoryTotals) {
        const categories = Object.values(response.data.categoryTotals)
          .filter(cat => cat.metal === metalType)
          .map(cat => cat.categoryName);
        return [...new Set(categories)].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        );
      }
      return [];
    } catch (err) {
      console.error("Error fetching categories:", err);
      return [];
    }
  };
  const fetchPurities = async (metalType, category) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/api/metadata`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.categoryTotals) {
        const categoryKey = `${category}_${metalType}`;
        const categoryData = response.data.categoryTotals[categoryKey];
        if (categoryData?.purities) {
          return Object.keys(categoryData.purities).map(Number).sort((a, b) => b - a);
        }
      }
      return [];
    } catch (err) {
      console.error("Error fetching purities:", err);
      return [];
    }
  };
  // ─── Add Sale form handlers ─────────────────────────────────────────────────
  const handleSaleFormChange = async (field, value) => {
    setSaleForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'metalType') { updated.category = ''; updated.purity = ''; }
      if (field === 'category') { updated.purity = ''; }
      return updated;
    });
    if (field === 'metalType') {
      // ── CHANGED: show loader while fetching categories ──────────────────────
      setIsCategoryLoading(true);
      setAvailableCategories([]);
      setAvailablePurities([]);
      const cats = await fetchCategories(value);
      setAvailableCategories(cats);
      setIsCategoryLoading(false);
    }
    if (field === 'category') {
      const currentMetal = saleForm.metalType;
      if (currentMetal && value) {
        setIsPurityLoading(true);
        setAvailablePurities([]);
        const purs = await fetchPurities(currentMetal, value);
        setAvailablePurities(purs);
        setIsPurityLoading(false);
      } else {
        setAvailablePurities([]);
      }
    }
  };
  // ─── Edit Sale form handlers ────────────────────────────────────────────────
  const handleEditFormChange = async (field, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'metalType') { updated.category = ''; updated.purity = ''; }
      if (field === 'category') { updated.purity = ''; }
      return updated;
    });
    if (field === 'metalType') {
      // ── CHANGED: show loader while fetching categories ──────────────────────
      setIsEditCategoryLoading(true);
      setEditCategories([]);
      setEditPurities([]);
      const cats = await fetchCategories(value);
      setEditCategories(cats);
      setIsEditCategoryLoading(false);
    }
    if (field === 'category') {
      const currentMetal = field === 'metalType' ? value : editForm.metalType;
      if (currentMetal && value) {
        setIsEditPurityLoading(true);
        setEditPurities([]);
        const purs = await fetchPurities(currentMetal, value);
        setEditPurities(purs);
        setIsEditPurityLoading(false);
      } else {
        setEditPurities([]);
      }
    }
  };
  // ─── Filter handlers ────────────────────────────────────────────────────────
  const handleFilterChange = async (field, value) => {
    setFilters(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'metalType') { updated.category = ''; updated.purity = ''; }
      if (field === 'category') { updated.purity = ''; }
      return updated;
    });
    if (field === 'metalType') {
      if (value) {
        // ── CHANGED: show loader while fetching categories ────────────────────
        setIsFilterCategoryLoading(true);
        setAvailableCategories([]);
        setAvailablePurities([]);
        const cats = await fetchCategories(value);
        setAvailableCategories(cats);
        setIsFilterCategoryLoading(false);
      } else {
        setAvailableCategories([]);
        setAvailablePurities([]);
      }
    }
    if (field === 'category') {
      const currentMetal = filters.metalType;
      if (currentMetal && value) {
        setIsFilterPurityLoading(true);
        setAvailablePurities([]);
        const purs = await fetchPurities(currentMetal, value);
        setAvailablePurities(purs);
        setIsFilterPurityLoading(false);
      } else {
        setAvailablePurities([]);
      }
    }
  };
  // ─── Entry search for Add Sale ──────────────────────────────────────────────
  const entryMatchesForm = (entry, form) => {
    const metal = form.metalType;
    const enteredWeight = parseFloat(form.weight);
    const enteredDesc = (form.description || "").trim().toLowerCase();
    if (!isNaN(enteredWeight) && enteredWeight > 0) {
      const tolerance = metal === "silver" ? 1.0 : 0.03;
      if (Math.abs(entry.weight - enteredWeight) > tolerance) return false;
    }
    if (enteredDesc.length > 0) {
      const entryNotes = (entry.notes || "").toLowerCase();
      const words = enteredDesc.split(/\s+/).filter(w => w.length >= 2);
      if (words.length > 0 && !words.some(word => entryNotes.includes(word))) return false;
    }
    return true;
  };
  const handleEntrySearch = async () => {
    setEntrySearchLoading(true);
    setIsEntrySearchOpen(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (saleForm.metalType) params.append("metalType", saleForm.metalType);
      if (saleForm.category)  params.append("category",  saleForm.category);
      if (saleForm.purity)    params.append("purity",    saleForm.purity);
      const response = await api.get(`/api/entries?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allEntries = response.data.entries || [];
      setEntrySearchResults(allEntries.filter(e => entryMatchesForm(e, saleForm)));
    } catch (err) {
      console.error("Error searching entries:", err);
      setEntrySearchResults([]);
    } finally {
      setEntrySearchLoading(false);
    }
  };
  const handleSelectEntry = async (entry) => {
    setSaleForm(prev => ({
      ...prev,
      metalType: entry.metalType || prev.metalType,
      category: entry.category || prev.category,
      purity: entry.purity?.toString() || prev.purity,
      weight: entry.weight?.toString() || prev.weight,
      isBulk: entry.isBulk || false,
      itemCount: entry.isBulk ? (entry.itemCount?.toString() || "") : ""
    }));
    if (entry.metalType) {
      const cats = await fetchCategories(entry.metalType);
      setAvailableCategories(cats);
    }
    if (entry.metalType && entry.category) {
      const purs = await fetchPurities(entry.metalType, entry.category);
      setAvailablePurities(purs);
    }
    setIsEntrySearchOpen(false);
  };
  // ─── Entry search for Edit Sale ─────────────────────────────────────────────
  const handleEditEntrySearch = async () => {
    setEditEntrySearchLoading(true);
    setIsEditEntrySearchOpen(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (editForm.metalType) params.append("metalType", editForm.metalType);
      if (editForm.category)  params.append("category",  editForm.category);
      if (editForm.purity)    params.append("purity",    editForm.purity);
      const response = await api.get(`/api/entries?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allEntries = response.data.entries || [];
      setEditEntrySearchResults(allEntries.filter(e => entryMatchesForm(e, editForm)));
    } catch (err) {
      console.error("Error searching entries for edit:", err);
      setEditEntrySearchResults([]);
    } finally {
      setEditEntrySearchLoading(false);
    }
  };
  const handleSelectEditEntry = async (entry) => {
    setEditForm(prev => ({
      ...prev,
      metalType: entry.metalType || prev.metalType,
      category: entry.category || prev.category,
      purity: entry.purity?.toString() || prev.purity,
      weight: entry.weight?.toString() || prev.weight,
      isBulk: entry.isBulk || false,
      itemCount: entry.isBulk ? (entry.itemCount?.toString() || "") : ""
    }));
    if (entry.metalType) {
      const cats = await fetchCategories(entry.metalType);
      setEditCategories(cats);
    }
    if (entry.metalType && entry.category) {
      const purs = await fetchPurities(entry.metalType, entry.category);
      setEditPurities(purs);
    }
    setIsEditEntrySearchOpen(false);
  };
  // ─── Create Sale ────────────────────────────────────────────────────────────
  const validateSaleForm = () => {
    const { metalType, category, purity, weight, salesPrice, isBulk, itemCount } = saleForm;
    if (!metalType || !category || !purity || !weight || !salesPrice) {
      alert("Please fill in all required fields");
      return false;
    }
    if (parseFloat(weight) <= 0) { alert("Weight must be greater than 0"); return false; }
    if (parseFloat(salesPrice) <= 0) { alert("Sales price must be greater than 0"); return false; }
    if (isBulk && (!itemCount || parseInt(itemCount) <= 0)) {
      alert("Item count is required for bulk sales");
      return false;
    }
    return true;
  };
  const handleCreateSale = async () => {
    if (!validateSaleForm()) return;
    try {
      setIsSubmitting(true);
      const saleData = {
        metalType: saleForm.metalType,
        category: saleForm.category,
        purity: parseFloat(saleForm.purity),
        weight: parseFloat(saleForm.weight),
        salesPrice: parseFloat(saleForm.salesPrice),
        isBulk: saleForm.isBulk,
        ...(saleForm.isBulk && { itemCount: parseInt(saleForm.itemCount) }),
        customerName: saleForm.customerName || undefined,
        customerAddress: saleForm.customerAddress || undefined,
        customerMobile: saleForm.customerMobile || undefined,
        description: saleForm.description || undefined,
        ...(saleForm.manualSoldDate && saleForm.soldDate && { soldAt: saleForm.soldDate })
      };
      const pureWeight = (saleData.weight * saleData.purity / 100).toFixed(3);
      setConfirmationData({ ...saleData, pureWeight });
      setIsConfirmModalOpen(true);
    } catch (err) {
      console.error("Error preparing sale:", err);
      alert("Error preparing sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const confirmSale = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      await api.post(`/api/sales`, confirmationData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // ── CHANGED: reset metalType to "" on clear ─────────────────────────────
      setSaleForm({
        metalType: "", category: "", purity: "", weight: "", salesPrice: "",
        isBulk: false, itemCount: "", customerName: "", customerAddress: "",
        customerMobile: "", description: "", showCustomerInfo: false,
        manualSoldDate: false, soldDate: ""
      });
      setAvailableCategories([]);
      setAvailablePurities([]);
      setIsAddModalOpen(false);
      setIsConfirmModalOpen(false);
      setConfirmationData(null);
      fetchSales();
      alert("Sale created successfully!");
    } catch (err) {
      console.error("Error creating sale:", err);
      alert(err.response?.data?.message || "Error creating sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // ─── Open Edit Modal ────────────────────────────────────────────────────────
  const handleEditSale = async (sale) => {
    setEditingSale(sale);
    const soldDateStr = sale.soldAt
      ? new Date(sale.soldAt).toISOString().split('T')[0]
      : "";
    setEditForm({
      metalType: sale.metalType || "gold",
      category: sale.category || "",
      purity: sale.purity?.toString() || "",
      weight: sale.weight?.toString() || "",
      salesPrice: sale.salesPrice?.toString() || "",
      isBulk: sale.isBulk || false,
      itemCount: sale.itemCount?.toString() || "",
      customerName: sale.customerName || "",
      customerAddress: sale.customerAddress || "",
      customerMobile: sale.customerMobile || "",
      description: sale.description || "",
      soldDate: soldDateStr
    });
    setIsEditCategoryLoading(true);
    const cats = await fetchCategories(sale.metalType || "gold");
    setEditCategories(cats);
    setIsEditCategoryLoading(false);
    if (sale.metalType && sale.category) {
      const purs = await fetchPurities(sale.metalType, sale.category);
      setEditPurities(purs);
    }
    setIsEditModalOpen(true);
  };
  // ─── Update Sale ────────────────────────────────────────────────────────────
  const handleUpdateSale = async () => {
    const { metalType, category, purity, weight, salesPrice, isBulk, itemCount } = editForm;
    if (!metalType || !category || !purity || !weight || !salesPrice) {
      alert("Please fill in all required fields");
      return;
    }
    if (parseFloat(weight) <= 0) { alert("Weight must be greater than 0"); return; }
    if (parseFloat(salesPrice) <= 0) { alert("Sales price must be greater than 0"); return; }
    if (isBulk && (!itemCount || parseInt(itemCount) <= 0)) {
      alert("Item count is required for bulk sales");
      return;
    }
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      await api.put(
        `/api/sales/${editingSale._id}`,
        {
          metalType,
          category,
          purity: parseFloat(purity),
          weight: parseFloat(weight),
          salesPrice: parseFloat(salesPrice),
          isBulk,
          itemCount: isBulk ? parseInt(itemCount) : undefined,
          customerName: editForm.customerName,
          customerAddress: editForm.customerAddress,
          customerMobile: editForm.customerMobile,
          description: editForm.description,
          soldAt: editForm.soldDate || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditModalOpen(false);
      setEditingSale(null);
      fetchSales();
      alert("Sale updated successfully!");
    } catch (err) {
      console.error("Error updating sale:", err);
      alert(err.response?.data?.message || "Error updating sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // ─── Delete Sale ────────────────────────────────────────────────────────────
  const handleDeleteSale = async (saleId) => {
    if (!confirm("Are you sure you want to delete this sale? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/api/sales/${saleId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchSales();
      alert("Sale deleted successfully!");
    } catch (err) {
      console.error("Error deleting sale:", err);
      alert(err.response?.data?.message || "Error deleting sale. Please try again.");
    }
  };
  // ─── Return Sale ────────────────────────────────────────────────────────────
  const handleReturnSale = async (saleId) => {
    if (!confirm("Are you sure you want to return this sale to inventory?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.post(`/api/sales/${saleId}/return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSales();
      alert("Sale returned to inventory successfully!");
    } catch (err) {
      console.error("Error returning sale:", err);
      alert(err.response?.data?.message || "Error returning sale. Please try again.");
    }
  };
  // ─── Filters ────────────────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    setActiveFilters(filters);
    setIsFilterOpen(false);
  };
  const handleClearFilters = () => {
    setFilters({
      startDate: "", endDate: "", metalType: "", category: "",
      purity: "", minPrice: "", maxPrice: "", customerName: "", customerAddress: ""
    });
    setActiveFilters({});
    setAvailableCategories([]);
    setAvailablePurities([]);
  };
  // ─── Delete Range ───────────────────────────────────────────────────────────
  const handleDeleteSalesRange = async () => {
    if (!deleteRangeForm.startDate || !deleteRangeForm.endDate) {
      alert("Please select both start and end dates");
      return;
    }
    if (new Date(deleteRangeForm.startDate) > new Date(deleteRangeForm.endDate)) {
      alert("Start date cannot be after end date");
      return;
    }
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      const { startDate, endDate } = deleteRangeForm;
      const countResponse = await api.get(
        `/api/sales/count-range?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const salesCount = countResponse.data.count;
      if (salesCount === 0) {
        alert("No sales found in the selected date range");
        return;
      }
      const fmt = (d) => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };
      if (!confirm(`Are you sure you want to delete ${salesCount} sales from ${fmt(startDate)} to ${fmt(endDate)}? This action cannot be undone.`)) return;
      await api.delete(`/api/sales/range`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { startDate, endDate }
      });
      setIsDeleteRangeModalOpen(false);
      setDeleteRangeForm({ startDate: "", endDate: "" });
      fetchSales();
      alert(`Successfully deleted ${salesCount} sales!`);
    } catch (err) {
      console.error("Error deleting sales range:", err);
      alert(err.response?.data?.message || "Error deleting sales range. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // ─── Formatters ─────────────────────────────────────────────────────────────
  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSales();
    // ── CHANGED: no longer pre-fetching gold categories on mount ────────────
  }, [activeFilters]);
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">Loading sales...</div>
      </div>
    );
  }
  const inputCls = "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400";

  // ── Inline category loading indicator ────────────────────────────────────────
  const CategoryLoadingPlaceholder = () => (
    <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 dark:bg-gray-800/50 dark:border-gray-600 flex items-center gap-2 text-gray-400 dark:text-gray-500">
      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <span className="text-sm">Loading categories...</span>
    </div>
  );

  const PurityLoadingPlaceholder = () => (
    <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 dark:bg-gray-800/50 dark:border-gray-600 flex items-center gap-2 text-gray-400 dark:text-gray-500">
      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <span className="text-sm">Loading purities...</span>
    </div>
  );

  // ─── Entry Search Result Card (shared between Add and Edit) ─────────────────
  const EntrySearchList = ({ results, loading, onSelect, form }) => {
    if (loading) return <div className="text-center py-8 text-gray-500">Searching inventory...</div>;
    if (results.length === 0) return (
      <div className="text-center py-8 text-gray-500">
        <Package size={40} className="mx-auto mb-3 opacity-40" />
        <p>No matching inventory entries found.</p>
        <p className="text-xs mt-1 text-gray-400">
          Weight tolerance: {form.metalType === "silver" ? "±1g" : "±0.03g"}.
          Try adjusting the weight or description.
        </p>
      </div>
    );
    return (
      <>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {results.length} entr{results.length === 1 ? "y" : "ies"} found — click one to fill the form.
        </p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {results.map((entry) => {
            const enteredWeight = parseFloat(form.weight);
            const weightDiff = !isNaN(enteredWeight) && enteredWeight > 0
              ? Math.abs(entry.weight - enteredWeight).toFixed(3)
              : null;
            return (
              <div
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="cursor-pointer border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition-all duration-150 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="font-semibold capitalize text-gray-900 dark:text-gray-100">
                      {entry.metalType} • {entry.category} • {entry.purity}%
                    </span>
                    {entry.isBulk && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">Bulk</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1">
                      <Weight size={13} />
                      <span className={weightDiff !== null && parseFloat(weightDiff) === 0 ? "text-green-600 font-semibold" : ""}>
                        {entry.weight}g
                      </span>
                      {weightDiff !== null && parseFloat(weightDiff) > 0 && (
                        <span className="text-xs text-amber-500 dark:text-amber-400">(Δ{weightDiff}g)</span>
                      )}
                    </span>
                    {entry.isBulk && (
                      <span className="flex items-center gap-1"><Package size={13} />{entry.itemCount} items</span>
                    )}
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">{entry.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen dark:bg-gray-900">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 dark:bg-gray-800/80 dark:border-gray-700/50">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsDeleteRangeModalOpen(true)}
            className="flex items-center gap-2 bg-white border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 size={16} />
            Delete Range
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
          >
            <Filter size={16} />
            Filter
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <ShoppingCart size={16} />
            Add New Sale
          </Button>
        </div>
      </div>
      {/* ── Active Filters ── */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-4 dark:bg-gray-800/80 dark:border-gray-700/50">
          <span className="text-sm text-gray-600 font-medium dark:text-gray-300">Active filters:</span>
          {Object.entries(activeFilters).map(([key, value]) => (
            <span key={key} className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-xs font-medium border border-blue-300/50 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-200 dark:border-blue-600/50">
              {key}: {value}
            </span>
          ))}
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-red-600 hover:text-red-700">
            Clear All
          </Button>
        </div>
      )}
      {/* ── Sales List ── */}
      <div className="space-y-4">
        {sales.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
            <CardContent className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg dark:text-gray-300">No sales found</p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Create Your First Sale
              </Button>
            </CardContent>
          </Card>
        ) : (
          sales.map((sale) => (
            <Card key={sale._id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-semibold text-lg capitalize dark:text-white leading-tight">
                        {sale.metalType} • {sale.category} • {sale.purity}%
                      </span>
                      {sale.isBulk && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs self-start">
                          Bulk ({sale.itemCount} items)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Weight size={14} />
                        <span>Gross: {sale.weight}g • Pure: {(sale.weight * sale.purity / 100).toFixed(3)}g</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-green-600">{formatCurrency(sale.salesPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(sale.soldAt)}</span>
                      </div>
                    </div>
                    {sale.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">{sale.description}</div>
                    )}
                    {(sale.customerName || sale.customerAddress || sale.customerMobile) && (
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-300 pt-2 border-t dark:border-gray-600">
                        {sale.customerName && <div className="flex items-center gap-1"><User size={14} /><span>{sale.customerName}</span></div>}
                        {sale.customerAddress && <div className="flex items-center gap-1"><MapPin size={14} /><span className="break-words">{sale.customerAddress}</span></div>}
                        {sale.customerMobile && <div className="flex items-center gap-1"><Phone size={14} /><span>{sale.customerMobile}</span></div>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t dark:border-gray-600">
                    <Button variant="outline" size="sm" onClick={() => handleEditSale(sale)}
                      className="flex items-center justify-center gap-1 w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 dark:border-gray-600 dark:hover:border-gray-500">
                      <Edit size={14} /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteSale(sale._id)}
                      className="flex items-center justify-center gap-1 w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium border-2 border-red-200 text-red-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 dark:border-red-600 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-900/20">
                      <Trash2 size={14} /> Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleReturnSale(sale._id)}
                      className="flex items-center justify-center gap-1 w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium border-2 border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/20">
                      <RotateCcw size={14} /> Return
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {/* ════════════════════════════════════════════════════════════════════════
          ADD SALE MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Sale" size="lg">
        <div className="space-y-4">
          {/* Metal Type */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Metal Type *</label>
            <CustomSelect value={saleForm.metalType} onValueChange={(v) => handleSaleFormChange('metalType', v)}>
              {/* ── CHANGED: blank placeholder option ── */}
              <option value="">Select Metal Type</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </CustomSelect>
          </div>
          {/* Category — shows loader while fetching */}
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            {isCategoryLoading ? (
              <CategoryLoadingPlaceholder />
            ) : (
              <CustomSelect
                value={saleForm.category}
                onValueChange={(v) => handleSaleFormChange('category', v)}
                disabled={!saleForm.metalType}
              >
                <option value="">{saleForm.metalType ? "Select Category" : "Select metal first"}</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Purity *</label>
            <CustomSelect
              value={saleForm.purity}
              onValueChange={(v) => handleSaleFormChange('purity', v)}
              disabled={!saleForm.category}
            >
              <option value="">{saleForm.category ? "Select Purity" : "Select category first"}</option>
              {availablePurities.map(p => <option key={p} value={p}>{p}%</option>)}
            </CustomSelect>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Weight (grams) *</label>
            <Input type="number" step="0.001" value={saleForm.weight}
              onChange={(e) => handleSaleFormChange('weight', e.target.value)}
              placeholder="Enter weight" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sales Price (₹) *</label>
            <Input type="number" step="0.01" value={saleForm.salesPrice}
              onChange={(e) => handleSaleFormChange('salesPrice', e.target.value)}
              placeholder="Enter sales price" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Textarea value={saleForm.description}
              onChange={(e) => handleSaleFormChange('description', e.target.value)}
              placeholder="Add a note or description for this sale..." rows={2} />
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Optionally search your inventory to select a specific item being sold.
            </p>
            <Button type="button" variant="outline" onClick={handleEntrySearch}
              className="flex items-center gap-2 border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20">
              <Search size={15} />
              Search &amp; Select from Inventory
            </Button>
          </div>
          <div className="border-t pt-4">
            <div className="mb-4">
              <CustomToggle id="customerInfo" checked={saleForm.showCustomerInfo}
                onChange={(e) => handleSaleFormChange('showCustomerInfo', e.target.checked)}
                label="Add Customer Information" />
            </div>
            {saleForm.showCustomerInfo && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input value={saleForm.customerName}
                    onChange={(e) => handleSaleFormChange('customerName', e.target.value)}
                    placeholder="Enter customer name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Address</label>
                  <Textarea value={saleForm.customerAddress}
                    onChange={(e) => handleSaleFormChange('customerAddress', e.target.value)}
                    placeholder="Enter customer address" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Mobile</label>
                  <Input type="tel" value={saleForm.customerMobile}
                    onChange={(e) => handleSaleFormChange('customerMobile', validateMobileNumber(e.target.value))}
                    placeholder="Enter 10-digit mobile number" maxLength="10" className={inputCls} />
                  {saleForm.customerMobile && saleForm.customerMobile.length !== 10 && (
                    <p className="text-red-500 text-xs mt-1">Mobile number must be exactly 10 digits</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="border-t pt-4">
            <div className="mb-4">
              <CustomToggle id="manualSoldDate" checked={saleForm.manualSoldDate}
                onChange={(e) => handleSaleFormChange('manualSoldDate', e.target.checked)}
                label="Enter Sold Date Manually" />
            </div>
            {saleForm.manualSoldDate && (
              <div>
                <label className="block text-sm font-medium mb-1">Sold Date</label>
                <Input type="date" value={saleForm.soldDate}
                  onChange={(e) => handleSaleFormChange('soldDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]} className={inputCls} />
              </div>
            )}
          </div>
          <CustomToggle id="bulkSale" checked={saleForm.isBulk}
            onChange={(e) => handleSaleFormChange('isBulk', e.target.checked)}
            label="Bulk Sale (deduct from bulk entry directly)" />
          {saleForm.isBulk && (
            <div>
              <label className="block text-sm font-medium mb-1">Item Count *</label>
              <Input type="number" value={saleForm.itemCount}
                onChange={(e) => handleSaleFormChange('itemCount', e.target.value)}
                placeholder="Enter item count" className={inputCls} />
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreateSale} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Create Sale"}
            </Button>
          </div>
        </div>
      </CustomModal>
      {/* ════════════════════════════════════════════════════════════════════════
          ENTRY SEARCH MODAL (Add Sale)
      ════════════════════════════════════════════════════════════════════════ */}
      <CustomModal isOpen={isEntrySearchOpen} onClose={() => setIsEntrySearchOpen(false)} title="Select from Inventory" size="xl">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {saleForm.metalType && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 capitalize">{saleForm.metalType}</span>}
            {saleForm.category && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">{saleForm.category}</span>}
            {saleForm.purity && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">{saleForm.purity}%</span>}
          </div>
          <EntrySearchList
            results={entrySearchResults}
            loading={entrySearchLoading}
            onSelect={handleSelectEntry}
            form={saleForm}
          />
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsEntrySearchOpen(false)}>Cancel</Button>
          </div>
        </div>
      </CustomModal>
      {/* ════════════════════════════════════════════════════════════════════════
          CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <CustomModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Sale">
        {confirmationData && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 dark:text-gray-200">This sale will deduct from inventory:</h4>
              <div className="space-y-1 text-sm dark:text-gray-300">
                <p><strong>Item:</strong> {confirmationData.metalType} {confirmationData.category} {confirmationData.purity}%</p>
                <p><strong>Gross Weight:</strong> {confirmationData.weight}g</p>
                <p><strong>Pure Weight:</strong> {confirmationData.pureWeight}g</p>
                <p><strong>Sale Price:</strong> {formatCurrency(confirmationData.salesPrice)}</p>
                {confirmationData.isBulk && <p><strong>Item Count:</strong> {confirmationData.itemCount}</p>}
                {confirmationData.customerName && <p><strong>Customer:</strong> {confirmationData.customerName}</p>}
                {confirmationData.description && <p><strong>Description:</strong> {confirmationData.description}</p>}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-red-700 text-sm">
                ⚠️ This action will deduct items from your inventory. Use "Return to Inventory" if you need to reverse this sale later.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={confirmSale} disabled={isSubmitting}>
                {isSubmitting ? "Creating Sale..." : "Confirm Sale"}
              </Button>
            </div>
          </div>
        )}
      </CustomModal>
      {/* ════════════════════════════════════════════════════════════════════════
          EDIT SALE MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <CustomModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Sale" size="lg">
        <div className="space-y-4">
          {/* Metal Type */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Metal Type *</label>
            <CustomSelect value={editForm.metalType} onValueChange={(v) => handleEditFormChange('metalType', v)}>
              <option value="">Select Metal Type</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </CustomSelect>
          </div>
          {/* Category — shows loader while fetching */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Category *</label>
            {isEditCategoryLoading ? (
              <CategoryLoadingPlaceholder />
            ) : (
              <CustomSelect
                value={editForm.category}
                onValueChange={(v) => handleEditFormChange('category', v)}
                disabled={!editForm.metalType}
              >
                <option value="">{editForm.metalType ? "Select Category" : "Select metal first"}</option>
                {editCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>
            )}
          </div>
          {/* Purity */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Purity *</label>
            <CustomSelect
              value={editForm.purity}
              onValueChange={(v) => handleEditFormChange('purity', v)}
              disabled={!editForm.category}
            >
              <option value="">{editForm.category ? "Select Purity" : "Select category first"}</option>
              {editPurities.map(p => <option key={p} value={p}>{p}%</option>)}
            </CustomSelect>
          </div>
          {/* Weight */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Weight (grams) *</label>
            <Input type="number" step="0.001" value={editForm.weight}
              onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
              placeholder="Enter weight" className={inputCls} />
          </div>
          {/* Sales Price */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Sales Price (₹) *</label>
            <Input type="number" step="1" value={editForm.salesPrice}
              onChange={(e) => setEditForm(prev => ({ ...prev, salesPrice: e.target.value }))}
              placeholder="Enter sales price" className={inputCls} />
          </div>
          {/* Search from inventory */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Search inventory to pick a different item — this will update metal, category, purity and weight.
            </p>
            <Button type="button" variant="outline" onClick={handleEditEntrySearch}
              className="flex items-center gap-2 border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20">
              <Search size={15} />
              Search &amp; Select from Inventory
            </Button>
          </div>
          {/* Bulk Toggle */}
          <div className="border-t pt-4">
            <CustomToggle id="editBulkSale" checked={editForm.isBulk}
              onChange={(e) => setEditForm(prev => ({ ...prev, isBulk: e.target.checked, itemCount: e.target.checked ? prev.itemCount : "" }))}
              label="Bulk Sale" />
            {editForm.isBulk && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Item Count *</label>
                <Input type="number" value={editForm.itemCount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, itemCount: e.target.value }))}
                  placeholder="Enter item count" className={inputCls} />
              </div>
            )}
          </div>
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Textarea value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add a note or description..." rows={2} />
          </div>
          {/* Sold Date */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-1 dark:text-gray-200 flex items-center gap-2">
              <Calendar size={15} />
              Sold Date
            </label>
            <Input type="date" value={editForm.soldDate}
              onChange={(e) => setEditForm(prev => ({ ...prev, soldDate: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Leave unchanged to keep the original sale date.</p>
          </div>
          {/* Customer info */}
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Customer Information</p>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">Customer Name</label>
              <Input value={editForm.customerName}
                onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Enter customer name" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">Customer Address</label>
              <Textarea value={editForm.customerAddress}
                onChange={(e) => setEditForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                placeholder="Enter customer address" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">Customer Mobile</label>
              <Input type="tel" value={editForm.customerMobile}
                onChange={(e) => setEditForm(prev => ({ ...prev, customerMobile: validateMobileNumber(e.target.value) }))}
                placeholder="Enter 10-digit mobile number" maxLength="10" className={inputCls} />
              {editForm.customerMobile && editForm.customerMobile.length !== 10 && (
                <p className="text-red-500 text-xs mt-1">Mobile number must be exactly 10 digits</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleUpdateSale} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Sale"}
            </Button>
          </div>
        </div>
      </CustomModal>
      {/* ════════════════════════════════════════════════════════════════════════
          EDIT ENTRY SEARCH MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <CustomModal isOpen={isEditEntrySearchOpen} onClose={() => setIsEditEntrySearchOpen(false)} title="Select from Inventory" size="xl">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {editForm.metalType && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 capitalize">{editForm.metalType}</span>}
            {editForm.category && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">{editForm.category}</span>}
            {editForm.purity && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">{editForm.purity}%</span>}
          </div>
          <EntrySearchList
            results={editEntrySearchResults}
            loading={editEntrySearchLoading}
            onSelect={handleSelectEditEntry}
            form={editForm}
          />
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsEditEntrySearchOpen(false)}>Cancel</Button>
          </div>
        </div>
      </CustomModal>
      {/* ════════════════════════════════════════════════════════════════════════
          FILTER MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <CustomModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Sales" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Metal Type</label>
              <CustomSelect value={filters.metalType} onValueChange={(v) => handleFilterChange('metalType', v)}>
                <option value="">All Metal Types</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </CustomSelect>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              {isFilterCategoryLoading ? (
                <CategoryLoadingPlaceholder />
              ) : filters.metalType ? (
                <CustomSelect value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
                  <option value="">All Categories</option>
                  {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </CustomSelect>
              ) : (
                <Input value={filters.category} disabled placeholder="Select metal type first" className={inputCls} />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Purity</label>
              {filters.metalType && filters.category ? (
                <CustomSelect value={filters.purity} onValueChange={(v) => handleFilterChange('purity', v)}>
                  <option value="">All Purities</option>
                  {availablePurities.map(p => <option key={p} value={p}>{p}%</option>)}
                </CustomSelect>
              ) : (
                <Input value={filters.purity} disabled placeholder="Select category first" className={inputCls} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Customer Name</label>
              <Input value={filters.customerName} onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))} placeholder="Search by customer name" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Address</label>
            <Input value={filters.customerAddress} onChange={(e) => setFilters(prev => ({ ...prev, customerAddress: e.target.value }))} placeholder="Search by customer address" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Price (₹)</label>
              <Input type="number" value={filters.minPrice} onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))} placeholder="Minimum price" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Price (₹)</label>
              <Input type="number" value={filters.maxPrice} onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))} placeholder="Maximum price" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClearFilters} className="flex-1">Clear All Filters</Button>
            <Button onClick={handleApplyFilters} className="flex-1">Apply Filters</Button>
          </div>
        </div>
      </CustomModal>
      {/* ════════════════════════════════════════════════════════════════════════
          DELETE RANGE MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <CustomModal isOpen={isDeleteRangeModalOpen} onClose={() => setIsDeleteRangeModalOpen(false)} title="Delete Sales Range" size="md">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-red-700 text-sm">
              ⚠️ This will permanently delete all sales within the selected date range. This action cannot be undone.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <Input type="date" value={deleteRangeForm.startDate} onChange={(e) => setDeleteRangeForm(prev => ({ ...prev, startDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date *</label>
              <Input type="date" value={deleteRangeForm.endDate} onChange={(e) => setDeleteRangeForm(prev => ({ ...prev, endDate: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => { setIsDeleteRangeModalOpen(false); setDeleteRangeForm({ startDate: "", endDate: "" }); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleDeleteSalesRange}
              disabled={isSubmitting || !deleteRangeForm.startDate || !deleteRangeForm.endDate}
              className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? "Deleting..." : "Delete Sales"}
            </Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
