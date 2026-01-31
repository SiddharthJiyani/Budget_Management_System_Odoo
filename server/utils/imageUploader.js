const cloudinary = require("cloudinary").v2;

exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
    const options = { folder };
    
    if (height) {
        options.height = height;
    }
    if (quality) {
        options.quality = quality;
    }
    options.resource_type = "auto"; // Automatically detect file type (image, video, raw)
    
    return await cloudinary.uploader.upload(file.tempFilePath, options);
};

// Upload multiple files
exports.uploadMultipleToCloudinary = async (files, folder) => {
    const uploadPromises = files.map(file => 
        cloudinary.uploader.upload(file.tempFilePath, {
            folder,
            resource_type: "auto"
        })
    );
    return await Promise.all(uploadPromises);
};

// Delete file from cloudinary
exports.deleteFromCloudinary = async (publicId) => {
    try {
        // Try deleting as image first
        let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        
        // If not found as image, try as video
        if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        }
        
        // If still not found, try as raw
        if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        }
        
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
};
