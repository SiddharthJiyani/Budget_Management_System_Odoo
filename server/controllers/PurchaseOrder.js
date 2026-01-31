const PurchaseOrder = require("../models/PurchaseOrder");
const Contact = require("../models/Contact");
const AnalyticMaster = require("../models/AnalyticMaster");
const Budget = require("../models/Budget");
const PDFDocument = require('pdfkit');
const mailSender = require("../utils/mailSender");

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

        // Calculate line totals
        const processedLines = lines.map(line => ({
            productId: line.productId || null,
            productName: line.productName || '',
            budgetAnalyticId: line.budgetAnalyticId || null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.quantity * line.unitPrice,
            exceedsBudget: line.exceedsBudget || false,
        }));

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

            purchaseOrder.lines = lines.map(line => ({
                productId: line.productId || null,
                productName: line.productName || '',
                budgetAnalyticId: line.budgetAnalyticId || null,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.quantity * line.unitPrice,
                exceedsBudget: line.exceedsBudget || false,
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
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=PO-${purchaseOrder.poNumber}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Add company header
        doc.fontSize(20).text('PURCHASE ORDER', { align: 'center' });
        doc.moveDown();

        // PO Details
        doc.fontSize(12);
        doc.text(`PO Number: ${purchaseOrder.poNumber}`, { continued: false });
        doc.text(`Date: ${new Date(purchaseOrder.poDate).toLocaleDateString()}`, { continued: false });
        doc.text(`Status: ${purchaseOrder.status.toUpperCase()}`, { continued: false });
        if (purchaseOrder.reference) {
            doc.text(`Reference: ${purchaseOrder.reference}`, { continued: false });
        }
        doc.moveDown();

        // Vendor Details
        doc.fontSize(14).text('Vendor Details:', { underline: true });
        doc.fontSize(11);
        doc.text(`Name: ${purchaseOrder.vendorId?.name || 'N/A'}`);
        doc.text(`Email: ${purchaseOrder.vendorId?.email || 'N/A'}`);
        doc.text(`Phone: ${purchaseOrder.vendorId?.phone || 'N/A'}`);
        if (purchaseOrder.vendorId?.address) {
            doc.text(`Address: ${purchaseOrder.vendorId.address}`);
        }
        doc.moveDown(2);

        // Products Table Header
        doc.fontSize(14).text('Products:', { underline: true });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const itemX = 50;
        const qtyX = 250;
        const priceX = 320;
        const totalX = 400;

        // Table header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Product', itemX, tableTop);
        doc.text('Qty', qtyX, tableTop);
        doc.text('Unit Price', priceX, tableTop);
        doc.text('Total', totalX, tableTop);

        // Draw line
        doc.moveTo(itemX, tableTop + 15).lineTo(500, tableTop + 15).stroke();

        // Table rows
        doc.font('Helvetica');
        let yPosition = tableTop + 25;

        purchaseOrder.lines.forEach((line, index) => {
            const productName = line.productName || line.productId?.name || 'N/A';
            doc.text(productName, itemX, yPosition, { width: 180 });
            doc.text(line.quantity.toString(), qtyX, yPosition);
            doc.text(`${line.unitPrice.toFixed(2)}`, priceX, yPosition);
            doc.text(`${line.lineTotal.toFixed(2)}`, totalX, yPosition);
            yPosition += 30;
        });

        // Draw line before total
        doc.moveTo(itemX, yPosition).lineTo(500, yPosition).stroke();
        yPosition += 15;

        // Grand Total
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Grand Total:', priceX - 50, yPosition);
        doc.text(`${purchaseOrder.grandTotal.toFixed(2)}`, totalX, yPosition);

        // Notes
        if (purchaseOrder.notes) {
            doc.moveDown(2);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Notes: ${purchaseOrder.notes}`);
        }

        // Footer
        doc.fontSize(8).text(
            `Generated on ${new Date().toLocaleString()}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );

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
