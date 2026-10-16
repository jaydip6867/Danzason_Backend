const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 18, min: 0 }, // GST %
  itemTotal: { type: Number, default: 0 },
});

const purchaseSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: String,
      unique: true,
      required: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier / Vendor Name is required'],
      trim: true,
    },
    supplierCompany: {
      type: String,
      trim: true,
      default: '',
    },
    supplierPhone: {
      type: String,
      trim: true,
      default: '',
    },
    supplierEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    supplierGst: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },
    items: [purchaseItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Ordered', 'Received', 'Pending', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      default: 'Unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'Credit Card'],
      default: 'Bank Transfer',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate unique Purchase ID (e.g. PUR-2026-1001)
purchaseSchema.pre('validate', async function (next) {
  if (!this.purchaseId) {
    const count = await mongoose.model('Purchase').countDocuments();
    this.purchaseId = `PUR-${new Date().getFullYear()}-${1000 + count + 1}`;
  }
  next();
});

const Purchase = mongoose.model('Purchase', purchaseSchema);
module.exports = Purchase;
