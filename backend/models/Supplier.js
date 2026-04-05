const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    contact:     { type: String, required: true, trim: true },
    address:     { type: String, trim: true, default: "" },
    city:        { type: String, trim: true, default: "" },
    email:       { type: String, trim: true, default: "" },
    status:      { type: String, enum: ["Active", "Inactive"], default: "Active" },
    rating:      { type: Number, min: 1, max: 5, default: 3 },
    totalOrders: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    lastOrderDate: { type: Date },
    notes:       { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
