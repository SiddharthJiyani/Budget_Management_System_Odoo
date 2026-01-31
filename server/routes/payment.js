const express = require("express");
const {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
  getRazorpayKey,
} = require("../controllers/Payment");

const router = express.Router();

// Get Razorpay key for frontend
router.get("/key", getRazorpayKey);

// Create a new order
router.post("/create-order", createOrder);

// Verify payment after successful payment
router.post("/verify-payment", verifyPayment);

// Get payment details
router.get("/payment/:paymentId", getPaymentDetails);

// Refund payment
router.post("/refund", refundPayment);

module.exports = router;
