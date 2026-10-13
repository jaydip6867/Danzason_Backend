const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');

// Helper to calculate totals securely
const calculateQuotationTotals = (items = []) => {
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

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private (quotations.view)
const getQuotations = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const count = await Quotation.countDocuments(query);
    const quotations = await Quotation.find(query)
      .populate('customer', 'name companyName email phone')
      .populate('relatedOrder', 'orderId')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      data: quotations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quotation
// @route   GET /api/quotations/:id
// @access  Private (quotations.view)
const getQuotationById = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('relatedOrder')
      .populate('createdBy', 'name email');

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new quotation
// @route   POST /api/quotations
// @access  Private (quotations.create)
const createQuotation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { customer, items, validUntil, termsAndConditions, notes, status } = req.body;

    const calculated = calculateQuotationTotals(items);

    const quotation = await Quotation.create({
      customer,
      validUntil: validUntil || undefined,
      items: calculated.items,
      subtotal: calculated.subtotal,
      taxAmount: calculated.taxAmount,
      grandTotal: calculated.grandTotal,
      termsAndConditions: termsAndConditions || undefined,
      notes: notes || '',
      status: status || 'Draft',
      createdBy: req.user._id,
    });

    const populated = await Quotation.findById(quotation._id).populate('customer', 'name companyName');
    res.status(201).json({ success: true, message: 'Quotation created successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private (quotations.edit)
const updateQuotation = async (req, res, next) => {
  try {
    let quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const updateData = { ...req.body };

    if (updateData.items) {
      const calculated = calculateQuotationTotals(updateData.items);
      updateData.items = calculated.items;
      updateData.subtotal = calculated.subtotal;
      updateData.taxAmount = calculated.taxAmount;
      updateData.grandTotal = calculated.grandTotal;
    }

    quotation = await Quotation.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('customer', 'name companyName');

    res.status(200).json({ success: true, message: 'Quotation updated successfully', data: quotation });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private (quotations.delete)
const deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    await quotation.deleteOne();
    res.status(200).json({ success: true, message: 'Quotation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert accepted quotation to Order (prevents duplicate orders)
// @route   POST /api/quotations/:id/convert-to-order
// @access  Private (orders.create)
const convertToOrder = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (quotation.convertedToOrder && quotation.relatedOrder) {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been converted to an order.',
      });
    }

    // Create Order with quotation items and details
    const order = await Order.create({
      customer: quotation.customer,
      relatedQuotation: quotation._id,
      orderDate: new Date(),
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      grandTotal: quotation.grandTotal,
      status: 'Confirmed',
      paymentStatus: 'Unpaid',
      notes: `Converted from Quotation #${quotation.quotationNumber}. ${quotation.notes || ''}`,
      createdBy: req.user._id,
    });

    // Update quotation status and link
    quotation.convertedToOrder = true;
    quotation.status = 'Accepted';
    quotation.relatedOrder = order._id;
    await quotation.save();

    res.status(201).json({
      success: true,
      message: 'Quotation converted into Order successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertToOrder,
};
