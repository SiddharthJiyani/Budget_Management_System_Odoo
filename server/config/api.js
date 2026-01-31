// Centralized API configuration to avoid hardcoded URLs
module.exports = {
    // Base URLs
    BASE_URL: process.env.BASE_URL || 'http://localhost:4000',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    
    // Cloudinary configuration
    CLOUDINARY: {
        FOLDER_NAME: process.env.FOLDER_NAME || 'Budget_ERP',
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        SUPPORTED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
    
    // Pagination defaults
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 10,
        MAX_LIMIT: 100,
    },
    
    // API version
    API_VERSION: 'v1',
    
    // Master Data folders for Cloudinary
    FOLDERS: {
        CONTACTS: 'contacts',
        PRODUCTS: 'products',
        ANALYTICS: 'analytics',
    },
};
