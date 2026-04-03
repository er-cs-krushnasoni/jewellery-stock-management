// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../config/api";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubscriptionExpired(false);
    setLoading(true);

    try {
      const response = await api.post("/api/auth/login", {
        username: username.trim(),
        password
      });

      if (response.data.token) {
        login(response.data.token, response.data.user);
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      const data = err.response?.data;

      if (data?.subscriptionExpired) {
        setSubscriptionExpired(true);
        setError(data.message || "Subscription Expired");
      } else {
        setError(data?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <form
        onSubmit={handleLogin}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 space-y-6 w-full max-w-md hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50"
      >
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
          Welcome Back
        </h2>

        <div className="space-y-2">
          <label className="block font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
            placeholder="Enter your username"
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 transition-colors duration-200 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Error / Subscription Expired Block ─────────────────────────── */}
        {error && (
          subscriptionExpired ? (
            <div className="rounded-xl border-2 border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 p-4 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Subscription Expired
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Your subscription has expired or has not been activated. Please contact your administrator to renew access.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 dark:bg-red-900/20 dark:border-red-800/50">
              <p className="text-red-600 text-sm text-center font-medium dark:text-red-400">
                {error}
              </p>
            </div>
          )
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-blue-500/20 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}