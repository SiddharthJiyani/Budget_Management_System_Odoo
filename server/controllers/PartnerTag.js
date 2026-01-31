const PartnerTag = require("../models/PartnerTag");
const Contact = require("../models/Contact");

// Create Partner Tag
exports.createPartnerTag = async (req, res) => {
    try {
        const { name, displayName, color } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Tag name is required",
            });
        }

        // Check if tag already exists (case-insensitive)
        const existingTag = await PartnerTag.findOne({ name: name.toLowerCase().trim() });
        if (existingTag) {
            return res.status(400).json({
                success: false,
                message: "Tag already exists",
                data: existingTag,
            });
        }

        const tag = await PartnerTag.create({
            name: name.toLowerCase().trim(),
            displayName: displayName || name.trim(),
            color,
            createdBy: req.user.id,
        });

        return res.status(201).json({
            success: true,
            message: "Tag created successfully",
            data: tag,
        });
    } catch (error) {
        console.error("Create tag error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating tag",
            error: error.message,
        });
    }
};

// Get all tags
exports.getAllPartnerTags = async (req, res) => {
    try {
        const tags = await PartnerTag.find()
            .populate('createdBy', 'firstName lastName email')
            .sort({ displayName: 1 });

        return res.status(200).json({
            success: true,
            message: "Tags retrieved successfully",
            data: tags,
        });
    } catch (error) {
        console.error("Get tags error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving tags",
            error: error.message,
        });
    }
};

// Get tag by ID
exports.getPartnerTagById = async (req, res) => {
    try {
        const { id } = req.params;

        const tag = await PartnerTag.findById(id)
            .populate('createdBy', 'firstName lastName email');

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: "Tag not found",
            });
        }

        // Count contacts using this tag
        const contactCount = await Contact.countDocuments({ partnerTags: id });

        return res.status(200).json({
            success: true,
            message: "Tag retrieved successfully",
            data: {
                ...tag.toObject(),
                contactCount,
            },
        });
    } catch (error) {
        console.error("Get tag error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving tag",
            error: error.message,
        });
    }
};

// Update tag
exports.updatePartnerTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, displayName, color } = req.body;

        const tag = await PartnerTag.findById(id);
        if (!tag) {
            return res.status(404).json({
                success: false,
                message: "Tag not found",
            });
        }

        // Check if name is being changed and if it's already taken
        if (name && name.toLowerCase().trim() !== tag.name) {
            const existingTag = await PartnerTag.findOne({ name: name.toLowerCase().trim() });
            if (existingTag) {
                return res.status(400).json({
                    success: false,
                    message: "Tag name already in use",
                });
            }
        }

        if (name) {
            tag.name = name.toLowerCase().trim();
            tag.displayName = displayName || name.trim();
        }
        if (displayName) tag.displayName = displayName;
        if (color) tag.color = color;

        await tag.save();

        return res.status(200).json({
            success: true,
            message: "Tag updated successfully",
            data: tag,
        });
    } catch (error) {
        console.error("Update tag error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating tag",
            error: error.message,
        });
    }
};

// Delete tag
exports.deletePartnerTag = async (req, res) => {
    try {
        const { id } = req.params;

        const tag = await PartnerTag.findById(id);
        if (!tag) {
            return res.status(404).json({
                success: false,
                message: "Tag not found",
            });
        }

        // Check if any contacts are using this tag
        const contactCount = await Contact.countDocuments({ partnerTags: id });
        if (contactCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete tag. ${contactCount} contact(s) are using this tag.`,
            });
        }

        await PartnerTag.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Tag deleted successfully",
        });
    } catch (error) {
        console.error("Delete tag error:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting tag",
            error: error.message,
        });
    }
};
