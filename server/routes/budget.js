const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createBudget,
    getAllBudgets,
    getBudgetById,
    updateBudget,
    updateBudgetStatus,
    createRevision,
    deleteBudget,
} = require("../controllers/Budget");

// All routes require authentication
router.post("/", auth, createBudget);
router.get("/", auth, getAllBudgets);
router.get("/:id", auth, getBudgetById);
router.put("/:id", auth, updateBudget);
router.patch("/:id/status", auth, updateBudgetStatus);
router.post("/:id/revise", auth, createRevision);
router.delete("/:id", auth, deleteBudget);

module.exports = router;
