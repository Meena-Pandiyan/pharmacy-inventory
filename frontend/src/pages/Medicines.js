import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, getSuppliers } from "../api";

const EMPTY_FORM = { name: "", category: "General", quantity: "", price: "", expiryDate: "", supplier: "", reorderLevel: 25, reorderQty: 50 };

const mapCategory = (drugClass = "") => {
  const c = drugClass.toLowerCase();
  if (c.includes("antibiotic") || c.includes("anti-infective")) return "Antibiotic";
  if (c.includes("analgesic") || c.includes("pain")) return "Painkiller";
  if (c.includes("antidiabetic") || c.includes("insulin") || c.includes("diabetes")) return "Antidiabetic";
  if (c.includes("antihypertensive") || c.includes("blood pressure") || c.includes("cardiac")) return "Cardiac";
  if (c.includes("antacid") || c.includes("gastrointestinal")) return "Antacid";
  if (c.includes("vitamin") || c.includes("supplement") || c.includes("mineral")) return "Supplement";
  if (c.includes("antifungal")) return "Antifungal";
  if (c.includes("antihistamine") || c.includes("allergy")) return "Antiallergic";
  if (c.includes("antiviral")) return "Antiviral";
  if (c.includes("steroid") || c.includes("corticosteroid")) return "Steroid";
  if (c.includes("antidepressant") || c.includes("psychiatric")) return "Psychiatric";
  if (c.includes("thyroid")) return "Thyroid";
  return "General";
};

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const load = async () => {
    try {
      const [medRes, supRes] = await Promise.all([getMedicines(), getSuppliers()]);
      setMedicines(medRes.data);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
    } catch {
      setError("Failed to load data");
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setSuggestions([]); setShowDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setSugLoading(true);
        const res = await axios.get(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${query}"&limit=10`);
        const results = res.data.results || [];
        const mapped = results.map((r) => ({
          name: r.openfda?.brand_name?.[0] || r.openfda?.generic_name?.[0] || "Unknown",
          generic: r.openfda?.generic_name?.[0] || "",
          category: mapCategory(r.openfda?.pharm_class_epc?.[0] || ""),
        }));
        const unique = mapped.filter((item, idx, self) =>
          idx === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase())
        );
        setSuggestions(unique);
        setShowDropdown(unique.length > 0);
      } catch {
        try {
          const res2 = await axios.get(`https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${query}"&limit=10`);
          const results = res2.data.results || [];
          const mapped = results.map((r) => ({
            name: r.openfda?.brand_name?.[0] || r.openfda?.generic_name?.[0] || "Unknown",
            generic: r.openfda?.generic_name?.[0] || "",
            category: mapCategory(r.openfda?.pharm_class_epc?.[0] || ""),
          }));
          const unique = mapped.filter((item, idx, self) =>
            idx === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase())
          );
          setSuggestions(unique);
          setShowDropdown(unique.length > 0);
        } catch {
          setSuggestions([]); setShowDropdown(false);
        }
      } finally {
        setSugLoading(false);
      }
    }, 400);
  }, []);

  const handleNameChange = (e) => {
    setForm({ ...form, name: e.target.value });
    fetchSuggestions(e.target.value);
  };

  const handleSelectSuggestion = (item) => {
    setForm((prev) => ({ ...prev, name: item.name, category: item.category || prev.category }));
    setSuggestions([]); setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const payload = {
        ...form,
        supplier: form.supplier && form.supplier !== "" ? form.supplier : undefined,
      };
      if (editId) {
        await updateMedicine(editId, payload);
        setEditId(null);
      } else {
        await addMedicine(payload);
      }
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to save medicine");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (med) => {
    setEditId(med._id);
    setForm({
      name: med.name,
      category: med.category,
      quantity: med.quantity,
      price: med.price,
      expiryDate: med.expiryDate?.substring(0, 10),
      supplier: med.supplier?._id || med.supplier || "",
      reorderLevel: med.reorderLevel ?? 25,
      reorderQty: med.reorderQty ?? 50,
    });
    setSuggestions([]); setShowDropdown(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this medicine?")) return;
    try { await deleteMedicine(id); load(); }
    catch { setError("Failed to delete medicine"); }
  };

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <h1>💊 Medicines</h1>

      <div className="card">
        <h3>{editId ? "Edit Medicine" : "Add Medicine"}</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit} className="form-grid">

          {/* Name with autocomplete */}
          <div ref={wrapperRef} style={{ position: "relative" }}>
            <label className="field-label">Medicine Name *</label>
            <input className="input" placeholder="Type to search..." value={form.name}
              onChange={handleNameChange} onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              autoComplete="off" required />
            {sugLoading && <span style={{ position: "absolute", right: "10px", top: "30px", fontSize: "12px", color: "#94a3b8" }}>searching...</span>}
            {showDropdown && suggestions.length > 0 && (
              <ul className="suggestion-dropdown">
                {suggestions.map((item, i) => (
                  <li key={i} onMouseDown={() => handleSelectSuggestion(item)}>
                    <span className="sug-name">{item.name}</span>
                    {item.generic && item.generic !== item.name && <span className="sug-generic"> ({item.generic})</span>}
                    <span className="sug-category">{item.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="field-label">Category</label>
            <input className="input" placeholder="Category" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>

          <div>
            <label className="field-label">Quantity *</label>
            <input className="input" type="number" placeholder="Quantity" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })} required min="0" />
          </div>

          <div>
            <label className="field-label">Price (₹) *</label>
            <input className="input" type="number" placeholder="Price" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" />
          </div>

          <div>
            <label className="field-label">Expiry Date *</label>
            <input className="input" type="date" value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required />
          </div>

          <div>
            <label className="field-label">Supplier</label>
            <select className="input" value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Reorder Level</label>
            <input className="input" type="number" placeholder="Default: 25" value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} min="1" />
          </div>

          <div>
            <label className="field-label">Reorder Qty</label>
            <input className="input" type="number" placeholder="Default: 50" value={form.reorderQty}
              onChange={(e) => setForm({ ...form, reorderQty: e.target.value })} min="1" />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : editId ? "Update" : "Add"}
            </button>
            {editId && (
              <button className="btn" type="button" style={{ background: "#64748b" }}
                onClick={() => { setEditId(null); setForm(EMPTY_FORM); setSuggestions([]); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <input className="input" placeholder="Search medicine..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: "12px" }} />

        {filtered.length === 0 ? <p>No medicines found</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Expiry</th>
                <th>Supplier</th>
                <th>Reorder At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td>
                  <td>{m.category}</td>
                  <td>
                    {m.quantity}
                    {m.quantity < (m.reorderLevel ?? 25) && (
                      <span style={{ marginLeft: "6px", fontSize: "11px", background: "#fef2f2", color: "#dc2626", padding: "2px 6px", borderRadius: "10px", fontWeight: 600 }}>
                        Low
                      </span>
                    )}
                  </td>
                  <td>₹{m.price}</td>
                  <td>{m.expiryDate?.substring(0, 10)}</td>
                  <td>{suppliers.find((s) => s._id === (m.supplier?._id || m.supplier))?.name || "—"}</td>
                  <td>{m.reorderLevel ?? 25}</td>
                  <td style={{ display: "flex", gap: "6px" }}>
                    <button className="btn" style={{ padding: "5px 10px", fontSize: "13px" }}
                      onClick={() => handleEdit(m)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(m._id)}>Delete</button>
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
