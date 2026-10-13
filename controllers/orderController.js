const Order = require('../models/Order');
const Quotation = require('../models/Quotation');
const { validationResult } = require('express-validator');

// Helper to calculate item totals and order totals securely on backend
const calculateOrderTotals = (items = []) => {
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

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (orders.view)
const getOrders = async (req, res, next) => {
  try {
    const { search, status, paymentStatus, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const count = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customer', 'name companyName email phone')
      .populate('relatedQuotation', 'quotationNumber')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private (orders.view)
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('relatedQuotation')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (orders.create)
const createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { customer, items, relatedQuotation, orderDate, expectedDeliveryDate, status, paymentStatus, notes } = req.body;

    const calculated = calculateOrderTotals(items);

    const order = await Order.create({
      customer,
      relatedQuotation: relatedQuotation || null,
      orderDate: orderDate || Date.now(),
      expectedDeliveryDate: expectedDeliveryDate || null,
      items: calculated.items,
      subtotal: calculated.subtotal,
      taxAmount: calculated.taxAmount,
      grandTotal: calculated.grandTotal,
      status: status || 'Draft',
      paymentStatus: paymentStatus || 'Unpaid',
      notes: notes || '',
      createdBy: req.user._id,
    });

    const populated = await Order.findById(order._id).populate('customer', 'name companyName');
    res.status(201).json({ success: true, message: 'Order created successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private (orders.edit)
const updateOrder = async (req, res, next) => {
  try {
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const updateData = { ...req.body };

    if (updateData.items) {
      const calculated = calculateOrderTotals(updateData.items);
      updateData.items = calculated.items;
      updateData.subtotal = calculated.subtotal;
      updateData.taxAmount = calculated.taxAmount;
      updateData.grandTotal = calculated.grandTotal;
    }

    order = await Order.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('customer', 'name companyName');

    res.status(200).json({ success: true, message: 'Order updated successfully', data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (orders.delete)
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await order.deleteOne();
    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
};
