const PurchaseOrder = require("../models/PurchaseOrder");
const Contact = require("../models/Contact");
const AnalyticMaster = require("../models/AnalyticMaster");
const Budget = require("../models/Budget");
const PDFDocument = require('pdfkit');
const mailSender = require("../utils/mailSender");
const Product = require("../models/Product");
const { recommendAnalytics } = require("../services/AutoAnalyticalService");

// Create Purchase Order
exports.createPurchaseOrder = async (req, res) => {
    try {
        const { vendorId, reference, poDate, lines } = req.body;

        // Validate vendor exists
        if (!vendorId) {
            return res.status(400).json({
                success: false,
                message: "Vendor is required",
            });
        }

        const vendor = await Contact.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found",
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
            // Validate product name is provided
            if (!line.productName || line.productName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required for each line item",
                });
            }

            // Validate quantity
            if (!line.quantity || line.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be greater than 0",
                });
            }

            // Validate unit price
            if (line.unitPrice === undefined || line.unitPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Unit price cannot be negative",
                });
            }
        }

        // Generate PO number
        const poNumber = await PurchaseOrder.getNextPoNumber();

        // Process lines with auto-analytics assignment
        // For each line without a manually specified budgetAnalyticId,
        // we attempt to auto-assign based on configured rules
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
                // User manually selected - no auto-assignment
                processedLine.budgetAnalyticId = line.budgetAnalyticId;
                processedLine.autoAssigned = false;
                console.log(`[PurchaseOrder] Line for product ${line.productId}: User provided analytics ${line.budgetAnalyticId}`);
            } else {
                // No analytics provided - attempt auto-assignment
                try {
                    const recommendation = await recommendAnalytics({
                        productId: line.productId,
                        partnerId: vendorId,
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
                        console.log(`[PurchaseOrder] Line for product ${line.productId}: Auto-assigned analytics - ${recommendation.explanation}`);
                    } else {
                        // No matching rule found - leave null
                        processedLine.budgetAnalyticId = null;
                        console.log(`[PurchaseOrder] Line for product ${line.productId}: No auto-assignment - ${recommendation.explanation}`);
                    }
                } catch (autoAssignError) {
                    console.error(`[PurchaseOrder] Auto-assignment error for product ${line.productId}:`, autoAssignError);
                    // On error, leave analytics null - don't block PO creation
                    processedLine.budgetAnalyticId = null;
                }
            }

            processedLines.push(processedLine);
        }

        const purchaseOrder = await PurchaseOrder.create({
            poNumber,
            vendorId,
            reference: reference || "",
            poDate: poDate || new Date(),
            lines: processedLines,
            status: "draft",
            createdBy: req.user.id,
        });

        // Calculate and save grand total
        purchaseOrder.calculateTotals();
        await purchaseOrder.save();

        // Populate references
        await purchaseOrder.populate([
            { path: "vendorId", select: "name email phone" },
            { path: "lines.productId", select: "name purchasePrice" },
            { path: "lines.budgetAnalyticId", select: "name type" },
            { path: "createdBy", select: "firstName lastName email" },
        ]);

        return res.status(201).json({
            success: true,
            message: "Purchase Order created successfully",
            data: purchaseOrder,
        });
    } catch (error) {
        console.error("Create purchase order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating purchase order",
            error: error.message,
        });
    }
};

// Get all purchase orders with filtering
exports.getAllPurchaseOrders = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        let query = { createdBy: req.user.id };

        if (status && status !== "all") {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { poNumber: { $regex: search, $options: "i" } },
                { reference: { $regex: search, $options: "i" } },
            ];
        }

        const purchaseOrders = await PurchaseOrder.find(query)
            .populate("vendorId", "name email phone")
            .populate("createdBy", "firstName lastName email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await PurchaseOrder.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Purchase orders retrieved successfully",
            data: {
                purchaseOrders,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalPurchaseOrders: count,
            },
        });
    } catch (error) {
        console.error("Get purchase orders error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving purchase orders",
            error: error.message,
        });
    }
};

// Get purchase order by ID
exports.getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const purchaseOrder = await PurchaseOrder.findById(id)
            .populate("vendorId", "name email phone address")
            .populate("lines.productId", "name purchasePrice salesPrice category")
            .populate("lines.budgetAnalyticId", "name description type")
            .populate("createdBy", "firstName lastName email");

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Purchase Order retrieved successfully",
            data: purchaseOrder,
        });
    } catch (error) {
        console.error("Get purchase order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving purchase order",
            error: error.message,
        });
    }
};

