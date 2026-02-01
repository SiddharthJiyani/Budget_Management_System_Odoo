const CustomerInvoice = require("../models/CustomerInvoice");
const Contact = require("../models/Contact");
const AnalyticMaster = require("../models/AnalyticMaster");
const PDFDocument = require('pdfkit');
const mailSender = require("../utils/mailSender");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Customer Invoice
exports.createCustomerInvoice = async (req, res) => {
    try {
        const { customerId, invoiceDate, dueDate, reference, lines, notes } = req.body;

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

            if (line.unitPrice === undefined || line.unitPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Unit price cannot be negative",
                });
            }
        }

        // Validate dates
        if (!dueDate) {
            return res.status(400).json({
                success: false,
                message: "Due date is required",
            });
        }

        // Generate invoice number
        const invoiceNo = await CustomerInvoice.getNextInvoiceNumber();

        // Process lines
        const processedLines = lines.map(line => ({
            productName: line.productName,
            budgetAnalyticId: line.budgetAnalyticId || null,
            quantity: parseFloat(line.quantity),
            unitPrice: parseFloat(line.unitPrice),
        }));

        // Create customer invoice
        const customerInvoice = await CustomerInvoice.create({
            invoiceNo,
            customerId,
            invoiceDate: invoiceDate || new Date(),
            dueDate: new Date(dueDate),
            reference,
            lines: processedLines,
            notes,
            createdBy: req.user.id,
        });

        // Ensure totals are calculated correctly
        customerInvoice.calculateTotals();
        await customerInvoice.save();

        // Populate the response
        await customerInvoice.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name code' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(201).json({
            success: true,
            message: "Customer Invoice created successfully",
            data: customerInvoice,
        });
    } catch (error) {
        console.error("Create customer invoice error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating customer invoice",
            error: error.message,
        });
    }
};

// Get all Customer Invoices with filtering
exports.getAllCustomerInvoices = async (req, res) => {
    try {
        const { status, paymentStatus, search, page = 1, limit = 50 } = req.query;

        // Build query
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (paymentStatus && paymentStatus !== 'all') {
            query.paymentStatus = paymentStatus;
        }

        if (search) {
            query.$or = [
                { invoiceNo: { $regex: search, $options: 'i' } },
                { reference: { $regex: search, $options: 'i' } },
            ];
        }

        // Execute query with pagination
        const customerInvoices = await CustomerInvoice.find(query)
            .populate('customerId', 'name email phone address')
            .populate('lines.budgetAnalyticId', 'name code')
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await CustomerInvoice.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Customer Invoices retrieved successfully",
            data: {
                customerInvoices,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalInvoices: count,
            },
        });
    } catch (error) {
        console.error("Get customer invoices error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving customer invoices",
            error: error.message,
        });
    }
};

// Get Customer Invoice by ID
exports.getCustomerInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const customerInvoice = await CustomerInvoice.findById(id)
            .populate('customerId', 'name email phone address')
            .populate('lines.budgetAnalyticId', 'name code')
            .populate('createdBy', 'firstName lastName email');

        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer Invoice retrieved successfully",
            data: customerInvoice,
        });
    } catch (error) {
        console.error("Get customer invoice error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving customer invoice",
            error: error.message,
        });
    }
};

// Update Customer Invoice (only in draft status)
exports.updateCustomerInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerId, invoiceDate, dueDate, reference, lines, notes } = req.body;

        const customerInvoice = await CustomerInvoice.findById(id);
        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        // Only allow updates in draft status
        if (customerInvoice.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft invoices can be updated",
            });
        }

        // Validate customer if provided
        if (customerId && customerId !== customerInvoice.customerId.toString()) {
            const customer = await Contact.findById(customerId);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }
            customerInvoice.customerId = customerId;
        }

        // Update fields
        if (invoiceDate) customerInvoice.invoiceDate = new Date(invoiceDate);
        if (dueDate) customerInvoice.dueDate = new Date(dueDate);
        if (reference !== undefined) customerInvoice.reference = reference;
        if (notes !== undefined) customerInvoice.notes = notes;

        // Update lines if provided
        if (lines && Array.isArray(lines)) {
            // Validate lines
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
                if (line.unitPrice === undefined || line.unitPrice < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Unit price cannot be negative",
                    });
                }
            }

            customerInvoice.lines = lines.map(line => ({
                productName: line.productName,
                budgetAnalyticId: line.budgetAnalyticId || null,
                quantity: parseFloat(line.quantity),
                unitPrice: parseFloat(line.unitPrice),
            }));
        }

        // Recalculate totals
        customerInvoice.calculateTotals();
        await customerInvoice.save();

        // Populate the response
        await customerInvoice.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name code' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(200).json({
            success: true,
            message: "Customer Invoice updated successfully",
            data: customerInvoice,
        });
    } catch (error) {
        console.error("Update customer invoice error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating customer invoice",
            error: error.message,
        });
    }
};

