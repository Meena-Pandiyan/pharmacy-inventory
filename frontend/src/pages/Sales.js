import { useEffect, useState } from "react";
import { getMedicines, getSales, addSale } from "../api";

const EMPTY_CUSTOMER = { customerName: "", customerMobile: "" };
const GST_RATE = 0.05;

export default function Sales() {
  const [medicines, setMedicines] = useState([]);
  const [sales, setSales] = useState([]);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [cart, setCart] = useState([]);
  const [selectedMed, setSelectedMed] = useState("");
  const [qty, setQty] = useState(1);
  const [disc, setDisc] = useState(0);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState("");
  const [bill, setBill] = useState(null);

  // ── Load data ─────────────────────────────────────────────
  const loadMedicines = async () => {
    try {
      const res = await getMedicines();
      setMedicines(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load medicines:", err.message);
    }
  };

  const loadSales = async () => {
    try {
      setSalesLoading(true);
      setSalesError("");
      const res = await getSales();
      setSales(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSalesError(err.response?.data?.message || "Failed to load sales history");
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
    loadSales();
  }, []);

  // ── Cart ──────────────────────────────────────────────────
  const handleAddToCart = () => {
    setFormError("");
    if (!selectedMed) { setFormError("Please select a medicine"); return; }
    if (!qty || Number(qty) < 1) { setFormError("Enter a valid quantity"); return; }

    const med = medicines.find((m) => m._id === selectedMed);
    if (!med) return;

    const existing = cart.find((c) => c.medicineId === selectedMed);
    const totalQty = (existing ? existing.quantity : 0) + Number(qty);

    if (totalQty > med.quantity) {
      setFormError(`Only ${med.quantity} units available for "${med.name}"`);
      return;
    }

    const discount = Math.min(Math.max(Number(disc), 0), 100);
    const discountedPrice = parseFloat((med.price - (med.price * discount) / 100).toFixed(2));
    const totalPrice = parseFloat((discountedPrice * Number(qty)).toFixed(2));

    if (existing) {
      setCart(cart.map((c) =>
        c.medicineId === selectedMed
          ? { ...c, quantity: totalQty, discount, discountedPrice, totalPrice: parseFloat((discountedPrice * totalQty).toFixed(2)) }
          : c
      ));
    } else {
      setCart([...cart, {
        medicineId: med._id,
        medicineName: med.name,
        price: med.price,
        discount,
        discountedPrice,
        quantity: Number(qty),
        totalPrice,
      }]);
    }

    setSelectedMed("");
    setQty(1);
    setDisc(0);
  };

  const updateQty = (medicineId, newQty) => {
    if (newQty < 1) return;
    const med = medicines.find((m) => m._id === medicineId);
    if (med && newQty > med.quantity) {
      setFormError(`Only ${med.quantity} units available for "${med.name}"`);
      return;
    }
    setFormError("");
    setCart(cart.map((c) =>
      c.medicineId === medicineId
        ? { ...c, quantity: newQty, totalPrice: parseFloat((c.discountedPrice * newQty).toFixed(2)) }
        : c
    ));
  };

  const removeItem = (medicineId) => setCart(cart.filter((c) => c.medicineId !== medicineId));

  // ── Totals ────────────────────────────────────────────────
  const subTotal = parseFloat(cart.reduce((s, c) => s + c.totalPrice, 0).toFixed(2));
  const gstAmount = parseFloat((subTotal * GST_RATE).toFixed(2));
  const grandTotal = parseFloat((subTotal + gstAmount).toFixed(2));

  // ── Submit ────────────────────────────────────────────────
  const handleGenerateBill = async () => {
    setFormError("");

    if (!customer.customerName.trim()) { setFormError("Customer name is required"); return; }
    if (!/^\d{10}$/.test(customer.customerMobile)) { setFormError("Enter a valid 10-digit mobile number"); return; }
    if (cart.length === 0) { setFormError("Add at least one medicine to the cart"); return; }

    setSubmitting(true);
    try {
      const payload = {
        customerName: customer.customerName.trim(),
        customerMobile: customer.customerMobile,
        items: cart.map(({ medicineId, medicineName, price, discount, discountedPrice, quantity, totalPrice }) => ({
          medicineId, medicineName, price, discount, discountedPrice, quantity, totalPrice,
        })),
        subTotal,
        gstAmount,
        grandTotal,
      };

      const res = await addSale(payload);

      if (res.data && res.data._id) {
        setBill(res.data);
        setCart([]);
        setCustomer(EMPTY_CUSTOMER);
        setFormError("");
        loadSales();
        loadMedicines();
      } else {
        setFormError("Unexpected response from server. Please try again.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to generate bill";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Print ─────────────────────────────────────────────────
  const printBill = (data) => {
    if (!data || !data.items) return;
    const date = new Date(data.createdAt).toLocaleString("en-IN");
    const rows = data.items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.medicineName}</td>
        <td>&#8377;${Number(item.price).toFixed(2)}</td>
        <td>${item.discount || 0}%</td>
        <td>&#8377;${Number(item.discountedPrice ?? item.price).toFixed(2)}</td>
        <td>${item.quantity}</td>
        <td>&#8377;${Number(item.totalPrice).toFixed(2)}</td>
      </tr>`).join("");

    const win = window.open("", "_blank", "width=820,height=950");
    if (!win) { alert("Please allow popups to print the bill"); return; }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${data.billNumber}</title>
  <style>
    @media print { @page { size: A4; margin: 15mm; } .no-print { display:none; } }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Segoe UI',sans-serif; color:#1e293b; padding:32px; font-size:13px; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; }
    .ph-name { font-size:22px; font-weight:700; color:#1e40af; }
    .ph-sub { font-size:12px; color:#64748b; margin-top:3px; }
    .bill-no { font-size:15px; font-weight:700; }
    .bill-date { font-size:12px; color:#64748b; margin-top:3px; }
    hr.solid { border:none; border-top:2px solid #1e40af; margin:14px 0; }
    hr.dash { border:none; border-top:1px dashed #cbd5e1; margin:14px 0; }
    .cust { display:flex; gap:40px; font-size:13px; margin-bottom:16px; }
    .cust span { color:#64748b; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    thead tr { background:#1e40af; color:#fff; }
    th { padding:9px 10px; text-align:left; font-size:12px; }
    td { padding:9px 10px; border-bottom:1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background:#f8fafc; }
    .totals { display:flex; justify-content:flex-end; margin-top:16px; }
    .tbox { width:260px; }
    .trow { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; }
    .trow.grand { font-size:16px; font-weight:700; color:#1e40af; border-top:2px solid #1e40af; padding-top:8px; margin-top:4px; }
    .footer { margin-top:28px; text-align:center; font-size:12px; color:#94a3b8; }
    .print-btn { display:block; margin:20px auto 0; padding:10px 28px; background:#1e40af; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="ph-name">&#128138; Pharmacy Inventory</div>
      <div class="ph-sub">Medical Store</div>
      <div class="ph-sub">Phone: +91-XXXXXXXXXX</div>
    </div>
    <div style="text-align:right">
      <div class="bill-no">${data.billNumber}</div>
      <div class="bill-date">${date}</div>
    </div>
  </div>
  <hr class="solid"/>
  <div class="cust">
    <div><span>Customer: </span><strong>${data.customerName}</strong></div>
    <div><span>Mobile: </span><strong>${data.customerMobile}</strong></div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Medicine</th><th>MRP</th><th>Disc%</th><th>Rate</th><th>Qty</th><th>Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="tbox">
      <div class="trow"><span>Sub Total</span><span>&#8377;${Number(data.subTotal || 0).toFixed(2)}</span></div>
      <div class="trow"><span>GST (5%)</span><span>&#8377;${Number(data.gstAmount || 0).toFixed(2)}</span></div>
      <div class="trow grand"><span>Grand Total</span><span>&#8377;${Number(data.grandTotal).toFixed(2)}</span></div>
    </div>
  </div>
  <hr class="dash"/>
  <div class="footer">Thank you for your purchase! Get well soon &#128138;<br/>This is a computer-generated bill.</div>
  <div class="no-print"><button class="print-btn" onclick="window.print()">&#128424; Print / Save as PDF</button></div>
</body>
</html>`);
    win.document.close();
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="page">
      <h1>🧾 Sales / Billing</h1>

      {/* BILL FORM */}
      <div className="card">
        <h3>New Bill</h3>

        {formError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", color: "#dc2626", fontSize: "14px" }}>
            ⚠️ {formError}
          </div>
        )}

        {/* Customer */}
        <div className="form-grid" style={{ marginBottom: "16px" }}>
          <div>
            <label className="field-label">Customer Name *</label>
            <input className="input" placeholder="Enter customer name" value={customer.customerName}
              onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Mobile Number *</label>
            <input className="input" placeholder="10-digit mobile number" value={customer.customerMobile}
              maxLength={10} onChange={(e) => setCustomer({ ...customer, customerMobile: e.target.value.replace(/\D/g, "") })} />
          </div>
        </div>

        {/* Add to cart */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "16px" }}>
          <div style={{ flex: 3, minWidth: "200px" }}>
            <label className="field-label">Medicine</label>
            <select value={selectedMed} onChange={(e) => setSelectedMed(e.target.value)} className="input">
              <option value="">-- Select Medicine --</option>
              {medicines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} | Stock: {m.quantity} | ₹{m.price}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "80px" }}>
            <label className="field-label">Qty</label>
            <input type="number" value={qty} min="1" onChange={(e) => setQty(e.target.value)} className="input" />
          </div>
          <div style={{ flex: 1, minWidth: "80px" }}>
            <label className="field-label">Discount %</label>
            <input type="number" value={disc} min="0" max="100" onChange={(e) => setDisc(e.target.value)} className="input" />
          </div>
          <button className="btn" type="button" onClick={handleAddToCart}>+ Add</button>
        </div>

        {/* Cart table */}
        {cart.length > 0 && (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>MRP</th>
                  <th>Disc%</th>
                  <th>Rate</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((c) => (
                  <tr key={c.medicineId}>
                    <td>{c.medicineName}</td>
                    <td>₹{c.price.toFixed(2)}</td>
                    <td>{c.discount}%</td>
                    <td>₹{c.discountedPrice.toFixed(2)}</td>
                    <td>
                      <input type="number" min="1" value={c.quantity}
                        onChange={(e) => updateQty(c.medicineId, Number(e.target.value))}
                        className="input" style={{ width: "70px", padding: "6px 8px" }} />
                    </td>
                    <td><strong>₹{c.totalPrice.toFixed(2)}</strong></td>
                    <td>
                      <button className="delete-btn" onClick={() => removeItem(c.medicineId)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bill-totals-box">
              <div className="bill-totals-row"><span>Sub Total</span><span>₹{subTotal.toFixed(2)}</span></div>
              <div className="bill-totals-row"><span>GST (5%)</span><span>₹{gstAmount.toFixed(2)}</span></div>
              <div className="bill-totals-row grand-total"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
            </div>

            <button className="btn" onClick={handleGenerateBill} disabled={submitting}
              style={{ marginTop: "16px", background: submitting ? "#86efac" : "#16a34a", minWidth: "200px" }}>
              {submitting ? "⏳ Saving..." : "🧾 Generate & Save Bill"}
            </button>
          </>
        )}
      </div>

      {/* BILL SAVED CONFIRMATION */}
      {bill && (
        <div className="card" style={{ borderLeft: "4px solid #16a34a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: "#16a34a", fontSize: "15px" }}>
                ✅ Bill Saved — {bill.billNumber}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                {bill.customerName} | {bill.customerMobile} | Grand Total: ₹{Number(bill.grandTotal).toFixed(2)}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn" onClick={() => printBill(bill)}>🖨️ Print / Save PDF</button>
              <button className="btn" style={{ background: "#64748b" }} onClick={() => setBill(null)}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* SALES HISTORY */}
      <div className="card">
        <h3>Sales History</h3>
        {salesLoading ? (
          <p style={{ color: "#64748b" }}>Loading...</p>
        ) : salesError ? (
          <p className="error">{salesError}</p>
        ) : sales.length === 0 ? (
          <p style={{ color: "#64748b" }}>No sales recorded yet</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Items</th>
                <th>Sub Total</th>
                <th>GST</th>
                <th>Grand Total</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s._id}>
                  <td><strong>{s.billNumber || "—"}</strong></td>
                  <td>{s.customerName || "—"}</td>
                  <td>{s.customerMobile || "—"}</td>
                  <td>{s.items?.length ?? 0} item(s)</td>
                  <td>₹{Number(s.subTotal ?? 0).toFixed(2)}</td>
                  <td>₹{Number(s.gstAmount ?? 0).toFixed(2)}</td>
                  <td><strong>₹{Number(s.grandTotal ?? 0).toFixed(2)}</strong></td>
                  <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td>
                    <button className="btn" style={{ padding: "5px 10px", fontSize: "12px" }}
                      onClick={() => printBill(s)}>
                      🖨️ Reprint
                    </button>
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
