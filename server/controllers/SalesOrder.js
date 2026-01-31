const SalesOrder = require("../models/SalesOrder");
const Contact = require("../models/Contact");
const AnalyticMaster = require("../models/AnalyticMaster");
const Budget = require("../models/Budget");
const PDFDocument = require('pdfkit');
const mailSender = require("../utils/mailSender");
const Product = require("../models/Product");
const { recommendAnalytics } = require("../services/AutoAnalyticalService");

// Create Sales Order
exports.createSalesOrder = async (req, res) => {
    try {
        const { customerId, reference, soDate, lines, notes } = req.body;

        // Validate customer exists
        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer is required",
            });
        }

        const customer = await Contact.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        // Validate lines
        if (!lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one line item is required",
            });
        }

        // Validate each line
        for (const line of lines) {
            if (!line.productName || line.productName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required for each line item",
                });
            }

            if (!line.quantity || line.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be greater than 0",
                });
            }

            if (line.unitPrice == null || line.unitPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Unit price is required and must be non-negative",
                });
            }
        }

        // Auto-generate SO number
        const year = new Date().getFullYear();
        const lastSO = await SalesOrder.findOne({ soNumber: new RegExp(`^SO-${year}-`) })
            .sort({ soNumber: -1 })
            .limit(1);

        let nextNumber = 1;
        if (lastSO) {
            const lastNumber = parseInt(lastSO.soNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }

        const soNumber = `SO-${year}-${String(nextNumber).padStart(4, '0')}`;

        // Process lines with auto-analytics assignment
        const processedLines = [];

        for (const line of lines) {
            const processedLine = {
                productId: line.productId,
                productName: line.productName || '',
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.quantity * line.unitPrice,
                autoAssigned: false,
                analyticsOverridden: false,
                autoAssignmentDetails: null,
                exceedsBudget: line.exceedsBudget || false,
            };

            // Check if user manually provided analytics
            if (line.budgetAnalyticId) {
                processedLine.budgetAnalyticId = line.budgetAnalyticId;
                processedLine.autoAssigned = false;
                console.log(`[SalesOrder] Line for product ${line.productId}: User provided analytics ${line.budgetAnalyticId}`);
            } else {
                // No analytics provided - attempt auto-assignment
                try {
                    const recommendation = await recommendAnalytics({
                        productId: line.productId,
                        partnerId: customerId,
                    });

                    if (recommendation.analyticsId) {
                        processedLine.budgetAnalyticId = recommendation.analyticsId;
                        processedLine.autoAssigned = true;
                        processedLine.autoAssignmentDetails = {
                            ruleId: recommendation.matchedRule?.id,
                            ruleName: recommendation.matchedRule?.name,
                            matchedFields: recommendation.matchedRule?.matchedFields || [],
                            explanation: recommendation.explanation,
                        };
                        console.log(`[SalesOrder] Line for product ${line.productId}: Auto-assigned analytics - ${recommendation.explanation}`);
                    } else {
                        processedLine.budgetAnalyticId = null;
                        console.log(`[SalesOrder] Line for product ${line.productId}: No auto-assignment - ${recommendation.explanation}`);
                    }
                } catch (autoAssignError) {
                    console.error(`[SalesOrder] Auto-assignment error for product ${line.productId}:`, autoAssignError);
                    processedLine.budgetAnalyticId = null;
                }
            }

            // Check budget if analytics assigned
            if (processedLine.budgetAnalyticId) {
                try {
                    const analytic = await AnalyticMaster.findById(processedLine.budgetAnalyticId);
                    if (analytic) {
                        const budget = await Budget.findOne({
                            'lines.analyticMasterId': processedLine.budgetAnalyticId,
                            status: 'confirmed',
                        });

                        if (budget) {
                            const budgetLine = budget.lines.find(
                                l => l.analyticMasterId.toString() === processedLine.budgetAnalyticId.toString()
                            );

                            if (budgetLine) {
                                const remaining = budgetLine.budgetedAmount - budgetLine.achievedAmount;
                                if (processedLine.lineTotal > remaining) {
                                    processedLine.exceedsBudget = true;
                                    console.log(`[SalesOrder] Line exceeds budget: ${processedLine.lineTotal} > ${remaining}`);
                                }
                            }
                        }
                    }
                } catch (budgetError) {
                    console.error('[SalesOrder] Budget check error:', budgetError);
                }
            }

            processedLines.push(processedLine);
        }

        // Calculate order total
        const orderTotal = processedLines.reduce((sum, line) => sum + line.lineTotal, 0);

        // Create sales order
        const salesOrder = new SalesOrder({
            soNumber,
            soDate: soDate || new Date(),
            customerId,
            reference: reference || '',
            lines: processedLines,
            orderTotal,
            status: 'draft',
            notes: notes || '',
            createdBy: req.user.id,
        });

        await salesOrder.save();

        return res.status(201).json({
            success: true,
            message: "Sales Order created successfully",
            data: salesOrder,
        });
    } catch (error) {
        console.error("Create sales order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating sales order",
            error: error.message,
        });
    }
};

