import { useEffect, useState } from "react";
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from "../api";

const EMPTY_FORM = { name: "", contact: "", address: "", email: "" };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await getSuppliers();
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Failed to load suppliers");
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      if (editId) {
        await updateSupplier(editId, form);
        setEditId(null);
      } else {
        await addSupplier(form);
      }
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s) => {
    setEditId(s._id);
    setForm({ name: s.name, contact: s.contact, address: s.address || "", email: s.email || "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    try {
      await deleteSupplier(id);
      load();
    } catch {
      setError("Failed to delete supplier");
    }
  };

  return (
    <div className="page">
      <h1>🏢 Suppliers</h1>

      <div className="card">
        <h3>{editId ? "Edit Supplier" : "Add Supplier"}</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit} className="form-grid">
          <input className="input" placeholder="Supplier Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Contact Number" value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })} required />
          <input className="input" placeholder="Address" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className="input" type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : editId ? "Update" : "Add"}
            </button>
            {editId && (
              <button className="btn" type="button" style={{ background: "#64748b" }}
                onClick={() => { setEditId(null); setForm(EMPTY_FORM); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Supplier List</h3>
        {suppliers.length === 0 ? (
          <p>No suppliers available</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.contact}</td>
                  <td>{s.address || "—"}</td>
                  <td>{s.email || "—"}</td>
                  <td style={{ display: "flex", gap: "6px" }}>
                    <button className="btn" style={{ padding: "5px 10px", fontSize: "13px" }}
                      onClick={() => handleEdit(s)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(s._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
