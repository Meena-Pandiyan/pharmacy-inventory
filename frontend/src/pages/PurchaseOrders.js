import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getPurchaseOrders, updatePurchaseOrder,
  deletePurchaseOrder, sendPurchaseOrderEmail,
  getSuppliers, getMedicines, createPurchaseOrder,
} from "../api";

const STATUS_META = {
  Pending:  { badge: "badge-orange", label: "Pending",  icon: "⏳" },
  Approved: { badge: "badge-blue",   label: "Approved", icon: "✅" },
  Received: { badge: "badge-green",  label: "Received", icon: "📦" },
};

const ITEMS_PER_PAGE = 8;

function Toast({ msg, type = "success", onClose }) {
  if (!msg) return null;
  const styles = {
    success: { bg: "#ECFDF5", border: "#6EE7B7", color: "#065F46" },
    error:   { bg: "#FEF2F2", border: "#FCA5A5", color: "#991B1B" },
    info:    { bg: "#EFF6FF", border: "#93C5FD", color: "#1E40AF" },
  };
  const s = styles[type];
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 2000,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 500,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      display: "flex", alignItems: "center", gap: 10, minWidth: 280,
    }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: s.color }}>✕</button>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

export default function PurchaseOrders() {
  const [orders, setOrders]       = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("All");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [sortBy, setSortBy]       = useState("date");

  const [toast, setToast]         = useState({ msg: "", type: "success" });
  const [emailModal, setEmailModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal]   = useState(null); // order being edited

  const [manualForm, setManualForm] = useState({ medicineId: "", supplierId: "", orderQty: "" });
  const [manualError, setManualError] = useState("");
  const [editState, setEditState]   = useState({ supplierId: "", orderQty: "" });

  const flash = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 4000);
  };

  const load = async () => {
    try {
      setLoading(true);
      const [ordRes, supRes, medRes] = await Promise.all([
        getPurchaseOrders(), getSuppliers(), getMedicines(),
      ]);
      setOrders(Array.isArray(ordRes.data) ? ordRes.data : []);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setMedicines(Array.isArray(medRes.data) ? medRes.data : []);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // ── Derived data ──────────────────────────────────────────
  const counts = {
    All:      orders.length,
    Pending:  orders.filter((o) => o.status === "Pending").length,
    Approved: orders.filter((o) => o.status === "Approved").length,
    Received: orders.filter((o) => o.status === "Received").length,
  };

  const filtered = orders
    .filter((o) => filter === "All" || o.status === filter)
    .filter((o) =>
      !search ||
      o.medicineName?.toLowerCase().includes(search.toLowerCase()) ||
      o.supplierName?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "date")     return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "medicine") return a.medicineName.localeCompare(b.medicineName);
      if (sortBy === "qty")      return b.orderQty - a.orderQty;
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Chart data — orders per supplier
  const supplierChartData = suppliers.map((s) => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
    orders: orders.filter((o) => o.supplierName === s.name).length,
  })).filter((d) => d.orders > 0);

  // ── Actions ───────────────────────────────────────────────
  const handleStatusChange = async (id, status) => {
    try {
      await updatePurchaseOrder(id, { status });
      load();
      flash(status === "Received" ? "📦 Stock updated successfully" : `Order marked as ${status}`);
    } catch (err) {
      flash(err.response?.data?.message || "Failed to update", "error");
    }
  };

  const handleSendEmail = async (order) => {
    if (!order.supplierEmail) {
      flash("Supplier has no email. Edit supplier to add one.", "error");
      return;
    }
    try {
      flash("⏳ Sending email...", "info");
      const res = await sendPurchaseOrderEmail(order._id);
      flash(`📧 Email sent to ${order.supplierEmail}`);
      load();
      setEmailModal(res.data.order.emailLog);
    } catch (err) {
      flash(err.response?.data?.error || "Failed to send email", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this purchase order?")) return;
    try { await deletePurchaseOrder(id); load(); flash("Order deleted"); }
    catch { flash("Failed to delete", "error"); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setManualError("");
    if (!manualForm.medicineId || !manualForm.orderQty) {
      setManualError("Medicine and quantity are required");
      return;
    }
    try {
      await createPurchaseOrder({
        medicineId: manualForm.medicineId,
        supplierId: manualForm.supplierId || undefined,
        orderQty: Number(manualForm.orderQty),
      });
      setManualForm({ medicineId: "", supplierId: "", orderQty: "" });
      setCreateModal(false);
      load();
      flash("Purchase order created successfully");
    } catch (err) {
      setManualError(err.response?.data?.message || "Failed to create order");
    }
  };

  const openEdit = (o) => {
    setEditState({ supplierId: o.supplier || "", orderQty: o.orderQty });
    setEditModal(o);
  };

  const handleSaveEdit = async () => {
    try {
      await updatePurchaseOrder(editModal._id, {
        supplierId: editState.supplierId,
        orderQty: Number(editState.orderQty),
      });
      setEditModal(null);
      load();
      flash("Order updated successfully");
    } catch (err) {
      flash(err.response?.data?.message || "Failed to update", "error");
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "" })} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p>Manage and track all medicine purchase orders</p>
        </div>
        <button className="btn" onClick={() => setCreateModal(true)}>+ New Order</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { label: "Total Orders",    value: counts.All,      icon: "📋", color: "blue",   trend: "All time" },
          { label: "Pending",         value: counts.Pending,  icon: "⏳", color: "orange", trend: "Awaiting approval" },
          { label: "Approved",        value: counts.Approved, icon: "✅", color: "purple", trend: "Ready to receive" },
          { label: "Received",        value: counts.Received, icon: "📦", color: "green",  trend: "Stock updated" },
        ].map((c) => (
          <div key={c.label} className="kpi-card">
            <div className={`kpi-icon ${c.color}`}>{c.icon}</div>
            <div className="kpi-body">
              <div className="kpi-label">{c.label}</div>
              <div className="kpi-value">{c.value}</div>
              <div className="kpi-trend neutral">{c.trend}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Create form row */}
      {supplierChartData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Orders by Supplier</div>
            <div className="card-subtitle">Distribution of purchase orders</div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={supplierChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Orders Table */}
      <div className="card">
        {/* Filter + Search bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {/* Status tabs */}
          <div style={{ display: "flex", gap: 6, background: "var(--bg)", borderRadius: 8, padding: 4 }}>
            {["All", "Pending", "Approved", "Received"].map((s) => (
              <button key={s} onClick={() => { setFilter(s); setPage(1); }}
                style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, transition: "all 0.15s",
                  background: filter === s ? "var(--surface)" : "transparent",
                  color: filter === s ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: filter === s ? "var(--shadow-sm)" : "none",
                }}>
                {s}
                {counts[s] > 0 && (
                  <span style={{ marginLeft: 6, background: filter === s ? "#3B82F6" : "var(--border)", color: filter === s ? "white" : "var(--text-muted)", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
            <span className="search-icon">🔍</span>
            <input className="input" placeholder="Search medicine or supplier..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          {/* Sort */}
          <select className="input" style={{ width: 150 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort: Latest</option>
            <option value="medicine">Sort: Medicine</option>
            <option value="qty">Sort: Qty</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3,4,5].map((i) => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 6 }} />)}
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 15, fontWeight: 500 }}>No purchase orders found</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Create a new order to get started</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Supplier</th>
                  <th>Current Stock</th>
                  <th>Order Qty</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((o, idx) => {
                  const sm = STATUS_META[o.status];
                  return (
                    <tr key={o._id}>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{o.medicineName}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{o.supplierName}</div>
                        {o.supplierEmail && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{o.supplierEmail}</div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 600,
                          color: o.currentStock === 0 ? "var(--red)" : o.currentStock < 10 ? "var(--orange)" : "var(--green)"
                        }}>
                          {o.currentStock} units
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{o.orderQty}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>units</span>
                      </td>
                      <td>
                        <span className={`badge ${o.autoGenerated ? "badge-orange" : "badge-blue"}`}>
                          {o.autoGenerated ? "🤖 Auto" : "✋ Manual"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td>
                        {o.emailLog?.sent ? (
                          <button onClick={() => setEmailModal(o.emailLog)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            <span className="badge badge-green">📧 Sent</span>
                          </button>
                        ) : (
                          <span className="badge badge-gray">Not sent</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${sm.badge}`}>{sm.icon} {sm.label}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {o.status !== "Received" && (
                            <button className="btn btn-sm btn-gray" onClick={() => openEdit(o)}>✏️</button>
                          )}
                          {o.status === "Pending" && (
                            <button className="btn btn-sm" onClick={() => handleStatusChange(o._id, "Approved")}>Approve</button>
                          )}
                          {o.status === "Approved" && (
                            <>
                              <button className="btn btn-sm" style={{ background: "#0369A1" }} onClick={() => handleSendEmail(o)}>📧</button>
                              <button className="btn btn-sm btn-green" onClick={() => handleStatusChange(o._id, "Received")}>Received</button>
                            </>
                          )}
                          {o.status === "Pending" && (
                            <button className="btn btn-sm" style={{ background: "#0369A1" }} onClick={() => handleSendEmail(o)}>📧</button>
                          )}
                          <button className="delete-btn" style={{ padding: "4px 8px" }} onClick={() => handleDelete(o._id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <span style={{ fontSize: 13, color: "var(--text-muted)", marginRight: 8 }}>
                  {filtered.length} orders
                </span>
                <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <>
                      {i > 0 && arr[i - 1] !== p - 1 && <span key={`dots-${p}`} style={{ color: "var(--text-muted)", padding: "0 4px" }}>…</span>}
                      <button key={p} className={`page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                    </>
                  ))}
                <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create Order Modal ── */}
      {createModal && (
        <Modal title="📦 Create Purchase Order" onClose={() => { setCreateModal(false); setManualError(""); }}>
          {manualError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, marginBottom: 16 }}>
              ⚠️ {manualError}
            </div>
          )}
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="field-label">Medicine *</label>
              <select className="input" value={manualForm.medicineId}
                onChange={(e) => setManualForm({ ...manualForm, medicineId: e.target.value })} required>
                <option value="">-- Select Medicine --</option>
                {medicines.map((m) => (
                  <option key={m._id} value={m._id}>{m.name} — Stock: {m.quantity}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Supplier</label>
              <select className="input" value={manualForm.supplierId}
                onChange={(e) => setManualForm({ ...manualForm, supplierId: e.target.value })}>
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} {s.email ? `(${s.email})` : "(no email)"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Order Quantity *</label>
              <input className="input" type="number" min="1" placeholder="Enter quantity to order"
                value={manualForm.orderQty}
                onChange={(e) => setManualForm({ ...manualForm, orderQty: e.target.value })} required />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" className="btn btn-outline" onClick={() => { setCreateModal(false); setManualError(""); }}>Cancel</button>
              <button type="submit" className="btn">Create Order</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Order Modal ── */}
      {editModal && (
        <Modal title="✏️ Edit Purchase Order" onClose={() => setEditModal(null)}>
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--bg)", borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{editModal.medicineName}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Current Stock: {editModal.currentStock} units</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="field-label">Supplier</label>
              <select className="input" value={editState.supplierId}
                onChange={(e) => setEditState({ ...editState, supplierId: e.target.value })}>
                <option value="">-- Unassigned --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} {s.email ? `(${s.email})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Order Quantity</label>
              <input className="input" type="number" min="1"
                value={editState.orderQty}
                onChange={(e) => setEditState({ ...editState, orderQty: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-green" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Email Copy Modal ── */}
      {emailModal && (
        <Modal title="📧 Email Copy" onClose={() => setEmailModal(null)}>
          <div style={{ background: "var(--bg)", borderRadius: 8, padding: 16, fontSize: 13 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Subject:</span>
              <span>{emailModal.subject}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Sent At:</span>
              <span>{new Date(emailModal.sentAt).toLocaleString("en-IN")}</span>
            </div>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--text-primary)", lineHeight: 1.8, fontSize: 13 }}>
              {emailModal.body}
            </pre>
          </div>
          <button className="btn" style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={() => setEmailModal(null)}>Close</button>
        </Modal>
      )}
    </div>
  );
}
