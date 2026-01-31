const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendor,
} = require("../controllers/Vendor");

// All routes require authentication
router.use(auth);

// Vendor routes
router.post("/", createVendor);
router.get("/", getAllVendors);
router.get("/:id", getVendorById);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

module.exports = router;
