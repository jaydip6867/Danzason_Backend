const express = require('express');
const { body } = require('express-validator');
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

const customerValidation = [
  body('name').trim().notEmpty().withMessage('Customer Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];

router
  .route('/')
  .get(protect, checkPermission('customers', 'view'), getCustomers)
  .post(protect, checkPermission('customers', 'create'), customerValidation, createCustomer);

router
  .route('/:id')
  .get(protect, checkPermission('customers', 'view'), getCustomerById)
  .put(protect, checkPermission('customers', 'edit'), updateCustomer)
  .delete(protect, checkPermission('customers', 'delete'), deleteCustomer);

module.exports = router;
