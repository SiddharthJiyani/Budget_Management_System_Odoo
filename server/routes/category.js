const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    cleanupInvalidCategories,
} = require("../controllers/Category");

// All routes require authentication and admin role
router.post("/", auth, isAdmin, createCategory);
router.get("/", auth, isAdmin, getAllCategories);
router.post("/cleanup", auth, isAdmin, cleanupInvalidCategories); // Clean up invalid categories
router.get("/:id", auth, isAdmin, getCategoryById);
router.put("/:id", auth, isAdmin, updateCategory);
router.delete("/:id", auth, isAdmin, deleteCategory);

module.exports = router;
