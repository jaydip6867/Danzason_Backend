const express = require('express');
const { body } = require('express-validator');
const {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
} = require('../controllers/purchaseController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

const purchaseValidation = [
  body('supplierName').trim().notEmpty().withMessage('Supplier / Vendor Name is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one purchase item is required'),
];

router
  .route('/')
  .get(protect, checkPermission('purchases', 'view'), getPurchases)
  .post(protect, checkPermission('purchases', 'create'), purchaseValidation, createPurchase);

router
  .route('/:id')
  .get(protect, checkPermission('purchases', 'view'), getPurchaseById)
  .put(protect, checkPermission('purchases', 'edit'), updatePurchase)
  .delete(protect, checkPermission('purchases', 'delete'), deletePurchase);

module.exports = router;
