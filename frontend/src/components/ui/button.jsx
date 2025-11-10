// // src/components/ui/button.jsx
// import React from "react";

// export const Button = ({ children, className = "", ...props }) => {
//   return (
//     <button
//       className={`px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition ${className}`}
//       {...props}
//     >
//       {children}
//     </button>
//   );
// };


// src/components/ui/button.jsx
import React from "react";

export const Button = ({ 
  children, 
  className = "", 
  variant = "primary", 
  size = "md",
  disabled = false,
  ...props 
}) => {
  
  // Base button styles
  const baseStyles = "font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  
  // Variant styles
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 focus:ring-blue-500/20 dark:from-blue-500 dark:to-blue-600",
    
    secondary: "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md focus:ring-gray-500/20 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700",
    
    outline: "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md focus:ring-gray-500/20 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700",
    
    danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 focus:ring-red-500/20",
    
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500/20 dark:text-gray-200 dark:hover:bg-gray-700"
  };
  
  // Size styles
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };
  
  const buttonClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
  
  return (
    <button
      className={buttonClasses}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};