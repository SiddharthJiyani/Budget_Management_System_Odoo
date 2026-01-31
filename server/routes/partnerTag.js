const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createPartnerTag,
    getAllPartnerTags,
    getPartnerTagById,
    updatePartnerTag,
    deletePartnerTag,
} = require("../controllers/PartnerTag");

// All routes require authentication
router.post("/", auth, createPartnerTag);
router.get("/", auth, getAllPartnerTags);
router.get("/:id", auth, getPartnerTagById);
router.put("/:id", auth, updatePartnerTag);
router.delete("/:id", auth, deletePartnerTag);

module.exports = router;
