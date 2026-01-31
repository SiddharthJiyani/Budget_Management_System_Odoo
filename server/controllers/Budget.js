const Budget = require("../models/Budget");
const AnalyticMaster = require("../models/AnalyticMaster");

// Create Budget
exports.createBudget = async (req, res) => {
    try {
        const { name, startDate, endDate, lines } = req.body;

        if (!name || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Budget name, start date, and end date are required",
            });
        }

        // Validate dates
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({
                success: false,
                message: "End date must be greater than or equal to start date",
            });
        }

        const budget = await Budget.create({
            name,
            startDate,
            endDate,
            lines: lines || [],
            status: 'draft',
            createdBy: req.user.id,
        });

        await budget.populate('lines.analyticMasterId', 'name description');

        return res.status(201).json({
            success: true,
            message: "Budget created successfully",
            data: budget,
        });
    } catch (error) {
        console.error("Create budget error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating budget",
            error: error.message,
        });
    }
};

// Get all budgets with filtering
exports.getAllBudgets = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        let query = { createdBy: req.user.id };
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const budgets = await Budget.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('originalBudgetId', 'name')
            .populate('revisedBudgetId', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Budget.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Budgets retrieved successfully",
            data: {
                budgets,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalBudgets: count,
            },
        });
    } catch (error) {
        console.error("Get budgets error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving budgets",
            error: error.message,
        });
    }
};

// Get budget by ID
exports.getBudgetById = async (req, res) => {
    try {
        const { id } = req.params;

        const budget = await Budget.findById(id)
            .populate('createdBy', 'firstName lastName email')
            .populate('originalBudgetId', 'name status')
            .populate('revisedBudgetId', 'name status')
            .populate('lines.analyticMasterId', 'name description');

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: "Budget not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Budget retrieved successfully",
            data: budget,
        });
    } catch (error) {
        console.error("Get budget error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving budget",
            error: error.message,
        });
    }
};

// Update budget
exports.updateBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, lines } = req.body;

        const budget = await Budget.findById(id);
        if (!budget) {
            return res.status(404).json({
                success: false,
                message: "Budget not found",
            });
        }

        // Check if budget can be edited (only draft and revised can be edited)
        if (budget.status !== 'draft' && budget.status !== 'revised') {
            return res.status(400).json({
                success: false,
                message: "Only draft or revised budgets can be edited",
            });
        }

        // Validate dates if provided
        const newStartDate = startDate || budget.startDate;
        const newEndDate = endDate || budget.endDate;
        if (new Date(newEndDate) < new Date(newStartDate)) {
            return res.status(400).json({
                success: false,
                message: "End date must be greater than or equal to start date",
            });
        }

        if (name) budget.name = name;
        if (startDate) budget.startDate = startDate;
        if (endDate) budget.endDate = endDate;
        if (lines) budget.lines = lines;

        await budget.save();
        await budget.populate('lines.analyticMasterId', 'name description');

        return res.status(200).json({
            success: true,
            message: "Budget updated successfully",
            data: budget,
        });
    } catch (error) {
        console.error("Update budget error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating budget",
            error: error.message,
        });
    }
};

// Update budget status
exports.updateBudgetStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }

        const validStatuses = ['draft', 'confirmed', 'revised', 'archived', 'canceled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        const budget = await Budget.findById(id);
        if (!budget) {
            return res.status(404).json({
                success: false,
                message: "Budget not found",
            });
        }

        // Status transition validation
        if (budget.status === 'confirmed' && status === 'draft') {
            return res.status(400).json({
                success: false,
                message: "Cannot change confirmed budget back to draft",
            });
        }

        budget.status = status;
        
        // If confirming, calculate all metrics
        if (status === 'confirmed') {
            budget.calculateAllMetrics();
        }

        await budget.save();

        return res.status(200).json({
            success: true,
            message: `Budget ${status} successfully`,
            data: budget,
        });
    } catch (error) {
        console.error("Update budget status error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating budget status",
            error: error.message,
        });
    }
};

// Create revision
exports.createRevision = async (req, res) => {
    try {
        const { id } = req.params;

        const originalBudget = await Budget.findById(id);
        if (!originalBudget) {
            return res.status(404).json({
                success: false,
                message: "Original budget not found",
            });
        }

        // Only confirmed budgets can be revised
        if (originalBudget.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: "Only confirmed budgets can be revised",
            });
        }

        // Check if revision already exists
        if (originalBudget.revisedBudgetId) {
            return res.status(400).json({
                success: false,
                message: "A revision already exists for this budget",
            });
        }

        // Create revision name with current date
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const revisionName = `${originalBudget.name} (Rev ${day} ${month} ${year})`;

        // Create revised budget
        const revisedBudget = await Budget.create({
            name: revisionName,
            startDate: originalBudget.startDate,
            endDate: originalBudget.endDate,
            lines: originalBudget.lines.map(line => ({
                analyticMasterId: line.analyticMasterId,
                analyticName: line.analyticName,
                type: line.type,
                budgetedAmount: line.budgetedAmount,
                achievedAmount: 0,
                achievedPercent: 0,
                amountToAchieve: 0,
            })),
            status: 'draft',
            isRevised: true,
            originalBudgetId: originalBudget._id,
            createdBy: req.user.id,
        });

        // Update original budget with revised budget reference
        originalBudget.revisedBudgetId = revisedBudget._id;
        await originalBudget.save();

        await revisedBudget.populate('lines.analyticMasterId', 'name description');

        return res.status(201).json({
            success: true,
            message: "Revised budget created successfully",
            data: revisedBudget,
        });
    } catch (error) {
        console.error("Create revision error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating revision",
            error: error.message,
        });
    }
};

// Archive budget (soft delete)
exports.deleteBudget = async (req, res) => {
    try {
        const { id } = req.params;

        const budget = await Budget.findById(id);
        if (!budget) {
            return res.status(404).json({
                success: false,
                message: "Budget not found",
            });
        }

        budget.status = 'archived';
        await budget.save();

        return res.status(200).json({
            success: true,
            message: "Budget archived successfully",
            data: budget,
        });
    } catch (error) {
        console.error("Delete budget error:", error);
        return res.status(500).json({
            success: false,
            message: "Error archiving budget",
            error: error.message,
        });
    }
};