// Confirm Customer Invoice
exports.confirmCustomerInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const customerInvoice = await CustomerInvoice.findById(id);
        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        if (customerInvoice.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft invoices can be confirmed",
            });
        }

        customerInvoice.status = 'confirmed';
        await customerInvoice.save();

        await customerInvoice.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name code' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(200).json({
            success: true,
            message: "Customer Invoice confirmed successfully",
            data: customerInvoice,
        });
    } catch (error) {
        console.error("Confirm customer invoice error:", error);
        return res.status(500).json({
            success: false,
            message: "Error confirming customer invoice",
            error: error.message,
        });
    }
};

// Cancel Customer Invoice
exports.cancelCustomerInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const customerInvoice = await CustomerInvoice.findById(id);
        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        if (customerInvoice.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Invoice is already cancelled",
            });
        }

        customerInvoice.status = 'cancelled';
        await customerInvoice.save();

        await customerInvoice.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name code' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(200).json({
            success: true,
            message: "Customer Invoice cancelled successfully",
            data: customerInvoice,
        });
    } catch (error) {
        console.error("Cancel customer invoice error:", error);
        return res.status(500).json({
            success: false,
            message: "Error cancelling customer invoice",
            error: error.message,
        });
    }
};

// Generate PDF for Customer Invoice
exports.generateCustomerInvoicePDF = async (req, res) => {
    try {
        const { id } = req.params;

        const customerInvoice = await CustomerInvoice.findById(id)
            .populate("customerId", "name email phone address")
            .populate("lines.budgetAnalyticId", "name code")
            .populate("createdBy", "firstName lastName email");

        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=CustomerInvoice-${customerInvoice.invoiceNo.replace(/\//g, '-')}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Add company branding
        doc.fontSize(20).fillColor('#2563eb').text('Your Company Name', { align: 'center' });
        doc.fontSize(10).fillColor('#64748b').text('123 Business Street, City, State 12345', { align: 'center' });
        doc.text('Email: info@company.com | Phone: (123) 456-7890', { align: 'center' });
        doc.moveDown(2);

        // Document title
        doc.fontSize(24).fillColor('#1e293b').text('CUSTOMER INVOICE', { align: 'center', underline: true });
        doc.moveDown(2);

        // Invoice details
        doc.fontSize(12).fillColor('#1e293b');
        const leftColumn = 50;
        const rightColumn = 350;
        let yPosition = doc.y;

        doc.text(`Invoice No:`, leftColumn, yPosition);
        doc.text(customerInvoice.invoiceNo, leftColumn + 100, yPosition);

        doc.text(`Invoice Date:`, rightColumn, yPosition);
        doc.text(new Date(customerInvoice.invoiceDate).toLocaleDateString(), rightColumn + 100, yPosition);

        yPosition += 20;
        doc.text(`Customer:`, leftColumn, yPosition);
        doc.text(customerInvoice.customerId?.name || 'N/A', leftColumn + 100, yPosition);

        doc.text(`Due Date:`, rightColumn, yPosition);
        doc.text(new Date(customerInvoice.dueDate).toLocaleDateString(), rightColumn + 100, yPosition);

        if (customerInvoice.reference) {
            yPosition += 20;
            doc.text(`Reference:`, leftColumn, yPosition);
            doc.text(customerInvoice.reference, leftColumn + 100, yPosition);
        }

        yPosition += 20;
        doc.text(`Status:`, leftColumn, yPosition);
        doc.fillColor(customerInvoice.status === 'confirmed' ? '#16a34a' : '#94a3b8')
            .text(customerInvoice.status.toUpperCase(), leftColumn + 100, yPosition);

        doc.fillColor('#1e293b').text(`Payment Status:`, rightColumn, yPosition);
        doc.fillColor(customerInvoice.paymentStatus === 'paid' ? '#16a34a' : '#dc2626')
            .text(customerInvoice.paymentStatus.toUpperCase().replace('_', ' '), rightColumn + 100, yPosition);

        doc.moveDown(2);

        // Line items table
        const tableTop = doc.y;
        doc.fillColor('#1e293b').fontSize(10);

        // Table headers
        doc.rect(50, tableTop, 495, 25).fillAndStroke('#e2e8f0', '#cbd5e1');
        doc.fillColor('#1e293b').fontSize(10).text('Sr.', 60, tableTop + 8);
        doc.text('Product', 100, tableTop + 8);
        doc.text('Qty', 300, tableTop + 8);
        doc.text('Unit Price', 350, tableTop + 8);
        doc.text('Total', 470, tableTop + 8);

        // Table rows
        let rowTop = tableTop + 30;
        customerInvoice.lines.forEach((line, index) => {
            doc.fillColor('#1e293b').fontSize(9);
            doc.text(index + 1, 60, rowTop);
            doc.text(line.productName, 100, rowTop, { width: 180 });
            doc.text(line.quantity, 300, rowTop);
            doc.text(`₹${line.unitPrice.toFixed(2)}`, 350, rowTop);
            doc.text(`₹${line.lineTotal.toFixed(2)}`, 470, rowTop);
            rowTop += 25;
        });

        // Total section
        doc.moveDown();
        const totalY = rowTop + 10;
        doc.rect(350, totalY, 195, 25).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold');
        doc.text('Grand Total:', 360, totalY + 7);
        doc.text(`₹${customerInvoice.grandTotal.toFixed(2)}/-`, 470, totalY + 7);

        // Payment summary
        if (customerInvoice.paidViaCash > 0 || customerInvoice.paidViaBank > 0) {
            doc.moveDown();
            const paymentY = doc.y;
            doc.font('Helvetica').fontSize(10);
            doc.text(`Paid via Cash: ₹${customerInvoice.paidViaCash.toFixed(2)}`, 360, paymentY);
            doc.text(`Paid via Bank: ₹${customerInvoice.paidViaBank.toFixed(2)}`, 360, paymentY + 15);
            doc.font('Helvetica-Bold').fillColor('#dc2626');
            doc.text(`Amount Due: ₹${customerInvoice.amountDue.toFixed(2)}`, 360, paymentY + 35);
        }

        // Footer
        doc.fontSize(8).fillColor('#94a3b8').text(
            'Thank you for your business!',
            50,
            doc.page.height - 100,
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

// Send Customer Invoice to Customer via Email
exports.sendCustomerInvoiceToCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const customerInvoice = await CustomerInvoice.findById(id)
            .populate("customerId", "name email phone address")
            .populate("lines.budgetAnalyticId", "name code")
            .populate("createdBy", "firstName lastName email");

        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        const customer = customerInvoice.customerId;
        if (!customer || !customer.email) {
            return res.status(400).json({
                success: false,
                message: "Customer email not found",
            });
        }

        // Prepare email content
        const emailSubject = `Customer Invoice ${customerInvoice.invoiceNo}`;
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Customer Invoice</h2>
                <p>Dear ${customer.name},</p>
                <p>Please find below the details of your invoice:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Invoice No:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${customerInvoice.invoiceNo}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Invoice Date:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(customerInvoice.invoiceDate).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Due Date:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(customerInvoice.dueDate).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Grand Total:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>₹${customerInvoice.grandTotal.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Amount Due:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;"><strong>₹${customerInvoice.amountDue.toFixed(2)}</strong></td>
                    </tr>
                </table>

               <h3 style="color: #1e293b; margin-top: 30px;">Line Items:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Product</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Qty</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Unit Price</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customerInvoice.lines.map(line => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${line.productName}</td>
                                <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${line.quantity}</td>
                                <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">₹${line.unitPrice.toFixed(2)}</td>
                                <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">₹${line.lineTotal.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <p style="margin-top: 30px;">If you have any questions about this invoice, please contact us.</p>
                <p>Best regards,<br>Your Company Team</p>
            </div>
        `;

        // Send email
        await mailSender(customer.email, emailSubject, emailBody);

        // Update invoice sent status
        customerInvoice.sentToCustomer = true;
        customerInvoice.sentDate = new Date();
        await customerInvoice.save();

        return res.status(200).json({
            success: true,
            message: "Customer Invoice sent successfully",
            data: {
                sentTo: customer.email,
                sentDate: customerInvoice.sentDate,
            },
        });
    } catch (error) {
        console.error("Send customer invoice error:", error);
        return res.status(500).json({
            success: false,
            message: "Error sending customer invoice",
            error: error.message,
        });
    }
};

// Create Razorpay Payment Order
exports.createPaymentOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const customerInvoice = await CustomerInvoice.findById(id)
            .populate("customerId", "name email phone");

        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        if (customerInvoice.amountDue <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invoice is already fully paid",
            });
        }

        // Create Razorpay order
        const options = {
            amount: Math.round(customerInvoice.amountDue * 100), // Amount in paise
            currency: "INR",
            receipt: customerInvoice.invoiceNo,
            notes: {
                invoiceId: customerInvoice._id.toString(),
                invoiceNo: customerInvoice.invoiceNo,
                customerId: customerInvoice.customerId._id.toString(),
            },
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Save Razorpay order ID
        customerInvoice.razorpayOrderId = razorpayOrder.id;
        await customerInvoice.save();

        return res.status(200).json({
            success: true,
            message: "Payment order created successfully",
            data: {
                orderId: razorpayOrder.id,
                amount: customerInvoice.amountDue,
                currency: "INR",
                key: process.env.RAZORPAY_KEY_ID,
                invoiceNo: customerInvoice.invoiceNo,
                customerName: customerInvoice.customerId.name,
                customerEmail: customerInvoice.customerId.email,
                customerContact: customerInvoice.customerId.phone,
            },
        });
    } catch (error) {
        console.error("Create payment order error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating payment order",
            error: error.message,
        });
    }
};

// Verify Razorpay Payment
exports.verifyPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const customerInvoice = await CustomerInvoice.findById(id);
        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        // Verify signature
        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed - Invalid signature",
            });
        }

        // Payment verified successfully - update invoice
        const paymentAmount = customerInvoice.amountDue;
        customerInvoice.paidViaBank = (customerInvoice.paidViaBank || 0) + paymentAmount;
        customerInvoice.razorpayPaymentId = razorpay_payment_id;
        customerInvoice.razorpaySignature = razorpay_signature;

        // Calculate totals will auto-update payment status
        customerInvoice.calculateTotals();
        await customerInvoice.save();

        await customerInvoice.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name code' },
        ]);

        return res.status(200).json({
            success: true,
            message: "Payment verified and recorded successfully",
            data: customerInvoice,
        });
    } catch (error) {
        console.error("Verify payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Error verifying payment",
            error: error.message,
        });
    }
};

// Record Manual Payment (Cash/Offline)
exports.recordManualPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { cashAmount = 0, bankAmount = 0 } = req.body;

        if (cashAmount < 0 || bankAmount < 0) {
            return res.status(400).json({
                success: false,
                message: "Payment amounts cannot be negative",
            });
        }

        if (cashAmount === 0 && bankAmount === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one payment amount must be greater than 0",
            });
        }

        const customerInvoice = await CustomerInvoice.findById(id);
        if (!customerInvoice) {
            return res.status(404).json({
                success: false,
                message: "Customer Invoice not found",
            });
        }

        // Record payment
        customerInvoice.recordPayment(parseFloat(cashAmount), parseFloat(bankAmount));
        await customerInvoice.save();

        await customerInvoice.populate([
            { path: 'customerId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name code' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(200).json({
            success: true,
            message: "Payment recorded successfully",
            data: customerInvoice,
        });
    } catch (error) {
        console.error("Record manual payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Error recording payment",
            error: error.message,
        });
    }
};
