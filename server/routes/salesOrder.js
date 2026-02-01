const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createSalesOrder,
    getAllSalesOrders,
    getSalesOrderById,
    updateSalesOrder,
    confirmSalesOrder,
    cancelSalesOrder,
    generateSalesOrderPDF,
    sendSalesOrderToCustomer,
    createPaymentOrder,
    verifyPayment,
    recordManualPayment,
} = require("../controllers/SalesOrder");

// All routes require authentication
router.use(auth);

// Sales Order CRUD routes
router.post("/", createSalesOrder);
router.get("/", getAllSalesOrders);
router.get("/:id", getSalesOrderById);
router.put("/:id", updateSalesOrder);

// Sales Order action routes
router.patch("/:id/confirm", confirmSalesOrder);
router.patch("/:id/cancel", cancelSalesOrder);

// Payment routes
router.post("/:id/create-payment", createPaymentOrder);
router.post("/:id/verify-payment", verifyPayment);
router.post("/:id/record-payment", recordManualPayment);

// PDF and email routes
router.get("/:id/pdf", generateSalesOrderPDF);
router.post("/:id/send", sendSalesOrderToCustomer);

module.exports = router;
