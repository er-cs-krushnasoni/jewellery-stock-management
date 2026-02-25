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
      {/* Modern backdrop with blur effect */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modern modal container with glassmorphism */}
        <div className={`relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 dark:bg-gray-800/95 dark:border-gray-700/50`}>
          
          {/* Modern header with better spacing */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content area with modern spacing */}
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
      
      {/* Modern toggle switch with smooth transitions */}
      <div
        onClick={() => onChange({ target: { checked: !checked } })}
        className={`w-12 h-6 rounded-full cursor-pointer transition-all duration-300 shadow-inner focus:ring-4 focus:ring-blue-500/20 ${
          checked 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg' 
            : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
        }`}
      >
        {/* Modern toggle handle with enhanced styling */}
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          } mt-0.5 ring-2 ring-white/20`}
        />
      </div>
    </div>
    
    {/* Modern label with better typography */}
    <label 
      htmlFor={id} 
      className="text-sm font-medium cursor-pointer text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
    >
      {label}
    </label>
  </div>
);

// Mobile number validation function
const validateMobileNumber = (number) => {
  const cleanNumber = number.replace(/\D/g, ''); // Remove non-digits
  return cleanNumber.slice(0, 10); // Limit to 10 digits
};

// Sort sales by date (newest first)
const sortSales = (sales) => {
  return [...sales].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
};

export default function SalesPage() {
  const { t } = useTranslation();
  
  // Main state
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Add these to your existing state declarations
const [isDeleteRangeModalOpen, setIsDeleteRangeModalOpen] = useState(false);
const [deleteRangeForm, setDeleteRangeForm] = useState({
  startDate: "",
  endDate: ""
});
  
  // Form states
  const [saleForm, setSaleForm] = useState({
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
    showCustomerInfo: false,
    manualSoldDate: false,  // Add this
    soldDate: ""            // Add this
  });
  
  const [editForm, setEditForm] = useState({
    salesPrice: "",
    customerName: "",
    customerAddress: "",
    customerMobile: ""
  });
  
  const [editingSale, setEditingSale] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    metalType: "",
    category: "",
    purity: "",
    minPrice: "",
    maxPrice: "",
    customerName: "",
    customerAddress: "" 
  });
  const [activeFilters, setActiveFilters] = useState({});
  
  
  // Dropdown options
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availablePurities, setAvailablePurities] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  
  // Fetch sales data
  const fetchSales = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(
        `/api/sales?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const sortedSales = sortSales(response.data.sales || []);
      setSales(sortedSales);
      
    } catch (err) {
      console.error("Error fetching sales:", err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };
  // Date format validation (dd/mm/yyyy)
const validateDateFormat = (dateString) => {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  
  return true;
};
  
// Fetch categories based on metal type
const fetchCategories = async (metalType) => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.get(
      `/api/metadata`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data?.categoryTotals) {
      const categories = Object.values(response.data.categoryTotals)
        .filter(cat => cat.metal === metalType)
        .map(cat => cat.categoryName);
      setAvailableCategories([...new Set(categories)]);
    }
  } catch (err) {
    console.error("Error fetching categories:", err);
    setAvailableCategories([]);
  }
};

// Fetch purities based on metal type and category
const fetchPurities = async (metalType, category) => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.get(
      `/api/metadata`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data?.categoryTotals) {
      const categoryKey = `${category}_${metalType}`;
      const categoryData = response.data.categoryTotals[categoryKey];
      
      if (categoryData?.purities) {
        const purities = Object.keys(categoryData.purities).map(Number);
        setAvailablePurities(purities.sort((a, b) => b - a));
      } else {
        setAvailablePurities([]);
      }
    }
  } catch (err) {
    console.error("Error fetching purities:", err);
    setAvailablePurities([]);
  }
};
  
