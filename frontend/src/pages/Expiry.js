import { useEffect, useState } from "react";
import { getExpiry } from "../api";

export default function Expiry() {
  const [expiryList, setExpiryList] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [activeTab, setActiveTab]   = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getExpiry();
        setExpiryList(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Expiry load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getDaysLeft = (d) =>
    Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));

  const getUrgency = (days) => {
    if (days <= 0)   return { label: "Expired",      badge: "badge-red",    dot: "#EF4444", bar: "#EF4444", pct: 100 };
    if (days <= 30)  return { label: "Critical",     badge: "badge-red",    dot: "#EF4444", bar: "#EF4444", pct: 90  };
    if (days <= 60)  return { label: "High Risk",    badge: "badge-orange", dot: "#F59E0B", bar: "#F59E0B", pct: 70  };
    if (days <= 90)  return { label: "Moderate",     badge: "badge-orange", dot: "#F59E0B", bar: "#FBBF24", pct: 50  };
    return             { label: "Expiring Soon", badge: "badge-blue",   dot: "#3B82F6", bar: "#3B82F6", pct: 25  };
  };

  const expired      = expiryList.filter((m) => getDaysLeft(m.expiryDate) <= 0);
  const critical     = expiryList.filter((m) => { const d = getDaysLeft(m.expiryDate); return d > 0 && d <= 30; });
  const highRisk     = expiryList.filter((m) => { const d = getDaysLeft(m.expiryDate); return d > 30 && d <= 60; });
  const moderate     = expiryList.filter((m) => { const d = getDaysLeft(m.expiryDate); return d > 60; });

  const tabData = {
    all:      expiryList,
    expired,
    critical,
    highRisk,
    moderate,
  };

  const filtered = (tabData[activeTab] || []).filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: "all",      label: "All",          count: expiryList.length, color: "#64748B" },
    { key: "expired",  label: "Expired",      count: expired.length,    color: "#EF4444" },
    { key: "critical", label: "Critical",     count: critical.length,   color: "#EF4444" },
    { key: "highRisk", label: "High Risk",    count: highRisk.length,   color: "#F59E0B" },
    { key: "moderate", label: "Expiring Soon",count: moderate.length,   color: "#3B82F6" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Expiry Alerts</h1>
          <p>Monitor and manage medicine expiry across your inventory</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon red">🚫</div>
          <div className="kpi-body">
            <div className="kpi-label">Already Expired</div>
            <div className="kpi-value" style={{ color: "var(--red)" }}>{expired.length}</div>
            <div className="kpi-trend down">Immediate action needed</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red">🔴</div>
          <div className="kpi-body">
            <div className="kpi-label">Critical (≤30 days)</div>
            <div className="kpi-value" style={{ color: "var(--red)" }}>{critical.length}</div>
            <div className="kpi-trend down">Expiring this month</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orange">🟠</div>
          <div className="kpi-body">
            <div className="kpi-label">High Risk (≤60 days)</div>
            <div className="kpi-value" style={{ color: "var(--orange)" }}>{highRisk.length}</div>
            <div className="kpi-trend neutral">Plan for disposal</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon blue">📅</div>
          <div className="kpi-body">
            <div className="kpi-label">Expiring Soon (≤6mo)</div>
            <div className="kpi-value" style={{ color: "var(--blue)" }}>{moderate.length}</div>
            <div className="kpi-trend neutral">Monitor closely</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Tabs + Search */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, background: "var(--bg)", borderRadius: 8, padding: 4, flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, transition: "all 0.15s",
                  background: activeTab === t.key ? "var(--surface)" : "transparent",
                  color: activeTab === t.key ? t.color : "var(--text-muted)",
                  boxShadow: activeTab === t.key ? "var(--shadow-sm)" : "none",
                }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    marginLeft: 6, borderRadius: 10, padding: "1px 7px", fontSize: 11,
                    background: activeTab === t.key ? t.color : "var(--border)",
                    color: activeTab === t.key ? "white" : "var(--text-muted)",
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="search-bar" style={{ minWidth: 220 }}>
            <span className="search-icon">🔍</span>
            <input className="input" placeholder="Search medicine or category..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 6 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
              {search ? "No medicines match your search" : "No medicines in this category"}
            </p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Your inventory looks healthy!</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Urgency</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((med, idx) => {
                const daysLeft = getDaysLeft(med.expiryDate);
                const urgency  = getUrgency(daysLeft);
                return (
                  <tr key={med._id}
                    style={{ background: daysLeft <= 0 ? "rgba(239,68,68,0.04)" : daysLeft <= 30 ? "rgba(245,158,11,0.04)" : "transparent" }}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{med.name}</div>
                    </td>
                    <td><span className="badge badge-blue">{med.category || "General"}</span></td>
                    <td>
                      <span style={{ fontWeight: 600, color: med.quantity === 0 ? "var(--red)" : "var(--text-primary)" }}>
                        {med.quantity} units
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {med.expiryDate?.substring(0, 10)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 15, color: urgency.dot }}>
                        {daysLeft <= 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d`}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${urgency.badge}`}>
                        {urgency.label}
                      </span>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <div style={{ background: "var(--border)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                        <div style={{
                          width: `${urgency.pct}%`,
                          height: "100%",
                          background: urgency.bar,
                          borderRadius: 4,
                          transition: "width 0.3s",
                        }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer summary */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 0", borderTop: "1px solid var(--border)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "Expired",      count: expired.length,   color: "#EF4444" },
              { label: "Critical",     count: critical.length,  color: "#EF4444" },
              { label: "High Risk",    count: highRisk.length,  color: "#F59E0B" },
              { label: "Expiring Soon",count: moderate.length,  color: "#3B82F6" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ color: "var(--text-secondary)" }}>{s.label}:</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
