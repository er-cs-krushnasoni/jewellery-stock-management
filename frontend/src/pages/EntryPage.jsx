// 📁 src/pages/EntryPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BackButton from "@/components/ui/BackButton";

export default function EntryPage() {
  const { metal, category, purity } = useParams();
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState("");
  const [editItemCount, setEditItemCount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
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
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/entries`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { metalType: metal, category, purity },
      });
      
      console.log("API Response:", res.data); // Debug log
      
      // Ensure we always set an array
      if (Array.isArray(res.data)) {
        setEntries(res.data);
        console.log("Entries set as array:", res.data); // Debug log
      } else if (res.data && Array.isArray(res.data.entries)) {
        setEntries(res.data.entries);
        console.log("Entries set from nested array:", res.data.entries); // Debug log
      } else {
        console.warn("API did not return an array:", res.data);
        setEntries([]);
      }
    } catch (err) {
      // toast.error(t("Error fetching entries"));
      console.error("Error fetching entries:", err);
      setEntries([]); // Set empty array on error
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
    console.log("Attempting to delete entry with ID:", id); // Debug log
    
    if (!id) {
      console.error("No ID provided for deletion");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/entries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // toast.success(t("Entry deleted"));
      console.log("Entry deleted successfully");
      fetchEntries();
    } catch (err) {
      // toast.error(t("Failed to delete entry"));
      console.error("Failed to delete entry:", err);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry._id || entry.id);
    setEditWeight(entry.weight.toString());
    setEditItemCount(entry.isBulk ? entry.itemCount.toString() : "");
    setEditNotes(entry.notes || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditWeight("");
    setEditItemCount("");
    setEditNotes("");
  };

  const handleSaveEdit = async (id) => {
    if (!editWeight || isNaN(editWeight) || Number(editWeight) <= 0) {
      console.error("Invalid weight value");
      return;
    }

    // Find the entry to check if it's bulk
    const entry = entries.find(e => (e._id || e.id) === id);
    const isBulkEntry = entry?.isBulk;

    if (isBulkEntry && editItemCount && (isNaN(editItemCount) || Number(editItemCount) <= 0)) {
      console.error("Invalid item count for bulk entry");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const updateData = {
        weight: Number(editWeight),
        notes: editNotes.trim() || null
      };

      // Add itemCount for bulk entries
      if (isBulkEntry && editItemCount) {
        updateData.itemCount = Number(editItemCount);
      }

      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/entries/${id}`, 
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Entry updated successfully");
      setEditingId(null);
      setEditWeight("");
      setEditItemCount("");
      setEditNotes("");
      fetchEntries(); // Refresh the entries
    } catch (err) {
      console.error("Failed to update entry:", err);
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
      console.error("Invalid weight value");
      return;
    }

    if (isBulk && (!itemCount || isNaN(itemCount) || Number(itemCount) <= 0)) {
      console.error("Invalid item count for bulk entry");
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
        ...(isBulk && { itemCount: Number(itemCount) })
      };

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/entries`, 
        entryData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("Entry added successfully");
      setIsAddDialogOpen(false);
      resetAddForm();
      fetchEntries(); // Refresh the entries
    } catch (err) {
      console.error("Failed to add entry:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // return (
  //   <div className="p-4 space-y-4">
  //     <BackButton to={`/${metal}/${category}`} label={t("Back to Purities")} />
  //     <div className="flex justify-between items-center">
  //       <h2 className="text-xl font-bold">
  //         {t("Entries for")} {metal} / {category} / {purity}%
  //       </h2>
        
  //       <Button onClick={() => setIsAddDialogOpen(true)}>
  //         {t("Add Item")}
  //       </Button>

  //     </div>

  //     {/* Add Item Modal */}
  //     {isAddDialogOpen && (
  //       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  //         <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
  //           <div className="flex justify-between items-center mb-4">
  //             <h3 className="text-lg font-semibold">{t("Add New Entry")}</h3>
  //             <Button
  //               variant="ghost"
  //               size="sm"
  //               onClick={() => {
  //                 setIsAddDialogOpen(false);
  //                 resetAddForm();
  //               }}
  //             >
  //               ✕
  //             </Button>
  //           </div>
            
  //           <div className="space-y-4">
  //             {/* Weight Input */}
  //             <div className="space-y-2">
  //               <label className="text-sm font-medium">{t("Weight")} (g)</label>
  //               <Input
  //                 type="number"
  //                 value={newWeight}
  //                 onChange={(e) => setNewWeight(e.target.value)}
  //                 placeholder={t("Enter weight")}
  //                 min="0"
  //                 step="0.01"
  //               />
  //             </div>

  //             {/* Notes Input */}
  //             <div className="space-y-2">
  //               <label className="text-sm font-medium">{t("Notes")} ({t("Optional")})</label>
  //               <Textarea
  //                 value={newNotes}
  //                 onChange={(e) => setNewNotes(e.target.value)}
  //                 placeholder={t("Enter notes about this item...")}
  //                 rows={3}
  //                 className="resize-none"
  //               />
  //             </div>

  //             {/* Bulk Toggle */}
  //             <div className="flex items-center space-x-3">
  //               <button
  //                 type="button"
  //                 onClick={() => setIsBulk(!isBulk)}
  //                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
  //                   isBulk ? 'bg-blue-600' : 'bg-gray-200'
  //                 }`}
  //               >
  //                 <span
  //                   className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
  //                     isBulk ? 'translate-x-6' : 'translate-x-1'
  //                   }`}
  //                 />
  //               </button>
  //               <label className="text-sm font-medium">
  //                 {isBulk ? t("Bulk Entry") : t("Single Entry")}
  //               </label>
  //             </div>

  //             {/* Item Count (only show when bulk is enabled) */}
  //             {isBulk && (
  //               <div className="space-y-2">
  //                 <label className="text-sm font-medium">{t("Number of Items")}</label>
  //                 <Input
  //                   type="number"
  //                   value={itemCount}
  //                   onChange={(e) => setItemCount(e.target.value)}
  //                   placeholder={t("Enter number of items")}
  //                   min="1"
  //                 />
  //               </div>
  //             )}

  //             {/* Action Buttons */}
  //             <div className="flex justify-end space-x-2 pt-4">
  //               <Button
  //                 variant="outline"
  //                 onClick={() => {
  //                   setIsAddDialogOpen(false);
  //                   resetAddForm();
  //                 }}
  //                 disabled={isSubmitting}
  //               >
  //                 {t("Cancel")}
  //               </Button>
  //               <Button
  //                 onClick={handleAddItem}
  //                 disabled={
  //                   isSubmitting ||
  //                   !newWeight ||
  //                   isNaN(newWeight) ||
  //                   Number(newWeight) <= 0 ||
  //                   (isBulk && (!itemCount || isNaN(itemCount) || Number(itemCount) <= 0))
  //                 }
  //               >
  //                 {isSubmitting ? t("Adding...") : t("Add Entry")}
  //               </Button>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     )}

  //     {/* <EntryForm
  //       metalType={metal}
  //       category={category}
  //       purity={Number(purity)}
  //       onSuccess={fetchEntries}
  //     /> */}

  //     {loading ? (
  //       <div className="text-center py-8">
  //         <p className="text-gray-500">{t("Loading entries...")}</p>
  //       </div>
  //     ) : (
  //       <div className="space-y-3">
  //         {entries.length === 0 ? (
  //           <p className="text-sm text-muted-foreground">
  //             {t("No entries yet")}
  //           </p>
  //         ) : Array.isArray(entries) ? (
  //           entries.map((entry) => {
  //             // Debug log for each entry
  //             console.log("Rendering entry:", entry);
  //             console.log("Entry ID:", entry._id);
              
  //             const entryId = entry._id || entry.id;
  //             const isEditing = editingId === entryId;
              
  //             return (
  //               <Card key={entryId || Math.random()} className="rounded-2xl">
  //                 <CardContent className="p-4">
  //                   <div className="flex justify-between items-start">
  //                     <div className="flex-1">
  //                       {isEditing ? (
  //                         <div className="space-y-3">
  //                           <div className="flex items-center gap-2">
  //                             <span className="font-semibold">{t("Weight")}:</span>
  //                             <Input
  //                               type="number"
  //                               value={editWeight}
  //                               onChange={(e) => setEditWeight(e.target.value)}
  //                               className="w-24"
  //                               min="0"
  //                               step="0.01"
  //                               autoFocus
  //                             />
  //                             <span>g</span>
  //                           </div>
  //                           {entry.isBulk && (
  //                             <div className="flex items-center gap-2">
  //                               <span className="font-semibold">{t("Items")}:</span>
  //                               <Input
  //                                 type="number"
  //                                 value={editItemCount}
  //                                 onChange={(e) => setEditItemCount(e.target.value)}
  //                                 className="w-20"
  //                                 min="1"
  //                               />
  //                             </div>
  //                           )}
  //                           <div className="space-y-2">
  //                             <label className="text-sm font-medium">{t("Notes")}</label>
  //                             <Textarea
  //                               value={editNotes}
  //                               onChange={(e) => setEditNotes(e.target.value)}
  //                               placeholder={t("Enter notes...")}
  //                               rows={2}
  //                               className="resize-none"
  //                             />
  //                           </div>
  //                         </div>
  //                       ) : (
  //                         <div className="space-y-2">
  //                           <p className="font-semibold">
  //                             {t("Weight")}: {entry.weight}g
  //                           </p>
  //                           <p>
  //   {t("Pure Weight")}: {(entry.weight * entry.purity / 100).toFixed(3)}g
  // </p>
  //                           {entry.isBulk && (
  //                             <p className="font-semibold">
  //                               {t("Items")}: {entry.itemCount}
  //                             </p>
  //                           )}
  //                           {entry.notes && (
  //                             <div className="mt-2">
  //                               <p className="text-sm font-medium text-gray-600">{t("Notes")}:</p>
  //                               <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded border-l-4 border-blue-200">
  //                                 {entry.notes}
  //                               </p>
  //                             </div>
  //                           )}
  //                           <p className="text-xs text-gray-500">
  //                             {t("Created")}: {new Date(entry.createdAt).toLocaleDateString("en-GB")}
  //                           </p>
  //                           {/* Debug info - remove this later */}
  //                           {/* <p className="text-xs text-gray-400">
  //                             ID: {entryId || "No ID found"}
  //                           </p> */}
  //                         </div>
  //                       )}
  //                     </div>
  //                     <div className="flex flex-col items-end gap-2 ml-4">
  //                       <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
  //                         {entry.isBulk ? t("Bulk") : t("Single")}
  //                       </span>
  //                       <div className="flex gap-2">
  //                         {isEditing ? (
  //                           <>
  //                             <Button
  //                               variant="outline"
  //                               size="sm"
  //                               onClick={() => handleSaveEdit(entryId)}
  //                               disabled={!editWeight || isNaN(editWeight) || Number(editWeight) <= 0}
  //                             >
  //                               {t("Save")}
  //                             </Button>
  //                             <Button
  //                               variant="ghost"
  //                               size="sm"
  //                               onClick={handleCancelEdit}
  //                             >
  //                               {t("Cancel")}
  //                             </Button>
  //                           </>
  //                         ) : (
  //                           <>
  //                             <Button
  //                               variant="outline"
  //                               size="sm"
  //                               onClick={() => handleEdit(entry)}
  //                               disabled={!entryId}
  //                             >
  //                               {t("Edit")}
  //                             </Button>
  //                             <Button
  //                               variant="destructive"
  //                               size="sm"
  //                               onClick={() => handleDelete(entryId)}
  //                               disabled={!entryId}
  //                             >
  //                               {t("Delete")}
  //                             </Button>
  //                           </>
  //                         )}
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </CardContent>
  //               </Card>
  //             );
  //           })
  //         ) : (
  //           <p className="text-sm text-red-500">
  //             {t("Error loading entries - invalid data format")}
  //           </p>
  //         )}
  //       </div>
  //     )}
  //   </div>
  // );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header Section */}
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
              
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t("Add New Entry")}
                </h3>
                <button
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetAddForm();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Weight Input */}
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
  
                {/* Notes Input */}
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
  
                {/* Bulk Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:bg-gray-700/50 dark:border-gray-600/50">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isBulk ? t("Bulk Entry") : t("Single Entry")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBulk(!isBulk)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      isBulk 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-md ${
                        isBulk ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
  
                {/* Item Count (only show when bulk is enabled) */}
                {isBulk && (
                  <div className="space-y-2 animate-fadeIn">
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
  
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                  <button
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetAddForm();
                    }}
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
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[44px] focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t("Adding...")}
                      </span>
                    ) : (
                      t("Add Entry")
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {t("Loading entries...")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.length === 0 ? (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
                <div className="text-6xl mb-4 text-gray-300 dark:text-gray-600">📦</div>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                  {t("No entries yet")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Click "Add Item" to create your first entry
                </p>
              </div>
            ) : Array.isArray(entries) ? (
              <div className="grid gap-6">
                {entries.map((entry) => {
                  console.log("Rendering entry:", entry);
                  console.log("Entry ID:", entry._id);
                  
                  const entryId = entry._id || entry.id;
                  const isEditing = editingId === entryId;
                  
                  return (
                    <div key={entryId || Math.random()} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-4 hover:shadow-xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                        
                        {/* Entry Content */}
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {t("Weight")}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={editWeight}
                                      onChange={(e) => setEditWeight(e.target.value)}
                                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100"
                                      min="0"
                                      step="0.01"
                                      autoFocus
                                    />
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">g</span>
                                  </div>
                                </div>
                                
                                {entry.isBulk && (
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      {t("Items")}
                                    </label>
                                    <input
                                      type="number"
                                      value={editItemCount}
                                      onChange={(e) => setEditItemCount(e.target.value)}
                                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100"
                                      min="1"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {t("Notes")}
                                </label>
                                <textarea
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  placeholder={t("Enter notes...")}
                                  rows={2}
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 resize-none dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-3 border-l-4 border-blue-500">
                                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                                    {t("Weight")}
                                  </p>
                                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                    {entry.weight}g
                                  </p>
                                </div>
                                
                                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg p-3 border-l-4 border-emerald-500">
                                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">
                                    {t("Pure Weight")}
                                  </p>
                                  <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                    {(entry.weight * entry.purity / 100).toFixed(3)}g
                                  </p>
                                </div>
                              </div>
                              
                              {entry.isBulk && (
                                <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-lg p-3 border-l-4 border-amber-500">
                                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                                    {t("Items")}
                                  </p>
                                  <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                                    {entry.itemCount}
                                  </p>
                                </div>
                              )}
                              
                              {entry.notes && (
                                <div className="bg-gray-50/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 dark:bg-gray-700/50 dark:border-gray-600/50">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {t("Notes")}:
                                  </p>
                                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                    {entry.notes}
                                  </p>
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
                        
                        {/* Actions Section */}
                                                <div className="flex flex-col items-end gap-3 lg:ml-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            entry.isBulk 
                              ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/30 dark:to-purple-800/30 dark:text-purple-300' 
                              : 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300'
                          }`}>
                            {entry.isBulk ? t("Bulk") : t("Single")}
                          </span>
                          
                          <div className="flex flex-row lg:flex-col gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(entryId)}
                                  disabled={!editWeight || isNaN(editWeight) || Number(editWeight) <= 0}
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm min-h-[36px] focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                                >
                                  {t("Save")}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm min-h-[36px] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                  {t("Cancel")}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(entry)}
                                  disabled={!entryId}
                                  className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[36px] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                  {t("Edit")}
                                </button>
                                <button
                                  onClick={() => handleDelete(entryId)}
                                  disabled={!entryId}
                                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm min-h-[36px] focus:outline-none focus:ring-4 focus:ring-red-500/20"
                                >
                                  {t("Delete")}
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
            ) : (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-red-200/50 dark:bg-gray-800/80 dark:border-red-700/50">
                <div className="text-6xl mb-4 text-red-300 dark:text-red-600">⚠️</div>
                <p className="text-lg text-red-600 dark:text-red-400 font-medium">
                  {t("Error loading entries - invalid data format")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}