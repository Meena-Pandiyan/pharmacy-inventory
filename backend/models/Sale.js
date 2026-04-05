const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerMobile: { type: String, required: true, trim: true },
    items: [
      {
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
        medicineName: { type: String, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        discountedPrice: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        totalPrice: { type: Number, required: true },
      },
    ],
    subTotal: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    billNumber: { type: String, unique: true },
  },
  { timestamps: true }
);

// Use timestamp to guarantee unique bill numbers
saleSchema.pre("save", async function () {
  if (!this.billNumber) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const time = Date.now().toString().slice(-6);
    this.billNumber = `BILL-${date}-${time}`;
  }
});

module.exports = mongoose.model("Sale", saleSchema);
