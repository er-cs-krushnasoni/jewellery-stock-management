import { useEffect, useState, useRef } from "react";

import axios from "axios";

import { api } from "../config/api";

import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Filter, Plus, Search, X, Trash2 } from "lucide-react";

// Custom Modal Component

const CustomModal = ({ isOpen, onClose, title, children }) => {

  if (!isOpen) return null;

  return (

    <div className="fixed inset-0 z-50 overflow-y-auto">

      <div

        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"

        onClick={onClose}

      />

      <div className="flex min-h-full items-center justify-center p-4">

        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 max-w-md w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800/95 dark:border-gray-700/50">

          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>

            <button

              onClick={onClose}

              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"

            >

              <X size={20} />

            </button>

          </div>

          <div className="p-6">{children}</div>

        </div>

      </div>

    </div>

  );

};

// Multi-select checkbox list component

const MultiSelectList = ({ options, selected, onChange, disabled, placeholder }) => {

  const toggle = (val) => {

    if (selected.includes(val)) {

      onChange(selected.filter((v) => v !== val));

    } else {

      onChange([...selected, val]);

    }

  };

  if (disabled || options.length === 0) {

    return (

      <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-400 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-500 text-sm">

        {placeholder}

      </div>

    );

  }

  return (

    <div className="border-2 border-gray-200 rounded-xl overflow-hidden dark:border-gray-600">

      {options.map((opt, idx) => (

        <label

          key={opt}

          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${

            idx !== 0 ? "border-t border-gray-100 dark:border-gray-700" : ""

          } ${selected.includes(opt) ? "bg-blue-50/80 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"}`}

        >

          <input

            type="checkbox"

            checked={selected.includes(opt)}

            onChange={() => toggle(opt)}

            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"

          />

          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt}</span>

        </label>

      ))}

    </div>

  );

};

// Custom sorting function — newest first

const sortEntries = (entries) => {

  return [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

};

export default function Entries() {

  const { t } = useTranslation();

  const topRef = useRef(null);

  // Main state

  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);

  const [metadata, setMetadata] = useState(null);

  // Delete loading state

  const [deletingId, setDeletingId] = useState(null);

  // Edit state — full form

  const [editingId, setEditingId] = useState(null);

  const [editForm, setEditForm] = useState({

    metalType: "",

    category: "",

    purity: "",

    weight: "",

    itemCount: "",

    notes: "",

    isBulk: false,

  });

  // Add item state

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [addForm, setAddForm] = useState({

    metalType: "gold",

    category: "",

    purity: "",

    weight: "",

    itemCount: "",

    notes: "",

    isBulk: false,

  });

  // Filter state — categories and purities are arrays for multi-select

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState({

    metalType: "",

    categories: [],       // multi-select

    purities: [],         // multi-select

    minWeight: "",

    maxWeight: "",

    keyword: "",

    useGrossWeight: true,

  });

  const [activeFilters, setActiveFilters] = useState({});

  // Available options for add/edit dropdowns

  const [availableCategories, setAvailableCategories] = useState([]);

  const [availablePurities, setAvailablePurities] = useState([]);

  // Available options for edit form dropdowns

  const [editAvailableCategories, setEditAvailableCategories] = useState([]);

  const [editAvailablePurities, setEditAvailablePurities] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Fetch data ───────────────────────────────────────────────

  const fetchData = async () => {

    setLoading(true);

    try {

      const token = localStorage.getItem("token");

      const entriesParams = new URLSearchParams();

      // Pass only single-value filters to backend; multi-select handled on frontend

      if (activeFilters.metalType) entriesParams.append("metalType", activeFilters.metalType);

      if (activeFilters.minWeight || activeFilters.maxWeight) {

        entriesParams.append("sortBy", "weight");

        if (activeFilters.minWeight) entriesParams.append("minWeight", activeFilters.minWeight);

        if (activeFilters.maxWeight) entriesParams.append("maxWeight", activeFilters.maxWeight);

        if (activeFilters.useGrossWeight !== undefined)

          entriesParams.append("useGrossWeight", activeFilters.useGrossWeight);

      }

      const [entriesRes, metadataRes] = await Promise.all([

        api.get(`/api/entries?${entriesParams}`, {

          headers: { Authorization: `Bearer ${token}` },

        }),

        api.get(`/api/metadata`, {

          headers: { Authorization: `Bearer ${token}` },

        }),

      ]);

      const raw = entriesRes.data.entries || [];

      if (activeFilters.minWeight || activeFilters.maxWeight) {

        setEntries(raw);

      } else {

        setEntries(sortEntries(raw));

      }

      setMetadata(metadataRes.data);

    } catch (err) {

      console.error("Error fetching data:", err);

      setEntries([]);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchData();

    // Scroll to top on filter change

    topRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [activeFilters]);

  // ─── Derived: filtered entries (keyword + multi-select categories/purities) ───

  const filteredEntries = (() => {

    let list = entries;

    // keyword filter on notes

    if (activeFilters.keyword) {

      list = list.filter(

        (e) => e.notes && e.notes.toLowerCase().includes(activeFilters.keyword.toLowerCase())

      );

    }

    // multi-select categories

    if (activeFilters.categories && activeFilters.categories.length > 0) {

      list = list.filter((e) => activeFilters.categories.includes(e.category));

    }

    // multi-select purities

    if (activeFilters.purities && activeFilters.purities.length > 0) {

      list = list.filter((e) =>

        activeFilters.purities.includes(String(e.purity)) ||

        activeFilters.purities.includes(e.purity)

      );

    }

    return list;

  })();

  // ─── Filter summary totals ───────────────────────────────────

  const filterSummary = (() => {

    const hasAny =

      activeFilters.keyword ||

      activeFilters.metalType ||

      (activeFilters.categories && activeFilters.categories.length > 0) ||

      (activeFilters.purities && activeFilters.purities.length > 0) ||

      activeFilters.minWeight ||

      activeFilters.maxWeight;

    if (!hasAny) return null;

    const totalGross = filteredEntries.reduce((sum, e) => sum + (e.weight || 0), 0);

    const totalPure = filteredEntries.reduce((sum, e) => sum + (e.weight * e.purity) / 100, 0);

    // Count total individual items (bulk entries contribute their itemCount)

    const totalItems = filteredEntries.reduce(

      (sum, e) => sum + (e.isBulk ? (e.itemCount || 1) : 1),

      0

    );

    return { count: filteredEntries.length, totalItems, totalGross, totalPure };

  })();

  // ─── Add/edit dropdown options from metadata ─────────────────

  // For ADD form

  useEffect(() => {
    if (!metadata?.categoryTotals || !addForm.metalType) return;
  
    const categories = Object.values(metadata.categoryTotals)
      .filter((cat) => cat.metal === addForm.metalType)
      .map((cat) => cat.categoryName);
  
    setAvailableCategories(
      [...new Set(categories)].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      )
    );
  }, [metadata, addForm.metalType]);

  useEffect(() => {

    if (!metadata?.categoryTotals || !addForm.metalType || !addForm.category) {

      setAvailablePurities([]);

      return;

    }

    const categoryKey = `${addForm.category}_${addForm.metalType}`;

    const categoryData = metadata.categoryTotals[categoryKey];

    if (categoryData?.purities) {

      setAvailablePurities(Object.keys(categoryData.purities).map(Number).sort((a, b) => b - a));

    } else {

      setAvailablePurities([]);

    }

  }, [metadata, addForm.metalType, addForm.category]);

  // For EDIT form

  useEffect(() => {
    if (!metadata?.categoryTotals || !editForm.metalType) return;
  
    const categories = Object.values(metadata.categoryTotals)
      .filter((cat) => cat.metal === editForm.metalType)
      .map((cat) => cat.categoryName);
  
    setEditAvailableCategories(
      [...new Set(categories)].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      )
    );
  }, [metadata, editForm.metalType]);

  useEffect(() => {

    if (!metadata?.categoryTotals || !editForm.metalType || !editForm.category) {

      setEditAvailablePurities([]);

      return;

    }

    const categoryKey = `${editForm.category}_${editForm.metalType}`;

    const categoryData = metadata.categoryTotals[categoryKey];

    if (categoryData?.purities) {

      setEditAvailablePurities(

        Object.keys(categoryData.purities).map(Number).sort((a, b) => b - a)

      );

    } else {

      setEditAvailablePurities([]);

    }

  }, [metadata, editForm.metalType, editForm.category]);

  // For FILTER multi-select options

  const getFilterCategories = () => {
    if (!metadata?.categoryTotals || !filters.metalType) return [];
  
    return [
      ...new Set(
        Object.values(metadata.categoryTotals)
          .filter((cat) => cat.metal === filters.metalType)
          .map((cat) => cat.categoryName)
      ),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  };

  const getFilterPurities = () => {

    if (!metadata?.categoryTotals || !filters.metalType) return [];

    // If categories selected, show purities for those; else show all purities for metal

    const selectedCats = filters.categories.length > 0 ? filters.categories : getFilterCategories();

    const purities = new Set();

    selectedCats.forEach((cat) => {

      const key = `${cat}_${filters.metalType}`;

      const data = metadata.categoryTotals[key];

      if (data?.purities) Object.keys(data.purities).forEach((p) => purities.add(p));

    });

    return [...purities].map(Number).sort((a, b) => b - a).map(String);

  };

  // ─── Delete ───────────────────────────────────────────────────

  const handleDelete = async (id) => {

    if (!confirm(t("Are you sure you want to delete this entry?"))) return;

    setDeletingId(id);

    try {

      const token = localStorage.getItem("token");

      await api.delete(`/api/entries/${id}`, {

        headers: { Authorization: `Bearer ${token}` },

      });

      fetchData();

    } catch (err) {

      console.error("Failed to delete entry:", err);

      alert(t("Failed to delete entry. Please try again."));

    } finally {

      setDeletingId(null);

    }

  };

  // ─── Edit ─────────────────────────────────────────────────────

  const handleEdit = (entry) => {

    setEditingId(entry.id || entry._id);

    setEditForm({

      metalType: entry.metalType,

      category: entry.category,

      purity: entry.purity.toString(),

      weight: entry.weight.toString(),

      itemCount: entry.isBulk ? entry.itemCount.toString() : "",

      notes: entry.notes || "",

      isBulk: entry.isBulk,

    });

  };

  const handleSaveEdit = async () => {

    if (!editForm.weight || isNaN(editForm.weight) || Number(editForm.weight) <= 0) {

      alert(t("Please enter a valid weight"));

      return;

    }

    if (

      editForm.isBulk &&

      (!editForm.itemCount || isNaN(editForm.itemCount) || Number(editForm.itemCount) <= 0)

    ) {

      alert(t("Please enter a valid item count for bulk entry"));

      return;

    }

    setIsSubmitting(true);

    try {

      const token = localStorage.getItem("token");

      const updateData = {
        metalType: editForm.metalType,
        category: editForm.category,
        purity: Number(editForm.purity),
        weight: Number(editForm.weight),
        isBulk: editForm.isBulk,
        notes: editForm.notes.trim() || null,
        itemCount: editForm.isBulk ? Number(editForm.itemCount) : 1,
      };

      await api.put(`/api/entries/${editingId}`, updateData, {

        headers: { Authorization: `Bearer ${token}` },

      });

      setEditingId(null);

      fetchData();

    } catch (err) {

      console.error("Failed to update entry:", err);

      alert(t("Failed to update entry. Please try again."));

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleCancelEdit = () => {

    setEditingId(null);

    setEditForm({ metalType: "", category: "", purity: "", weight: "", itemCount: "", notes: "", isBulk: false });

  };

  // ─── Add item ─────────────────────────────────────────────────

  const handleAddItem = async () => {

    if (!addForm.metalType || !addForm.category || !addForm.purity || !addForm.weight) {

      alert(t("Please fill all required fields"));

      return;

    }

    if (isNaN(addForm.weight) || Number(addForm.weight) <= 0) {

      alert(t("Please enter a valid weight"));

      return;

    }

    if (

      addForm.isBulk &&

      (!addForm.itemCount || isNaN(addForm.itemCount) || Number(addForm.itemCount) <= 0)

    ) {

      alert(t("Please enter a valid item count for bulk entry"));

      return;

    }

    setIsSubmitting(true);

    try {

      const token = localStorage.getItem("token");

      const entryData = {

        metalType: addForm.metalType,

        category: addForm.category,

        purity: Number(addForm.purity),

        weight: Number(addForm.weight),

        isBulk: addForm.isBulk,

        notes: addForm.notes.trim() || null,

        ...(addForm.isBulk && { itemCount: Number(addForm.itemCount) }),

      };

      await api.post(`/api/entries`, entryData, {

        headers: { Authorization: `Bearer ${token}` },

      });

      setIsAddModalOpen(false);

      resetAddForm();

      fetchData();

    } catch (err) {

      console.error("Failed to add entry:", err);

      alert(t("Failed to add entry. Please try again."));

    } finally {

      setIsSubmitting(false);

    }

  };

  const resetAddForm = () => {

    setAddForm({ metalType: "gold", category: "", purity: "", weight: "", itemCount: "", notes: "", isBulk: false });

  };

  const handleCloseAddModal = () => {

    setIsAddModalOpen(false);

    resetAddForm();

  };

  // ─── Filter ───────────────────────────────────────────────────

  const handleApplyFilter = () => {

    if ((filters.minWeight || filters.maxWeight) && !filters.metalType) {

      alert(t("Please select a metal type when filtering by weight range"));

      return;

    }

    setActiveFilters({ ...filters });

    setIsFilterOpen(false);

  };

  const handleClearFilter = () => {

    const cleared = { metalType: "", categories: [], purities: [], minWeight: "", maxWeight: "", keyword: "", useGrossWeight: true };

    setFilters(cleared);

    setActiveFilters({});

  };

  // Whether any filter is active (for display purposes)

  const hasActiveFilters = () => {

    return (

      activeFilters.keyword ||

      activeFilters.metalType ||

      (activeFilters.categories && activeFilters.categories.length > 0) ||

      (activeFilters.purities && activeFilters.purities.length > 0) ||

      activeFilters.minWeight ||

      activeFilters.maxWeight

    );

  };

  // ─── Render entry card ────────────────────────────────────────

  const renderEntryCard = (entry) => {

    const entryId = entry.id || entry._id;

    const isEditing = editingId === entryId;

    const isDeleting = deletingId === entryId;

    return (

      <Card

        key={entryId}

        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50"

      >

        <CardContent className="p-6">

          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">

            <div className="flex-1 w-full">

              {isEditing ? (

                // ── FULL EDIT FORM ──────────────────────────────

                <div className="space-y-5">

                  {/* Metal Type */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Metal Type")}</label>

                    <select

                      value={editForm.metalType}

                      onChange={(e) =>

                        setEditForm({ ...editForm, metalType: e.target.value, category: "", purity: "" })

                      }

                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 min-h-[48px]"

                    >

                      <option value="gold">{t("Gold")}</option>

                      <option value="silver">{t("Silver")}</option>

                    </select>

                  </div>

                  {/* Category */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Category")}</label>

                    <select

                      value={editForm.category}

                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value, purity: "" })}

                      disabled={!editForm.metalType}

                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"

                    >

                      <option value="">{t("Select Category")}</option>

                      {editAvailableCategories.map((cat) => (

                        <option key={cat} value={cat}>{cat}</option>

                      ))}

                    </select>

                  </div>

                  {/* Purity */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Purity")} (%)</label>

                    <select

                      value={editForm.purity}

                      onChange={(e) => setEditForm({ ...editForm, purity: e.target.value })}

                      disabled={!editForm.category}

                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"

                    >

                      <option value="">{t("Select Purity")}</option>

                      {editAvailablePurities.map((p) => (

                        <option key={p} value={p}>{p}%</option>

                      ))}

                    </select>

                  </div>

                  {/* Weight */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Weight")} (g)</label>

                    <Input

                      type="number"

                      value={editForm.weight}

                      onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}

                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 min-h-[48px]"

                      min="0"

                      step="0.01"

                      autoFocus

                    />

                  </div>

                  {/* Bulk Toggle */}

                  <div className="flex items-center space-x-4 p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50">

                    <button

                      type="button"

                      onClick={() => setEditForm({ ...editForm, isBulk: !editForm.isBulk })}

                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 shadow-lg ${

                        editForm.isBulk ? "bg-gradient-to-r from-blue-600 to-blue-700" : "bg-gray-300 dark:bg-gray-600"

                      }`}

                    >

                      <span

                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${

                          editForm.isBulk ? "translate-x-6" : "translate-x-1"

                        }`}

                      />

                    </button>

                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">

                      {editForm.isBulk ? t("Bulk Entry") : t("Single Entry")}

                    </label>

                  </div>

                  {/* Item Count (bulk only) */}

                  {editForm.isBulk && (

                    <div className="space-y-2">

                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Number of Items")}</label>

                      <Input

                        type="number"

                        value={editForm.itemCount}

                        onChange={(e) => setEditForm({ ...editForm, itemCount: e.target.value })}

                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 min-h-[48px]"

                        min="1"

                      />

                    </div>

                  )}

                  {/* Notes */}

                  <div className="space-y-2">

                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("Notes")}</label>

                    <Textarea

                      value={editForm.notes}

                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}

                      placeholder={t("Enter notes...")}

                      rows={3}

                      className="resize-none w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"

                    />

                  </div>

                </div>

              ) : (

                // ── VIEW MODE ───────────────────────────────────

                <div className="space-y-4">

                  <div className="flex flex-wrap items-center gap-3 text-sm">

                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-full font-semibold shadow-lg">

                      {entry.metalType.toUpperCase()}

                    </span>

                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full font-medium">

                      {entry.category}

                    </span>

                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-medium">

                      {entry.purity}%

                    </span>

                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-xl border border-gray-200/50 dark:border-gray-600/50 space-y-2">

                    <p className="font-semibold text-gray-900 dark:text-gray-100">

                      {t("Gross Weight")}: <span className="text-blue-600 dark:text-blue-400">{entry.weight}g</span>

                    </p>

                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">

                      {t("Pure Weight")}:{" "}

                      <span className="text-emerald-700 dark:text-emerald-300">

                        {((entry.weight * entry.purity) / 100).toFixed(3)}g

                      </span>

                    </p>

                  </div>

                  {entry.isBulk && (

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/50">

                      <p className="font-semibold text-amber-800 dark:text-amber-200">

                        {t("Items")}: <span className="text-amber-700 dark:text-amber-300">{entry.itemCount}</span>

                      </p>

                    </div>

                  )}

                  {entry.notes && (

                    <div className="space-y-2">

                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("Notes")}:</p>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-l-4 border-blue-500 dark:border-blue-400">

                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{entry.notes}</p>

                      </div>

                    </div>

                  )}

                  <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">

                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">

                      {t("Created")}: {new Date(entry.createdAt).toLocaleDateString("en-GB")}

                    </p>

                  </div>

                </div>

              )}

            </div>

            {/* Action Buttons */}

            <div className="flex flex-col items-end gap-4 w-full lg:w-auto">

              <span

                className={`px-3 py-1 rounded-full text-xs font-medium border ${

                  entry.isBulk

                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"

                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"

                }`}

              >

                {entry.isBulk ? t("Bulk") : t("Single")}

              </span>

              <div className="flex gap-3 w-full lg:w-auto">

                {isEditing ? (

                  <>

                    <Button

                      variant="outline"

                      size="sm"

                      onClick={handleSaveEdit}

                      disabled={

                        isSubmitting ||

                        !editForm.weight ||

                        isNaN(editForm.weight) ||

                        Number(editForm.weight) <= 0 ||

                        !editForm.category ||

                        !editForm.purity

                      }

                      className="flex-1 lg:flex-none bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"

                    >

                      {isSubmitting ? t("Saving...") : t("Save")}

                    </Button>

                    <Button

                      variant="ghost"

                      size="sm"

                      onClick={handleCancelEdit}

                      disabled={isSubmitting}

                      className="flex-1 lg:flex-none bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"

                    >

                      {t("Cancel")}

                    </Button>

                  </>

                ) : (

                  <>

                    <Button

                      variant="outline"

                      size="sm"

                      onClick={() => handleEdit(entry)}

                      className="flex-1 lg:flex-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"

                    >

                      {t("Edit")}

                    </Button>

                    <Button

                      variant="destructive"

                      size="sm"

                      onClick={() => handleDelete(entryId)}

                      disabled={isDeleting}

                      className="flex-1 lg:flex-none bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"

                    >

                      {isDeleting ? (

                        <>

                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                          {t("Deleting...")}

                        </>

                      ) : (

                        t("Delete")

                      )}

                    </Button>

                  </>

                )}

              </div>

            </div>

          </div>

        </CardContent>

      </Card>

    );

  };

  // ─── RENDER ───────────────────────────────────────────────────

  return (

    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">

      {/* Scroll anchor */}

      <div ref={topRef} />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50">

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">

            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-500">

              {t("All Entries")}

            </h1>

            <div className="flex flex-wrap gap-2">

              <button

                onClick={() => setIsFilterOpen(true)}

                className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 font-medium px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 min-h-[44px]"

              >

                <Filter size={16} />

                {t("Filter")}

              </button>

              {hasActiveFilters() && (

                <button

                  onClick={handleClearFilter}

                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 min-h-[44px]"

                >

                  <X size={16} />

                  {t("Clear Filter")}

                </button>

              )}

              <button

                onClick={() => setIsAddModalOpen(true)}

                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 min-h-[44px]"

              >

                <Plus size={16} />

                {t("Add Item")}

              </button>

            </div>

          </div>

        </div>

        {/* ── Filter Summary Card ── */}

        {hasActiveFilters() && filterSummary && (

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200/60 p-5 dark:bg-gray-800/90 dark:border-blue-700/40 space-y-4">

            {/* Totals row */}

            <div className="grid grid-cols-3 gap-4">

              {/* Entries + Items count */}

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl p-4 text-center border border-blue-200/50 dark:border-blue-700/40">

  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
    {t("Total Items")}
  </p>

  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
    {filterSummary.totalItems}
  </p>

</div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/30 rounded-xl p-4 text-center border border-gray-200/50 dark:border-gray-600/40">

                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">{t("Total Gross")}</p>

                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{filterSummary.totalGross.toFixed(3)}g</p>

              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-xl p-4 text-center border border-emerald-200/50 dark:border-emerald-700/40">

                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">{t("Total Pure")}</p>

                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{filterSummary.totalPure.toFixed(3)}g</p>

              </div>

            </div>

            {/* Active filter tags */}

            <div className="flex flex-wrap items-center gap-2 pt-1">

              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("Filters")}:</span>

              {activeFilters.keyword && (

                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-700">

                  {t("Keyword")}: {activeFilters.keyword}

                </span>

              )}

              {activeFilters.metalType && (

                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-700">

                  {t("Metal")}: {activeFilters.metalType}

                </span>

              )}

              {activeFilters.categories && activeFilters.categories.length > 0 && (

                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-medium border border-indigo-200 dark:border-indigo-700">

                  {t("Categories")}: {activeFilters.categories.join(", ")}

                </span>

              )}

              {activeFilters.purities && activeFilters.purities.length > 0 && (

                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-700">

                  {t("Purities")}: {activeFilters.purities.map((p) => `${p}%`).join(", ")}

                </span>

              )}

              {(activeFilters.minWeight || activeFilters.maxWeight) && (

                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-700">

                  {t("Weight")}: {activeFilters.minWeight || "0"}g – {activeFilters.maxWeight || "∞"}g

                  {" "}({activeFilters.useGrossWeight ? t("Gross") : t("Pure")})

                </span>

              )}

            </div>

          </div>

        )}

        {/* ── Entries List ── */}

        {loading ? (

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-12 text-center dark:bg-gray-800/80 dark:border-gray-700/50">

            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>

            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">{t("Loading entries...")}</p>

          </div>

        ) : (

          <div className="space-y-4">

            {filteredEntries.length === 0 ? (

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-12 text-center dark:bg-gray-800/80 dark:border-gray-700/50">

                <div className="text-gray-400 mb-4">

                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2a2 2 0 012 2v1M6 13h2" />

                  </svg>

                </div>

                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">{t("No entries found")}</p>

              </div>

            ) : (

              filteredEntries.map(renderEntryCard)

            )}

          </div>

        )}

        {/* ── Add Item Modal ── */}

        <div

          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 ${

            isAddModalOpen ? "opacity-100 visible" : "opacity-0 invisible"

          }`}

        >

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800/95 dark:border-gray-700/50">

            <div className="flex justify-between items-center mb-6">

              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-500">

                {t("Add New Entry")}

              </h3>

              <button

                onClick={handleCloseAddModal}

                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"

              >

                <X size={24} />

              </button>

            </div>

            <div className="space-y-6">

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Metal Type")}</label>

                <select

                  value={addForm.metalType}

                  onChange={(e) => setAddForm({ ...addForm, metalType: e.target.value, category: "", purity: "" })}

                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 min-h-[48px]"

                >

                  <option value="gold">{t("Gold")}</option>

                  <option value="silver">{t("Silver")}</option>

                </select>

              </div>

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Category")}</label>

                <select

                  value={addForm.category}

                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value, purity: "" })}

                  disabled={!addForm.metalType}

                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"

                >

                  <option value="">{t("Select Category")}</option>

                  {availableCategories.map((category) => (

                    <option key={category} value={category}>{category}</option>

                  ))}

                </select>

              </div>

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Purity")} (%)</label>

                <select

                  value={addForm.purity}

                  onChange={(e) => setAddForm({ ...addForm, purity: e.target.value })}

                  disabled={!addForm.category}

                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"

                >

                  <option value="">{t("Select Purity")}</option>

                  {availablePurities.map((purity) => (

                    <option key={purity} value={purity}>{purity}%</option>

                  ))}

                </select>

              </div>

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Weight")} (g)</label>

                <input

                  type="number"

                  value={addForm.weight}

                  onChange={(e) => setAddForm({ ...addForm, weight: e.target.value })}

                  placeholder={t("Enter weight")}

                  min="0"

                  step="0.01"

                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 min-h-[48px]"

                />

              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 dark:bg-gray-700/50 dark:border-gray-600/50">

                <div className="flex items-center space-x-3">

                  <button

                    type="button"

                    onClick={() => setAddForm({ ...addForm, isBulk: !addForm.isBulk })}

                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${

                      addForm.isBulk ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg" : "bg-gray-300 dark:bg-gray-600"

                    }`}

                  >

                    <span

                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${

                        addForm.isBulk ? "translate-x-6" : "translate-x-1"

                      }`}

                    />

                  </button>

                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                    {addForm.isBulk ? t("Bulk Entry") : t("Single Entry")}

                  </label>

                </div>

              </div>

              {addForm.isBulk && (

                <div className="space-y-2">

                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Number of Items")}</label>

                  <input

                    type="number"

                    value={addForm.itemCount}

                    onChange={(e) => setAddForm({ ...addForm, itemCount: e.target.value })}

                    placeholder={t("Enter number of items")}

                    min="1"

                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 min-h-[48px]"

                  />

                </div>

              )}

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                  {t("Notes")} ({t("Optional")})

                </label>

                <textarea

                  value={addForm.notes}

                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}

                  placeholder={t("Enter notes about this item...")}

                  rows={3}

                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 resize-none"

                />

              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">

                <button

                  onClick={handleCloseAddModal}

                  disabled={isSubmitting}

                  className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"

                >

                  {t("Cancel")}

                </button>

                <button

                  onClick={handleAddItem}

                  disabled={

                    isSubmitting ||

                    !addForm.metalType ||

                    !addForm.category ||

                    !addForm.purity ||

                    !addForm.weight ||

                    isNaN(addForm.weight) ||

                    Number(addForm.weight) <= 0 ||

                    (addForm.isBulk &&

                      (!addForm.itemCount || isNaN(addForm.itemCount) || Number(addForm.itemCount) <= 0))

                  }

                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[48px]"

                >

                  {isSubmitting ? t("Adding...") : t("Add Entry")}

                </button>

              </div>

            </div>

          </div>

        </div>

        {/* ── Filter Modal ── */}

        <div

          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 ${

            isFilterOpen ? "opacity-100 visible" : "opacity-0 invisible"

          }`}

        >

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800/95 dark:border-gray-700/50">

            <div className="flex justify-between items-center mb-6">

              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-500">

                {t("Filter Entries")}

              </h3>

              <button

                onClick={() => setIsFilterOpen(false)}

                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"

              >

                <X size={24} />

              </button>

            </div>

            <div className="space-y-6">

              {/* Keyword */}

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                  {t("Keyword")} ({t("Search in notes")})

                </label>

                <input

                  type="text"

                  value={filters.keyword}

                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}

                  placeholder={t("Enter keyword")}

                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 min-h-[48px]"

                />

              </div>

              {/* Metal Type */}

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Metal Type")}</label>

                <select

                  value={filters.metalType}

                  onChange={(e) =>

                    setFilters({ ...filters, metalType: e.target.value, categories: [], purities: [] })

                  }

                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 min-h-[48px]"

                >

                  <option value="">{t("All Metals")}</option>

                  <option value="gold">{t("Gold")}</option>

                  <option value="silver">{t("Silver")}</option>

                </select>

              </div>

              {/* Categories — multi-select */}

              <div className="space-y-2">

                <div className="flex items-center justify-between">

                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                    {t("Categories")}

                  </label>

                  {filters.categories.length > 0 && (

                    <button

                      onClick={() => setFilters({ ...filters, categories: [], purities: [] })}

                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"

                    >

                      {t("Clear")}

                    </button>

                  )}

                </div>

                <MultiSelectList

                  options={getFilterCategories()}

                  selected={filters.categories}

                  onChange={(val) => setFilters({ ...filters, categories: val, purities: [] })}

                  disabled={!filters.metalType}

                  placeholder={

                    !filters.metalType

                      ? t("Select a metal type first")

                      : t("No categories available")

                  }

                />

                {filters.metalType && getFilterCategories().length > 0 && (

                  <p className="text-xs text-gray-500 dark:text-gray-400">

                    {filters.categories.length === 0

                      ? t("No selection = all categories")

                      : `${filters.categories.length} ${t("selected")}`}

                  </p>

                )}

              </div>

              {/* Purities — multi-select */}

              <div className="space-y-2">

                <div className="flex items-center justify-between">

                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                    {t("Purities")}

                  </label>

                  {filters.purities.length > 0 && (

                    <button

                      onClick={() => setFilters({ ...filters, purities: [] })}

                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"

                    >

                      {t("Clear")}

                    </button>

                  )}

                </div>

                <MultiSelectList

                  options={getFilterPurities().map(String)}

                  selected={filters.purities.map(String)}

                  onChange={(val) => setFilters({ ...filters, purities: val })}

                  disabled={!filters.metalType}

                  placeholder={

                    !filters.metalType

                      ? t("Select a metal type first")

                      : t("No purities available")

                  }

                />

                {filters.metalType && getFilterPurities().length > 0 && (

                  <p className="text-xs text-gray-500 dark:text-gray-400">

                    {filters.purities.length === 0

                      ? t("No selection = all purities")

                      : `${filters.purities.length} ${t("selected")}`}

                  </p>

                )}

              </div>

              {/* Weight Range */}

              <div className="space-y-2">

                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                  {t("Weight Range")} (g)

                </label>

                <div className="flex gap-3">

                  <input

                    type="number"

                    value={filters.minWeight}

                    onChange={(e) => setFilters({ ...filters, minWeight: e.target.value })}

                    placeholder={t("Min")}

                    min="0"

                    step="0.01"

                    disabled={!filters.metalType}

                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"

                  />

                  <input

                    type="number"

                    value={filters.maxWeight}

                    onChange={(e) => setFilters({ ...filters, maxWeight: e.target.value })}

                    placeholder={t("Max")}

                    min="0"

                    step="0.01"

                    disabled={!filters.metalType}

                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"

                  />

                </div>

                {!filters.metalType && (

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">

                    {t("Select a metal type to enable weight filtering")}

                  </p>

                )}

              </div>

              {/* Weight Type Toggle */}

              {(filters.minWeight || filters.maxWeight) && (

                <div className="space-y-2">

                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Weight Type")}</label>

                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 dark:bg-gray-700/50 dark:border-gray-600/50">

                    <div className="flex items-center space-x-3">

                      <button

                        type="button"

                        onClick={() => setFilters({ ...filters, useGrossWeight: !filters.useGrossWeight })}

                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${

                          filters.useGrossWeight

                            ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg"

                            : "bg-gray-300 dark:bg-gray-600"

                        }`}

                      >

                        <span

                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${

                            filters.useGrossWeight ? "translate-x-6" : "translate-x-1"

                          }`}

                        />

                      </button>

                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                        {filters.useGrossWeight ? t("Gross Weight") : t("Pure Weight")}

                      </label>

                    </div>

                  </div>

                </div>

              )}

              {/* Buttons */}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">

                <button

                  onClick={() => setIsFilterOpen(false)}

                  className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 min-h-[48px]"

                >

                  {t("Cancel")}

                </button>

                <button

                  onClick={handleApplyFilter}

                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 min-h-[48px]"

                >

                  {t("Apply Filter")}

                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}