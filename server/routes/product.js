const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    unarchiveProduct,
    permanentDeleteProduct,
} = require("../controllers/Product");

// All routes require authentication and admin role
router.post("/", auth, isAdmin, createProduct);
router.get("/", auth, isAdmin, getAllProducts);
router.get("/:id", auth, isAdmin, getProductById);
router.put("/:id", auth, isAdmin, updateProduct);
router.delete("/:id", auth, isAdmin, deleteProduct);
router.post("/:id/unarchive", auth, isAdmin, unarchiveProduct);
router.delete("/:id/permanent", auth, isAdmin, permanentDeleteProduct);

module.exports = router;