const searchCustomers = async (query) => {
  if (!query.trim()) {
    setCustomerSuggestions([]);
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    const response = await api.get(
      `/api/sales/customers/search?q=${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setCustomerSuggestions(response.data.customers || []);
  } catch (err) {
    console.error("Error searching customers:", err);
    setCustomerSuggestions([]);
  }
};
  
  // Handle form changes
  const handleSaleFormChange = (field, value) => {
    setSaleForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Fetch categories when metal type changes
      if (field === 'metalType') {
        updated.category = '';
        updated.purity = '';
        fetchCategories(value);
      }
      
      // Fetch purities when category changes
      if (field === 'category') {
        updated.purity = '';
        if (updated.metalType && value) {
          fetchPurities(updated.metalType, value);
        }
      }
      
      return updated;
    });
  };

  // Handle filter form changes
const handleFilterChange = (field, value) => {
  setFilters(prev => {
    const updated = { ...prev, [field]: value };
    
    // Fetch categories when metal type changes (reuse existing function)
    if (field === 'metalType') {
      updated.category = '';
      updated.purity = '';
      if (value && value !== '') {
        fetchCategories(value); // This will update availableCategories
      } else {
        setAvailableCategories([]);
        setAvailablePurities([]);
      }
    }
    
    // Fetch purities when category changes (reuse existing function)
    if (field === 'category') {
      updated.purity = '';
      if (updated.metalType && value) {
        fetchPurities(updated.metalType, value); // This will update availablePurities
      } else {
        setAvailablePurities([]);
      }
    }
    
    return updated;
  });
};
  
  // Validate sale form
  const validateSaleForm = () => {
    const { metalType, category, purity, weight, salesPrice, isBulk, itemCount } = saleForm;
    
    if (!metalType || !category || !purity || !weight || !salesPrice) {
      alert("Please fill in all required fields");
      return false;
    }
    
    if (parseFloat(weight) <= 0) {
      alert("Weight must be greater than 0");
      return false;
    }
    
    if (parseFloat(salesPrice) <= 0) {
      alert("Sales price must be greater than 0");
      return false;
    }
    
    if (isBulk && (!itemCount || parseInt(itemCount) <= 0)) {
      alert("Item count is required for bulk sales");
      return false;
    }
    
    return true;
  };
  
  // Create sale with confirmation
  const handleCreateSale = async () => {
    if (!validateSaleForm()) return;
    
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      
      const saleData = {
        metalType: saleForm.metalType,
        category: saleForm.category,
        purity: parseFloat(saleForm.purity),
        weight: parseFloat(saleForm.weight),
        salesPrice: parseFloat(saleForm.salesPrice),
        isBulk: saleForm.isBulk,
        ...(saleForm.isBulk && { itemCount: parseInt(saleForm.itemCount) }),
        // Remove the conditional spread and make these always present
        customerName: saleForm.customerName || undefined,
        customerAddress: saleForm.customerAddress || undefined,
        customerMobile: saleForm.customerMobile || undefined,
        ...(saleForm.manualSoldDate && saleForm.soldDate && { soldAt: saleForm.soldDate })

      };
      
      // Show confirmation data
      const pureWeight = (saleData.weight * saleData.purity / 100).toFixed(3);
      setConfirmationData({
        ...saleData,
        pureWeight
      });
      setIsConfirmModalOpen(true);
      
    } catch (err) {
      console.error("Error preparing sale:", err);
      alert("Error preparing sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Confirm and submit sale
  const confirmSale = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      
      await api.post(
        `/api/sales`,
        confirmationData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reset forms and close modals
      setSaleForm({
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
        showCustomerInfo: false,
        manualSoldDate: false,  // Add this
        soldDate: ""            // Add this
      });
      
      setIsAddModalOpen(false);
      setIsConfirmModalOpen(false);
      setConfirmationData(null);
      
      // Refresh data
      fetchSales();
      
      alert("Sale created successfully!");
      
    } catch (err) {
      console.error("Error creating sale:", err);
      alert(err.response?.data?.message || "Error creating sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Edit sale
  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setEditForm({
      salesPrice: sale.salesPrice.toString(),
      customerName: sale.customerName || "",
      customerAddress: sale.customerAddress || "",
      customerMobile: sale.customerMobile || ""
    });
    setIsEditModalOpen(true);
  };
  
  // Update sale
  const handleUpdateSale = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      
      await api.put(
        `/api/sales/${editingSale._id}`,
        {
          salesPrice: parseFloat(editForm.salesPrice),
          customerName: editForm.customerName,
          customerAddress: editForm.customerAddress,
          customerMobile: editForm.customerMobile
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
  
  // Delete sale
  const handleDeleteSale = async (saleId) => {
    if (!confirm("Are you sure you want to delete this sale? This action cannot be undone.")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      
      await api.delete(
        `/api/sales/${saleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchSales();
      alert("Sale deleted successfully!");
      
    } catch (err) {
      console.error("Error deleting sale:", err);
      alert(err.response?.data?.message || "Error deleting sale. Please try again.");
    }
  };
  
  // Return sale to inventory
  const handleReturnSale = async (saleId) => {
    if (!confirm("Are you sure you want to return this sale to inventory?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      
      await api.post(
        `/api/sales/${saleId}/return`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchSales();
      alert("Sale returned to inventory successfully!");
      
    } catch (err) {
      console.error("Error returning sale:", err);
      alert(err.response?.data?.message || "Error returning sale. Please try again.");
    }
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    setActiveFilters(filters);
    setIsFilterOpen(false);
  };
  
// Clear filters
const handleClearFilters = () => {
  setFilters({
    startDate: "",
    endDate: "",
    metalType: "",
    category: "",
    purity: "",
    minPrice: "",
    maxPrice: "",
    customerName: "",
    customerAddress: "" // Add this line
  });
  setActiveFilters({});
  
  // Clear existing dropdown options
  setAvailableCategories([]);
  setAvailablePurities([]);
};

// Delete sales range
const handleDeleteSalesRange = async () => {
  if (!deleteRangeForm.startDate || !deleteRangeForm.endDate) {
    alert("Please select both start and end dates");
    return;
  }

  // HTML5 date inputs already provide dates in yyyy-mm-dd format
  const startDate = deleteRangeForm.startDate;
  const endDate = deleteRangeForm.endDate;

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start date cannot be after end date");
    return;
  }

  try {
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    
    // First, get count of sales in range for confirmation
    const countResponse = await api.get(
      `/api/sales/count-range?startDate=${startDate}&endDate=${endDate}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const salesCount = countResponse.data.count;
    
    if (salesCount === 0) {
      alert("No sales found in the selected date range");
      setIsSubmitting(false);
      return;
    }

    // Format dates for display in confirmation (convert yyyy-mm-dd to dd/mm/yyyy)
    const formatDateForDisplay = (dateStr) => {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const displayStartDate = formatDateForDisplay(startDate);
    const displayEndDate = formatDateForDisplay(endDate);

    if (!confirm(`Are you sure you want to delete ${salesCount} sales from ${displayStartDate} to ${displayEndDate}? This action cannot be undone.`)) {
      setIsSubmitting(false);
      return;
    }

    // Delete sales in range via backend API
    await api.delete(
      `/api/sales/range`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { startDate, endDate }
      }
    );

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
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Initialize data
  useEffect(() => {
    fetchSales();
    fetchCategories("gold"); // Uncomment this line
  }, [activeFilters]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">Loading sales...</div>
      </div>
    );
  }
  
  return (
    // <div className="p-4 space-y-4">
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen dark:bg-gray-900">

      {/* Header */}
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full"> */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 dark:bg-gray-800/80 dark:border-gray-700/50">

  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={() => setIsDeleteRangeModalOpen(true)}
      // className="flex items-center gap-2 text-red-600 hover:text-red-700"
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
      // className="flex items-center gap-2"
      className="flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
      
    >
      <Filter size={16} />
      Filter
    </Button>
    <Button
      onClick={() => setIsAddModalOpen(true)}
      // className="flex items-center gap-2"
      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
    >
      <ShoppingCart size={16} />
      Add New Sale
    </Button>
  </div>
</div>

      
      {/* Active Filters Display */}
      {Object.keys(activeFilters).length > 0 && (
        // <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-2 items-center bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-4 dark:bg-gray-800/80 dark:border-gray-700/50">

          {/* <span className="text-sm text-gray-600">Active filters:</span> */}
          <span className="text-sm text-gray-600 font-medium dark:text-gray-300">Active filters:</span>

          {Object.entries(activeFilters).map(([key, value]) => (
            <span
              key={key}
              // className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-xs font-medium border border-blue-300/50 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-200 dark:border-blue-600/50"

            >
              {key}: {value}
            </span>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-red-600 hover:text-red-700"
          >
            Clear All
          </Button>
        </div>
      )}
      
{/* Sales List */}
<div className="space-y-4">
  {sales.length === 0 ? (
    <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50">
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
          {/* Mobile-first responsive layout */}
          <div className="space-y-4">
            {/* Sale Info Section */}
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
              
              {/* Weight and Price - Stack on mobile */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1">
                  <Weight size={14} />
                  <span>Gross: {sale.weight}g • Pure: {(sale.weight * sale.purity / 100).toFixed(3)}g</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-green-600">
                    {formatCurrency(sale.salesPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{formatDate(sale.soldAt)}</span>
                </div>
              </div>
              
              {/* Customer Info - Stack on mobile */}
              {(sale.customerName || sale.customerAddress || sale.customerMobile) && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-300 pt-2 border-t dark:border-gray-600">
                  {sale.customerName && (
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>{sale.customerName}</span>
                    </div>
                  )}
                  {sale.customerAddress && (
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span className="break-words">{sale.customerAddress}</span>
                    </div>
                  )}
                  {sale.customerMobile && (
                    <div className="flex items-center gap-1">
                      <Phone size={14} />
                      <span>{sale.customerMobile}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Actions Section - Full width on mobile, horizontal on desktop */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t dark:border-gray-600">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditSale(sale)}
                className="flex items-center justify-center gap-1 w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 dark:border-gray-600 dark:hover:border-gray-500"
              >
                <Edit size={14} />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteSale(sale._id)}
                className="flex items-center justify-center gap-1 w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium border-2 border-red-200 text-red-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 dark:border-red-600 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReturnSale(sale._id)}
                className="flex items-center justify-center gap-1 w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm font-medium border-2 border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
              >
                <RotateCcw size={14} />
                Return
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    ))
  )}
</div>
      
      {/* Add Sale Modal */}
      <CustomModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Sale"
        size="lg"
      >
        <div className="space-y-4">
          {/* Metal Type */}
          <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Metal Type *</label>
                      <CustomSelect
              value={saleForm.metalType}
              onValueChange={(value) => handleSaleFormChange('metalType', value)}
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </CustomSelect>
          </div>
          
          {/* Category */}
<div>
  <label className="block text-sm font-medium mb-1">Category *</label>
  <CustomSelect
    value={saleForm.category}
    onValueChange={(value) => handleSaleFormChange('category', value)}
  >
    <option value="">Select Category</option>
    {availableCategories.map(category => (
      <option key={category} value={category}>{category}</option>
    ))}
  </CustomSelect>
</div>
          
          {/* Purity */}
<div>
  <label className="block text-sm font-medium mb-1">Purity *</label>
  <CustomSelect
    value={saleForm.purity}
    onValueChange={(value) => handleSaleFormChange('purity', value)}
  >
    <option value="">Select Purity</option>
    {availablePurities.map(purity => (
      <option key={purity} value={purity}>{purity}%</option>
    ))}
  </CustomSelect>
</div>
          
          {/* Weight */}
          <div>
            <label className="block text-sm font-medium mb-1">Weight (grams) *</label>
            <Input
              type="number"
              step="0.001"
              value={saleForm.weight}
              onChange={(e) => handleSaleFormChange('weight', e.target.value)}
              placeholder="Enter weight"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>
          
          {/* Sales Price */}
          <div>
            <label className="block text-sm font-medium mb-1">Sales Price (₹) *</label>
            <Input
              type="number"
              step="0.01"
              value={saleForm.salesPrice}
              onChange={(e) => handleSaleFormChange('salesPrice', e.target.value)}
              placeholder="Enter sales price"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

            />
          </div>
          
  
          {/* Customer Info Toggle */}
          <div className="border-t pt-4">
          <div className="mb-4">
  <CustomToggle
    id="customerInfo"
    checked={saleForm.showCustomerInfo}
    onChange={(e) => handleSaleFormChange('showCustomerInfo', e.target.checked)}
    label="Add Customer Information"
  />
</div>
            
            {saleForm.showCustomerInfo && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input
                    value={saleForm.customerName}
                    onChange={(e) => handleSaleFormChange('customerName', e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Address</label>
                  <Textarea
                    value={saleForm.customerAddress}
                    onChange={(e) => handleSaleFormChange('customerAddress', e.target.value)}
                    placeholder="Enter customer address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Mobile</label>
                  <Input
  type="tel"
  value={saleForm.customerMobile}
  onChange={(e) => {
    const validatedNumber = validateMobileNumber(e.target.value);
    handleSaleFormChange('customerMobile', validatedNumber);
  }}
  placeholder="Enter 10-digit mobile number"
  maxLength="10"
  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

/>
{saleForm.customerMobile && saleForm.customerMobile.length !== 10 && (
  <p className="text-red-500 text-xs mt-1">Mobile number must be exactly 10 digits</p>
)}
                </div>
              </div>
            )}
          </div>


{/* Manual Sold Date Toggle - Add this section before the Actions */}
<div className="border-t pt-4">
  <div className="mb-4">
    <CustomToggle
      id="manualSoldDate"
      checked={saleForm.manualSoldDate}
      onChange={(e) => handleSaleFormChange('manualSoldDate', e.target.checked)}
      label="Enter Sold Date Manually"
    />
  </div>
  
  {saleForm.manualSoldDate && (
    <div>
      <label className="block text-sm font-medium mb-1">Sold Date</label>
      <Input
        type="date"
        value={saleForm.soldDate}
        onChange={(e) => handleSaleFormChange('soldDate', e.target.value)}
        max={new Date().toISOString().split('T')[0]} // Prevent future dates
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

      />
    </div>
  )}
</div>

          {/* Bulk Toggle */}
          <CustomToggle
            id="bulkSale"
            checked={saleForm.isBulk}
            onChange={(e) => handleSaleFormChange('isBulk', e.target.checked)}
            label="Bulk Sale (deduct from bulk entry directly)"
          />
          
          {/* Item Count (if bulk) */}
          {saleForm.isBulk && (
            <div>
              <label className="block text-sm font-medium mb-1">Item Count *</label>
              <Input
                type="number"
                value={saleForm.itemCount}
                onChange={(e) => handleSaleFormChange('itemCount', e.target.value)}
                placeholder="Enter item count"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

              />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSale}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Create Sale"}
            </Button>
          </div>
        </div>
      </CustomModal>
      
      {/* Confirmation Modal */}
      <CustomModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Sale"
      >
        {confirmationData && (
          <div className="space-y-4">
<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 dark:text-gray-200">This sale will deduct from inventory:</h4>
            <div className="space-y-1 text-sm dark:text-gray-300">
                              <p><strong>Item:</strong> {confirmationData.metalType} {confirmationData.category} {confirmationData.purity}%</p>
                <p><strong>Gross Weight:</strong> {confirmationData.weight}g</p>
                <p><strong>Pure Weight:</strong> {confirmationData.pureWeight}g</p>
                <p><strong>Sale Price:</strong> {formatCurrency(confirmationData.salesPrice)}</p>
                {confirmationData.isBulk && (
                  <p><strong>Item Count:</strong> {confirmationData.itemCount}</p>
                )}
                {confirmationData.customerName && (
                  <p><strong>Customer:</strong> {confirmationData.customerName}</p>
                )}
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                            <p className="text-red-700 text-sm">
                ⚠️ This action will deduct items from your inventory. Use "Return to Inventory" option if you need to reverse this sale later.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSale}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Sale..." : "Confirm Sale"}
              </Button>
            </div>
          </div>
        )}
      </CustomModal>
      
      {/* Edit Sale Modal */}
      <CustomModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Sale"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sales Price (₹) *</label>
            <Input
              type="number"
              step="1"
              value={editForm.salesPrice}
              onChange={(e) => setEditForm(prev => ({ ...prev, salesPrice: e.target.value }))}
              placeholder="Enter sales price"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <Input
              value={editForm.customerName}
              onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Enter customer name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Customer Address</label>
            <Textarea
              value={editForm.customerAddress}
              onChange={(e) => setEditForm(prev => ({ ...prev, customerAddress: e.target.value }))}
              placeholder="Enter customer address"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Customer Mobile</label>
            <Input
  type="tel"
  value={editForm.customerMobile}
  onChange={(e) => {
    const validatedNumber = validateMobileNumber(e.target.value);
    setEditForm(prev => ({ ...prev, customerMobile: validatedNumber }));
  }}
  placeholder="Enter 10-digit mobile number"
  maxLength="10"
  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

/>
{editForm.customerMobile && editForm.customerMobile.length !== 10 && (
  <p className="text-red-500 text-xs mt-1">Mobile number must be exactly 10 digits</p>
)}
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSale}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Sale"}
            </Button>
          </div>
        </div>
      </CustomModal>
      
      {/* Filter Modal */}
      <CustomModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Sales"
        size="lg"
      >
        <div className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

              />
            </div>
          </div>
          
{/* Metal Type & Category */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium mb-1">Metal Type</label>
    <CustomSelect
      value={filters.metalType}
      onValueChange={(value) => handleFilterChange('metalType', value)}
    >
      <option value="">All Metal Types</option>
      <option value="gold">Gold</option>
      <option value="silver">Silver</option>
    </CustomSelect>
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Category</label>
    {filters.metalType && filters.metalType !== '' ? (
      <CustomSelect
        value={filters.category}
        onValueChange={(value) => handleFilterChange('category', value)}
      >
        <option value="">All Categories</option>
        {availableCategories.map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </CustomSelect>
    ) : (
      <Input
        value={filters.category}
        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
        placeholder="Enter category"
        disabled
        // className="bg-gray-100"
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

        
      />
    )}
  </div>
</div>


{/* Purity & Customer Name */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium mb-1">Purity</label>
    {filters.metalType && filters.category && filters.metalType !== '' && filters.category !== '' ? (
      <CustomSelect
        value={filters.purity}
        onValueChange={(value) => handleFilterChange('purity', value)}
      >
        <option value="">All Purities</option>
        {availablePurities.map(purity => (
          <option key={purity} value={purity}>{purity}%</option>
        ))}
      </CustomSelect>
    ) : (
      <Input
        value={filters.purity}
        onChange={(e) => setFilters(prev => ({ ...prev, purity: e.target.value }))}
        placeholder="Enter purity (e.g., 22)"
        disabled
        // className="bg-gray-100"
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

      />
    )}
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Customer Name</label>
    <Input
      value={filters.customerName}
      onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
      placeholder="Search by customer name"
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

    />
  </div>
</div>

{/* Customer Address */}
<div>
  <label className="block text-sm font-medium mb-1">Customer Address</label>
  <Input
    value={filters.customerAddress}
    onChange={(e) => setFilters(prev => ({ ...prev, customerAddress: e.target.value }))}
    placeholder="Search by customer address"
  />
</div>
          
          {/* Price Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Price (₹)</label>
              <Input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                placeholder="Minimum price"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Price (₹)</label>
              <Input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                placeholder="Maximum price"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

              />
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1"
            >
              Clear All Filters
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* Delete Sales Range Modal */}
      <CustomModal
  isOpen={isDeleteRangeModalOpen}
  onClose={() => setIsDeleteRangeModalOpen(false)}
  title="Delete Sales Range"
  size="md"
>
  <div className="space-y-4">
  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-700 text-sm">
        ⚠️ This will permanently delete all sales within the selected date range. This action cannot be undone.
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Start Date *</label>
        <Input
          type="date"
          value={deleteRangeForm.startDate}
          onChange={(e) => setDeleteRangeForm(prev => ({ ...prev, startDate: e.target.value }))}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">End Date *</label>
        <Input
          type="date"
          value={deleteRangeForm.endDate}
          onChange={(e) => setDeleteRangeForm(prev => ({ ...prev, endDate: e.target.value }))}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

        />
      </div>
    </div>
    
    <div className="flex gap-2 pt-4">
      <Button
        variant="outline"
        onClick={() => {
          setIsDeleteRangeModalOpen(false);
          setDeleteRangeForm({ startDate: "", endDate: "" });
        }}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        onClick={handleDeleteSalesRange}
        disabled={isSubmitting || !deleteRangeForm.startDate || !deleteRangeForm.endDate}
        className="bg-red-600 hover:bg-red-700"
      >
        {isSubmitting ? "Deleting..." : "Delete Sales"}
      </Button>
    </div>
  </div>
</CustomModal>
    </div>
  );
}