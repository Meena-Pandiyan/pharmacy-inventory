const express = require("express");
const router  = express.Router();
const Supplier = require("../models/Supplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const protect  = require("../middleware/authMiddleware");

// Get all suppliers
router.get("/", protect, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get supplier stats (for analytics)
router.get("/stats", protect, async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    const orders    = await PurchaseOrder.find();

    const total    = suppliers.length;
    const active   = suppliers.filter((s) => s.status === "Active").length;
    const totalAmt = suppliers.reduce((s, sup) => s + (sup.totalAmount || 0), 0);
    const pending  = orders.filter((o) => o.status === "Pending").length;

    // Monthly purchase trend (last 6 months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const amt = orders
        .filter((o) => {
          const od = new Date(o.createdAt);
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        })
        .reduce((s, o) => s + (o.orderQty * 10), 0); // estimated value
      trend.push({ month: label, amount: amt });
    }

    res.json({ total, active, totalAmt, pending, trend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single supplier with purchase orders
router.get("/:id", protect, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    const orders = await PurchaseOrder.find({ supplier: req.params.id }).sort({ createdAt: -1 });
    res.json({ supplier, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add supplier
router.post("/", protect, async (req, res) => {
  try {
    const { name, contact, address, city, email, status, rating, notes } = req.body;
    if (!name || !contact)
      return res.status(400).json({ message: "Name and contact are required" });

    // Duplicate check
    const existing = await Supplier.findOne({ contact });
    if (existing)
      return res.status(400).json({ message: `Supplier with contact ${contact} already exists` });

    const supplier = await Supplier.create({ name, contact, address, city, email, status, rating, notes });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update supplier
router.put("/:id", protect, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete supplier
router.delete("/:id", protect, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
