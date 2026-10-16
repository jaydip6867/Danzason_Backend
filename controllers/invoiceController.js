const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');

// Helper to calculate invoice items and totals
const calculateInvoiceTotals = (items = []) => {
  let subtotal = 0;
  let taxAmount = 0;

  const calculatedItems = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const lineBase = qty * unitPrice - discount;
    const itemSubtotal = lineBase > 0 ? lineBase : 0;
    const itemTax = (itemSubtotal * taxRate) / 100;
    const itemTotal = itemSubtotal + itemTax;

    subtotal += itemSubtotal;
    taxAmount += itemTax;

    return {
      description: item.description,
      quantity: qty,
      unitPrice,
      discount,
      taxRate,
      itemTotal: Math.round(itemTotal * 100) / 100,
    };
  });

  const grandTotal = subtotal + taxAmount;

  return {
    items: calculatedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (invoices.view)
const getInvoices = async (req, res, next) => {
  try {
    const { search, paymentStatus, page = 1, limit = 50 } = req.query;

    const query = {};

    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const count = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customer', 'name companyName email phone billingAddress gstNumber')
      .populate('relatedOrder', 'orderId')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private (invoices.view)
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('relatedOrder')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private (invoices.create)
const createInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { customer, relatedOrder, invoiceDate, dueDate, items, notes } = req.body;

    const calculated = calculateInvoiceTotals(items);

    const invoice = await Invoice.create({
      customer,
      relatedOrder: relatedOrder || null,
      invoiceDate: invoiceDate || Date.now(),
      dueDate: dueDate || undefined,
      items: calculated.items,
      subtotal: calculated.subtotal,
      taxAmount: calculated.taxAmount,
      grandTotal: calculated.grandTotal,
      amountPaid: 0,
      balanceDue: calculated.grandTotal,
      paymentStatus: 'Unpaid',
      payments: [],
      notes: notes || '',
      createdBy: req.user._id,
    });

    const populated = await Invoice.findById(invoice._id).populate('customer', 'name companyName');
    res.status(201).json({ success: true, message: 'Invoice created successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private (invoices.edit)
const updateInvoice = async (req, res, next) => {
  try {
    let invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const updateData = { ...req.body };

    if (updateData.items) {
      const calculated = calculateInvoiceTotals(updateData.items);
      updateData.items = calculated.items;
      updateData.subtotal = calculated.subtotal;
      updateData.taxAmount = calculated.taxAmount;
      updateData.grandTotal = calculated.grandTotal;

      // Re-evaluate balance with existing payments
      const totalPaid = (invoice.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
      updateData.amountPaid = totalPaid;
      updateData.balanceDue = Math.max(0, Math.round((calculated.grandTotal - totalPaid) * 100) / 100);

      if (updateData.balanceDue === 0 && calculated.grandTotal > 0) {
        updateData.paymentStatus = 'Paid';
      } else if (totalPaid > 0) {
        updateData.paymentStatus = 'Partially Paid';
      } else {
        updateData.paymentStatus = 'Unpaid';
      }
    }

    invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('customer', 'name companyName');

    res.status(200).json({ success: true, message: 'Invoice updated successfully', data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (invoices.delete)
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    await invoice.deleteOne();
    res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a payment against an invoice
// @route   POST /api/invoices/:id/payments
// @access  Private (invoices.edit)
const recordPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod, referenceNumber, notes, paymentDate } = req.body;
    const paymentAmount = Math.round(Number(amount) * 100) / 100;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid payment amount greater than 0' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const currentBalance = Math.round(Number(invoice.balanceDue || 0) * 100) / 100;

    if (currentBalance <= 0) {
      return res.status(400).json({ success: false, message: 'This invoice is already fully paid.' });
    }

    // Allow 0.01 tolerance for floating point rounding differences
    if (paymentAmount > currentBalance + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount.toFixed(2)}) cannot exceed balance due (₹${currentBalance.toFixed(2)})`,
      });
    }

    // Cap payment to currentBalance if within tolerance
    const finalPayment = paymentAmount > currentBalance ? currentBalance : paymentAmount;

    const newPayment = {
      amount: finalPayment,
      paymentMethod: paymentMethod || 'Bank Transfer',
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      paymentDate: paymentDate || new Date(),
      recordedBy: req.user._id,
    };

    invoice.payments.push(newPayment);
    invoice.amountPaid = Math.round(((invoice.amountPaid || 0) + finalPayment) * 100) / 100;
    const remainingBalance = Math.round(((invoice.grandTotal || 0) - invoice.amountPaid) * 100) / 100;
    invoice.balanceDue = remainingBalance <= 0.009 ? 0 : remainingBalance;

    if (invoice.balanceDue === 0) {
      invoice.paymentStatus = 'Paid';
    } else {
      invoice.paymentStatus = 'Partially Paid';
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
};
