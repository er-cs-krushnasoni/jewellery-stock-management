// src/pages/AdminPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../config/api";
import {
  Users, CheckCircle, XCircle, AlertTriangle, Clock,
  Plus, Trash2, Edit3, Calendar, ChevronDown, ChevronUp,
  RefreshCw, Shield, Eye, EyeOff, X, BarChart2, UserX
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`
});

const getDaysConfig = (status, days) => {
  if (status === "expired" || status === "no_subscription") return {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800/40",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
    label: status === "no_subscription" ? "No Subscription" : "Expired"
  };
  if (status === "critical") return {
    bg: "bg-red-50 dark:bg-red-900/10",
    border: "border-red-200 dark:border-red-800/40",
    text: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
    dot: "bg-red-500 animate-pulse",
    label: `${days}d left`
  };
  if (status === "warning") return {
    bg: "bg-orange-50 dark:bg-orange-900/10",
    border: "border-orange-200 dark:border-orange-800/40",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    label: `${days}d left`
  };
  return {
    bg: "bg-green-50 dark:bg-green-900/10",
    border: "border-green-200 dark:border-green-800/40",
    text: "text-green-600 dark:text-green-400",
    badge: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
    dot: "bg-green-500",
    label: `${days}d left`
  };
};

// ── Mini Modal ─────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/20",
    green: "from-green-500 to-emerald-500 shadow-green-500/20",
    red: "from-red-500 to-rose-500 shadow-red-500/20",
    orange: "from-orange-500 to-amber-500 shadow-orange-500/20",
    yellow: "from-yellow-500 to-amber-400 shadow-yellow-500/20",
    gray: "from-gray-400 to-gray-500 shadow-gray-500/20"
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-5 flex items-center gap-4 hover:shadow-xl transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg flex-shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">{value ?? "—"}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  );
};

// ── Input helper ──────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm";

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { user: adminUser } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // userId

  const [selectedUser, setSelectedUser] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ username: "", password: "", subscriptionDays: "" });
  const [editForm, setEditForm] = useState({ username: "", password: "" });
  const [subForm, setSubForm] = useState({ days: "", action: "extend" });
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Filter
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get("/api/admin/dashboard", { headers: authHeader() }),
        api.get("/api/admin/users", { headers: authHeader() })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered users ─────────────────────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !searchQuery || u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      u.subscriptionStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Create user ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setFormError("");
    if (!createForm.username || !createForm.password || !createForm.subscriptionDays) {
      setFormError("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/admin/users", {
        username: createForm.username.trim(),
        password: createForm.password,
        subscriptionDays: Number(createForm.subscriptionDays)
      }, { headers: authHeader() });
      setCreateOpen(false);
      setCreateForm({ username: "", password: "", subscriptionDays: "" });
      setFormSuccess("User created successfully");
      setTimeout(() => setFormSuccess(""), 3000);
      loadData(true);
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit user ──────────────────────────────────────────────────────────────
  const openEdit = (u) => {
    setSelectedUser(u);
    setEditForm({ username: u.username, password: "" });
    setFormError("");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    setFormError("");
    if (!editForm.username && !editForm.password) {
      setFormError("Provide at least a new username or password");
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/api/admin/users/${selectedUser._id}`, {
        ...(editForm.username !== selectedUser.username && { username: editForm.username.trim() }),
        ...(editForm.password && { password: editForm.password })
      }, { headers: authHeader() });
      setEditOpen(false);
      setFormSuccess("User updated successfully");
      setTimeout(() => setFormSuccess(""), 3000);
      loadData(true);
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Subscription modal ─────────────────────────────────────────────────────
  const openSub = (u) => {
    setSelectedUser(u);
    setSubForm({ days: "", action: "extend" });
    setFormError("");
    setSubOpen(true);
  };

  const handleSub = async () => {
    setFormError("");
    if (!subForm.days || isNaN(subForm.days) || Number(subForm.days) < 1) {
      setFormError("Enter a valid number of days (≥ 1)");
      return;
    }
    setSubmitting(true);
    try {
      await api.put(
        `/api/admin/users/${selectedUser._id}/subscription/${subForm.action}`,
        { days: Number(subForm.days) },
        { headers: authHeader() }
      );
      setSubOpen(false);
      setFormSuccess(`Subscription ${subForm.action === "extend" ? "extended" : "reduced"} successfully`);
      setTimeout(() => setFormSuccess(""), 3000);
      loadData(true);
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to update subscription");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete user ────────────────────────────────────────────────────────────
  const handleDelete = async (userId) => {
    setSubmitting(true);
    try {
      await api.delete(`/api/admin/users/${userId}`, { headers: authHeader() });
      setDeleteConfirm(null);
      setFormSuccess("User deleted successfully");
      setTimeout(() => setFormSuccess(""), 3000);
      loadData(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete user");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Format end date ────────────────────────────────────────────────────────
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Admin Panel</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Logged in as <span className="font-semibold text-blue-600 dark:text-blue-400">{adminUser?.username}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {formSuccess && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/40">
                ✓ {formSuccess}
              </span>
            )}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => { setCreateOpen(true); setFormError(""); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium text-sm"
            >
              <Plus size={15} />
              New User
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard icon={Users}        label="Total Users"      value={stats.totalUsers}        color="blue" />
          <StatCard icon={CheckCircle}  label="Active"           value={stats.activeUsers}        color="green" />
          <StatCard icon={XCircle}      label="Expired / None"   value={stats.expiredUsers}       color="red" />
          <StatCard icon={AlertTriangle}label="Expiring in 7d"   value={stats.expiringSoon}       color="orange" />
          {/* <StatCard icon={Clock}        label="Expiring in 30d"  value={stats.expiringThisMonth}  color="yellow" /> */}
          <StatCard icon={UserX}        label="No Subscription"  value={stats.noSubscription}     color="gray" />
        </div>
      )}

      {/* ── Users Table ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden">

        {/* Table header / filters */}
        <div className="p-5 border-b border-gray-200/50 dark:border-gray-700/50 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search username…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputCls} flex-1`}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${inputCls} sm:w-48`}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="warning">Expiring (7d)</option>
            <option value="critical">Critical (3d)</option>
            <option value="expired">Expired</option>
            <option value="no_subscription">No Subscription</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {["Username", "Status", "Days Left", "Expires On", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                    <Users size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const cfg = getDaysConfig(u.subscriptionStatus, u.daysRemaining);
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">

                      {/* Username */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{u.username}</span>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge} ${cfg.border}`}>
                          {u.subscriptionStatus === "active" && <CheckCircle size={11} />}
                          {(u.subscriptionStatus === "warning" || u.subscriptionStatus === "critical") && <AlertTriangle size={11} />}
                          {(u.subscriptionStatus === "expired" || u.subscriptionStatus === "no_subscription") && <XCircle size={11} />}
                          {cfg.label.replace(/\d+d left/, u.subscriptionStatus === "active" ? "Active" : u.subscriptionStatus === "warning" ? "Expiring Soon" : "Critical")}
                        </span>
                      </td>

                      {/* Days left */}
                      <td className="px-5 py-4">
                        <span className={`font-black text-lg tabular-nums ${cfg.text}`}>
                          {u.daysRemaining !== null && u.daysRemaining > 0
                            ? u.daysRemaining
                            : u.subscriptionStatus === "no_subscription" ? "—" : "0"}
                        </span>
                        {u.daysRemaining !== null && u.daysRemaining > 0 && (
                          <span className="text-xs text-gray-400 ml-1">days</span>
                        )}
                      </td>

                      {/* End date */}
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300 font-medium">
                        {fmtDate(u.subscription?.endDate)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {/* Subscription */}
                          <button
                            onClick={() => openSub(u)}
                            title="Manage Subscription"
                            className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <Calendar size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit User"
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirm(u)}
                            title="Delete User"
                            className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50 text-xs text-gray-400 dark:text-gray-500">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* ══════════════════════════ MODALS ════════════════════════════════ */}

      {/* Create User */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New User">
        <div className="space-y-4">
          <Field label="Username" required>
            <input
              className={inputCls}
              placeholder="e.g. john_shop"
              value={createForm.username}
              onChange={(e) => setCreateForm(p => ({ ...p, username: e.target.value }))}
            />
          </Field>

          <Field label="Password" required>
            <div className="relative">
              <input
                type={showCreatePwd ? "text" : "password"}
                className={`${inputCls} pr-10`}
                placeholder="Enter password"
                value={createForm.password}
                onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowCreatePwd(!showCreatePwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCreatePwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <Field label="Subscription Duration (days)" required>
            <input
              type="number"
              min="1"
              className={inputCls}
              placeholder="e.g. 30"
              value={createForm.subscriptionDays}
              onChange={(e) => setCreateForm(p => ({ ...p, subscriptionDays: e.target.value }))}
            />
            {createForm.subscriptionDays && Number(createForm.subscriptionDays) > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Expires on:{" "}
                {new Date(Date.now() + Number(createForm.subscriptionDays) * 86400000)
                  .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
          </Field>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium text-sm shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create User"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit — ${selectedUser?.username}`}>
        <div className="space-y-4">
          <Field label="New Username">
            <input
              className={inputCls}
              value={editForm.username}
              onChange={(e) => setEditForm(p => ({ ...p, username: e.target.value }))}
            />
          </Field>

          <Field label="New Password (leave blank to keep)">
            <div className="relative">
              <input
                type={showEditPwd ? "text" : "password"}
                className={`${inputCls} pr-10`}
                placeholder="Leave blank to keep current"
                value={editForm.password}
                onChange={(e) => setEditForm(p => ({ ...p, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowEditPwd(!showEditPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showEditPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors">
              Cancel
            </button>
            <button onClick={handleEdit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium text-sm shadow-lg transition-all disabled:opacity-50">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Subscription Modal */}
      <Modal open={subOpen} onClose={() => setSubOpen(false)} title={`Subscription — ${selectedUser?.username}`}>
        <div className="space-y-4">

          {/* Current status */}
          {selectedUser && (
            <div className={`p-4 rounded-xl border-2 ${getDaysConfig(selectedUser.subscriptionStatus, selectedUser.daysRemaining).border} ${getDaysConfig(selectedUser.subscriptionStatus, selectedUser.daysRemaining).bg}`}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Current Status</p>
                  <p className={`font-bold capitalize ${getDaysConfig(selectedUser.subscriptionStatus, selectedUser.daysRemaining).text}`}>
                    {selectedUser.subscriptionStatus?.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Days Remaining</p>
                  <p className={`font-black text-xl tabular-nums ${getDaysConfig(selectedUser.subscriptionStatus, selectedUser.daysRemaining).text}`}>
                    {selectedUser.daysRemaining > 0 ? selectedUser.daysRemaining : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Start Date</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs">{fmtDate(selectedUser.subscription?.startDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">End Date</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs">{fmtDate(selectedUser.subscription?.endDate)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action selector */}
          <div className="grid grid-cols-2 gap-2">
            {["extend", "reduce"].map((a) => (
              <button
                key={a}
                onClick={() => setSubForm(p => ({ ...p, action: a }))}
                className={`py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                  subForm.action === a
                    ? a === "extend"
                      ? "bg-green-600 border-green-600 text-white shadow-lg"
                      : "bg-red-500 border-red-500 text-white shadow-lg"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                {a === "extend" ? "➕ Extend" : "➖ Reduce"}
              </button>
            ))}
          </div>

          <Field label={`Days to ${subForm.action}`} required>
            <input
              type="number"
              min="1"
              className={inputCls}
              placeholder="e.g. 30"
              value={subForm.days}
              onChange={(e) => setSubForm(p => ({ ...p, days: e.target.value }))}
            />
            {subForm.days && Number(subForm.days) > 0 && selectedUser?.subscription?.endDate && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                New end date:{" "}
                {(() => {
                  const base =
                    subForm.action === "extend"
                      ? new Date(Math.max(new Date(selectedUser.subscription.endDate), Date.now()))
                      : new Date(selectedUser.subscription.endDate);
                  const newDate = new Date(base);
                  const delta = subForm.action === "extend" ? Number(subForm.days) : -Number(subForm.days);
                  newDate.setDate(newDate.getDate() + delta);
                  return newDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                })()}
              </p>
            )}
          </Field>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setSubOpen(false)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSub}
              disabled={submitting}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium text-sm shadow-lg transition-all disabled:opacity-50 ${
                subForm.action === "extend"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
              }`}
            >
              {submitting ? "Saving…" : subForm.action === "extend" ? "Extend Subscription" : "Reduce Subscription"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              ⚠️ Permanently delete <strong>{deleteConfirm?.username}</strong>?
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              This will also delete all their entries, sales, and metadata. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors">
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm._id)}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-medium text-sm shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? "Deleting…" : "Delete User"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}