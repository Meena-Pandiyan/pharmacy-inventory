const express  = require("express");
const router   = express.Router();
const Medicine = require("../models/Medicine");
const protect  = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const today   = new Date();
    const in7     = new Date(); in7.setDate(today.getDate() + 7);
    const in30    = new Date(); in30.setDate(today.getDate() + 30);
    const in180   = new Date(); in180.setMonth(today.getMonth() + 6);

    // All medicines expiring within 6 months (includes already expired)
    const medicines = await Medicine.find({ expiryDate: { $lte: in180 } })
      .populate("supplier", "name contact email")
      .sort({ expiryDate: 1 });

    const expired   = medicines.filter((m) => new Date(m.expiryDate) < today);
    const in7Days   = medicines.filter((m) => { const d = new Date(m.expiryDate); return d >= today && d <= in7; });
    const in30Days  = medicines.filter((m) => { const d = new Date(m.expiryDate); return d >= today && d <= in30; });

    // Total loss = quantity × price for expired items
    const totalLoss = expired.reduce((s, m) => s + (m.quantity * m.price), 0);

    // Category-wise expiry breakdown
    const catMap = {};
    medicines.forEach((m) => {
      const cat = m.category || "General";
      if (!catMap[cat]) catMap[cat] = { category: cat, expired: 0, expiringSoon: 0, total: 0 };
      catMap[cat].total += 1;
      if (new Date(m.expiryDate) < today) catMap[cat].expired += 1;
      else catMap[cat].expiringSoon += 1;
    });
    const categoryBreakdown = Object.values(catMap).sort((a, b) => b.total - a.total);

    // Monthly expiry trend (last 6 months)
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      monthlyMap[key] = { month: label, count: 0, loss: 0 };
    }
    expired.forEach((m) => {
      const d   = new Date(m.expiryDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].count += 1;
        monthlyMap[key].loss  += m.quantity * m.price;
      }
    });
    const monthlyTrend = Object.values(monthlyMap).map((m) => ({
      ...m,
      loss: parseFloat(m.loss.toFixed(2)),
    }));

    // Supplier return candidates (expired with a supplier)
    const supplierReturns = expired
      .filter((m) => m.supplier)
      .map((m) => ({
        _id:          m._id,
        name:         m.name,
        category:     m.category,
        quantity:     m.quantity,
        price:        m.price,
        expiryDate:   m.expiryDate,
        supplierName: m.supplier?.name  || "—",
        supplierContact: m.supplier?.contact || "—",
        supplierEmail:   m.supplier?.email   || "—",
        refundAmount: parseFloat((m.quantity * m.price).toFixed(2)),
      }));

    res.json({
      kpi: {
        expiredCount:  expired.length,
        in7DaysCount:  in7Days.length,
        in30DaysCount: in30Days.length,
        totalLoss:     parseFloat(totalLoss.toFixed(2)),
      },
      medicines: medicines.map((m) => ({
        _id:          m._id,
        name:         m.name,
        category:     m.category,
        quantity:     m.quantity,
        price:        m.price,
        expiryDate:   m.expiryDate,
        supplierName: m.supplier?.name || "—",
        supplierEmail: m.supplier?.email || "—",
      })),
      categoryBreakdown,
      monthlyTrend,
      supplierReturns,
    });
  } catch (err) {
    console.error("Expiry error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
