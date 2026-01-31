const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createAnalyticMaster,
    getAllAnalyticMasters,
    getAnalyticMasterById,
    updateAnalyticMaster,
    deleteAnalyticMaster,
    unarchiveAnalyticMaster,
    permanentDeleteAnalyticMaster,
} = require("../controllers/AnalyticMaster");

// All routes require authentication
router.post("/", auth, createAnalyticMaster);
router.get("/", auth, getAllAnalyticMasters);
router.get("/:id", auth, getAnalyticMasterById);
router.put("/:id", auth, updateAnalyticMaster);
router.delete("/:id", auth, deleteAnalyticMaster);
router.post("/:id/unarchive", auth, unarchiveAnalyticMaster);
router.delete("/:id/permanent", auth, permanentDeleteAnalyticMaster);

module.exports = router;
