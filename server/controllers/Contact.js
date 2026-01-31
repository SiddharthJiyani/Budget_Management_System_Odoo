const Contact = require("../models/Contact");
const PartnerTag = require("../models/PartnerTag");
const { uploadImageToCloudinary, deleteFromCloudinary } = require("../utils/imageUploader");
const { FOLDERS } = require("../config/api");

// Create Contact
exports.createContact = async (req, res) => {
    try {
        const { name, email, phone, address, partnerTags } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Contact name and email are required",
            });
        }

        // Check if contact with same email already exists
        const existingContact = await Contact.findOne({ email });
        if (existingContact) {
            return res.status(400).json({
                success: false,
                message: "Contact with this email already exists",
            });
        }

        // Process partner tags (convert string array or create new tags)
        let tagIds = [];
        if (partnerTags && partnerTags.length > 0) {
            for (const tagName of partnerTags) {
                // Try to find existing tag (case-insensitive)
                let tag = await PartnerTag.findOne({ name: tagName.toLowerCase().trim() });
                
                // Create tag if it doesn't exist (on-the-fly creation)
                if (!tag) {
                    tag = await PartnerTag.create({
                        name: tagName.toLowerCase().trim(),
                        displayName: tagName.trim(),
                        createdBy: req.user.id,
                    });
                }
                tagIds.push(tag._id);
            }
        }

        // Create contact
        const contact = await Contact.create({
            name,
            email,
            phone,
            address: address || {},
            partnerTags: tagIds,
            status: 'new',
            createdBy: req.user.id,
        });

        // Populate tags before sending response
        await contact.populate('partnerTags');

        return res.status(201).json({
            success: true,
            message: "Contact created successfully",
            data: contact,
        });
    } catch (error) {
        console.error("Create contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating contact",
            error: error.message,
        });
    }
};

// Get all contacts with filtering
exports.getAllContacts = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        // Build query
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        // Execute query with pagination
        const contacts = await Contact.find(query)
            .populate('partnerTags', 'name displayName color')
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Contact.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Contacts retrieved successfully",
            data: {
                contacts,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalContacts: count,
            },
        });
    } catch (error) {
        console.error("Get contacts error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving contacts",
            error: error.message,
        });
    }
};

// Get single contact by ID
exports.getContactById = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findById(id)
            .populate('partnerTags', 'name displayName color')
            .populate('createdBy', 'firstName lastName email');

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Contact retrieved successfully",
            data: contact,
        });
    } catch (error) {
        console.error("Get contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving contact",
            error: error.message,
        });
    }
};

// Update contact
exports.updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, partnerTags, status } = req.body;

        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== contact.email) {
            const existingContact = await Contact.findOne({ email });
            if (existingContact) {
                return res.status(400).json({
                    success: false,
                    message: "Email already in use by another contact",
                });
            }
        }

        // Process partner tags if provided
        if (partnerTags) {
            let tagIds = [];
            for (const tagName of partnerTags) {
                let tag = await PartnerTag.findOne({ name: tagName.toLowerCase().trim() });
                if (!tag) {
                    tag = await PartnerTag.create({
                        name: tagName.toLowerCase().trim(),
                        displayName: tagName.trim(),
                        createdBy: req.user.id,
                    });
                }
                tagIds.push(tag._id);
            }
            contact.partnerTags = tagIds;
        }

        // Update fields
        if (name) contact.name = name;
        if (email) contact.email = email;
        if (phone !== undefined) contact.phone = phone;
        if (address) contact.address = { ...contact.address, ...address };
        if (status) contact.status = status;

        await contact.save();
        await contact.populate('partnerTags');

        return res.status(200).json({
            success: true,
            message: "Contact updated successfully",
            data: contact,
        });
    } catch (error) {
        console.error("Update contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating contact",
            error: error.message,
        });
    }
};

// Archive contact (soft delete)
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        contact.status = 'archived';
        await contact.save();

        return res.status(200).json({
            success: true,
            message: "Contact archived successfully",
            data: contact,
        });
    } catch (error) {
        console.error("Delete contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Error archiving contact",
            error: error.message,
        });
    }
};

// Upload contact image
exports.uploadContactImage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.files || !req.files.image) {
            return res.status(400).json({
                success: false,
                message: "No image file provided",
            });
        }

        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        const imageFile = req.files.image;

        // Delete old image from Cloudinary if exists
        if (contact.image && contact.image.publicId) {
            await deleteFromCloudinary(contact.image.publicId);
        }

        // Upload new image to Cloudinary
        const response = await uploadImageToCloudinary(imageFile, FOLDERS.CONTACTS);

        // Update contact with new image
        contact.image = {
            url: response.secure_url,
            publicId: response.public_id,
        };
        await contact.save();

        return res.status(200).json({
            success: true,
            message: "Contact image uploaded successfully",
            data: {
                url: response.secure_url,
                publicId: response.public_id,
            },
        });
    } catch (error) {
        console.error("Upload contact image error:", error);
        return res.status(500).json({
            success: false,
            message: "Error uploading contact image",
            error: error.message,
        });
    }
};

// Unarchive contact (restore)
exports.unarchiveContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        contact.status = 'new';
        await contact.save();

        return res.status(200).json({
            success: true,
            message: "Contact restored successfully",
            data: contact,
        });
    } catch (error) {
        console.error("Unarchive contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Error restoring contact",
            error: error.message,
        });
    }
};

// Permanent delete contact
exports.permanentDeleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        // Delete image from Cloudinary if exists
        if (contact.image && contact.image.publicId) {
            await deleteFromCloudinary(contact.image.publicId);
        }

        // Permanently delete from database
        await Contact.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Contact permanently deleted",
        });
    } catch (error) {
        console.error("Permanent delete contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Error permanently deleting contact",
            error: error.message,
        });
    }
};

