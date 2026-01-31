const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    cleanupInvalidCategories,
} = require("../controllers/Category");

// All routes require authentication
router.post("/", auth, createCategory);
router.get("/", auth, getAllCategories);
router.post("/cleanup", auth, cleanupInvalidCategories); // Clean up invalid categories
router.get("/:id", auth, getCategoryById);
router.put("/:id", auth, updateCategory);
router.delete("/:id", auth, deleteCategory);

module.exports = router;
