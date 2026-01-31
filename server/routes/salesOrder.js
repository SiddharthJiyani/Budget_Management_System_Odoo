const express = require('express');
const router = express.Router();
const {
    createSalesOrder,
    getAllSalesOrders,
    getSalesOrderById,
    updateSalesOrder,
    confirmSalesOrder,
    cancelSalesOrder,
    generateSalesOrderPDF,
    sendSalesOrderEmail
} = require('../controllers/SalesOrder');
const { auth } = require('../middlewares/auth');

// All routes require authentication
router.use(auth);

// CRUD routes
router.post('/', createSalesOrder);
router.get('/', getAllSalesOrders);
router.get('/:id', getSalesOrderById);
router.put('/:id', updateSalesOrder);

// Status management
router.patch('/:id/confirm', confirmSalesOrder);
router.patch('/:id/cancel', cancelSalesOrder);

// PDF and email
router.get('/:id/pdf', generateSalesOrderPDF);
router.post('/:id/send', sendSalesOrderEmail);

module.exports = router;
