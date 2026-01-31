const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createAutoAnalyticalModel,
    getAllAutoAnalyticalModels,
    getAutoAnalyticalModelById,
    updateAutoAnalyticalModel,
    confirmAutoAnalyticalModel,
    archiveAutoAnalyticalModel,
    deleteAutoAnalyticalModel,
    testRuleMatching,
} = require("../controllers/AutoAnalyticalModel");

/**
 * Auto-Analytical Model Routes
 * 
 * API endpoints for managing auto-analytical rules.
 * These rules determine automatic analytics assignment on transaction lines.
 * 
 * All routes require authentication.
 */

// CRUD operations
router.post("/", auth, createAutoAnalyticalModel);
router.get("/", auth, getAllAutoAnalyticalModels);
router.get("/:id", auth, getAutoAnalyticalModelById);
router.put("/:id", auth, updateAutoAnalyticalModel);
router.delete("/:id", auth, deleteAutoAnalyticalModel);

// Status transitions
router.patch("/:id/confirm", auth, confirmAutoAnalyticalModel);
router.patch("/:id/archive", auth, archiveAutoAnalyticalModel);

// Debug/Testing endpoint
router.post("/test-matching", auth, testRuleMatching);

module.exports = router;