// Get all sales orders with filtering
exports.getAllSalesOrders = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        let query = { createdBy: req.user.id };

        if (status && status !== "all") {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { soNumber: { $regex: search, $options: "i" } },
                { reference: { $regex: search, $options: "i" } },
            ];
        }

        const salesOrders = await SalesOrder.find(query)
            .populate("customerId", "name email phone")
            .populate("createdBy", "firstName lastName email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await SalesOrder.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Sales orders retrieved successfully",
            data: {
                salesOrders,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalSalesOrders: count,
            },
        });
    } catch (error) {
        console.error("Get sales orders error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving sales orders",
            error: error.message,
        });
    }
};

// Get sales order by ID
exports.getSalesOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const salesOrder = await SalesOrder.findById(id)
            .populate("customerId", "name email phone address")
            .populate("lines.productId", "name salesPrice purchasePrice category")
            .populate("lines.budgetAnalyticId", "name description type")
            .populate("createdBy", "firstName lastName email");

        if (!salesOrder) {
            return res.status(404).json({
                success: false,
                message: "Sales Order not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Sales Order retrieved successfully",
            data: salesOrder,
        });
    } catch (error) {
        console.error("Get sales order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving sales order",
            error: error.message,
        });
    }
};

// Update sales order
exports.updateSalesOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerId, reference, soDate, lines, notes } = req.body;

        const salesOrder = await SalesOrder.findById(id);

        if (!salesOrder) {
            return res.status(404).json({
                success: false,
                message: "Sales Order not found",
            });
        }

        // Only allow updates if status is draft
        if (salesOrder.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Cannot update confirmed or cancelled sales order",
            });
        }

        // Validate customer if changed
        if (customerId && customerId !== salesOrder.customerId.toString()) {
            const customer = await Contact.findById(customerId);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }
            salesOrder.customerId = customerId;
        }

        // Update basic fields
        if (reference !== undefined) salesOrder.reference = reference;
        if (soDate) salesOrder.soDate = soDate;
        if (notes !== undefined) salesOrder.notes = notes;

        // Update lines if provided
        if (lines && Array.isArray(lines)) {
            const processedLines = [];

            for (const line of lines) {
                const processedLine = {
                    productId: line.productId,
                    productName: line.productName,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: line.quantity * line.unitPrice,
                    autoAssigned: false,
                    analyticsOverridden: false,
                    autoAssignmentDetails: null,
                    exceedsBudget: false,
                };

                // Find existing line for override detection
                const existingLine = salesOrder.lines.find(
                    existingL => existingL._id.toString() === line._id?.toString()
                );

                // Handle analytics assignment and override detection
                if (line.budgetAnalyticId) {
                    processedLine.budgetAnalyticId = line.budgetAnalyticId;

                    // Check if this is a manual override
                    if (existingLine?.autoAssigned &&
                        existingLine.budgetAnalyticId !== line.budgetAnalyticId) {
                        processedLine.autoAssigned = false;
                        processedLine.analyticsOverridden = true;
                        processedLine.autoAssignmentDetails = null;
                        console.log(`[SalesOrder] Override detected for line ${line._id}: ${existingLine.budgetAnalyticId} → ${line.budgetAnalyticId}`);
                    } else if (existingLine) {
                        processedLine.autoAssigned = existingLine.autoAssigned;
                        processedLine.analyticsOverridden = existingLine.analyticsOverridden;
                        processedLine.autoAssignmentDetails = existingLine.autoAssignmentDetails;
                    }
                } else if (line.analyticsOverridden) {
                    processedLine.budgetAnalyticId = null;
                    processedLine.autoAssigned = false;
                    processedLine.analyticsOverridden = true;
                } else {
                    // Attempt auto-assignment
                    try {
                        const recommendation = await recommendAnalytics({
                            productId: line.productId,
                            partnerId: salesOrder.customerId,
                        });

                        if (recommendation.analyticsId) {
                            processedLine.budgetAnalyticId = recommendation.analyticsId;
                            processedLine.autoAssigned = true;
                            processedLine.autoAssignmentDetails = {
                                ruleId: recommendation.matchedRule?.id,
                                ruleName: recommendation.matchedRule?.name,
                                matchedFields: recommendation.matchedRule?.matchedFields || [],
                                explanation: recommendation.explanation,
                            };
                        }
                    } catch (error) {
                        console.error('[SalesOrder] Auto-assignment error:', error);
                    }
                }

                // Check budget
                if (processedLine.budgetAnalyticId) {
                    try {
                        const budget = await Budget.findOne({
                            'lines.analyticMasterId': processedLine.budgetAnalyticId,
                            status: 'confirmed',
                        });

                        if (budget) {
                            const budgetLine = budget.lines.find(
                                l => l.analyticMasterId.toString() === processedLine.budgetAnalyticId.toString()
                            );

                            if (budgetLine) {
                                const remaining = budgetLine.budgetedAmount - budgetLine.achievedAmount;
                                if (processedLine.lineTotal > remaining) {
                                    processedLine.exceedsBudget = true;
                                }
                            }
                        }
                    } catch (error) {
                        console.error('[SalesOrder] Budget check error:', error);
                    }
                }

                processedLines.push(processedLine);
            }

            salesOrder.lines = processedLines;
            salesOrder.orderTotal = processedLines.reduce((sum, line) => sum + line.lineTotal, 0);
        }

        await salesOrder.save();

        return res.status(200).json({
            success: true,
            message: "Sales Order updated successfully",
            data: salesOrder,
        });
    } catch (error) {
        console.error("Update sales order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating sales order",
            error: error.message,
        });
    }
};

