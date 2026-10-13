const express = require('express');
const { body } = require('express-validator');
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
} = require('../controllers/invoiceController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

const invoiceValidation = [
  body('customer').notEmpty().withMessage('Customer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
];

router
  .route('/')
  .get(protect, checkPermission('invoices', 'view'), getInvoices)
  .post(protect, checkPermission('invoices', 'create'), invoiceValidation, createInvoice);

router
  .route('/:id')
  .get(protect, checkPermission('invoices', 'view'), getInvoiceById)
  .put(protect, checkPermission('invoices', 'edit'), updateInvoice)
  .delete(protect, checkPermission('invoices', 'delete'), deleteInvoice);

router.post(
  '/:id/payments',
  protect,
  checkPermission('invoices', 'edit'),
  recordPayment
);

module.exports = router;
