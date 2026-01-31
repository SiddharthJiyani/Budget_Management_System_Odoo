const express = require("express");
const router = express.Router();

const { uploadFile, uploadMultipleFiles, deleteFile, getAllFiles, getUserFiles } = require("../controllers/FileUpload");

// Single file upload
router.post("/upload", uploadFile);

// Multiple files upload
router.post("/upload-multiple", uploadMultipleFiles);

// Delete file
router.delete("/delete", deleteFile);

// Get all files (with optional pagination and user filter)
router.get("/all", getAllFiles);

// Get current user's files (requires authentication)
router.get("/my-files", getUserFiles);

module.exports = router;
