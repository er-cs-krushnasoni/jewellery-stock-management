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
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  // Loading states for rename and delete per category name
  const [isRenamingCategory, setIsRenamingCategory] = useState(null); // stores the name being renamed
  const [isDeletingCategory, setIsDeletingCategory] = useState(null); // stores the name being deleted

  const handleCardClick = (metalType, catName) => {
    navigate(`/${metalType.toLowerCase()}/${catName}`);
  };

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get('/api/metadata', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data.categoryTotals || {};

      const filtered = Object.entries(data)
  .filter(([key, val]) => {
    const keyEndsWithMetal = key.toLowerCase().endsWith('_' + metal.toLowerCase());
    const isOldFormat = !key.includes('_') && val.metal && val.metal.toLowerCase() === metal.toLowerCase();
    return keyEndsWithMetal || isOldFormat;
  })
  .map(([key, val]) => ({
    name: val.categoryName || (key.includes('_') ? key.split('_')[0] : key),
    grossWeight: val.grossWeight || 0,
    pureWeight: val.pureWeight || 0,
    totalItems: val.totalItems || 0,
    metal: val.metal || metal.toLowerCase()
  }))
  // ✅ Add this sort:
  .sort((a, b) => a.name.localeCompare(b.name, 'und', { sensitivity: 'base' }));
        

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
      setEditingCategoryValue("");
      return;
    }

    console.log("✏️ Renaming category:", oldName, "->", newName.trim());
    setIsRenamingCategory(oldName);

    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        '/api/config/categories/rename',
        { metalType: metal, oldName, newName: newName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Rename response:", response.data);
      await fetchMetadata();

      setEditingCategory(null);
      setEditingCategoryValue("");
      alert(`Category renamed from "${oldName}" to "${newName.trim()}" successfully!`);
    } catch (err) {
      console.error("❌ Error renaming category:", err);
      alert(err.response?.data?.error || "Error renaming category");
    } finally {
      setIsRenamingCategory(null);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}" and all its entries? This action cannot be undone.`)) {
      return;
    }

    console.log("🗑️ Deleting category:", categoryName);
    setIsDeletingCategory(categoryName);

    try {
      const token = localStorage.getItem("token");
      const response = await api.delete(
        `/api/config/categories`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { metalType: metal, categoryName }
        }
      );

      console.log("✅ Delete response:", response.data);
      await fetchMetadata();

      alert(`Category "${categoryName}" and ${response.data.deletedEntries} entries deleted successfully!`);
    } catch (err) {
      console.error("❌ Error deleting category:", err);
      alert(err.response?.data?.error || "Error deleting category");
    } finally {
      setIsDeletingCategory(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreatingLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/api/config/categories`,
        { metalType: metal, categoryName: newCategoryName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchMetadata();
      setNewCategoryName("");
      setIsCreating(false);
      alert(`Category "${newCategoryName.trim()}" created successfully!`);
    } catch (err) {
      console.error("❌ Error creating category:", err);
      alert(err.response?.data?.error || "Error creating category");
    } finally {
      setIsCreatingLoading(false);
    }
  };

  // Spinner SVG reused in multiple buttons
  const Spinner = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  if (loading) return <p className="p-4">{t("Loading...")}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
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
              onClick={() => handleCardClick(metal, cat.name)}
              className="cursor-pointer text-left w-full focus:outline-none focus:ring-4 focus:ring-blue-500/20 rounded-2xl transform hover:scale-105 transition-all duration-200 group"
            >
              <div className={cn(
                "bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 h-full p-6 hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50 group-hover:border-blue-400 dark:group-hover:border-blue-500",
                metal === "gold"
                  ? "border-yellow-400 dark:border-yellow-500"
                  : "border-gray-300 dark:border-gray-600"
              )}>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {cat.name}
                  </h2>
                  <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full group-hover:w-16 transition-all duration-300" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("Gross Weight")}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cat.grossWeight.toFixed(2)}g</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("Pure Weight")}</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{cat.pureWeight.toFixed(2)}g</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("Total Items")}</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{cat.totalItems}</span>
                  </div>
                </div>

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
            // Block closing while an operation is in progress
            if (isCreatingLoading || isRenamingCategory || isDeletingCategory) return;
            setConfigOpen(false);
            setEditingCategory(null);
            setEditingCategoryValue("");
            setNewCategoryName("");
            setIsCreating(false);
          }}
          title={`Manage ${metal.charAt(0).toUpperCase() + metal.slice(1)} Categories`}
        >
          <div className="space-y-6">

            {/* Add New Category */}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCategory();
                      if (e.key === 'Escape') { setIsCreating(false); setNewCategoryName(""); }
                    }}
                    autoFocus
                    disabled={isCreatingLoading}
                  />
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || isCreatingLoading}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]"
                  >
                    {isCreatingLoading ? <Spinner /> : <Save size={16} />}
                  </button>
                  <button
                    onClick={() => { setIsCreating(false); setNewCategoryName(""); }}
                    disabled={isCreatingLoading}
                    className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 font-medium px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No categories found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create your first category to get started</p>
                  </div>
                ) : (
                  categories.map((cat) => {
                    const isThisRenaming = isRenamingCategory === cat.name;
                    const isThisDeleting = isDeletingCategory === cat.name;
                    const isThisEditing = editingCategory === cat.name;
                    // Disable all actions if any operation is in progress
                    const anyBusy = !!isRenamingCategory || !!isDeletingCategory || isCreatingLoading;

                    return (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex-1 mr-3">
                          {isThisEditing ? (
                            <div className="flex gap-2 items-center">
                              <input
                                value={editingCategoryValue}
                                onChange={(e) => setEditingCategoryValue(e.target.value)}
                                className="flex-1 px-4 py-2 border-2 border-blue-400 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-blue-500 dark:text-gray-100"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameCategory(cat.name, editingCategoryValue);
                                  if (e.key === 'Escape') { setEditingCategory(null); setEditingCategoryValue(""); }
                                }}
                                disabled={isThisRenaming}
                                autoFocus
                              />
                              {/* Save rename button with spinner */}
                              <button
                                onClick={() => handleRenameCategory(cat.name, editingCategoryValue)}
                                disabled={
                                  !editingCategoryValue.trim() ||
                                  editingCategoryValue.trim() === cat.name ||
                                  isThisRenaming
                                }
                                className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex-shrink-0 flex items-center justify-center min-w-[32px] min-h-[32px]"
                                title="Save rename"
                              >
                                {isThisRenaming ? <Spinner /> : <Save size={14} />}
                              </button>
                              {/* Cancel rename button */}
                              <button
                                onClick={() => { setEditingCategory(null); setEditingCategoryValue(""); }}
                                disabled={isThisRenaming}
                                className="p-2 bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Cancel rename"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{cat.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {cat.totalItems} items • {cat.grossWeight.toFixed(2)}g gross
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Edit / Delete — hidden while this row is in edit mode */}
                        {!isThisEditing && (
                          <div className="flex gap-2 flex-shrink-0">
                            {/* Edit button */}
                            <button
                              onClick={() => {
                                setEditingCategory(cat.name);
                                setEditingCategoryValue(cat.name);
                              }}
                              disabled={anyBusy}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Rename category"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete button with spinner */}
                            <button
                              onClick={() => handleDeleteCategory(cat.name)}
                              disabled={anyBusy}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[32px] min-h-[32px]"
                              title="Delete category"
                            >
                              {isThisDeleting ? (
                                <svg className="animate-spin h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
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