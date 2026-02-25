// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    }

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      localStorage.removeItem("user");
      setUser(null);
    }

    const clearSession = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    };

    const handleBackNavigation = () => {
      clearSession();
      navigate("/login");
    };

    // Direct access only: clear session on tab close/refresh
    // Inside iframe: HiddenProject.tsx handles cleanup on exit,
    // and beforeunload fires on every proxied page navigation
    // which would log the user out on every route change
    if (!isInIframe()) {
      window.addEventListener("beforeunload", clearSession);
    }

    window.addEventListener("popstate", handleBackNavigation);

    return () => {
      if (!isInIframe()) {
        window.removeEventListener("beforeunload", clearSession);
      }
      window.removeEventListener("popstate", handleBackNavigation);
    };
  }, [navigate]);

  const login = (token, user) => {
    setToken(token);
    setUser(user);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    // With correct basename, this navigates to the right /sales in both contexts
    navigate("/sales");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);