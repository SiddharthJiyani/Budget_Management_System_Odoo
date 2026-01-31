const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
    createPartnerTag,
    getAllPartnerTags,
    getPartnerTagById,
    updatePartnerTag,
    deletePartnerTag,
} = require("../controllers/PartnerTag");

// All routes require authentication and admin role
router.post("/", auth, isAdmin, createPartnerTag);
router.get("/", auth, isAdmin, getAllPartnerTags);
router.get("/:id", auth, isAdmin, getPartnerTagById);
router.put("/:id", auth, isAdmin, updatePartnerTag);
router.delete("/:id", auth, isAdmin, deletePartnerTag);

module.exports = router;
