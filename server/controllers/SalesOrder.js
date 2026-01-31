const SalesOrder = require("../models/SalesOrder");
const Contact = require("../models/Contact");
const PDFDocument = require('pdfkit');
const mailSender = require("../utils/mailSender");

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

        // Generate SO number
        const soNumber = await SalesOrder.getNextSoNumber();

        // Process lines
        const processedLines = lines.map(line => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.quantity * line.unitPrice,
        }));

        // Create sales order
        const salesOrder = await SalesOrder.create({
            soNumber,
            customerId,
            reference,
            soDate: soDate || new Date(),
            lines: processedLines,
            notes,
            createdBy: req.user.id,
        });

        // Ensure totals are calculated correctly
        salesOrder.calculateTotals();
        await salesOrder.save();

        // Populate the response
        await salesOrder.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

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

        // Only allow updates in draft status
        if (salesOrder.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft sales orders can be updated",
            });
        }

        // Validate customer if provided
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

            salesOrder.lines = lines.map(line => ({
                productId: line.productId,
                productName: line.productName,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.quantity * line.unitPrice,
            }));
        }

        // Update other fields
        if (reference !== undefined) salesOrder.reference = reference;
        if (soDate) salesOrder.soDate = soDate;
        if (notes !== undefined) salesOrder.notes = notes;

        // Ensure totals are calculated correctly
        salesOrder.calculateTotals();
        await salesOrder.save();

        // Populate the response
        await salesOrder.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

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

        if (salesOrder.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Sales Order is already cancelled",
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

// Generate PDF for sales order
exports.generateSalesOrderPDF = async (req, res) => {
    try {
        const { id } = req.params;

        const salesOrder = await SalesOrder.findById(id)
            .populate("customerId", "name email phone address")
            .populate("createdBy", "firstName lastName email");

        if (!salesOrder) {
            return res.status(404).json({
                success: false,
                message: "Sales Order not found",
            });
        }

        // Create PDF document
        const doc = new PDFDocument({
            margin: 40,
            size: 'A4'
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=SalesOrder-${salesOrder.soNumber.replace(/\//g, '-')}.pdf`);

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
        const primaryColor = '#3b82f6';
        const secondaryColor = '#64748b';
        const accentColor = '#eff6ff';
        const textColor = '#1e293b';

        // Header with company name and styling
        doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);

        doc.fontSize(24)
            .fillColor('white')
            .font('Helvetica-Bold')
            .text('SALES ORDER', 50, 30, { align: 'center' });

        doc.fontSize(12)
            .fillColor('white')
            .font('Helvetica')
            .text('Budget Management System', 50, 55, { align: 'center' });

        // Reset position and color
        doc.y = 120;
        doc.fillColor(textColor);

        // SO Header Section with background
        doc.rect(40, doc.y - 10, doc.page.width - 80, 70).fill(accentColor).stroke(primaryColor);

        doc.fontSize(16)
            .font('Helvetica-Bold')
            .fillColor(primaryColor)
            .text(`Sales Order #${salesOrder.soNumber}`, 60, doc.y + 10);

        doc.fontSize(11)
            .font('Helvetica')
            .fillColor(textColor)
            .text(`SO Date: ${new Date(salesOrder.soDate).toLocaleDateString()}`, 60, doc.y + 8)
            .text(`Status: ${salesOrder.status.toUpperCase()}`, 60, doc.y + 5);

        if (salesOrder.reference) {
            doc.text(`Reference: ${salesOrder.reference}`, 60, doc.y + 5);
        }

        doc.y += 50;

        // Customer Details Section
        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor(primaryColor)
            .text('CUSTOMER DETAILS', 50, doc.y);

        doc.y += 5;
        doc.rect(40, doc.y, doc.page.width - 80, 2).fill(primaryColor);
        doc.y += 15;

        doc.fontSize(11)
            .font('Helvetica')
            .fillColor(textColor);

        const customerName = salesOrder.customerId?.name || 'N/A';
        const customerEmail = salesOrder.customerId?.email || 'N/A';
        const customerPhone = salesOrder.customerId?.phone || 'N/A';
        const customerAddress = formatAddress(salesOrder.customerId?.address);

        doc.font('Helvetica-Bold').text('Name: ', 60, doc.y, { continued: true })
            .font('Helvetica').text(customerName);

        doc.font('Helvetica-Bold').text('Email: ', 60, doc.y + 5, { continued: true })
            .font('Helvetica').text(customerEmail);

        doc.font('Helvetica-Bold').text('Phone: ', 60, doc.y + 5, { continued: true })
            .font('Helvetica').text(customerPhone);

        doc.font('Helvetica-Bold').text('Address: ', 60, doc.y + 5, { continued: true })
            .font('Helvetica').text(customerAddress, { width: 400 });

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
        const qtyX = 280;
        const priceX = 360;
        const totalX = 450;

        // Table header background
        doc.rect(50, tableTop - 5, doc.page.width - 100, 25).fill(accentColor).stroke(primaryColor);

        // Table header text
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(textColor);

        doc.text('PRODUCT', itemX, tableTop + 5);
        doc.text('QTY', qtyX, tableTop + 5);
        doc.text('UNIT PRICE', priceX, tableTop + 5);
        doc.text('TOTAL', totalX, tableTop + 5);

        // Table rows
        doc.font('Helvetica');
        let yPosition = tableTop + 30;

        salesOrder.lines.forEach((line, index) => {
            // Alternate row background
            if (index % 2 === 0) {
                doc.rect(50, yPosition - 5, doc.page.width - 100, 25).fill('#fefefe').stroke();
            }

            const productName = line.productName || 'N/A';

            doc.fillColor(textColor);
            doc.text(productName, itemX, yPosition, { width: 210 });
            doc.text(line.quantity.toString(), qtyX, yPosition);
            doc.text(`₹${line.unitPrice.toFixed(2)}`, priceX, yPosition);
            doc.text(`₹${line.lineTotal.toFixed(2)}`, totalX, yPosition);

            yPosition += 30;
        });

        // Total section
        yPosition += 10;
        doc.rect(50, yPosition - 5, doc.page.width - 100, 40).fill(primaryColor);

        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('white');

        doc.text('GRAND TOTAL:', priceX - 80, yPosition + 10);
        doc.text(`₹${salesOrder.grandTotal.toFixed(2)}`, totalX, yPosition + 10);

        // Notes section
        if (salesOrder.notes && salesOrder.notes.trim() !== '') {
            doc.y = yPosition + 70;
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
                .text(salesOrder.notes, 60, doc.y, { width: 480 });
        }

        // Footer
        const footerY = doc.page.height - 60;
        doc.rect(0, footerY - 10, doc.page.width, 70).fill('#fef2f2');

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

// Send sales order to customer via email
exports.sendSalesOrderToCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const salesOrder = await SalesOrder.findById(id)
            .populate("customerId", "name email phone address")
            .populate("createdBy", "firstName lastName");

        if (!salesOrder) {
            return res.status(404).json({
                success: false,
                message: "Sales Order not found",
            });
        }

        if (!salesOrder.customerId?.email) {
            return res.status(400).json({
                success: false,
                message: "Customer email not found",
            });
        }

        // Prepare email content
        const emailSubject = `Sales Order: ${salesOrder.soNumber}`;
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6;">Sales Order</h2>
                
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <p><strong>SO Number:</strong> ${salesOrder.soNumber}</p>
                    <p><strong>SO Date:</strong> ${new Date(salesOrder.soDate).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${salesOrder.status.toUpperCase()}</p>
                    ${salesOrder.reference ? `<p><strong>Reference:</strong> ${salesOrder.reference}</p>` : ''}
                </div>

                <h3 style="color: #3b82f6;">Customer Details</h3>
                <p><strong>Name:</strong> ${salesOrder.customerId.name}</p>

                <h3 style="color: #3b82f6;">Products</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #3b82f6; color: white;">
                            <th style="padding: 10px; text-align: left;">Product</th>
                            <th style="padding: 10px; text-align: center;">Quantity</th>
                            <th style="padding: 10px; text-align: right;">Unit Price</th>
                            <th style="padding: 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${salesOrder.lines.map(line => `
                            <tr style="border-bottom: 1px solid #ddd;">
                                <td style="padding: 10px;">${line.productName || 'N/A'}</td>
                                <td style="padding: 10px; text-align: center;">${line.quantity}</td>
                                <td style="padding: 10px; text-align: right;">₹${line.unitPrice.toFixed(2)}</td>
                                <td style="padding: 10px; text-align: right;">₹${line.lineTotal.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="background-color: #3b82f6; color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <table style="width: 100%; color: white;">
                        <tr><td><strong>Grand Total:</strong></td><td style="text-align: right;"><strong>₹${salesOrder.grandTotal.toFixed(2)}</strong></td></tr>
                    </table>
                </div>

                ${salesOrder.notes ? `<p><strong>Notes:</strong> ${salesOrder.notes}</p>` : ''}

                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated email. Please do not reply directly to this message.
                </p>
            </div>
        `;

        // Send email
        const emailResult = await mailSender(
            salesOrder.customerId.email,
            emailSubject,
            emailBody
        );

        // Check if email sending failed
        if (typeof emailResult === 'string' && emailResult.includes('error')) {
            console.warn("Email sending failed:", emailResult);
            return res.status(200).json({
                success: true,
                message: "Sales Order processed successfully, but email could not be sent. Please send manually.",
                data: salesOrder,
                emailError: emailResult,
            });
        }

        // Update sales order
        salesOrder.sentToCustomer = true;
        salesOrder.sentDate = new Date();
        await salesOrder.save();

        return res.status(200).json({
            success: true,
            message: `Sales Order sent to ${salesOrder.customerId.email}`,
            data: salesOrder,
        });
    } catch (error) {
        console.error("Send email error:", error);
        return res.status(500).json({
            success: false,
            message: "Error sending sales order",
            error: error.message,
        });
    }
};
