const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    getMyInvoices,
    getPaymentDetails,
    createPaymentOrder,
    verifyPaymentAndUpdate,
    getMyProfile,
    getMyStats,
} = require("../controllers/Portal");

/**
 * Portal Routes
 * 
 * API endpoints for portal users (customers and vendors).
 * All routes require authentication.
 */

// Get user's profile information
router.get("/my-profile", auth, getMyProfile);

// Get user's statistics (invoices/bills summary)
router.get("/my-stats", auth, getMyStats);

// Get user's invoices or bills
router.get("/my-invoices", auth, getMyInvoices);

// Get payment details for a specific document
router.get("/payment/:documentType/:documentId", auth, getPaymentDetails);

// Create Razorpay order for invoice/bill payment
router.post("/payment/create-order", auth, createPaymentOrder);

// Verify payment and update invoice/bill
router.post("/payment/verify", auth, verifyPaymentAndUpdate);

module.exports = router;
