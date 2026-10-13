const express = require('express');
const { body } = require('express-validator');
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
} = require('../controllers/leadController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

const leadValidation = [
  body('name').trim().notEmpty().withMessage('Lead Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];

router
  .route('/')
  .get(protect, checkPermission('leads', 'view'), getLeads)
  .post(protect, checkPermission('leads', 'create'), leadValidation, createLead);

router
  .route('/:id')
  .get(protect, checkPermission('leads', 'view'), getLeadById)
  .put(protect, checkPermission('leads', 'edit'), updateLead)
  .delete(protect, checkPermission('leads', 'delete'), deleteLead);

module.exports = router;
