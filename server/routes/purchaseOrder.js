const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    confirmPurchaseOrder,
    cancelPurchaseOrder,
    deletePurchaseOrder,
    autoAssignAnalytics,
    generatePurchaseOrderPDF,
    sendPurchaseOrderToVendor,
} = require("../controllers/PurchaseOrder");

// All routes require authentication
router.post("/", auth, createPurchaseOrder);
router.get("/", auth, getAllPurchaseOrders);
router.get("/:id", auth, getPurchaseOrderById);
router.put("/:id", auth, updatePurchaseOrder);
router.patch("/:id/confirm", auth, confirmPurchaseOrder);
router.patch("/:id/cancel", auth, cancelPurchaseOrder);
router.delete("/:id", auth, deletePurchaseOrder);

// New routes for PDF, email, and auto-analytics
router.post("/auto-assign-analytics", auth, autoAssignAnalytics);
router.get("/:id/pdf", auth, generatePurchaseOrderPDF);
router.post("/:id/send", auth, sendPurchaseOrderToVendor);

module.exports = router;
