const Purchase = require('../models/Purchase');
const { validationResult } = require('express-validator');

// Helper to calculate totals securely on backend
const calculatePurchaseTotals = (items = []) => {
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

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private (purchases.view)
const getPurchases = async (req, res, next) => {
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
        { purchaseId: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { supplierCompany: { $regex: search, $options: 'i' } },
        { supplierPhone: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const count = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single purchase by ID
// @route   GET /api/purchases/:id
// @access  Private (purchases.view)
const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private (purchases.create)
const createPurchase = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const {
      supplierName,
      supplierCompany,
      supplierPhone,
      supplierEmail,
      supplierGst,
      purchaseDate,
      expectedDeliveryDate,
      items,
      status,
      paymentStatus,
      paymentMethod,
      referenceNumber,
      notes,
    } = req.body;

    const calculated = calculatePurchaseTotals(items);

    const purchase = await Purchase.create({
      supplierName,
      supplierCompany: supplierCompany || '',
      supplierPhone: supplierPhone || '',
      supplierEmail: supplierEmail || '',
      supplierGst: supplierGst || '',
      purchaseDate: purchaseDate || Date.now(),
      expectedDeliveryDate: expectedDeliveryDate || null,
      items: calculated.items,
      subtotal: calculated.subtotal,
      taxAmount: calculated.taxAmount,
      grandTotal: calculated.grandTotal,
      status: status || 'Pending',
      paymentStatus: paymentStatus || 'Unpaid',
      paymentMethod: paymentMethod || 'Bank Transfer',
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Purchase record created successfully',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Private (purchases.edit)
const updatePurchase = async (req, res, next) => {
  try {
    let purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    const updateData = { ...req.body };

    if (updateData.items) {
      const calculated = calculatePurchaseTotals(updateData.items);
      updateData.items = calculated.items;
      updateData.subtotal = calculated.subtotal;
      updateData.taxAmount = calculated.taxAmount;
      updateData.grandTotal = calculated.grandTotal;
    }

    purchase = await Purchase.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Purchase record updated successfully',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private (purchases.delete)
const deletePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    await purchase.deleteOne();
    res.status(200).json({ success: true, message: 'Purchase record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
};
