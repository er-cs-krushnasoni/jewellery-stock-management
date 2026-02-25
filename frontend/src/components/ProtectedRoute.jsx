// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();

  if (!token) {
    // With the correct BrowserRouter basename set in main.jsx,
    // React Router's <Navigate> resolves relative to the basename.
    // Direct access (basename="/"):          navigates to /login
    // Via proxy iframe (basename="/hidden-app"): navigates to /hidden-app/login
    // Both cases are handled correctly with the same code.
    return <Navigate to="/login" replace />;
  }

  return children;
}