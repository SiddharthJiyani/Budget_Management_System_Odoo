const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
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

// All routes require authentication and admin role
router.post("/", auth, isAdmin, createContact);
router.get("/", auth, isAdmin, getAllContacts);
router.get("/:id", auth, isAdmin, getContactById);
router.put("/:id", auth, isAdmin, updateContact);
router.delete("/:id", auth, isAdmin, deleteContact);
router.post("/:id/image", auth, isAdmin, uploadContactImage);
router.post("/:id/unarchive", auth, isAdmin, unarchiveContact);
router.delete("/:id/permanent", auth, isAdmin, permanentDeleteContact);

module.exports = router;
