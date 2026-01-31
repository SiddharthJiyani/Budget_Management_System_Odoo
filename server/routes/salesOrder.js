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

// PDF and email routes
router.get("/:id/pdf", generateSalesOrderPDF);
router.post("/:id/send", sendSalesOrderToCustomer);

module.exports = router;
