import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router, Routes, Route,
  NavLink, Navigate, useLocation,
} from "react-router-dom";

import Dashboard     from "./pages/Dashboard";
import Medicines     from "./pages/Medicines";
import Sales         from "./pages/Sales";
import Suppliers     from "./pages/Suppliers";
import Reports       from "./pages/Reports";
import Expiry        from "./pages/Expiry";
import Login         from "./pages/Login";
import PurchaseOrders from "./pages/PurchaseOrders";
import "./App.css";

const NAV = [
  { to: "/dashboard",       icon: "📊", label: "Dashboard" },
  { to: "/medicines",       icon: "💊", label: "Medicines" },
  { to: "/sales",           icon: "🧾", label: "Sales" },
  { to: "/suppliers",       icon: "🏢", label: "Suppliers" },
  { to: "/purchase-orders", icon: "📦", label: "Purchase Orders" },
  { to: "/reports",         icon: "📈", label: "Reports" },
  { to: "/expiry",          icon: "⚠️",  label: "Expiry Alerts" },
];

function ProtectedRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

function AppLayout() {
  const location = useLocation();
  const isLogin  = location.pathname === "/login";
  const [dark, setDark]         = useState(() => localStorage.getItem("theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const currentPage = NAV.find((n) => location.pathname.startsWith(n.to))?.label || "Dashboard";

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  if (isLogin) return <Routes><Route path="/login" element={<Login />} /></Routes>;

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-title">
            <span>💊</span> PharmaCare
          </div>
          <div className="sidebar-logo-sub">Inventory Management</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: "none", background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              className="menu-toggle"
            >☰</button>
            <div>
              <div className="header-title">{currentPage}</div>
              <div className="header-breadcrumb">PharmaCare / {currentPage}</div>
            </div>
          </div>
          <div className="header-right">
            <button className="dark-toggle" onClick={() => setDark(!dark)} title="Toggle dark mode">
              {dark ? "☀️" : "🌙"}
            </button>
            <div className="avatar" title="Admin">A</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Routes>
            <Route path="/"                element={<Navigate to="/dashboard" replace />} />
            <Route path="/login"           element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/medicines"       element={<ProtectedRoute><Medicines /></ProtectedRoute>} />
            <Route path="/sales"           element={<ProtectedRoute><Sales /></ProtectedRoute>} />
            <Route path="/suppliers"       element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/reports"         element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/expiry"          element={<ProtectedRoute><Expiry /></ProtectedRoute>} />
            <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
