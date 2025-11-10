// src/App.jsx
import { Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/entries" element={<Entries />} />
        <Route path="/sales" element={<SalesPage/>}/>
        <Route path="/reports" element={<ReportPage/>}/>
        <Route path="/:metal" element={<CategoryPage/>}/>
        <Route path= ":metal/:category" element={ <PurityPage />}/>
        <Route path= ":metal/:category/:purity" element={ <EntryPage />}/>
      </Route>
    </Routes>
  );
}

export default App;
