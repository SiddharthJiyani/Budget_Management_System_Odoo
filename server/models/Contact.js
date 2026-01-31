const mongoose = require("mongoose");

// Contact Master Schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Contact name is required"],
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
        type: String,
        trim: true,
    },
    address: {
        street: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        state: {
            type: String,
            trim: true,
        },
        country: {
            type: String,
            trim: true,
        },
        pincode: {
            type: String,
            trim: true,
        },
    },
    // Partner Tags (Many-to-Many relationship) - DB uses "partnerTags", UI shows "Contact Tags"
    partnerTags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "PartnerTag",
    }],
    // Profile image - Cloudinary URL
    image: {
        url: {
            type: String,
        },
        publicId: {
            type: String,
        },
    },
    status: {
        type: String,
        enum: ['new', 'confirmed', 'archived'],
        default: 'new',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});

// Indexes for better query performance
contactSchema.index({ name: 1, status: 1 });
contactSchema.index({ status: 1 });

module.exports = mongoose.model("Contact", contactSchema);
