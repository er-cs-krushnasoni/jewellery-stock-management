// 📁 src/router/index.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/components/ui/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Entries from "@/pages/Entries";
import Users from "@/pages/Users";
import Metadata from "@/pages/Metadata";
import CategoryPage from "@/pages/CategoryPage";
import PurityPage from "@/pages/PurityPage";
import EntryPage from "@/pages/EntryPage";
import ProtectedRoute from "@/components/ui/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: "", element: <Home /> }, // now "/"
      { path: "entries", element: <Entries /> },
      { path: "metadata", element: <Metadata /> },
      { path: "users", element: <Users /> },
      { path: ":metal", element: <CategoryPage /> }, // now "/gold"
      { path: ":metal/:category", element: <PurityPage /> }, // e.g. "/gold/necklace"
      { path: ":metal/:category/:purity", element: <EntryPage /> }, // e.g. "/gold/necklace/916"
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
]);


export default function AppRouter() {
  return <RouterProvider router={router} />;
}
