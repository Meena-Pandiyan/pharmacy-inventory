import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { getMedicines, getReports, getSales } from "../api";

const ITEMS_PER_PAGE = 5;

function SkeletonCard() {
  return (
    <div className="kpi-card">
      <div className="skeleton kpi-icon" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <div className="kpi-body">
        <div className="skeleton skeleton-text" style={{ width: "60%" }} />
        <div className="skeleton" style={{ height: 28, width: "40%", margin: "6px 0" }} />
        <div className="skeleton skeleton-text" style={{ width: "50%" }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]           = useState(null);
  const [medicines, setMedicines]   = useState([]);
  const [sales, setSales]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [page, setPage]             = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, mRes, saRes] = await Promise.all([getReports(), getMedicines(), getSales()]);
        setStats(sRes.data);
        setMedicines(Array.isArray(mRes.data) ? mRes.data : []);
        setSales(Array.isArray(saRes.data) ? saRes.data : []);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build last 7 days sales chart data
  const salesChartData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const dayTotal = sales
        .filter((s) => new Date(s.createdAt).toDateString() === d.toDateString())
        .reduce((sum, s) => sum + (s.grandTotal || 0), 0);
      days.push({ day: label, sales: parseFloat(dayTotal.toFixed(2)) });
    }
    return days;
  })();

  // Category-wise medicine count
  const categoryData = (() => {
    const map = {};
    medicines.forEach((m) => {
      map[m.category] = (map[m.category] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  })();

  const today = new Date();
  const lowStockList  = medicines.filter((m) => m.quantity < (m.reorderLevel ?? 25) && m.quantity > 0);
  const expiredList   = medicines.filter((m) => new Date(m.expiryDate) < today);
  const expiringSoon  = medicines.filter((m) => {
    const d = Math.ceil((new Date(m.expiryDate) - today) / 86400000);
    return d >= 0 && d <= 30;
  });
  const outOfStock    = medicines.filter((m) => m.quantity === 0);

  const categories = ["All", ...new Set(medicines.map((m) => m.category))];

  const filtered = medicines
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .filter((m) => categoryFilter === "All" || m.category === categoryFilter);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const todaySales = sales.filter((s) => new Date(s.createdAt).toDateString() === today.toDateString());

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening today.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/medicines")}>+ Add Medicine</button>
          <button className="btn btn-sm" onClick={() => navigate("/sales")}>🧾 Create Bill</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {loading ? (
          [1,2,3,4].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="kpi-card">
              <div className="kpi-icon blue">💊</div>
              <div className="kpi-body">
                <div className="kpi-label">Total Medicines</div>
                <div className="kpi-value">{stats?.totalMedicines ?? 0}</div>
                <div className="kpi-trend neutral">📦 In inventory</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon orange">⚠️</div>
              <div className="kpi-body">
                <div className="kpi-label">Low Stock</div>
                <div className="kpi-value" style={{ color: "var(--orange)" }}>{stats?.lowStock ?? 0}</div>
                <div className="kpi-trend down">Below reorder level</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon red">🚫</div>
              <div className="kpi-body">
                <div className="kpi-label">Expired</div>
                <div className="kpi-value" style={{ color: "var(--red)" }}>{stats?.expired ?? 0}</div>
                <div className="kpi-trend down">Need immediate action</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon green">💰</div>
              <div className="kpi-body">
                <div className="kpi-label">Total Sales</div>
                <div className="kpi-value" style={{ color: "var(--green)", fontSize: "22px" }}>
                  ₹{(stats?.totalSalesValue ?? 0).toFixed(0)}
                </div>
                <div className="kpi-trend up">↑ {todaySales.length} bills today</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon purple">🛒</div>
              <div className="kpi-body">
                <div className="kpi-label">Out of Stock</div>
                <div className="kpi-value" style={{ color: "var(--purple)" }}>{outOfStock.length}</div>
                <div className="kpi-trend down">Needs restocking</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Sales Overview</div>
              <div className="card-subtitle">Last 7 days revenue</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
                formatter={(v) => [`₹${v}`, "Sales"]}
              />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Category Distribution</div>
              <div className="card-subtitle">Medicines by category</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={80} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Grid — Table + Alerts */}
      <div className="dashboard-grid">

        {/* Recent Medicines Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Medicine Inventory</div>
              <div className="card-subtitle">{filtered.length} medicines found</div>
            </div>
            <button className="btn btn-sm" onClick={() => navigate("/medicines")}>+ Add</button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
            <div className="search-bar" style={{ flex: 1, minWidth: "160px" }}>
              <span className="search-icon">🔍</span>
              <input className="input" placeholder="Search medicine..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input" style={{ width: "140px" }} value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3,4,5].map((i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />)}
            </div>
          ) : paginated.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>No medicines found</p>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Price</th>
                    <th>Expiry</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m) => {
                    const isExpired = new Date(m.expiryDate) < today;
                    const isLow     = m.quantity < (m.reorderLevel ?? 25);
                    return (
                      <tr key={m._id} className={isExpired ? "row-expired" : isLow ? "row-low" : ""}>
                        <td style={{ fontWeight: 500 }}>{m.name}</td>
                        <td><span className="badge badge-blue">{m.category}</span></td>
                        <td>{m.quantity}</td>
                        <td>₹{m.price}</td>
                        <td>{m.expiryDate?.substring(0, 10)}</td>
                        <td>
                          {isExpired
                            ? <span className="badge badge-red">Expired</span>
                            : isLow
                            ? <span className="badge badge-orange">Low Stock</span>
                            : <span className="badge badge-green">In Stock</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={`page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Alerts Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Out of Stock */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🚫 Out of Stock</div>
              <span className="badge badge-red">{outOfStock.length}</span>
            </div>
            {outOfStock.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>✅ All medicines in stock</p>
            ) : outOfStock.slice(0, 4).map((m) => (
              <div key={m._id} className="alert-item">
                <div className="alert-dot red" />
                <div className="alert-text">
                  <div className="alert-name">{m.name}</div>
                  <div className="alert-meta">{m.category}</div>
                </div>
                <span className="alert-badge red">0 units</span>
              </div>
            ))}
          </div>

          {/* Low Stock */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⚠️ Low Stock</div>
              <span className="badge badge-orange">{lowStockList.length}</span>
            </div>
            {lowStockList.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>✅ Stock levels are healthy</p>
            ) : lowStockList.slice(0, 4).map((m) => (
              <div key={m._id} className="alert-item">
                <div className="alert-dot orange" />
                <div className="alert-text">
                  <div className="alert-name">{m.name}</div>
                  <div className="alert-meta">Reorder at {m.reorderLevel ?? 25}</div>
                </div>
                <span className="alert-badge orange">{m.quantity} left</span>
              </div>
            ))}
          </div>

          {/* Expiring Soon */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⏳ Expiring Soon</div>
              <span className="badge badge-orange">{expiringSoon.length}</span>
            </div>
            {expiringSoon.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>✅ No medicines expiring soon</p>
            ) : expiringSoon.slice(0, 4).map((m) => {
              const days = Math.ceil((new Date(m.expiryDate) - today) / 86400000);
              return (
                <div key={m._id} className="alert-item">
                  <div className="alert-dot yellow" />
                  <div className="alert-text">
                    <div className="alert-name">{m.name}</div>
                    <div className="alert-meta">{m.expiryDate?.substring(0, 10)}</div>
                  </div>
                  <span className="alert-badge orange">{days}d left</span>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
