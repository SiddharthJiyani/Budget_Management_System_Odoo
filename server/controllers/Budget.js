const Budget = require("../models/Budget");
const AnalyticMaster = require("../models/AnalyticMaster");
const Invoice = require("../models/Invoice");
const Bill = require("../models/Bill");

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

        // Populate analytics in real-time to get name and type
        await budget.populate('lines.analyticMasterId', 'name description type');

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

        // Admin can see all budgets, portal users only see their own
        let query = {};
        if (req.user.accountType !== 'admin') {
            query.createdBy = req.user.id;
        }
        
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
            .populate('lines.analyticMasterId', 'name description type') // Populate analytics with type
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

// Get budget by ID - Dynamically fetches current analytics for the date range
exports.getBudgetById = async (req, res) => {
    try {
        const { id } = req.params;

        const budget = await Budget.findById(id)
            .populate('createdBy', 'firstName lastName email')
            .populate('originalBudgetId', 'name status')
            .populate('revisedBudgetId', 'name status')
            .populate('lines.analyticMasterId', 'name description type');

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: "Budget not found",
            });
        }

        // Fetch current analytics for the budget's date range (excluding archived)
        const currentAnalytics = await AnalyticMaster.find({
            startDate: { $lte: budget.endDate },
            $or: [
                { endDate: { $gte: budget.startDate } },
                { endDate: null }
            ],
            status: { $ne: 'archived' } // Exclude archived analytics
        }).select('name description type');

        // Merge existing budget lines with current analytics
        // Create a map of existing lines for quick lookup
        const existingLinesMap = new Map();
        budget.lines.forEach(line => {
            const analyticId = line.analyticMasterId?._id?.toString() || line.analyticMasterId?.toString();
            if (analyticId) {
                existingLinesMap.set(analyticId, line);
            }
        });

        // Merge: include all current analytics, preserve budgeted amounts for existing ones
        const mergedLines = await Promise.all(currentAnalytics.map(async (analytic) => {
            const existingLine = existingLinesMap.get(analytic._id.toString());
            
            // Calculate achieved amount from invoices/bills for this analytic
            let achievedAmount = 0;
            
            if (analytic.type === 'Income') {
                // Calculate from invoices (sales)
                const invoices = await Invoice.aggregate([
                    {
                        $match: {
                            invoiceDate: { 
                                $gte: budget.startDate, 
                                $lte: budget.endDate 
                            },
                            status: { $in: ['paid', 'sent'] } // Only paid or sent invoices
                        }
                    },
                    { $unwind: '$lines' },
                    {
                        $match: {
                            'lines.analyticMaster': analytic._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$lines.subtotal' }
                        }
                    }
                ]);
                
                achievedAmount = invoices.length > 0 ? invoices[0].total : 0;
            } else {
                // Calculate from bills (purchases/expenses)
                const bills = await Bill.aggregate([
                    {
                        $match: {
                            billDate: { 
                                $gte: budget.startDate, 
                                $lte: budget.endDate 
                            },
                            status: { $in: ['paid', 'confirmed'] } // Only paid or confirmed bills
                        }
                    },
                    { $unwind: '$lines' },
                    {
                        $match: {
                            'lines.analyticMaster': analytic._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$lines.subtotal' }
                        }
                    }
                ]);
                
                achievedAmount = bills.length > 0 ? bills[0].total : 0;
            }
            
            const budgetedAmount = existingLine?.budgetedAmount || 0;
            const achievedPercent = budgetedAmount > 0 ? (achievedAmount / budgetedAmount) * 100 : 0;
            const amountToAchieve = budgetedAmount - achievedAmount;
            
            if (existingLine) {
                // Keep existing budgeted amount, calculate achieved values
                return {
                    ...existingLine.toObject(),
                    analyticMasterId: analytic, // Use current analytic data
                    achievedAmount,
                    achievedPercent,
                    amountToAchieve,
                };
            } else {
                // New analytic added after budget creation - add with zero budgeted amount
                return {
                    analyticMasterId: analytic,
                    budgetedAmount: 0,
                    achievedAmount,
                    achievedPercent: 0,
                    amountToAchieve: 0,
                };
            }
        }));

        // Return budget with dynamically updated lines
        const budgetWithUpdatedLines = budget.toObject();
        budgetWithUpdatedLines.lines = mergedLines;

        return res.status(200).json({
            success: true,
            message: "Budget retrieved successfully with current analytics",
            data: budgetWithUpdatedLines,
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

        // Check if budget can be edited (only draft budgets can be edited)
        if (budget.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft budgets can be edited",
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
        await budget.populate('lines.analyticMasterId', 'name description type'); // Populate analytics with type

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

        // Create revised budget - only store reference and amounts, not name/type
        const revisedBudget = await Budget.create({
            name: revisionName,
            startDate: originalBudget.startDate,
            endDate: originalBudget.endDate,
            lines: originalBudget.lines.map(line => ({
                analyticMasterId: line.analyticMasterId,
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

        await revisedBudget.populate('lines.analyticMasterId', 'name description type'); // Populate analytics with type

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

// Get invoice/bill details for a specific analytic in budget period
exports.getAnalyticDetails = async (req, res) => {
    try {
        const { budgetId, analyticId } = req.params;

        const budget = await Budget.findById(budgetId);
        if (!budget) {
            return res.status(404).json({
                success: false,
                message: "Budget not found",
            });
        }

        const analytic = await AnalyticMaster.findById(analyticId);
        if (!analytic) {
            return res.status(404).json({
                success: false,
                message: "Analytic not found",
            });
        }

        let details = [];

        if (analytic.type === 'Income') {
            // Get invoices for this analytic in budget period
            const invoices = await Invoice.find({
                invoiceDate: { 
                    $gte: budget.startDate, 
                    $lte: budget.endDate 
                },
                'lines.analyticMaster': analyticId,
                status: { $in: ['paid', 'sent'] }
            })
            .populate('customer', 'name email')
            .populate('lines.product', 'name')
            .select('invoiceNumber invoiceDate totalAmount status lines');

            details = invoices.map(invoice => ({
                type: 'Invoice',
                number: invoice.invoiceNumber,
                date: invoice.invoiceDate,
                partner: invoice.customer?.name || 'Unknown',
                status: invoice.status,
                lines: invoice.lines
                    .filter(line => line.analyticMaster.toString() === analyticId)
                    .map(line => ({
                        product: line.product?.name || 'Unknown',
                        description: line.description,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                        subtotal: line.subtotal
                    })),
                amount: invoice.lines
                    .filter(line => line.analyticMaster.toString() === analyticId)
                    .reduce((sum, line) => sum + line.subtotal, 0)
            }));
        } else {
            // Get bills for this analytic in budget period
            const bills = await Bill.find({
                billDate: { 
                    $gte: budget.startDate, 
                    $lte: budget.endDate 
                },
                'lines.analyticMaster': analyticId,
                status: { $in: ['paid', 'confirmed'] }
            })
            .populate('vendor', 'name email')
            .populate('lines.product', 'name')
            .select('billNumber billDate totalAmount status lines');

            details = bills.map(bill => ({
                type: 'Bill',
                number: bill.billNumber,
                date: bill.billDate,
                partner: bill.vendor?.name || 'Unknown',
                status: bill.status,
                lines: bill.lines
                    .filter(line => line.analyticMaster.toString() === analyticId)
                    .map(line => ({
                        product: line.product?.name || 'Unknown',
                        description: line.description,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                        subtotal: line.subtotal
                    })),
                amount: bill.lines
                    .filter(line => line.analyticMaster.toString() === analyticId)
                    .reduce((sum, line) => sum + line.subtotal, 0)
            }));
        }

        return res.status(200).json({
            success: true,
            message: "Analytic details retrieved successfully",
            data: {
                analytic: {
                    name: analytic.name,
                    type: analytic.type
                },
                budgetPeriod: {
                    startDate: budget.startDate,
                    endDate: budget.endDate
                },
                details,
                totalAmount: details.reduce((sum, item) => sum + item.amount, 0)
            },
        });
    } catch (error) {
        console.error("Get analytic details error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving analytic details",
            error: error.message,
        });
    }
};
