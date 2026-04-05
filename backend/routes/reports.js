const express = require("express");
const router  = express.Router();
const Medicine = require("../models/Medicine");
const Sale     = require("../models/Sale");
const PurchaseOrder = require("../models/PurchaseOrder");
const protect  = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const today = new Date();

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   { const t = new Date(to); t.setHours(23,59,59,999); dateFilter.$lte = t; }

    const salesQuery = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const [medicines, sales, orders] = await Promise.all([
      Medicine.find(),
      Sale.find(salesQuery).sort({ createdAt: -1 }),
      PurchaseOrder.find(salesQuery),
    ]);

    // ── KPI ──────────────────────────────────────────────────
    const totalRevenue     = sales.reduce((s, x) => s + (x.grandTotal || 0), 0);
    const totalSalesCount  = sales.length;
    const totalMedicinesSold = sales.reduce((s, x) => s + (x.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0);
    const totalPurchases   = orders.filter((o) => o.status === "Received").reduce((s, o) => s + (o.orderQty * 10), 0);
    const netProfit        = totalRevenue - totalPurchases;
    const totalMedicines   = medicines.length;
    const lowStock         = medicines.filter((m) => m.quantity < (m.reorderLevel || 25)).length;
    const expired          = medicines.filter((m) => new Date(m.expiryDate) < today).length;
    const outOfStock       = medicines.filter((m) => m.quantity === 0).length;

    // ── Daily sales trend (last 30 days) ─────────────────────
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { date: key, revenue: 0, count: 0 };
    }
    sales.forEach((s) => {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].revenue += s.grandTotal || 0;
        dailyMap[key].count   += 1;
      }
    });
    const dailyTrend = Object.values(dailyMap).map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: parseFloat(d.revenue.toFixed(2)),
    }));

    // ── Monthly trend (last 6 months) ────────────────────────
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      monthlyMap[key] = { month: label, revenue: 0, purchases: 0 };
    }
    sales.forEach((s) => {
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) monthlyMap[key].revenue += s.grandTotal || 0;
    });
    orders.filter((o) => o.status === "Received").forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) monthlyMap[key].purchases += o.orderQty * 10;
    });
    const monthlyTrend = Object.values(monthlyMap).map((m) => ({
      ...m,
      revenue:   parseFloat(m.revenue.toFixed(2)),
      purchases: parseFloat(m.purchases.toFixed(2)),
      profit:    parseFloat((m.revenue - m.purchases).toFixed(2)),
    }));

    // ── Category-wise sales ───────────────────────────────────
    const catMap = {};
    sales.forEach((s) => {
      s.items?.forEach((item) => {
        const med = medicines.find((m) => m._id.toString() === item.medicineId?.toString());
        const cat = med?.category || "General";
        catMap[cat] = (catMap[cat] || 0) + item.totalPrice;
      });
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    // ── Top selling medicines ─────────────────────────────────
    const medSalesMap = {};
    sales.forEach((s) => {
      s.items?.forEach((item) => {
        const id = item.medicineId?.toString();
        if (!medSalesMap[id]) medSalesMap[id] = { name: item.medicineName, qty: 0, revenue: 0 };
        medSalesMap[id].qty     += item.quantity;
        medSalesMap[id].revenue += item.totalPrice;
      });
    });
    const topMedicines = Object.values(medSalesMap)
      .sort((a, b) => b.qty - a.qty).slice(0, 10);
    const leastMedicines = Object.values(medSalesMap)
      .sort((a, b) => a.qty - b.qty).slice(0, 5);

    // ── Customer stats ────────────────────────────────────────
    const custMap = {};
    sales.forEach((s) => {
      const key = s.customerMobile;
      if (!custMap[key]) custMap[key] = { name: s.customerName, mobile: key, visits: 0, total: 0 };
      custMap[key].visits += 1;
      custMap[key].total  += s.grandTotal || 0;
    });
    const customers     = Object.values(custMap);
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((c) => c.visits > 1).length;
    const topCustomers  = customers.sort((a, b) => b.total - a.total).slice(0, 5);

    // ── Supplier-wise purchases ───────────────────────────────
    const supMap = {};
    orders.filter((o) => o.status === "Received").forEach((o) => {
      const key = o.supplierName || "Unassigned";
      supMap[key] = (supMap[key] || 0) + o.orderQty * 10;
    });
    const supplierBreakdown = Object.entries(supMap)
      .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);

    // ── Expiring soon ─────────────────────────────────────────
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const expiringSoon = medicines
      .filter((m) => new Date(m.expiryDate) > today && new Date(m.expiryDate) <= in30)
      .map((m) => ({ name: m.name, category: m.category, quantity: m.quantity, expiryDate: m.expiryDate }));

    res.json({
      kpi: { totalRevenue, totalSalesCount, totalMedicinesSold, totalPurchases, netProfit, totalMedicines, lowStock, expired, outOfStock },
      dailyTrend,
      monthlyTrend,
      categoryBreakdown,
      topMedicines,
      leastMedicines,
      customers: { totalCustomers, repeatCustomers, topCustomers },
      supplierBreakdown,
      expiringSoon,
      recentSales: sales.slice(0, 50),
    });
  } catch (err) {
    console.error("Reports error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
