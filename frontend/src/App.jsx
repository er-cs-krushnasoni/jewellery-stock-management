// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Entries from "./pages/Entries.jsx";
import Login from "./pages/Login.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import PurityPage from "./pages/PurityPage.jsx";
import EntryPage from "./pages/EntryPage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import './utils/consoleBlocker.js';

// Guard that only allows admin users
function AdminRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/sales" replace />;
  return children;
}

// Guard that only allows non-admin users (prevents admins accessing user pages)
function UserRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin layout */}
      <Route
        element={
          <AdminRoute>
            <Layout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Regular user layout */}
      <Route
        element={
          <UserRoute>
            <Layout />
          </UserRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/entries" element={<Entries />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/reports" element={<ReportPage />} />
        <Route path="/:metal" element={<CategoryPage />} />
        <Route path=":metal/:category" element={<PurityPage />} />
        <Route path=":metal/:category/:purity" element={<EntryPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;