const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "General" },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    reorderLevel: { type: Number, default: 25 },
    reorderQty: { type: Number, default: 50 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medicine", medicineSchema);
