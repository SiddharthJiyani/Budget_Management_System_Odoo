const AnalyticMaster = require("../models/AnalyticMaster");
const Category = require("../models/Category");

// Create Analytic Master
exports.createAnalyticMaster = async (req, res) => {
    try {
        const { name, description, startDate, endDate, productCategory } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Analytic name is required",
            });
        }

        // Validate dates if provided
        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({
                success: false,
                message: "End date must be greater than or equal to start date",
            });
        }

        // Process category if provided
        let categoryId = null;
        if (productCategory) {
            if (typeof productCategory === 'string') {
                let categoryDoc = await Category.findOne({ name: productCategory });
                if (!categoryDoc) {
                    categoryDoc = await Category.create({
                        name: productCategory,
                        createdBy: req.user.id,
                    });
                }
                categoryId = categoryDoc._id;
            } else {
                categoryId = productCategory;
            }
        }

        const analytic = await AnalyticMaster.create({
            name,
            description,
            startDate,
            endDate,
            productCategory: categoryId,
            status: 'new',
            createdBy: req.user.id,
        });

        await analytic.populate('productCategory');

        return res.status(201).json({
            success: true,
            message: "Analytic created successfully",
            data: analytic,
        });
    } catch (error) {
        console.error("Create analytic error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating analytic",
            error: error.message,
        });
    }
};

// Get all analytics with filtering
exports.getAllAnalyticMasters = async (req, res) => {
    try {
        const { status, category, search, page = 1, limit = 10 } = req.query;

        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (category) {
            query.productCategory = category;
        }
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const analytics = await AnalyticMaster.find(query)
            .populate('productCategory', 'name color')
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await AnalyticMaster.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Analytics retrieved successfully",
            data: {
                analytics,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalAnalytics: count,
            },
        });
    } catch (error) {
        console.error("Get analytics error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving analytics",
            error: error.message,
        });
    }
};

// Get analytic by ID
exports.getAnalyticMasterById = async (req, res) => {
    try {
        const { id } = req.params;

        const analytic = await AnalyticMaster.findById(id)
            .populate('productCategory', 'name color description')
            .populate('createdBy', 'firstName lastName email');

        if (!analytic) {
            return res.status(404).json({
                success: false,
                message: "Analytic not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Analytic retrieved successfully",
            data: analytic,
        });
    } catch (error) {
        console.error("Get analytic error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving analytic",
            error: error.message,
        });
    }
};

// Update analytic
exports.updateAnalyticMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, productCategory, status } = req.body;

        const analytic = await AnalyticMaster.findById(id);
        if (!analytic) {
            return res.status(404).json({
                success: false,
                message: "Analytic not found",
            });
        }

        // Validate dates if provided
        const newStartDate = startDate || analytic.startDate;
        const newEndDate = endDate || analytic.endDate;
        if (newStartDate && newEndDate && new Date(newEndDate) < new Date(newStartDate)) {
            return res.status(400).json({
                success: false,
                message: "End date must be greater than or equal to start date",
            });
        }

        // Process category if provided
        if (productCategory) {
            let categoryId = productCategory;
            if (typeof productCategory === 'string') {
                let categoryDoc = await Category.findOne({ name: productCategory });
                if (!categoryDoc) {
                    categoryDoc = await Category.create({
                        name: productCategory,
                        createdBy: req.user.id,
                    });
                }
                categoryId = categoryDoc._id;
            }
            analytic.productCategory = categoryId;
        }

        if (name) analytic.name = name;
        if (description !== undefined) analytic.description = description;
        if (startDate) analytic.startDate = startDate;
        if (endDate) analytic.endDate = endDate;
        if (status) analytic.status = status;

        await analytic.save();
        await analytic.populate('productCategory');

        return res.status(200).json({
            success: true,
            message: "Analytic updated successfully",
            data: analytic,
        });
    } catch (error) {
        console.error("Update analytic error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating analytic",
            error: error.message,
        });
    }
};

// Archive analytic (soft delete)
exports.deleteAnalyticMaster = async (req, res) => {
    try {
        const { id } = req.params;

        const analytic = await AnalyticMaster.findById(id);
        if (!analytic) {
            return res.status(404).json({
                success: false,
                message: "Analytic not found",
            });
        }

        analytic.status = 'archived';
        await analytic.save();

        return res.status(200).json({
            success: true,
            message: "Analytic archived successfully",
            data: analytic,
        });
    } catch (error) {
        console.error("Delete analytic error:", error);
        return res.status(500).json({
            success: false,
            message: "Error archiving analytic",
            error: error.message,
        });
    }
};

// Unarchive analytic (restore)
exports.unarchiveAnalyticMaster = async (req, res) => {
    try {
        const { id } = req.params;

        const analytic = await AnalyticMaster.findById(id);
        if (!analytic) {
            return res.status(404).json({
                success: false,
                message: "Analytic not found",
            });
        }

        analytic.status = 'new';
        await analytic.save();

        return res.status(200).json({
            success: true,
            message: "Analytic restored successfully",
            data: analytic,
        });
    } catch (error) {
        console.error("Unarchive analytic error:", error);
        return res.status(500).json({
            success: false,
            message: "Error restoring analytic",
            error: error.message,
        });
    }
};

// Permanent delete analytic
exports.permanentDeleteAnalyticMaster = async (req, res) => {
    try {
        const { id } = req.params;

        const analytic = await AnalyticMaster.findById(id);
        if (!analytic) {
            return res.status(404).json({
                success: false,
                message: "Analytic not found",
            });
        }

        await AnalyticMaster.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Analytic permanently deleted",
        });
    } catch (error) {
        console.error("Permanent delete analytic error:", error);
        return res.status(500).json({
            success: false,
            message: "Error permanently deleting analytic",
            error: error.message,
        });
    }
};

// Get analytics by date range for budget creation
exports.getAnalyticsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required",
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format",
            });
        }

        if (end < start) {
            return res.status(400).json({
                success: false,
                message: "End date must be greater than or equal to start date",
            });
        }

        // Query analytics where their date range overlaps with the budget period
        // An analytic overlaps if:
        // - It starts before the budget ends AND
        // - It ends after the budget starts
        const analytics = await AnalyticMaster.find({
            status: { $ne: 'archived' },
            $or: [
                // Analytics with date ranges that overlap
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start }
                },
                // Analytics without dates (include all)
                {
                    startDate: null,
                    endDate: null
                },
                // Analytics with only start date
                {
                    startDate: { $lte: end },
                    endDate: null
                },
                // Analytics with only end date
                {
                    startDate: null,
                    endDate: { $gte: start }
                }
            ]
        })
        .populate('productCategory', 'name color')
        .populate('createdBy', 'firstName lastName email')
        .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            message: `Found ${analytics.length} analytics for the selected period`,
            data: analytics,
        });
    } catch (error) {
        console.error("Get analytics by date range error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving analytics by date range",
            error: error.message,
        });
    }
};


