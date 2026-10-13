const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Customer Name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    billingAddress: {
      type: String,
      default: '',
    },
    shippingAddress: {
      type: String,
      default: '',
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    customerType: {
      type: String,
      enum: ['Individual', 'Corporate', 'Wholesale', 'Retail'],
      default: 'Corporate',
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

customerSchema.pre('validate', async function (next) {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST-${1000 + count + 1}`;
  }
  next();
});

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
