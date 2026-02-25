import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../config/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/modal";
import { Select } from "../components/ui/select";
import { useTranslation } from "react-i18next";
import { Settings, Plus, Trash2, Edit2, Package } from "lucide-react";
import BackButton from "@/components/ui/BackButton";

export default function PurityPage() {
  const { metal, category } = useParams();
  const [purities, setPurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newPurity, setNewPurity] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editPurity, setEditPurity] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Add Item Form State
  const [addItemForm, setAddItemForm] = useState({
    weight: '',
    purity: '',
    isBulk: false,
    quantity: 1,
    notes: '' // Added notes field
  });
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchPurities = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/api/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      
      console.log("🔍 PurityPage - Raw metadata:", data.categoryTotals);
      console.log("🔍 PurityPage - Looking for metal:", metal, "category:", category);
      
      // Try to find the category data - handle both old and new formats
      let categoryData = null;
      
      // First, try the composite key format: "Bracelet_gold"
      const compositeKey = `${category}_${metal}`;
      if (data.categoryTotals?.[compositeKey]) {
        categoryData = data.categoryTotals[compositeKey];
        console.log("🔍 PurityPage - Found composite key:", compositeKey, categoryData);
      }
      // If not found, try the old format: "Bracelet" with metal check
      else if (data.categoryTotals?.[category]?.metal === metal) {
        categoryData = data.categoryTotals[category];
        console.log("🔍 PurityPage - Found old format key:", category, categoryData);
      }
      // If still not found, log all available keys for debugging
      else {
        console.log("🔍 PurityPage - Available keys:", Object.keys(data.categoryTotals || {}));
        console.log("🔍 PurityPage - No matching category found for:", metal, category);
      }
      
      const purityData = categoryData?.purities || {};
      console.log("🔍 PurityPage - Purity data:", purityData);
      
      const parsed = Object.entries(purityData).map(
        ([purity, values]) => ({
          purity,
          ...values,
        })
      );
      
      console.log("🔍 PurityPage - Parsed purities:", parsed);
      setPurities(parsed);
      
      // Set default purity for add item form if not set and purities exist
      if (parsed.length > 0 && (!addItemForm.purity || addItemForm.purity === '')) {
        setAddItemForm(prev => ({ ...prev, purity: parsed[0].purity }));
      }
    } catch (err) {
      console.error("❌ Error fetching purities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurities();
  }, [category, metal]);

  const handleClick = (purity) => {
    console.log("handleClick called with:", purity);
    console.log("Navigating to:", `/${metal}/${category}/${purity}`);
    navigate(`/${metal}/${category}/${purity}`);
  };

  const handleAddPurity = async () => {
    try {
      const purityValue = parseFloat(newPurity);
      if (isNaN(purityValue) || purityValue < 0 || purityValue > 100) {
        alert(t('Purity must be a number between 0-100%'));
        return;
      }
      const token = localStorage.getItem("token");
      await api.post(
        `/api/config/purities`,
        {
          metalType: metal,
          category,
          purity: purityValue
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setNewPurity('');
      await fetchPurities();
      alert(t('Purity level added successfully'));
    } catch (err) {
      console.error("Error adding purity:", err);
      alert(err.response?.data?.error || t('Error adding purity level'));
    }
  };

  const handleEditPurity = async () => {
    try {
      const oldPurityValue = parseFloat(editPurity);
      const newPurityValue = parseFloat(editValue);
      
      if (isNaN(newPurityValue) || newPurityValue < 0 || newPurityValue > 100) {
        alert(t('Purity must be a number between 0-100%'));
        return;
      }
      const token = localStorage.getItem("token");
      
      console.log("🔄 Editing purity:", {
        metalType: metal,
        categoryName: category,
        oldPurity: oldPurityValue,
        newPurity: newPurityValue
      });
      await api.post(
        `/api/config/purities/update`,
        {
          metalType: metal,
          categoryName: category,
          oldPurity: oldPurityValue,
          newPurity: newPurityValue
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setEditPurity(null);
      setEditValue('');
      await fetchPurities();
      alert(t('Purity level updated successfully'));
    } catch (err) {
      console.error("Error updating purity:", err);
      alert(err.response?.data?.error || t('Error updating purity level'));
    }
  };

  const handleDeletePurity = async (purity) => {
    try {
      const purityValue = parseFloat(purity);
      const token = localStorage.getItem("token");
      
      console.log("🗑️ Deleting purity:", {
        metalType: metal,
        categoryName: category,
        purity: purityValue
      });
      await api.delete(
        `/api/config/purities`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            metalType: metal,
            categoryName: category,
            purity: purityValue
          }
        }
      );
      setDeleteConfirm(null);
      await fetchPurities();
      alert(t('Purity level deleted successfully'));
    } catch (err) {
      console.error("Error deleting purity:", err);
      alert(err.response?.data?.error || t('Error deleting purity level'));
    }
  };

  const startEdit = (purity) => {
    setEditPurity(purity);
    setEditValue(purity);
  };

  const handleAddItemFormChange = (field, value) => {
    setAddItemForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // If bulk is turned off, reset quantity to 1
      if (field === 'isBulk' && !value) {
        updated.quantity = 1;
      }
      // If bulk is turned on and quantity is 1, set to empty for user input
      else if (field === 'isBulk' && value && prev.quantity === 1) {
        updated.quantity = '';
      }
      
      return updated;
    });
  };

  const resetAddItemForm = () => {
    setAddItemForm({
      weight: '',
      purity: purities.length > 0 ? purities[0].purity : '',
      isBulk: false,
      quantity: 1,
      notes: '' // Reset notes as well
    });
  };

  const handleAddItem = async () => {
    try {
      setSubmitting(true);
      
      // Validation
      const weight = parseFloat(addItemForm.weight);
      const purity = parseFloat(addItemForm.purity);
      const quantity = addItemForm.isBulk ? parseInt(addItemForm.quantity) : 1;
      
      if (isNaN(weight) || weight <= 0) {
        alert(t('Please enter a valid weight'));
        return;
      }
      
      if (isNaN(purity) || purity < 0 || purity > 100) {
        alert(t('Please select a valid purity'));
        return;
      }
      
      if (addItemForm.isBulk && (isNaN(quantity) || quantity <= 0)) {
        alert(t('Please enter a valid quantity for bulk entry'));
        return;
      }
      
      const token = localStorage.getItem("token");
      
      const entryData = {
        metalType: metal,
        category: category,
        purity: purity,
        weight: weight,
        isBulk: addItemForm.isBulk
      };
      
      // Add itemCount for bulk entries
      if (addItemForm.isBulk) {
        entryData.itemCount = quantity;
      }
      
      // Add notes if provided (trim whitespace, send null if empty)
      if (addItemForm.notes && addItemForm.notes.trim()) {
        entryData.notes = addItemForm.notes.trim();
      }
      
      console.log("🎯 Adding item:", entryData);
      
      const response = await api.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/entries`,
        entryData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log("✅ Item added successfully:", response.data);
      
      // Reset form after successful submission
      resetAddItemForm();
      setIsAddItemOpen(false);
      
      // Small delay before refreshing to ensure backend has processed
      setTimeout(async () => {
        await fetchPurities();
      }, 500);
      
      alert(t(addItemForm.isBulk ? 'Bulk entry added/updated successfully' : 'Item added successfully'));
      
    } catch (err) {
      console.error("❌ Error adding item:", err);
      alert(err.response?.data?.error || t('Error adding item'));
    } finally {
      setSubmitting(false);
    }
  };

  const openAddItemModal = () => {
    // Ensure we have the latest purities before opening modal
    if (purities.length > 0) {
      setAddItemForm(prev => ({
        ...prev,
        purity: prev.purity || purities[0].purity
      }));
    }
    setIsAddItemOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Back Button */}
        <div className="flex items-center">
          <BackButton 
            to={`/${metal}`} 
            label={t("Back to Categories")} 
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          />
        </div>
  
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 lg:p-8 dark:bg-gray-800/80 dark:border-gray-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-300">
                <span className="capitalize">{metal}</span> / {category}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                {t("Purities")}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={openAddItemModal}
                disabled={purities.length === 0}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 transform ${
                  purities.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl hover:scale-105'
                }`}
              >
                <Package size={18} />
                <span className="hidden sm:inline">{t("Add Item")}</span>
                <span className="sm:hidden">{t("Add")}</span>
              </button>
              
              <button
                onClick={() => setIsConfigOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700/80 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <Settings size={18} />
                <span className="hidden sm:inline">{t("Config")}</span>
              </button>
            </div>
          </div>
        </div>
  
        {/* Main Content */}
        {loading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-12 text-center dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">{t("Loading purities...")}</p>
          </div>
        ) : purities.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-12 text-center dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6 dark:from-gray-600 dark:to-gray-700">
              <Package size={32} className="text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t("No purities available.")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t("Use the Config button to add purity levels first")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {purities.map((p) => (
              <div
                key={p.purity}
                onClick={() => {
                  console.log(`Clicking on ${p.purity}% purity`);
                  handleClick(p.purity);
                }}
                className="group cursor-pointer"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 dark:bg-gray-800/80 dark:border-gray-700/50 h-full">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-600">
                        {p.purity}%
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {t("Purity")}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">{t("Gross Weight")}:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{p.grossWeight.toFixed(2)}g</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">{t("Pure Weight")}:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{p.pureWeight.toFixed(2)}g</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">{t("Total Items")}:</span>
                        <span className="font-medium text-blue-700 dark:text-blue-300">{p.totalItems}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
  
        {/* Add Item Modal */}
        <Modal
          isOpen={isAddItemOpen}
          onClose={() => {
            setIsAddItemOpen(false);
            resetAddItemForm();
          }}
          title={t("Add New Item")}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800/95 dark:border-gray-700/50">
            <div className="space-y-6">
              {/* Weight Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("Weight")} (g) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder={t("Enter weight in grams")}
                  value={addItemForm.weight}
                  onChange={(e) => handleAddItemFormChange('weight', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
  
              {/* Purity Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("Purity")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={addItemForm.purity}
                  onChange={(e) => handleAddItemFormChange('purity', e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">{t("Select Purity")}</option>
                  {purities.map((p) => (
                    <option key={p.purity} value={p.purity}>
                      {p.purity}%
                    </option>
                  ))}
                </select>
              </div>
  
              {/* Toggle Button for Bulk Entry */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t("Entry Type")}:
                  </label>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm transition-all duration-200 ${!addItemForm.isBulk ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {t("Single")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddItemFormChange('isBulk', !addItemForm.isBulk)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                        addItemForm.isBulk ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                          addItemForm.isBulk ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm transition-all duration-200 ${addItemForm.isBulk ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {t("Bulk")}
                    </span>
                  </div>
                </div>
              </div>
  
              {/* Quantity Input (only for bulk) */}
              {addItemForm.isBulk && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("Quantity")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder={t("Enter number of items")}
                    value={addItemForm.quantity}
                    onChange={(e) => handleAddItemFormChange('quantity', e.target.value)}
                    min="1"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
              )}
  
              {/* Notes Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("Notes")} <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">({t("Optional")})</span>
                </label>
                <textarea
                  placeholder={t("Add any notes or description for this item...")}
                  value={addItemForm.notes}
                  onChange={(e) => handleAddItemFormChange('notes', e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 resize-none dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                  {addItemForm.notes.length}/500 {t("characters")}
                </div>
              </div>
  
              {/* Info Text */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {addItemForm.isBulk ? (
                    <div className="space-y-2">
                      <p>
                        <strong className="text-blue-700 dark:text-blue-300">{t("Bulk Entry")}:</strong> {t("If a bulk entry already exists for this purity, it will be updated with the new weight and quantity.")}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {t("Notes will be appended to existing notes if any.")}
                      </p>
                    </div>
                  ) : (
                    <p>
                      <strong className="text-blue-700 dark:text-blue-300">{t("Single Entry")}:</strong> {t("This will add one individual item entry with the specified notes.")}
                    </p>
                  )}
                </div>
              </div>
  
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsAddItemOpen(false);
                    resetAddItemForm();
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700/80 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={submitting || !addItemForm.weight || !addItemForm.purity}
                  className={`flex-1 px-6 py-3 font-medium rounded-xl shadow-lg transition-all duration-200 transform ${
                    submitting || !addItemForm.weight || !addItemForm.purity
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t("Adding...")}
                    </span>
                  ) : (
                    t("Add Item")
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
  
        {/* Purity Config Modal */}
        <Modal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          title={t("Manage Purities")}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800/95 dark:border-gray-700/50">
            <div className="space-y-6">
              {/* Add New Purity */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {t("Add New Purity Level")}
                </h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder={t("Enter purity (0-100%)")}
                    value={newPurity}
                    onChange={(e) => setNewPurity(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                  <button
                    onClick={handleAddPurity}
                    className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
  
              {/* Existing Purities */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {t("Existing Purities")}
                </h3>
                {purities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 dark:from-gray-600 dark:to-gray-700">
                      <Package size={32} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{t("No purities available")}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {purities.map((p) => (
                      <div
                        key={p.purity}
                        className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800/80 dark:border-gray-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {p.purity}%
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                ({p.totalItems} {t("items")}, {p.grossWeight.toFixed(2)}g)
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(p.purity)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(p.purity)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
  
        {/* Edit Purity Modal */}
        <Modal
          isOpen={editPurity !== null}
          onClose={() => {
            setEditPurity(null);
            setEditValue('');
          }}
          title={t("Edit Purity Level")}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 p-6 max-w-md w-full dark:bg-gray-800/95 dark:border-gray-700/50">
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-700 dark:text-gray-300">
                  {t("Edit purity level from")} <span className="font-bold text-blue-600 dark:text-blue-400">{editPurity}%</span> {t("to")}:
                </p>
              </div>
              
              <input
                type="number"
                placeholder={t("Enter new purity (0-100%)")}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
              />
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setEditPurity(null);
                    setEditValue('');
                  }}
                  className="flex-1 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700/80 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleEditPurity}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {t("Update")}
                </button>
              </div>
            </div>
          </div>
        </Modal>
  
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteConfirm !== null}
          onClose={() => setDeleteConfirm(null)}
          title={t("Confirm Delete")}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 p-6 max-w-md w-full dark:bg-gray-800/95 dark:border-gray-700/50">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-white" />
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  {t("Are you sure you want to delete the")} <span className="font-bold text-red-600 dark:text-red-400">{deleteConfirm}%</span> {t("purity level")}?
                </p>
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {t("This will also delete all entries under this purity level!")}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-700/80 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={() => handleDeletePurity(deleteConfirm)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {t("Delete")}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}