// Update purchase order (only draft)
exports.updatePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId, reference, poDate, lines } = req.body;

        const purchaseOrder = await PurchaseOrder.findById(id);
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        // Only draft POs can be edited
        if (purchaseOrder.status !== "draft") {
            return res.status(400).json({
                success: false,
                message: "Only draft Purchase Orders can be edited",
            });
        }

        // Validate vendor if provided
        if (vendorId) {
            const vendor = await Contact.findById(vendorId);
            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: "Vendor not found",
                });
            }
            purchaseOrder.vendorId = vendorId;
        }

        // Validate lines if provided
        if (lines && Array.isArray(lines)) {
            for (const line of lines) {
                // Validate product name is provided
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
                if (line.unitPrice === undefined || line.unitPrice < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Unit price cannot be negative",
                    });
                }
            }

            // Process lines with override detection
            // If a line was auto-assigned and user changes analytics, mark as overridden
            const existingLinesMap = new Map();
            purchaseOrder.lines.forEach((line, index) => {
                existingLinesMap.set(line._id?.toString(), {
                    index,
                    autoAssigned: line.autoAssigned,
                    budgetAnalyticId: line.budgetAnalyticId?.toString(),
                });
            });

            purchaseOrder.lines = await Promise.all(lines.map(async (line, index) => {
                const existingLine = existingLinesMap.get(line._id?.toString());

                const processedLine = {
                    productId: line.productId,
                    productName: line.productName || '',
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: line.quantity * line.unitPrice,
                    exceedsBudget: line.exceedsBudget || false,
                };

                // Handle analytics assignment and override detection
                if (line.budgetAnalyticId) {
                    processedLine.budgetAnalyticId = line.budgetAnalyticId;

                    // Check if this is a manual override of an auto-assigned value
                    if (existingLine?.autoAssigned &&
                        existingLine.budgetAnalyticId !== line.budgetAnalyticId) {
                        processedLine.autoAssigned = false;
                        processedLine.analyticsOverridden = true;
                        processedLine.autoAssignmentDetails = null; // Clear old details
                        console.log(`[PurchaseOrder] Line ${index}: Manual override - changed from auto-assigned ${existingLine.budgetAnalyticId} to ${line.budgetAnalyticId}`);
                    } else if (existingLine) {
                        // Preserve existing flags
                        processedLine.autoAssigned = existingLine.autoAssigned || false;
                        processedLine.analyticsOverridden = line.analyticsOverridden || false;
                        processedLine.autoAssignmentDetails = line.autoAssignmentDetails;
                    } else {
                        // New line with manual analytics
                        processedLine.autoAssigned = false;
                        processedLine.analyticsOverridden = false;
                    }
                } else if (line.analyticsOverridden) {
                    // Line was previously overridden, don't auto-assign again
                    processedLine.budgetAnalyticId = null;
                    processedLine.autoAssigned = false;
                    processedLine.analyticsOverridden = true;
                } else {
                    // No analytics and not overridden - try auto-assignment
                    try {
                        const recommendation = await recommendAnalytics({
                            productId: line.productId,
                            partnerId: vendorId || purchaseOrder.vendorId,
                        });

                        if (recommendation.analyticsId) {
                            processedLine.budgetAnalyticId = recommendation.analyticsId;
                            processedLine.autoAssigned = true;
                            processedLine.analyticsOverridden = false;
                            processedLine.autoAssignmentDetails = {
                                ruleId: recommendation.matchedRule?.id,
                                ruleName: recommendation.matchedRule?.name,
                                matchedFields: recommendation.matchedRule?.matchedFields || [],
                                explanation: recommendation.explanation,
                            };
                        } else {
                            processedLine.budgetAnalyticId = null;
                            processedLine.autoAssigned = false;
                        }
                    } catch (err) {
                        console.error(`[PurchaseOrder] Auto-assignment error during update:`, err);
                        processedLine.budgetAnalyticId = null;
                    }
                }

                return processedLine;
            }));
        }

        if (reference !== undefined) purchaseOrder.reference = reference;
        if (poDate) purchaseOrder.poDate = poDate;

        // Recalculate totals
        purchaseOrder.calculateTotals();
        await purchaseOrder.save();

        await purchaseOrder.populate([
            { path: "vendorId", select: "name email phone" },
            { path: "lines.productId", select: "name purchasePrice" },
            { path: "lines.budgetAnalyticId", select: "name type" },
            { path: "createdBy", select: "firstName lastName email" },
        ]);

        return res.status(200).json({
            success: true,
            message: "Purchase Order updated successfully",
            data: purchaseOrder,
        });
    } catch (error) {
        console.error("Update purchase order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating purchase order",
            error: error.message,
        });
    }
};

