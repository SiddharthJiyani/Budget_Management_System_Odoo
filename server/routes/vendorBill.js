const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createVendorBill,
    getAllVendorBills,
    getVendorBillById,
    updateVendorBill,
    confirmVendorBill,
    cancelVendorBill,
    createPayment,
    verifyPayment,
    autoAssignAnalytics,
    generateVendorBillPDF,
    sendVendorBillToVendor,
    createFromPurchaseOrder,
} = require("../controllers/VendorBill");

// All routes require authentication
router.use(auth);

// Vendor Bill CRUD routes
router.post("/", createVendorBill);
router.get("/", getAllVendorBills);
router.get("/:id", getVendorBillById);
router.put("/:id", updateVendorBill);

// Vendor Bill action routes
router.patch("/:id/confirm", confirmVendorBill);
router.patch("/:id/cancel", cancelVendorBill);

// Payment routes
router.post("/:id/payment", createPayment);
router.post("/:id/verify-payment", verifyPayment);

// Analytics assignment
router.post("/auto-assign-analytics", autoAssignAnalytics);

// PDF and email routes
router.get("/:id/pdf", generateVendorBillPDF);
router.post("/:id/send", sendVendorBillToVendor);

// Create from Purchase Order
router.post("/from-po/:poId", createFromPurchaseOrder);

module.exports = router;