// Confirm sales order
exports.confirmSalesOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const salesOrder = await SalesOrder.findById(id);

        if (!salesOrder) {
            return res.status(404).json({
                success: false,
                message: "Sales Order not found",
            });
        }

        if (salesOrder.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft sales orders can be confirmed",
            });
        }

        salesOrder.status = 'confirmed';
        await salesOrder.save();

        return res.status(200).json({
            success: true,
            message: "Sales Order confirmed successfully",
            data: salesOrder,
        });
    } catch (error) {
        console.error("Confirm sales order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error confirming sales order",
            error: error.message,
        });
    }
};

// Cancel sales order
exports.cancelSalesOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const salesOrder = await SalesOrder.findById(id);

        if (!salesOrder) {
            return res.status(404).json({
                success: false,
                message: "Sales Order not found",
            });
        }

        salesOrder.status = 'cancelled';
        await salesOrder.save();

        return res.status(200).json({
            success: true,
            message: "Sales Order cancelled successfully",
            data: salesOrder,
        });
    } catch (error) {
        console.error("Cancel sales order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error cancelling sales order",
            error: error.message,
        });
    }
};

// Generate PDF (will be implemented next)
exports.generateSalesOrderPDF = async (req, res) => {
    // PDF generation implementation
    res.status(501).json({ success: false, message: "PDF generation not yet implemented" });
};

// Send email (will be implemented next)
exports.sendSalesOrderEmail = async (req, res) => {
    // Email sending implementation
    res.status(501).json({ success: false, message: "Email sending not yet implemented" });
};
