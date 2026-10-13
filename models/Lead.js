const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Lead Name is required'],
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
    source: {
      type: String,
      enum: ['Website', 'Referral', 'Social Media', 'Direct Call', 'Cold Outreach', 'Trade Show', 'Other'],
      default: 'Website',
    },
    interestedProduct: {
      type: String,
      trim: true,
      default: '',
    },
    estimatedValue: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'],
      default: 'New',
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    followUpDate: {
      type: Date,
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

// Pre-save hook to generate human-readable unique Lead ID (e.g. LED-1001)
leadSchema.pre('validate', async function (next) {
  if (!this.leadId) {
    const count = await mongoose.model('Lead').countDocuments();
    this.leadId = `LED-${1000 + count + 1}`;
  }
  next();
});

const Lead = mongoose.model('Lead', leadSchema);
module.exports = Lead;
