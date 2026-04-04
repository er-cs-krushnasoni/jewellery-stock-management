// src/components/Layout.jsx
import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Menu, X, Lock, Sun, Moon, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import ResetPasswordModal from "./ResetPasswordModal";
import SubscriptionBadge from "./SubscriptionBadge";

export default function Layout() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const navItems = user?.isAdmin
    ? [{ name: "Admin Panel", path: "/admin" }]
    : [
        { name: t("Sales"), path: "/sales" },
        { name: t("Stock"), path: "/" },
        { name: t("Stock Entries"), path: "/entries" },
        { name: t("Reports"), path: "/reports" },
      ];

  const handleResetPassword = () => {
    setShowResetPasswordModal(true);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-0 left-0 right-0 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center gap-3 md:hidden z-50 shadow-lg"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 14px)",
          paddingBottom: "14px",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="transition-transform duration-200">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </div>
        <span className="font-semibold text-lg">
          {sidebarOpen ? t("Close Menu") : t("Open Menu")}
        </span>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 fixed md:sticky top-0 left-0 w-72
          bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl
          border-r border-gray-200/50 dark:border-gray-700/50
          transition-all duration-300 z-40
          flex flex-col justify-between
        `}
        style={{
          height: "100%",
          paddingTop: "calc(env(safe-area-inset-top) + 72px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
          paddingLeft: "0",
          paddingRight: "0",
        }}
      >
        {/* Top section: Logo + Nav */}
        <div className="flex flex-col gap-2 min-h-0 px-4">
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {t("jewelleryStock") || "Jewellery Stock"}
            </h1>
            {user?.isAdmin && (
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <ShieldCheck size={12} className="text-blue-500" />
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                  Admin
                </span>
              </div>
            )}
            <div className="w-10 h-0.5 bg-gradient-to-r from-blue-600 to-blue-700 mx-auto mt-1 rounded-full" />
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-xl font-medium transition-all duration-200 text-sm ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-600/30"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col gap-1.5 pt-2">
          {/* Subscription badge — only for non-admin users */}
          {!user?.isAdmin && user?.subscription && (
            <SubscriptionBadge subscription={user.subscription} />
          )}
          <div className="px-4 flex flex-col gap-1.5 border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={handleResetPassword}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Lock size={16} />
              {t("Reset Password") || "Reset Password"}
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <LogOut size={16} />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className="flex-1 p-4 md:p-8 max-w-full overflow-y-auto"
        style={{
          marginTop: "calc(env(safe-area-inset-top) + 56px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
          <div className="mt-12 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
              Developed by Krushna Soni
            </p>
          </div>
        </div>
      </main>

      {showResetPasswordModal && (
        <ResetPasswordModal onClose={() => setShowResetPasswordModal(false)} />
      )}
    </div>
  );
}