// Confirm purchase order
exports.confirmPurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const purchaseOrder = await PurchaseOrder.findById(id);
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        if (purchaseOrder.status !== "draft") {
            return res.status(400).json({
                success: false,
                message: "Only draft Purchase Orders can be confirmed",
            });
        }

        purchaseOrder.status = "confirmed";
        await purchaseOrder.save();

        return res.status(200).json({
            success: true,
            message: "Purchase Order confirmed successfully",
            data: purchaseOrder,
        });
    } catch (error) {
        console.error("Confirm purchase order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error confirming purchase order",
            error: error.message,
        });
    }
};

// Cancel purchase order
exports.cancelPurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const purchaseOrder = await PurchaseOrder.findById(id);
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        if (purchaseOrder.status !== "draft") {
            return res.status(400).json({
                success: false,
                message: "Only draft Purchase Orders can be cancelled",
            });
        }

        purchaseOrder.status = "cancelled";
        await purchaseOrder.save();

        return res.status(200).json({
            success: true,
            message: "Purchase Order cancelled successfully",
            data: purchaseOrder,
        });
    } catch (error) {
        console.error("Cancel purchase order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error cancelling purchase order",
            error: error.message,
        });
    }
};

// Delete (archive) purchase order
exports.deletePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const purchaseOrder = await PurchaseOrder.findById(id);
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        // Soft delete - set status to cancelled
        purchaseOrder.status = "cancelled";
        await purchaseOrder.save();

        return res.status(200).json({
            success: true,
            message: "Purchase Order deleted successfully",
            data: purchaseOrder,
        });
    } catch (error) {
        console.error("Delete purchase order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting purchase order",
            error: error.message,
        });
    }
};

// Auto-assign analytics category (simulated - will be replaced by ML model)
exports.autoAssignAnalytics = async (req, res) => {
    try {
        const { productName, amount } = req.body;

        // Get all active analytics categories
        const analyticsCategories = await AnalyticMaster.find({
            status: { $ne: 'archived' }
        });

        if (analyticsCategories.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No analytics categories found",
            });
        }

        // SIMULATION: Randomly select an analytics category
        // TODO: Replace with Auto Analytical Model ML prediction
        const randomIndex = Math.floor(Math.random() * analyticsCategories.length);
        const selectedCategory = analyticsCategories[randomIndex];

        // Check if amount exceeds remaining budget
        let exceedsBudget = false;
        let remainingBudget = 0;

        // Get budgets that include this analytics category
        const budgets = await Budget.find({
            'lines.analyticMasterId': selectedCategory._id,
            status: { $in: ['confirmed', 'revised'] },
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        if (budgets.length > 0) {
            // Get the line for this analytics from the first matching budget
            const budgetLine = budgets[0].lines.find(
                line => line.analyticMasterId.toString() === selectedCategory._id.toString()
            );

            if (budgetLine) {
                remainingBudget = budgetLine.budgetedAmount - budgetLine.achievedAmount;
                exceedsBudget = amount > remainingBudget;
            }
        }

        return res.status(200).json({
            success: true,
            message: "Analytics category assigned",
            data: {
                analyticsCategory: selectedCategory,
                exceedsBudget,
                remainingBudget,
                allocatedAmount: amount,
            },
        });
    } catch (error) {
        console.error("Auto assign analytics error:", error);
        return res.status(500).json({
            success: false,
            message: "Error assigning analytics category",
            error: error.message,
        });
    }
};

