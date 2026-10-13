const express = require('express');
const { body } = require('express-validator');
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

const orderValidation = [
  body('customer').notEmpty().withMessage('Customer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
];

router
  .route('/')
  .get(protect, checkPermission('orders', 'view'), getOrders)
  .post(protect, checkPermission('orders', 'create'), orderValidation, createOrder);

router
  .route('/:id')
  .get(protect, checkPermission('orders', 'view'), getOrderById)
  .put(protect, checkPermission('orders', 'edit'), updateOrder)
  .delete(protect, checkPermission('orders', 'delete'), deleteOrder);

module.exports = router;
