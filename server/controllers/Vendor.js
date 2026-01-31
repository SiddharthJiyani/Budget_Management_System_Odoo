const Contact = require("../models/Contact");

// Create Vendor (Contact)
exports.createVendor = async (req, res) => {
    try {
        const { name, email, phone, partnerTags, address } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Contact name is required",
            });
        }

        const vendor = await Contact.create({
            name,
            email,
            phone,
            partnerTags,
            address,
            createdBy: req.user.id,
        });

        return res.status(201).json({
            success: true,
            message: "Vendor created successfully",
            data: vendor,
        });
    } catch (error) {
        console.error("Create vendor error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating vendor",
            error: error.message,
        });
    }
};

// Get all vendors (Contacts)
exports.getAllVendors = async (req, res) => {
    try {
        const { search, page = 1, limit = 100 } = req.query;

        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        console.log('Fetching vendors/contacts with query:', query);
        
        const vendors = await Contact.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('partnerTags', 'name')
            .sort({ name: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Contact.countDocuments(query);
        
        console.log(`Found ${count} contacts, returning ${vendors.length} vendors`);

        return res.status(200).json({
            success: true,
            message: "Contacts retrieved successfully",
            data: {
                vendors,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalVendors: count,
            },
        });
    } catch (error) {
        console.error("Get vendors error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving vendors",
            error: error.message,
        });
    }
};

// Get vendor by ID (Contact)
exports.getVendorById = async (req, res) => {
    try {
        const { id } = req.params;

        const vendor = await Contact.findById(id)
            .populate('createdBy', 'firstName lastName email')
            .populate('partnerTags', 'name');

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vendor retrieved successfully",
            data: vendor,
        });
    } catch (error) {
        console.error("Get vendor error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving vendor",
            error: error.message,
        });
    }
};

// Update vendor
exports.updateVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, partnerTags, address } = req.body;

        const vendor = await Contact.findById(id);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        if (name) vendor.name = name;
        if (email !== undefined) vendor.email = email;
        if (phone !== undefined) vendor.phone = phone;
        if (partnerTags !== undefined) vendor.partnerTags = partnerTags;
        if (address !== undefined) vendor.address = address;

        await vendor.save();

        return res.status(200).json({
            success: true,
            message: "Vendor updated successfully",
            data: vendor,
        });
    } catch (error) {
        console.error("Update vendor error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating vendor",
            error: error.message,
        });
    }
};

// Delete vendor
exports.deleteVendor = async (req, res) => {
    try {
        const { id } = req.params;

        const vendor = await Contact.findById(id);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        await vendor.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Vendor deleted successfully",
            data: vendor,
        });
    } catch (error) {
        console.error("Delete vendor error:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting vendor",
            error: error.message,
        });
    }
};
