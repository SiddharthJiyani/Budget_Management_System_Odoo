const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createCustomerInvoice,
    getAllCustomerInvoices,
    getCustomerInvoiceById,
    updateCustomerInvoice,
    confirmCustomerInvoice,
    cancelCustomerInvoice,
    generateCustomerInvoicePDF,
    sendCustomerInvoiceToCustomer,
    createPaymentOrder,
    verifyPayment,
    recordManualPayment,
} = require("../controllers/CustomerInvoice");

// All routes require authentication
router.use(auth);

// Customer Invoice CRUD routes
router.post("/", createCustomerInvoice);
router.get("/", getAllCustomerInvoices);
router.get("/:id", getCustomerInvoiceById);
router.put("/:id", updateCustomerInvoice);

// Customer Invoice action routes
router.patch("/:id/confirm", confirmCustomerInvoice);
router.patch("/:id/cancel", cancelCustomerInvoice);

// PDF and email routes
router.get("/:id/pdf", generateCustomerInvoicePDF);
router.post("/:id/send", sendCustomerInvoiceToCustomer);

// Payment routes
router.post("/:id/create-payment", createPaymentOrder);
router.post("/:id/verify-payment", verifyPayment);
router.post("/:id/record-payment", recordManualPayment);

module.exports = router;
