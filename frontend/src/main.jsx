// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";
import "./i18n";

const isInIframe = () => {
  try { return window.self !== window.top; } catch (e) { return true; }
};

if (isInIframe()) {
  const noop = function() {};
  ['log', 'info', 'warn', 'debug', 'trace', 'table', 'dir'].forEach(m => {
    try { console[m] = noop; } catch (e) {}
  });
}

// When served through /hidden-app proxy → basename = '/hidden-app'
// When served directly → basename = '/'
const getBasename = () => {
  if (window.location.pathname.startsWith('/hidden-app')) return '/hidden-app';
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