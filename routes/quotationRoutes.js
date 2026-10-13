const express = require('express');
const { body } = require('express-validator');
const {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertToOrder,
} = require('../controllers/quotationController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

const quotationValidation = [
  body('customer').notEmpty().withMessage('Customer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
];

router
  .route('/')
  .get(protect, checkPermission('quotations', 'view'), getQuotations)
  .post(protect, checkPermission('quotations', 'create'), quotationValidation, createQuotation);

router
  .route('/:id')
  .get(protect, checkPermission('quotations', 'view'), getQuotationById)
  .put(protect, checkPermission('quotations', 'edit'), updateQuotation)
  .delete(protect, checkPermission('quotations', 'delete'), deleteQuotation);

router.post(
  '/:id/convert-to-order',
  protect,
  checkPermission('orders', 'create'),
  convertToOrder
);

module.exports = router;