// Generate PDF for purchase order
exports.generatePurchaseOrderPDF = async (req, res) => {
    try {
        const { id } = req.params;

        const purchaseOrder = await PurchaseOrder.findById(id)
            .populate("vendorId", "name email phone address")
            .populate("lines.productId", "name")
            .populate("lines.budgetAnalyticId", "name")
            .populate("createdBy", "firstName lastName email");

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        // Create PDF document
        const doc = new PDFDocument({ 
            margin: 40,
            size: 'A4'
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=PO-${purchaseOrder.poNumber}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Helper function to format address
        const formatAddress = (address) => {
            if (!address) return 'N/A';
            if (typeof address === 'string') return address;
            
            const parts = [
                address.street,
                address.city,
                address.state,
                address.country,
                address.pincode
            ].filter(part => part && part.trim() !== '');
            
            return parts.join(', ');
        };

        // Color theme
        const primaryColor = '#2563eb';
        const secondaryColor = '#64748b';
        const accentColor = '#f8fafc';
        const textColor = '#1e293b';

        // Header with company name and styling
        doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
        
        doc.fontSize(24)
           .fillColor('white')
           .font('Helvetica-Bold')
           .text('PURCHASE ORDER', 50, 30, { align: 'center' });

        doc.fontSize(12)
           .fillColor('white')
           .font('Helvetica')
           .text('Budget Management System', 50, 55, { align: 'center' });

        // Reset position and color
        doc.y = 120;
        doc.fillColor(textColor);

        // PO Header Section with background
        doc.rect(40, doc.y - 10, doc.page.width - 80, 60).fill(accentColor).stroke('#e2e8f0');
        
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text(`PO #${purchaseOrder.poNumber}`, 60, doc.y + 10);
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor(textColor)
           .text(`Date: ${new Date(purchaseOrder.poDate).toLocaleDateString()}`, 60, doc.y + 8)
           .text(`Status: ${purchaseOrder.status.toUpperCase()}`, 60, doc.y + 5);
        
        if (purchaseOrder.reference) {
            doc.text(`Reference: ${purchaseOrder.reference}`, 60, doc.y + 5);
        }

        doc.y += 40;

        // Vendor Details Section
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text('VENDOR DETAILS', 50, doc.y);
        
        doc.y += 5;
        doc.rect(40, doc.y, doc.page.width - 80, 2).fill(primaryColor);
        doc.y += 15;

        doc.fontSize(11)
           .font('Helvetica')
           .fillColor(textColor);
        
        const vendorName = purchaseOrder.vendorId?.name || 'N/A';
        const vendorEmail = purchaseOrder.vendorId?.email || 'N/A';
        const vendorPhone = purchaseOrder.vendorId?.phone || 'N/A';
        const vendorAddress = formatAddress(purchaseOrder.vendorId?.address);

        doc.font('Helvetica-Bold').text('Name: ', 60, doc.y, { continued: true })
           .font('Helvetica').text(vendorName);
        
        doc.font('Helvetica-Bold').text('Email: ', 60, doc.y + 5, { continued: true })
           .font('Helvetica').text(vendorEmail);
        
        doc.font('Helvetica-Bold').text('Phone: ', 60, doc.y + 5, { continued: true })
           .font('Helvetica').text(vendorPhone);
        
        doc.font('Helvetica-Bold').text('Address: ', 60, doc.y + 5, { continued: true })
           .font('Helvetica').text(vendorAddress, { width: 400 });

        doc.y += 40;

        // Products Section
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text('PRODUCTS', 50, doc.y);
        
        doc.y += 5;
        doc.rect(40, doc.y, doc.page.width - 80, 2).fill(primaryColor);
        doc.y += 20;

        // Table setup
        const tableTop = doc.y;
        const itemX = 60;
        const analyticsX = 200;
        const qtyX = 320;
        const priceX = 380;
        const totalX = 450;

        // Table header background
        doc.rect(50, tableTop - 5, doc.page.width - 100, 25).fill('#f1f5f9').stroke('#e2e8f0');

        // Table header text
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(textColor);
        
        doc.text('PRODUCT', itemX, tableTop + 5);
        doc.text('ANALYTICS', analyticsX, tableTop + 5);
        doc.text('QTY', qtyX, tableTop + 5);
        doc.text('UNIT PRICE', priceX, tableTop + 5);
        doc.text('TOTAL', totalX, tableTop + 5);

        // Table rows
        doc.font('Helvetica');
        let yPosition = tableTop + 30;

        purchaseOrder.lines.forEach((line, index) => {
            // Alternate row background
            if (index % 2 === 0) {
                doc.rect(50, yPosition - 5, doc.page.width - 100, 25).fill('#fefefe').stroke();
            }

            const productName = line.productName || 'N/A';
            const analyticsName = line.budgetAnalyticId?.name || 'N/A';
            
            doc.fillColor(textColor);
            doc.text(productName, itemX, yPosition, { width: 130 });
            doc.text(analyticsName, analyticsX, yPosition, { width: 110 });
            doc.text(line.quantity.toString(), qtyX, yPosition);
            doc.text(`₹${line.unitPrice.toFixed(2)}`, priceX, yPosition);
            doc.text(`₹${line.lineTotal.toFixed(2)}`, totalX, yPosition);
            
            // Warning for budget exceeded
            if (line.exceedsBudget) {
                doc.fontSize(8)
                   .fillColor('#dc2626')
                   .text('⚠ Exceeds Budget', itemX, yPosition + 12);
                doc.fontSize(10).fillColor(textColor);
            }
            
            yPosition += 30;
        });

        // Total section
        yPosition += 10;
        doc.rect(50, yPosition - 5, doc.page.width - 100, 30).fill(primaryColor);
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('white')
           .text('GRAND TOTAL:', priceX - 60, yPosition + 8);
        
        doc.fontSize(14)
           .text(`₹${purchaseOrder.grandTotal.toFixed(2)}`, totalX, yPosition + 6);

        // Notes section
        if (purchaseOrder.notes && purchaseOrder.notes.trim() !== '') {
            doc.y = yPosition + 50;
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor(primaryColor)
               .text('NOTES', 50, doc.y);
            
            doc.y += 5;
            doc.rect(40, doc.y, doc.page.width - 80, 2).fill(primaryColor);
            doc.y += 15;
            
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(textColor)
               .text(purchaseOrder.notes, 60, doc.y, { width: 480 });
        }

        // Footer
        const footerY = doc.page.height - 60;
        doc.rect(0, footerY - 10, doc.page.width, 70).fill('#f8fafc');
        
        doc.fontSize(8)
           .fillColor(secondaryColor)
           .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY, { align: 'center' })
           .text('This is a computer-generated document.', 50, footerY + 15, { align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error("Generate PDF error:", error);
        return res.status(500).json({
            success: false,
            message: "Error generating PDF",
            error: error.message,
        });
    }
};

// Send purchase order to vendor via email
exports.sendPurchaseOrderToVendor = async (req, res) => {
    try {
        const { id } = req.params;

        const purchaseOrder = await PurchaseOrder.findById(id)
            .populate("vendorId", "name email phone address")
            .populate("lines.productId", "name")
            .populate("createdBy", "firstName lastName");

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        if (!purchaseOrder.vendorId?.email) {
            return res.status(400).json({
                success: false,
                message: "Vendor email not found",
            });
        }

        // Prepare email content
        const emailSubject = `Purchase Order: ${purchaseOrder.poNumber}`;
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Purchase Order</h2>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>PO Number:</strong> ${purchaseOrder.poNumber}</p>
                    <p><strong>Date:</strong> ${new Date(purchaseOrder.poDate).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${purchaseOrder.status.toUpperCase()}</p>
                    ${purchaseOrder.reference ? `<p><strong>Reference:</strong> ${purchaseOrder.reference}</p>` : ''}
                </div>

                <h3 style="color: #333;">Vendor Details</h3>
                <p><strong>Name:</strong> ${purchaseOrder.vendorId.name}</p>

                <h3 style="color: #333;">Products</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #333; color: white;">
                            <th style="padding: 10px; text-align: left;">Product</th>
                            <th style="padding: 10px; text-align: center;">Quantity</th>
                            <th style="padding: 10px; text-align: right;">Unit Price</th>
                            <th style="padding: 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchaseOrder.lines.map(line => `
                            <tr style="border-bottom: 1px solid #ddd;">
                                <td style="padding: 10px;">${line.productName || line.productId?.name || 'N/A'}</td>
                                <td style="padding: 10px; text-align: center;">${line.quantity}</td>
                                <td style="padding: 10px; text-align: right;">${line.unitPrice.toFixed(2)}</td>
                                <td style="padding: 10px; text-align: right;">${line.lineTotal.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f5f5f5; font-weight: bold;">
                            <td colspan="3" style="padding: 10px; text-align: right;">Grand Total:</td>
                            <td style="padding: 10px; text-align: right;">${purchaseOrder.grandTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                ${purchaseOrder.notes ? `<p><strong>Notes:</strong> ${purchaseOrder.notes}</p>` : ''}

                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated email. Please do not reply directly to this message.
                </p>
            </div>
        `;

        // Send email
        const emailResult = await mailSender(
            purchaseOrder.vendorId.email,
            emailSubject,
            emailBody
        );

        // Check if email sending failed
        if (typeof emailResult === 'string' && emailResult.includes('error')) {
            console.warn("Email sending failed:", emailResult);
            return res.status(200).json({
                success: true,
                message: "Purchase Order processed successfully, but email could not be sent. Please send manually.",
                data: purchaseOrder,
                emailError: emailResult,
            });
        }

        // Update purchase order
        purchaseOrder.sentToVendor = true;
        purchaseOrder.sentDate = new Date();
        await purchaseOrder.save();

        return res.status(200).json({
            success: true,
            message: `Purchase Order sent to ${purchaseOrder.vendorId.email}`,
            data: purchaseOrder,
        });
    } catch (error) {
        console.error("Send email error:", error);
        return res.status(500).json({
            success: false,
            message: "Error sending purchase order",
            error: error.message,
        });
    }
};
