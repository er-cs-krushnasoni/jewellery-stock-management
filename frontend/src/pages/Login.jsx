// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`,
        { username: username.trim(), password }, // Trim username before sending
        { withCredentials: true }
      );

      if (response.data.token) {
        login(response.data.token, response.data.user);
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const handleUsernameChange = (e) => {
    // Remove leading and trailing spaces automatically
    const trimmedValue = e.target.value.trim();
    setUsername(trimmedValue);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <form
        onSubmit={handleLogin}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 space-y-6 w-full max-w-md hover:shadow-2xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50"
      >
        {/* Modern heading with better typography */}
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
          Welcome Back
        </h2>

        {/* Username field with automatic trimming */}
        <div className="space-y-2">
          <label className="block font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50 backdrop-blur-sm placeholder-gray-500 text-gray-900 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
            placeholder="Enter your username"
            required
          />
        </div>

        {/* Password field with visibility toggle */}
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
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 transition-colors duration-200 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Modern error message with better styling */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 dark:bg-red-900/20 dark:border-red-800/50">
            <p className="text-red-600 text-sm text-center font-medium dark:text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Modern button with gradient and hover effects */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-blue-500/20 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}