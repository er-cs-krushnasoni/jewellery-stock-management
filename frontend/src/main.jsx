// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";
import "./i18n";

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// Suppress console inside iframe — but only display methods, never error
// so React errors still surface during debugging
if (isInIframe()) {
  const noop = function() {};
  const suppress = ['log', 'info', 'warn', 'debug', 'trace', 'table', 'dir'];
  suppress.forEach(method => {
    try { console[method] = noop; } catch (e) {}
  });
}

// CRITICAL: Detect the basename dynamically.
// When served directly:     window.location.pathname = "/login" → basename = "/"
// When served via proxy:    window.location.pathname = "/hidden-app/login" → basename = "/hidden-app"
// BrowserRouter needs the correct basename so React Router strips it before
// matching routes. Without this, Router sees "/hidden-app/login" and finds
// no matching route → blank white screen.
const getBasename = () => {
  if (isInIframe()) {
    // Inside iframe we are always accessed via the /hidden-app proxy
    return '/hidden-app';
  }
  // Direct access — no basename needed
  return '/';
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={getBasename()}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);