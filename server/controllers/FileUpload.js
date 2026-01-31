const { uploadImageToCloudinary, uploadMultipleToCloudinary, deleteFromCloudinary } = require("../utils/imageUploader");
const File = require("../models/File");

// Upload single file
exports.uploadFile = async (req, res) => {
    try {
        // Check if file exists
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        // Get the first file regardless of field name
        const file = Object.values(req.files)[0];
        const folder = process.env.FOLDER_NAME || "uploads";
        
        // Validate file type (optional - customize as needed)
        const supportedTypes = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "pdf"];
        const fileType = file.name.split('.').pop().toLowerCase();
        
        if (!supportedTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                message: `File type .${fileType} not supported. Supported types: ${supportedTypes.join(", ")}`,
            });
        }

        // File size validation (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: "File size exceeds 10MB limit",
            });
        }

        // Upload to cloudinary
        const response = await uploadImageToCloudinary(file, folder);

        // Save file metadata to database
        const fileData = await File.create({
            fileName: file.name,
            fileUrl: response.secure_url,
            publicId: response.public_id,
            fileType: response.format,
            fileSize: response.bytes,
            uploadedBy: req.user?.id || null, // Save user ID if authenticated
            folder: folder,
        });

        return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: {
                id: fileData._id,
                url: response.secure_url,
                publicId: response.public_id,
                format: response.format,
                size: response.bytes,
                fileName: file.name,
                createdAt: fileData.createdAt,
            },
        });

    } catch (error) {
        console.error("File upload error:", error);
        return res.status(500).json({
            success: false,
            message: "Error uploading file",
            error: error.message,
        });
    }
};

// Upload multiple files
exports.uploadMultipleFiles = async (req, res) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded",
            });
        }

        const folder = process.env.FOLDER_NAME || "uploads";
        
        // Convert to array if single file or get all files
        let filesArray = [];
        if (req.files.files) {
            filesArray = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
        } else {
            // Handle case where files come with different field names
            filesArray = Object.values(req.files);
        }

        const responses = await uploadMultipleToCloudinary(filesArray, folder);

        // Save all files to database
        const fileDataPromises = responses.map(async (response, index) => {
            return await File.create({
                fileName: filesArray[index].name,
                fileUrl: response.secure_url,
                publicId: response.public_id,
                fileType: response.format,
                fileSize: response.bytes,
                uploadedBy: req.user?.id || null,
                folder: folder,
            });
        });

        const savedFiles = await Promise.all(fileDataPromises);

        const uploadedFiles = savedFiles.map((fileData, index) => ({
            id: fileData._id,
            url: responses[index].secure_url,
            publicId: responses[index].public_id,
            format: responses[index].format,
            size: responses[index].bytes,
            fileName: fileData.fileName,
            createdAt: fileData.createdAt,
        }));

        return res.status(200).json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            data: uploadedFiles,
        });

    } catch (error) {
        console.error("Multiple file upload error:", error);
        return res.status(500).json({
            success: false,
            message: "Error uploading files",
            error: error.message,
        });
    }
};

// Delete file
exports.deleteFile = async (req, res) => {
    try {
        const { publicId } = req.body;

        if (!publicId) {
            return res.status(400).json({
                success: false,
                message: "Public ID is required",
            });
        }

        // Delete from Cloudinary first
        const cloudinaryResponse = await deleteFromCloudinary(publicId);

        // Check if Cloudinary deletion was successful
        if (cloudinaryResponse.result !== 'ok' && cloudinaryResponse.result !== 'not found') {
            throw new Error(`Cloudinary deletion failed: ${cloudinaryResponse.result}`);
        }

        // Delete from database
        const deletedFile = await File.findOneAndDelete({ publicId: publicId });

        if (!deletedFile) {
            console.warn(`File with publicId ${publicId} not found in database`);
        } else {
            console.log(`Successfully deleted file from database: ${deletedFile.fileName}`);
        }

        return res.status(200).json({
            success: true,
            message: "File deleted successfully",
            data: {
                cloudinary: {
                    status: cloudinaryResponse.result,
                    publicId: publicId,
                },
                database: deletedFile ? {
                    fileName: deletedFile.fileName,
                    status: "Deleted"
                } : "Not found in database",
            },
        });

    } catch (error) {
        console.error("File delete error:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting file",
            error: error.message,
        });
    }
};

// Get all files (with optional user filter)
exports.getAllFiles = async (req, res) => {
    try {
        const { page = 1, limit = 10, userId } = req.query;
        
        const query = userId ? { uploadedBy: userId } : {};
        
        const files = await File.find(query)
            .populate('uploadedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const count = await File.countDocuments(query);
        
        return res.status(200).json({
            success: true,
            message: "Files retrieved successfully",
            data: {
                files,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalFiles: count,
            },
        });
    } catch (error) {
        console.error("Get files error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving files",
            error: error.message,
        });
    }
};

// Get files for current user
exports.getUserFiles = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }
        
        const files = await File.find({ uploadedBy: req.user.id })
            .sort({ createdAt: -1 });
        
        return res.status(200).json({
            success: true,
            message: "User files retrieved successfully",
            data: files,
        });
    } catch (error) {
        console.error("Get user files error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving user files",
            error: error.message,
        });
    }
};
