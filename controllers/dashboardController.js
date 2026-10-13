const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');

// @desc    Get dashboard metrics & summary counts
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalLeads,
      totalCustomers,
      totalOrders,
      totalQuotations,
      totalInvoices,
      invoiceRevenueAgg,
      leadsByStatusAgg,
      ordersByStatusAgg,
      invoicesByStatusAgg,
    ] = await Promise.all([
      Lead.countDocuments(),
      Customer.countDocuments(),
      Order.countDocuments(),
      Quotation.countDocuments(),
      Invoice.countDocuments(),
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$grandTotal' },
            totalCollected: { $sum: '$amountPaid' },
            totalDue: { $sum: '$balanceDue' },
          },
        },
      ]),
      Lead.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
      ]),
    ]);

    const revenue = invoiceRevenueAgg[0] || {
      totalBilled: 0,
      totalCollected: 0,
      totalDue: 0,
    };

    // Format distributions into clean dictionary
    const leadStatusMap = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Proposal: 0,
      Won: 0,
      Lost: 0,
    };
    leadsByStatusAgg.forEach((item) => {
      if (item._id) leadStatusMap[item._id] = item.count;
    });

    const orderStatusMap = {
      Draft: 0,
      Confirmed: 0,
      Processing: 0,
      Completed: 0,
      Cancelled: 0,
    };
    ordersByStatusAgg.forEach((item) => {
      if (item._id) orderStatusMap[item._id] = item.count;
    });

    const invoiceStatusMap = {
      Unpaid: 0,
      'Partially Paid': 0,
      Paid: 0,
      Overdue: 0,
    };
    invoicesByStatusAgg.forEach((item) => {
      if (item._id) invoiceStatusMap[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        cards: {
          totalLeads,
          totalCustomers,
          totalOrders,
          totalQuotations,
          totalInvoices,
          totalInvoiceAmount: revenue.totalBilled,
          totalCollected: revenue.totalCollected,
          totalDue: revenue.totalDue,
        },
        distributions: {
          leads: leadStatusMap,
          orders: orderStatusMap,
          invoices: invoiceStatusMap,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard recent records for tables
// @route   GET /api/dashboard/recent
// @access  Private
const getDashboardRecent = async (req, res, next) => {
  try {
    const [recentLeads, recentOrders, recentQuotations, recentInvoices] =
      await Promise.all([
        Lead.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('assignedEmployee', 'name email'),
        Order.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('customer', 'name companyName phone'),
        Quotation.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('customer', 'name companyName'),
        Invoice.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('customer', 'name companyName'),
      ]);

    res.status(200).json({
      success: true,
      data: {
        recentLeads,
        recentOrders,
        recentQuotations,
        recentInvoices,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getDashboardRecent,
};
