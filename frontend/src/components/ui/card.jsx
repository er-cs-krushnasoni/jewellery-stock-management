// // src/components/ui/card.jsx
// import React from "react";

// export function Card({ children, className = "" }) {
//   return <div className={`bg-white rounded-xl border p-4 ${className}`}>{children}</div>;
// }

// export function CardContent({ children, className = "" }) {
//   return <div className={className}>{children}</div>;
// }

import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}