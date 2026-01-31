const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        trim: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null, // Allow null for unauthenticated uploads
    },
    folder: {
        type: String,
        default: "uploads",
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt
});

module.exports = mongoose.model("File", fileSchema);
