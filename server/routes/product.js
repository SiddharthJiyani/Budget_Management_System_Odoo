const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    unarchiveProduct,
    permanentDeleteProduct,
} = require("../controllers/Product");

// All routes require authentication
router.post("/", auth, createProduct);
router.get("/", auth, getAllProducts);
router.get("/:id", auth, getProductById);
router.put("/:id", auth, updateProduct);
router.delete("/:id", auth, deleteProduct);
router.post("/:id/unarchive", auth, unarchiveProduct);
router.delete("/:id/permanent", auth, permanentDeleteProduct);

module.exports = router;
