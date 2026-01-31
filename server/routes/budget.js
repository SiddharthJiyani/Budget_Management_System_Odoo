const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
    createBudget,
    getAllBudgets,
    getBudgetById,
    updateBudget,
    updateBudgetStatus,
    createRevision,
    deleteBudget,
    getAnalyticDetails,
} = require("../controllers/Budget");

// All routes require authentication and admin role
router.post("/", auth, isAdmin, createBudget);
router.get("/", auth, isAdmin, getAllBudgets);
router.get("/:id", auth, isAdmin, getBudgetById);
router.get("/:budgetId/analytic/:analyticId/details", auth, isAdmin, getAnalyticDetails);
router.put("/:id", auth, isAdmin, updateBudget);
router.patch("/:id/status", auth, isAdmin, updateBudgetStatus);
router.post("/:id/revise", auth, isAdmin, createRevision);
router.delete("/:id", auth, isAdmin, deleteBudget);

module.exports = router;
