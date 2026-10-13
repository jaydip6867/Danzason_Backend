const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 18, min: 0 }, // GST %
  itemTotal: { type: Number, default: 0 },
});

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    quotationDate: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: () => new Date(+new Date() + 15 * 24 * 60 * 60 * 1000), // 15 days default
    },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    termsAndConditions: {
      type: String,
      default: 'Payment within 30 days. Delivery within 2 weeks of purchase order confirmation.',
    },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'],
      default: 'Draft',
    },
    convertedToOrder: {
      type: Boolean,
      default: false,
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
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

quotationSchema.pre('validate', async function (next) {
  if (!this.quotationNumber) {
    const count = await mongoose.model('Quotation').countDocuments();
    this.quotationNumber = `QT-${new Date().getFullYear()}-${1000 + count + 1}`;
  }
  next();
});

const Quotation = mongoose.model('Quotation', quotationSchema);
module.exports = Quotation;
