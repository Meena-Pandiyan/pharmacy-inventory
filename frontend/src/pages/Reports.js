import { useEffect, useState } from "react";
import { getReports } from "../api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getReports({ from, to });
      setData(res.data);
    } catch (err) {
      console.error("Reports load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  if (loading) return <div className="page-content"><p>Loading...</p></div>;
  if (!data) return <div className="page-content"><p className="error">Failed to load reports.</p></div>;

  const { kpi, dailyTrend, monthlyTrend, categoryBreakdown, topMedicines, customers, supplierBreakdown, expiringSoon } = data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>📈 Reports & Analytics</h1>
          <p>Business overview and insights</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div>
            <label className="field-label">From</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} />
          </div>
          <div>
            <label className="field-label">To</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150 }} />
          </div>
          <button className="btn" onClick={load}>Apply</button>
          <button className="btn btn-outline" onClick={() => { setFrom(""); setTo(""); setTimeout(load, 0); }}>Reset</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard icon="💰" color="green"  label="Total Revenue"      value={`₹${kpi.totalRevenue.toFixed(2)}`} />
        <KpiCard icon="📦" color="blue"   label="Total Sales"        value={kpi.totalSalesCount} />
        <KpiCard icon="💊" color="purple" label="Medicines Sold"     value={kpi.totalMedicinesSold} />
        <KpiCard icon="📈" color="green"  label="Net Profit"         value={`₹${kpi.netProfit.toFixed(2)}`} />
        <KpiCard icon="🏥" color="blue"   label="Total Medicines"    value={kpi.totalMedicines} />
        <KpiCard icon="⚠️" color="orange" label="Low Stock"          value={kpi.lowStock} />
        <KpiCard icon="❌" color="red"    label="Expired"            value={kpi.expired} />
        <KpiCard icon="🚫" color="red"    label="Out of Stock"       value={kpi.outOfStock} />
      </div>

      {/* Daily Revenue Trend */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Daily Revenue (Last 30 Days)</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dailyTrend}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => [`₹${v}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#revGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Trend + Category Breakdown */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">Monthly Revenue vs Purchases</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `₹${v}`} />
              <Legend />
              <Bar dataKey="revenue"   name="Revenue"   fill="#3B82F6" radius={[4,4,0,0]} />
              <Bar dataKey="purchases" name="Purchases" fill="#F59E0B" radius={[4,4,0,0]} />
              <Bar dataKey="profit"    name="Profit"    fill="#10B981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Sales by Category</div></div>
          {categoryBreakdown.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `₹${v}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Medicines + Customers */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">Top 10 Selling Medicines</div></div>
          {topMedicines.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No sales data</p> : (
            <table className="table">
              <thead><tr><th>#</th><th>Medicine</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {topMedicines.map((m, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{m.name}</td>
                    <td>{m.qty}</td>
                    <td>₹{m.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top Customers</div>
              <div className="card-subtitle">Total: {customers.totalCustomers} | Repeat: {customers.repeatCustomers}</div>
            </div>
          </div>
          {customers.topCustomers.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No customer data</p> : (
            <table className="table">
              <thead><tr><th>Name</th><th>Mobile</th><th>Visits</th><th>Total</th></tr></thead>
              <tbody>
                {customers.topCustomers.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.mobile}</td>
                    <td>{c.visits}</td>
                    <td>₹{c.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Supplier Breakdown + Expiring Soon */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">Supplier-wise Purchases</div></div>
          {supplierBreakdown.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No purchase data</p> : (
            <table className="table">
              <thead><tr><th>Supplier</th><th>Amount</th></tr></thead>
              <tbody>
                {supplierBreakdown.map((s, i) => (
                  <tr key={i}>
                    <td>{s.name}</td>
                    <td>₹{s.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">⚠️ Expiring in 30 Days</div></div>
          {expiringSoon.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>None expiring soon</p> : (
            <table className="table">
              <thead><tr><th>Medicine</th><th>Qty</th><th>Expiry</th></tr></thead>
              <tbody>
                {expiringSoon.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td>{m.quantity}</td>
                    <td className="warning">{m.expiryDate?.substring(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, color, label, value }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${color}`}>{icon}</div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
    </div>
  );
}
