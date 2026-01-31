const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createContact,
    getAllContacts,
    getContactById,
    updateContact,
    deleteContact,
    uploadContactImage,
    unarchiveContact,
    permanentDeleteContact,
} = require("../controllers/Contact");

// All routes require authentication
router.post("/", auth, createContact);
router.get("/", auth, getAllContacts);
router.get("/:id", auth, getContactById);
router.put("/:id", auth, updateContact);
router.delete("/:id", auth, deleteContact);
router.post("/:id/image", auth, uploadContactImage);
router.post("/:id/unarchive", auth, unarchiveContact);
router.delete("/:id/permanent", auth, permanentDeleteContact);

module.exports = router;
