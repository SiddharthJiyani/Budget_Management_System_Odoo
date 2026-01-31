const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
    createAnalyticMaster,
    getAllAnalyticMasters,
    getAnalyticMasterById,
    updateAnalyticMaster,
    deleteAnalyticMaster,
    unarchiveAnalyticMaster,
    permanentDeleteAnalyticMaster,
    getAnalyticsByDateRange,
} = require("../controllers/AnalyticMaster");

// All routes require authentication and admin role
router.get("/by-date-range", auth, isAdmin, getAnalyticsByDateRange);
router.post("/", auth, isAdmin, createAnalyticMaster);
router.get("/", auth, isAdmin, getAllAnalyticMasters);
router.get("/:id", auth, isAdmin, getAnalyticMasterById);
router.put("/:id", auth, isAdmin, updateAnalyticMaster);
router.delete("/:id", auth, isAdmin, deleteAnalyticMaster);
router.post("/:id/unarchive", auth, isAdmin, unarchiveAnalyticMaster);
router.delete("/:id/permanent", auth, isAdmin, permanentDeleteAnalyticMaster);

module.exports = router;
