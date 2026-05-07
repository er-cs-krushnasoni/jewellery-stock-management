import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../config/api";
import { useTranslation } from "react-i18next";
import BackButton from "@/components/ui/BackButton";

export default function EntryPage() {
  const { metal, category, purity } = useParams();
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState("");
  const [editItemCount, setEditItemCount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editIsBulk, setEditIsBulk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);   // ← NEW
  const [deletingId, setDeletingId] = useState(null); // ← NEW

  // Add item form states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isBulk, setIsBulk] = useState(false);
  const [itemCount, setItemCount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/api/entries`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { metalType: metal, category, purity },
      });
      if (Array.isArray(res.data)) {
        setEntries(res.data);
      } else if (res.data && Array.isArray(res.data.entries)) {
        setEntries(res.data.entries);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Error fetching entries:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 15000);
    return () => clearInterval(interval);
  }, [metal, category, purity]);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!confirm(t("Are you sure you want to delete this entry?"))) return;
    setDeletingId(id); // ← NEW
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/api/entries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEntries();
    } catch (err) {
      console.error("Failed to delete entry:", err);
      alert(t("Failed to delete entry. Please try again."));
    } finally {
      setDeletingId(null); // ← NEW
    }
  };

  const handleEdit = (entry) => {
    const id = entry._id || entry.id;
    setEditingId(id);
    setEditWeight(entry.weight.toString());
    setEditIsBulk(entry.isBulk);
    setEditItemCount(entry.isBulk ? entry.itemCount.toString() : "1");
    setEditNotes(entry.notes || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditWeight("");
    setEditIsBulk(false);
    setEditItemCount("");
    setEditNotes("");
  };

  const handleSaveEdit = async (id) => {
    if (!editWeight || isNaN(editWeight) || Number(editWeight) <= 0) {
      alert(t("Please enter a valid weight"));
      return;
    }
    if (editIsBulk && (!editItemCount || isNaN(editItemCount) || Number(editItemCount) <= 0)) {
      alert(t("Please enter a valid item count for bulk entry"));
      return;
    }
    setIsSaving(true); // ← NEW
    try {
      const token = localStorage.getItem("token");
      const updateData = {
        weight: Number(editWeight),
        isBulk: editIsBulk,
        itemCount: editIsBulk ? Number(editItemCount) : 1,
        notes: editNotes.trim() || null,
      };
      await api.put(`/api/entries/${id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditingId(null);
      setEditWeight("");
      setEditIsBulk(false);
      setEditItemCount("");
      setEditNotes("");
      fetchEntries();
    } catch (err) {
      console.error("Failed to update entry:", err);
      alert(t("Failed to update entry. Please try again."));
    } finally {
      setIsSaving(false); // ← NEW
    }
  };

  const resetAddForm = () => {
    setNewWeight("");
    setNewNotes("");
    setIsBulk(false);
    setItemCount("");
  };

  const handleAddItem = async () => {
    if (!newWeight || isNaN(newWeight) || Number(newWeight) <= 0) {
      alert(t("Please enter a valid weight"));
      return;
    }
    if (isBulk && (!itemCount || isNaN(itemCount) || Number(itemCount) <= 0)) {
      alert(t("Please enter a valid item count for bulk entry"));
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const entryData = {
        metalType: metal,
        category: category,
        purity: Number(purity),
        weight: Number(newWeight),
        isBulk: isBulk,
        notes: newNotes.trim() || null,
        itemCount: isBulk ? Number(itemCount) : 1,
      };
      await api.post(`/api/entries`, entryData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsAddDialogOpen(false);
      resetAddForm();
      fetchEntries();
    } catch (err) {
      console.error("Failed to add entry:", err);
      alert(t("Failed to add entry. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <BackButton
            to={`/${metal}/${category}`}
            label={t("Back to Purities")}
            className="mb-6"
          />
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 dark:bg-gray-800/80 dark:border-gray-700/50">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t("Entries for")} {metal} / {category}
              </h2>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg">
                <span className="font-semibold">{purity}% {t("Purity")}</span>
              </div>
            </div>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/20 min-h-[44px] flex items-center justify-center"
            >
              <span className="mr-2">+</span>
              {t("Add Item")}
            </button>
          </div>
        </div>

        {/* Add Item Modal */}
        {isAddDialogOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto dark:bg-gray-800/95 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t("Add New Entry")}
                </h3>
                <button
                  onClick={() => { setIsAddDialogOpen(false); resetAddForm(); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("Weight")} (g)
                  </label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder={t("Enter weight")}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("Notes")} ({t("Optional")})
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={t("Enter notes about this item...")}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 resize-none dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:bg-gray-700/50 dark:border-gray-600/50">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isBulk ? t("Bulk Entry") : t("Single Entry")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBulk(!isBulk)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      isBulk ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-md ${isBulk ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {isBulk && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t("Number of Items")}
                    </label>
                    <input
                      type="number"
                      value={itemCount}
                      onChange={(e) => setItemCount(e.target.value)}
                      placeholder={t("Enter number of items")}
                      min="1"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                  <button
                    onClick={() => { setIsAddDialogOpen(false); resetAddForm(); }}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={
                      isSubmitting ||
                      !newWeight ||
                      isNaN(newWeight) ||
                      Number(newWeight) <= 0 ||
                      (isBulk && (!itemCount || isNaN(itemCount) || Number(itemCount) <= 0))
                    }
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t("Adding...")}
                      </span>
                    ) : t("Add Entry")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">{t("Loading entries...")}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="text-6xl mb-4 text-gray-300 dark:text-gray-600">📦</div>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">{t("No entries yet")}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Click "Add Item" to create your first entry</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {entries.map((entry) => {
              const entryId = entry._id || entry.id;
              const isEditing = editingId === entryId;
              const isDeleting = deletingId === entryId; // ← NEW

              return (
                <div
                  key={entryId || Math.random()}
                  className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-4 hover:shadow-xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50"
                >
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">

                    {/* Entry Content */}
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">

                          {/* Weight */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {t("Weight")} (g)
                            </label>
                            <input
                              type="number"
                              value={editWeight}
                              onChange={(e) => setEditWeight(e.target.value)}
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                          </div>

                          {/* Bulk Toggle */}
                          <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-200/50 dark:bg-gray-700/50 dark:border-gray-600/50">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {editIsBulk ? t("Bulk Entry") : t("Single Entry")}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const next = !editIsBulk;
                                setEditIsBulk(next);
                                setEditItemCount(next ? (entry.itemCount?.toString() || "1") : "1");
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                                editIsBulk ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg" : "bg-gray-300 dark:bg-gray-600"
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-md ${editIsBulk ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>

                          {/* Item Count (bulk only) */}
                          {editIsBulk && (
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t("Number of Items")}
                              </label>
                              <input
                                type="number"
                                value={editItemCount}
                                onChange={(e) => setEditItemCount(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100"
                                min="1"
                              />
                            </div>
                          )}

                          {/* Notes */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {t("Notes")}
                            </label>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder={t("Enter notes...")}
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 placeholder-gray-500 text-gray-900 resize-none dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-3 border-l-4 border-blue-500">
                              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">{t("Weight")}</p>
                              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{entry.weight}g</p>
                            </div>
                            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg p-3 border-l-4 border-emerald-500">
                              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">{t("Pure Weight")}</p>
                              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                {(entry.weight * entry.purity / 100).toFixed(3)}g
                              </p>
                            </div>
                          </div>
                          {entry.isBulk && (
                            <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-lg p-3 border-l-4 border-amber-500">
                              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">{t("Items")}</p>
                              <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{entry.itemCount}</p>
                            </div>
                          )}
                          {entry.notes && (
                            <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-200/50 dark:bg-gray-700/50 dark:border-gray-600/50">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("Notes")}:</p>
                              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{entry.notes}</p>
                            </div>
                          )}
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t("Created")}: {new Date(entry.createdAt).toLocaleDateString("en-GB")}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-3 lg:ml-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        entry.isBulk
                          ? "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/30 dark:to-purple-800/30 dark:text-purple-300"
                          : "bg-gradient-to-r from-green-100 to-green-200 text-green-700 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300"
                      }`}>
                        {entry.isBulk ? t("Bulk") : t("Single")}
                      </span>
                      <div className="flex flex-row lg:flex-col gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(entryId)}
                              disabled={
                                isSaving ||
                                !editWeight ||
                                isNaN(editWeight) ||
                                Number(editWeight) <= 0 ||
                                (editIsBulk && (!editItemCount || isNaN(editItemCount) || Number(editItemCount) <= 0))
                              }
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm min-h-[36px] min-w-[70px] flex items-center justify-center gap-1.5"
                            >
                              {isSaving ? (
                                <>
                                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  {t("Saving...")}
                                </>
                              ) : t("Save")}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              {t("Cancel")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(entry)}
                              disabled={!entryId || isDeleting}
                              className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[36px] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              {t("Edit")}
                            </button>
                            <button
                              onClick={() => handleDelete(entryId)}
                              disabled={!entryId || isDeleting}
                              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm min-h-[36px] min-w-[70px] flex items-center justify-center gap-1.5"
                            >
                              {isDeleting ? (
                                <>
                                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  {t("Deleting...")}
                                </>
                              ) : t("Delete")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}