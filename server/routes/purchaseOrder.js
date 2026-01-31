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
} = require("../controllers/PurchaseOrder");

// All routes require authentication
router.post("/", auth, createPurchaseOrder);
router.get("/", auth, getAllPurchaseOrders);
router.get("/:id", auth, getPurchaseOrderById);
router.put("/:id", auth, updatePurchaseOrder);
router.patch("/:id/confirm", auth, confirmPurchaseOrder);
router.patch("/:id/cancel", auth, cancelPurchaseOrder);
router.delete("/:id", auth, deletePurchaseOrder);

module.exports = router;
