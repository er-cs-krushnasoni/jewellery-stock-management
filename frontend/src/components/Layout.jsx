// // src/components/Layout.jsx
// import React, { useState } from "react";
// import { NavLink, Outlet } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import { LogOut, Menu, X, Lock } from "lucide-react";
// import LanguageSwitcher from "/jewellery-stock-management-app/frontend/src/components/ui/LanguageSwitcher";
// import { useTranslation } from "react-i18next";
// import ResetPasswordModal from "./ResetPasswordModal";

// export default function Layout() {
//   const { logout } = useAuth();
//   const { t } = useTranslation();
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

//   const navItems = [
//     { name: t("Sales"), path: "/sales" },
//     { name: t("Stock"), path: "/" },
//     { name: t(" Stock Entries"), path: "/entries" },
//     { name: t("Reports"), path: "/reports" }
//   ];

//   const handleResetPassword = () => {
//     setShowResetPasswordModal(true);
//     setSidebarOpen(false); // Close sidebar on mobile when modal opens
//   };

//   return (
//     <div className="min-h-screen flex flex-col md:flex-row">
//       {/* Mobile Menu Button - Fixed at top with higher z-index */}
//       <button
//         onClick={() => setSidebarOpen(!sidebarOpen)}
//         className="fixed top-0 left-0 right-0 w-full bg-blue-600 text-white p-3 flex items-center justify-center gap-2 md:hidden z-50"
//       >
//         {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
//         <span className="font-medium">
//           {sidebarOpen ? t("Close Menu") : t("Open Menu")}
//         </span>
//       </button>

//       {/* Sidebar */}
//       <aside className={`
//         ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
//         md:translate-x-0 fixed md:sticky top-12 md:top-0 left-0 w-64 h-screen
//         bg-white shadow-md p-4 space-y-4 transition-transform duration-300 z-40
//       `}>
//         <h1 className="text-2xl font-bold text-center text-blue-700 mt-4 md:mt-0">
//           {t("jewelleryStock") || "Jewellery Stock"}
//         </h1>

//         <nav className="space-y-2">
//           {navItems.map((item) => (
//             <NavLink
//               key={item.path}
//               to={item.path}
//               onClick={() => setSidebarOpen(false)}
//               className={({ isActive }) =>
//                 `block px-4 py-2 rounded-lg ${
//                   isActive
//                     ? "bg-blue-600 text-white"
//                     : "text-gray-700 hover:bg-blue-100"
//                 }`
//               }
//             >
//               {item.name}
//             </NavLink>
//           ))}
//         </nav>

//         {/* Reset Password Button */}
//         <button
//           onClick={handleResetPassword}
//           className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
//         >
//           <Lock size={18} />
//           {t("Reset Password") || "Reset Password"}
//         </button>

//         {/* Logout Button */}
//         <button
//           onClick={logout}
//           className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
//         >
//           <LogOut size={18} />
//           {t("logout")}
//         </button>

//         {/* Language Switcher */}
//         {/* <div className="pt-4 border-t">
//           <LanguageSwitcher />
//         </div> */}
//       </aside>

//       {/* Backdrop */}
//       {sidebarOpen && (
//         <div 
//           className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Main Content - Add top margin for mobile to account for fixed button */}
//       <main className="flex-1 p-4 mt-12 md:mt-0">
//         <Outlet />
//         <p className="text-center text-xs text-gray-400 mt-8">
//           Developed by Krushna Soni
//         </p>
//       </main>

//       {/* Reset Password Modal */}
//       {showResetPasswordModal && (
//         <ResetPasswordModal
//           onClose={() => setShowResetPasswordModal(false)}
//         />
//       )}
//     </div>
//   );
// }


// src/components/Layout.jsx
import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Menu, X, Lock, Sun, Moon } from "lucide-react";
import LanguageSwitcher from "/jewellery-stock-management-app/frontend/src/components/ui/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import ResetPasswordModal from "./ResetPasswordModal";

export default function Layout() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  
  // Dark mode state with localStorage persistence
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode to document and save to localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const navItems = [
    { name: t("Sales"), path: "/sales" },
    { name: t("Stock"), path: "/" },
    { name: t(" Stock Entries"), path: "/entries" },
    { name: t("Reports"), path: "/reports" }
  ];

  const handleResetPassword = () => {
    setShowResetPasswordModal(true);
    setSidebarOpen(false); // Close sidebar on mobile when modal opens
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Button - Modern glassmorphism design */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-0 left-0 right-0 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-center gap-3 md:hidden z-50 shadow-lg backdrop-blur-sm"
      >
        <div className="transition-transform duration-200">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </div>
        <span className="font-semibold text-lg">
          {sidebarOpen ? t("Close Menu") : t("Open Menu")}
        </span>
      </button>

      {/* Sidebar - Modern card-like design with glassmorphism */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 fixed md:sticky top-16 md:top-0 left-0 w-72 h-screen
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl border-r border-gray-200/50 dark:border-gray-700/50
        p-6 space-y-6 transition-all duration-300 z-40
      `}>
        {/* Logo/Title with modern typography */}
        <div className="text-center pt-2 md:pt-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            {t("jewelleryStock") || "Jewellery Stock"}
          </h1>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-blue-700 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Navigation with modern button styling */}
        <nav className="space-y-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl"
                    : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-600/30"
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Action Buttons with modern styling */}
        <div className="space-y-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-purple-500/20"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {darkMode ? t("Light Mode") || "Light Mode" : t("Dark Mode") || "Dark Mode"}
          </button>

          {/* Reset Password Button */}
          <button
            onClick={handleResetPassword}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-orange-500/20"
          >
            <Lock size={20} />
            {t("Reset Password") || "Reset Password"}
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-red-500/20"
          >
            <LogOut size={20} />
            {t("logout")}
          </button>
        </div>

        {/* Language Switcher - Commented out as in original */}
        {/* <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <LanguageSwitcher />
        </div> */}
      </aside>

      {/* Backdrop with modern blur effect */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content with modern container and spacing */}
      <main className="flex-1 p-4 md:p-8 mt-16 md:mt-0 max-w-full">
        <div className="max-w-7xl mx-auto">
          <Outlet />
          
          {/* Footer with modern styling */}
          <div className="mt-12 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
              Developed by Krushna Soni
            </p>
          </div>
        </div>
      </main>

      {/* Reset Password Modal - Maintains existing functionality */}
      {showResetPasswordModal && (
        <ResetPasswordModal
          onClose={() => setShowResetPasswordModal(false)}
        />
      )}
    </div>
  );
}