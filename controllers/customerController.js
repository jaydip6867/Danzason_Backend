const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const { validationResult } = require('express-validator');

// @desc    Get all customers with search and pagination
// @route   GET /api/customers
// @access  Private (customers.view)
const getCustomers = async (req, res, next) => {
  try {
    const { search, customerType, page = 1, limit = 50 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }

    if (customerType && customerType !== 'All') {
      query.customerType = customerType;
    }

    const count = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .populate('assignedEmployee', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer by ID with history of Orders, Quotations, and Invoices
// @route   GET /api/customers/:id
// @access  Private (customers.view)
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedEmployee', 'name email')
      .populate('createdBy', 'name email');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Fetch related records
    const [orders, quotations, invoices] = await Promise.all([
      Order.find({ customer: customer._id }).sort({ createdAt: -1 }),
      Quotation.find({ customer: customer._id }).sort({ createdAt: -1 }),
      Invoice.find({ customer: customer._id }).sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        customer,
        orders,
        quotations,
        invoices,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private (customers.create)
const createCustomer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const customerData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const customer = await Customer.create(customerData);
    res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (customers.edit)
const updateCustomer = async (req, res, next) => {
  try {
    let customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('assignedEmployee', 'name email');

    res.status(200).json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (customers.delete)
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await customer.deleteOne();
    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
