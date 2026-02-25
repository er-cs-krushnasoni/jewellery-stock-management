// 📁 src/pages/CategoryPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Settings, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import { api } from "../config/api";

export default function CategoryPage() {
  const { metal } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCardClick = (metalType, catName) => {
    console.log("handleCardClick called with:", metalType, catName);
    console.log("Navigating to:", `/${metalType.toLowerCase()}/${catName}`);
    navigate(`/${metalType.toLowerCase()}/${catName}`);
  }; 

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Updated: Use centralized api instance
      const res = await api.get('/api/metadata', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = res.data.categoryTotals || {};
      
      console.log("🔍 CategoryPage - Raw metadata:", data);
      console.log("🔍 CategoryPage - URL metal param:", metal);
    
      // Filter categories for the specified metal
      const filtered = Object.entries(data)
        .filter(([key, val]) => {
          // New format: key ends with "_metal" (e.g., "Bracelet_gold", "Payal_gold")
          const keyEndsWithMetal = key.toLowerCase().endsWith('_' + metal.toLowerCase());
          
          // Old format: key has no underscore and val.metal matches (e.g., "Ring" with metal: "gold")
          const isOldFormat = !key.includes('_') && val.metal && val.metal.toLowerCase() === metal.toLowerCase();
          
          const matches = keyEndsWithMetal || isOldFormat;
          console.log(`🔍 Category key "${key}": ends with "_${metal}"? ${keyEndsWithMetal}, old format match? ${isOldFormat}, overall match? ${matches}`);
          return matches;
        })
        .map(([key, val]) => ({
          name: val.categoryName || (key.includes('_') ? key.split('_')[0] : key),
          grossWeight: val.grossWeight || 0,
          pureWeight: val.pureWeight || 0,
          totalItems: val.totalItems || 0,
          metal: val.metal || metal.toLowerCase()
        }));
    
      console.log("🔍 CategoryPage - Filtered categories:", filtered);
      setCategories(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [metal]);

  const handleRenameCategory = async (oldName, newName) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingCategory(null);
      return;
    }

    console.log("✏️ Renaming category:", oldName, "->", newName.trim());

    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        '/api/config/categories/rename',
        {
          metalType: metal,
          oldName: oldName,
          newName: newName.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log("✅ Rename response:", response.data);
      
      // Refresh the categories and wait for completion
      console.log("🔄 Refreshing metadata after rename...");
      await fetchMetadata();
      console.log("✅ Metadata refreshed after rename");
      
      setEditingCategory(null);
      alert(`Category renamed from "${oldName}" to "${newName.trim()}" successfully!`);
    } catch (err) {
      console.error("❌ Error renaming category:", err);
      console.error("❌ Error response:", err.response?.data);
      alert(err.response?.data?.error || "Error renaming category");
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}" and all its entries? This action cannot be undone.`)) {
      return;
    }

    console.log("🗑️ Deleting category:", categoryName);

    try {
      const token = localStorage.getItem("token");
      const response = await api.delete(
        `$/api/config/categories`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            metalType: metal,
            categoryName: categoryName
          }
        }
      );
      
      console.log("✅ Delete response:", response.data);
      
      // Refresh the categories and wait for completion
      console.log("🔄 Refreshing metadata after delete...");
      await fetchMetadata();
      console.log("✅ Metadata refreshed after delete");
      
      alert(`Category "${categoryName}" and ${response.data.deletedEntries} entries deleted successfully!`);
    } catch (err) {
      console.error("❌ Error deleting category:", err);
      console.error("❌ Error response:", err.response?.data);
      alert(err.response?.data?.error || "Error deleting category");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      console.log("❌ Category name is empty");
      return;
    }
  
    const requestData = {
      metalType: metal,
      categoryName: newCategoryName.trim()
    };
  
    console.log("🚀 Creating category with data:", requestData);
    console.log("🌐 API URL:", `${import.meta.env.VITE_API_BASE_URL}/api/config/categories`);
  
    try {
      const token = localStorage.getItem("token");
      console.log("🔑 Token exists:", !!token);
      
      const response = await api.post(
        `/api/config/categories`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log("✅ Backend response:", response.data);
      console.log("✅ Response status:", response.status);
      
      // Refresh categories and wait for it to complete
      console.log("🔄 Refreshing metadata...");
      await fetchMetadata();
      console.log("✅ Metadata refreshed");
      
      setNewCategoryName("");
      setIsCreating(false);
      
      alert(`Category "${newCategoryName.trim()}" created successfully! The category is now available for adding entries.`);
    } catch (err) {
      console.error("❌ Error creating category:", err);
      console.error("❌ Error response:", err.response?.data);
      console.error("❌ Error status:", err.response?.status);
      console.error("❌ Error headers:", err.response?.headers);
      alert(err.response?.data?.error || "Error creating category");
    }
  };

  if (loading) return <p className="p-4">{t("Loading...")}</p>;


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 dark:bg-gray-800/80 dark:border-gray-700/50">
          <BackButton to="/" label={t("Back to Home")} />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
            <h1 className="text-3xl lg:text-4xl font-bold capitalize bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-500">
              {t(metal)} Categories
            </h1>
            
            <button
              onClick={() => setConfigOpen(true)}
              className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-500 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <Settings size={16} />
              Config
            </button>
          </div>
        </div>
  
        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => {
                console.log(`Clicking on ${cat.name}`);
                handleCardClick(metal, cat.name);
              }}
              className="cursor-pointer text-left w-full focus:outline-none focus:ring-4 focus:ring-blue-500/20 rounded-2xl transform hover:scale-105 transition-all duration-200 group"
            >
              <div className={cn(
                "bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 h-full p-6 hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50 group-hover:border-blue-400 dark:group-hover:border-blue-500",
                metal === "gold" 
                  ? "border-yellow-400 dark:border-yellow-500" 
                  : "border-gray-300 dark:border-gray-600"
              )}>
                {/* Category Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {cat.name}
                  </h2>
                  <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full group-hover:w-16 transition-all duration-300"></div>
                </div>
  
                {/* Stats Grid */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("Gross Weight")}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {cat.grossWeight.toFixed(2)}g
                    </span>
                  </div>
  
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("Pure Weight")}
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {cat.pureWeight.toFixed(2)}g
                    </span>
                  </div>
  
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("Total Items")}
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {cat.totalItems}
                    </span>
                  </div>
                </div>
  
                {/* Metal Badge */}
                <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    Metal: {cat.metal}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
  
        {/* Configuration Modal */}
        <Modal
          isOpen={configOpen}
          onClose={() => {
            setConfigOpen(false);
            setEditingCategory(null);
            setNewCategoryName("");
            setIsCreating(false);
          }}
          title={`Manage ${metal.charAt(0).toUpperCase() + metal.slice(1)} Categories`}
        >
          <div className="space-y-6">
            {/* Add New Category Section */}
            <div className="border-b border-gray-200/50 dark:border-gray-700/50 pb-6">
              {!isCreating ? (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-500 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Create New Category
                </button>
              ) : (
                <div className="flex gap-3">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCategory();
                      }
                      if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewCategoryName("");
                      }
                    }}
                  />
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewCategoryName("");
                    }}
                    className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-500 font-medium px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
  
            {/* Existing Categories */}
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-4">
                Existing Categories
              </h3>
              <div className="space-y-3">
                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No categories found
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      Create your first category to get started
                    </p>
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex-1">
                        {editingCategory === cat.name ? (
                          <div className="flex gap-2">
                            <input
                              defaultValue={cat.name}
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameCategory(cat.name, e.target.value);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCategory(null);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value.trim() !== cat.name) {
                                  handleRenameCategory(cat.name, e.target.value);
                                } else {
                                  setEditingCategory(null);
                                }
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {cat.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {cat.totalItems} items • {cat.grossWeight.toFixed(2)}g gross
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (editingCategory === cat.name) {
                              setEditingCategory(null);
                            } else {
                              setEditingCategory(cat.name);
                            }
                          }}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.name)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
  
            {/* Footer Note */}
            <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> Creating a new category will add a placeholder entry. Deleting a category will remove all associated entries permanently.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}