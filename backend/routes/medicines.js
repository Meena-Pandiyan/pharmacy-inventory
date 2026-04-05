const express = require("express");
const router = express.Router();
const Medicine = require("../models/Medicine");
const protect = require("../middleware/authMiddleware");

// Get all medicines
router.get("/", protect, async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ createdAt: -1 });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add medicine
router.post("/", protect, async (req, res) => {
  try {
    const { name, quantity, price, expiryDate, category, supplier, reorderLevel, reorderQty } = req.body;

    if (!name || quantity == null || !price || !expiryDate)
      return res.status(400).json({ message: "Name, quantity, price and expiry date are required" });

    const medicine = await Medicine.create({
      name,
      quantity,
      price,
      expiryDate,
      category,
      reorderLevel: reorderLevel || 25,
      reorderQty: reorderQty || 50,
      supplier: supplier && supplier !== "" ? supplier : undefined,
    });
    res.status(201).json(medicine);
  } catch (err) {
    console.error("Add medicine error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update medicine
router.put("/:id", protect, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.supplier === "") body.supplier = undefined;
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!medicine) return res.status(404).json({ message: "Medicine not found" });
    res.json(medicine);
  } catch (err) {
    console.error("Update medicine error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete medicine
router.delete("/:id", protect, async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ message: "Medicine not found" });
    res.json({ message: "Medicine deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
