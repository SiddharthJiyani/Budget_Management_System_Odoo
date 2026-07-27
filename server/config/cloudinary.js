const cloudinary = require("cloudinary").v2;

exports.cloudinaryConnect = () => {
    try {
        cloudinary.config({
            cloud_name: process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.API_KEY || process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.API_SECRET || process.env.CLOUDINARY_API_SECRET,
        });
        console.log("Cloudinary connected successfully");
    } catch (error) {
        console.log("Cloudinary connection error:", error);
    }
};
