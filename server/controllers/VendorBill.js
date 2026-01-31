const VendorBill = require("../models/VendorBill");
const Contact = require("../models/Contact");
const PurchaseOrder = require("../models/PurchaseOrder");
const AnalyticMaster = require("../models/AnalyticMaster");
const Budget = require("../models/Budget");
const PDFDocument = require('pdfkit');
const mailSender = require("../utils/mailSender");
const Razorpay = require("razorpay");

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Vendor Bill
exports.createVendorBill = async (req, res) => {
    try {
        const { vendorId, purchaseOrderId, reference, billDate, dueDate, lines, notes } = req.body;

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

        // If created from PO, validate PO exists
        let purchaseOrder = null;
        if (purchaseOrderId) {
            purchaseOrder = await PurchaseOrder.findById(purchaseOrderId)
                .populate("lines.budgetAnalyticId");
            
            if (!purchaseOrder) {
                return res.status(404).json({
                    success: false,
                    message: "Purchase Order not found",
                });
            }
        }

        // Validate lines
        const billLines = lines || (purchaseOrder ? purchaseOrder.lines : []);
        if (!billLines || !Array.isArray(billLines) || billLines.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one line item is required",
            });
        }

        // Validate each line
        for (const line of billLines) {
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

        // Generate bill number
        const billNumber = await VendorBill.getNextBillNumber();

        // Process lines with budget analytics
        const processedLines = [];
        for (const line of billLines) {
            const processedLine = {
                productName: line.productName,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.quantity * line.unitPrice,
                budgetAnalyticId: line.budgetAnalyticId,
                exceedsBudget: false,
            };

            // Check budget if analytics assigned
            if (line.budgetAnalyticId) {
                const budget = await Budget.findOne({
                    budgetAnalyticId: line.budgetAnalyticId,
                    status: { $in: ['confirmed', 'revised'] }
                });

                if (budget) {
                    const totalSpent = budget.actualExpenses || 0;
                    const totalApproved = budget.approvedBudget || 0;
                    const newTotal = totalSpent + processedLine.lineTotal;

                    if (newTotal > totalApproved) {
                        processedLine.exceedsBudget = true;
                    }
                }
            }

            processedLines.push(processedLine);
        }

        // Create vendor bill
        const vendorBill = await VendorBill.create({
            billNumber,
            vendorId,
            purchaseOrderId: purchaseOrderId || null,
            reference,
            billDate: billDate || new Date(),
            dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lines: processedLines,
            notes,
            createdBy: req.user.id,
        });

        // Ensure totals are calculated correctly
        vendorBill.calculateTotals();
        await vendorBill.save();

        // Populate the response
        await vendorBill.populate([
            { path: 'vendorId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(201).json({
            success: true,
            message: "Vendor Bill created successfully",
            data: vendorBill,
        });
    } catch (error) {
        console.error("Create vendor bill error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating vendor bill",
            error: error.message,
        });
    }
};

// Get all vendor bills with filtering
exports.getAllVendorBills = async (req, res) => {
    try {
        const { status, paymentStatus, search, page = 1, limit = 10 } = req.query;

        let query = { createdBy: req.user.id };

        if (status && status !== "all") {
            query.status = status;
        }

        if (paymentStatus && paymentStatus !== "all") {
            query.paymentStatus = paymentStatus;
        }

        if (search) {
            query.$or = [
                { billNumber: { $regex: search, $options: "i" } },
                { reference: { $regex: search, $options: "i" } },
            ];
        }

        const vendorBills = await VendorBill.find(query)
            .populate("vendorId", "name email phone")
            .populate("createdBy", "firstName lastName email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await VendorBill.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Vendor bills retrieved successfully",
            data: {
                vendorBills,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalVendorBills: count,
            },
        });
    } catch (error) {
        console.error("Get vendor bills error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving vendor bills",
            error: error.message,
        });
    }
};

// Get vendor bill by ID
exports.getVendorBillById = async (req, res) => {
    try {
        const { id } = req.params;

        const vendorBill = await VendorBill.findById(id)
            .populate("vendorId", "name email phone address")
            .populate("purchaseOrderId", "poNumber")
            .populate("lines.budgetAnalyticId", "name")
            .populate("createdBy", "firstName lastName email");

        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vendor Bill retrieved successfully",
            data: vendorBill,
        });
    } catch (error) {
        console.error("Get vendor bill error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving vendor bill",
            error: error.message,
        });
    }
};

// Update vendor bill
exports.updateVendorBill = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId, reference, billDate, dueDate, lines, notes } = req.body;

        const vendorBill = await VendorBill.findById(id);
        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        // Only allow updates in draft status
        if (vendorBill.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft bills can be updated",
            });
        }

        // Validate vendor if provided
        if (vendorId && vendorId !== vendorBill.vendorId.toString()) {
            const vendor = await Contact.findById(vendorId);
            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: "Vendor not found",
                });
            }
            vendorBill.vendorId = vendorId;
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

            // Process lines with budget analytics
            const processedLines = [];
            for (const line of lines) {
                const processedLine = {
                    productName: line.productName,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: line.quantity * line.unitPrice,
                    budgetAnalyticId: line.budgetAnalyticId,
                    exceedsBudget: false,
                };

                // Check budget if analytics assigned
                if (line.budgetAnalyticId) {
                    const budget = await Budget.findOne({
                        budgetAnalyticId: line.budgetAnalyticId,
                        status: { $in: ['confirmed', 'revised'] }
                    });

                    if (budget) {
                        const totalSpent = budget.actualExpenses || 0;
                        const totalApproved = budget.approvedBudget || 0;
                        const newTotal = totalSpent + processedLine.lineTotal;

                        if (newTotal > totalApproved) {
                            processedLine.exceedsBudget = true;
                        }
                    }
                }

                processedLines.push(processedLine);
            }

            vendorBill.lines = processedLines;
        }

        // Update other fields
        if (reference !== undefined) vendorBill.reference = reference;
        if (billDate) vendorBill.billDate = billDate;
        if (dueDate) vendorBill.dueDate = dueDate;
        if (notes !== undefined) vendorBill.notes = notes;

        // Ensure totals are calculated correctly
        vendorBill.calculateTotals();
        await vendorBill.save();

        // Populate the response
        await vendorBill.populate([
            { path: 'vendorId', select: 'name email phone address' },
            { path: 'lines.budgetAnalyticId', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(200).json({
            success: true,
            message: "Vendor Bill updated successfully",
            data: vendorBill,
        });
    } catch (error) {
        console.error("Update vendor bill error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating vendor bill",
            error: error.message,
        });
    }
};

// Confirm vendor bill
exports.confirmVendorBill = async (req, res) => {
    try {
        const { id } = req.params;

        const vendorBill = await VendorBill.findById(id);
        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        if (vendorBill.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft bills can be confirmed",
            });
        }

        vendorBill.status = 'confirmed';
        await vendorBill.save();

        return res.status(200).json({
            success: true,
            message: "Vendor Bill confirmed successfully",
            data: vendorBill,
        });
    } catch (error) {
        console.error("Confirm vendor bill error:", error);
        return res.status(500).json({
            success: false,
            message: "Error confirming vendor bill",
            error: error.message,
        });
    }
};

// Cancel vendor bill
exports.cancelVendorBill = async (req, res) => {
    try {
        const { id } = req.params;

        const vendorBill = await VendorBill.findById(id);
        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        if (vendorBill.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Vendor Bill is already cancelled",
            });
        }

        vendorBill.status = 'cancelled';
        await vendorBill.save();

        return res.status(200).json({
            success: true,
            message: "Vendor Bill cancelled successfully",
            data: vendorBill,
        });
    } catch (error) {
        console.error("Cancel vendor bill error:", error);
        return res.status(500).json({
            success: false,
            message: "Error cancelling vendor bill",
            error: error.message,
        });
    }
};

// Create payment for vendor bill
exports.createPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, paymentMethod = "razorpay", notes } = req.body;

        const vendorBill = await VendorBill.findById(id);
        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        if (vendorBill.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: "Only confirmed bills can be paid",
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Payment amount must be greater than 0",
            });
        }

        if (amount > vendorBill.dueAmount) {
            return res.status(400).json({
                success: false,
                message: "Payment amount cannot exceed due amount",
            });
        }

        let razorpayOrder = null;

        // Create Razorpay order if payment method is razorpay
        if (paymentMethod === "razorpay") {
            try {
                razorpayOrder = await razorpay.orders.create({
                    amount: Math.round(amount * 100), // Convert to paise
                    currency: "INR",
                    receipt: `bill_${vendorBill.billNumber}_${Date.now()}`,
                    notes: {
                        billId: vendorBill._id.toString(),
                        billNumber: vendorBill.billNumber,
                        vendorName: vendorBill.vendorId.name,
                    },
                });
            } catch (razorpayError) {
                return res.status(500).json({
                    success: false,
                    message: "Error creating payment order",
                    error: razorpayError.message,
                });
            }
        }

        // For cash/bank payments, directly add payment
        if (paymentMethod !== "razorpay") {
            const payment = {
                amount,
                paymentMethod,
                paymentDate: new Date(),
                status: "completed",
                notes,
            };

            vendorBill.payments.push(payment);
            vendorBill.paidAmount += amount;
            await vendorBill.save();

            return res.status(200).json({
                success: true,
                message: "Payment recorded successfully",
                data: {
                    vendorBill,
                    payment,
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: "Razorpay order created successfully",
            data: {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID,
                billId: vendorBill._id,
                billNumber: vendorBill.billNumber,
            },
        });
    } catch (error) {
        console.error("Create payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Error processing payment",
            error: error.message,
        });
    }
};

// Verify payment for vendor bill
exports.verifyPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount, notes } = req.body;

        const vendorBill = await VendorBill.findById(id);
        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        // Verify Razorpay signature
        const crypto = require("crypto");
        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed",
            });
        }

        // Add payment to vendor bill
        const payment = {
            amount,
            paymentMethod: "razorpay",
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paymentDate: new Date(),
            status: "completed",
            notes,
        };

        vendorBill.payments.push(payment);
        vendorBill.paidAmount += amount;
        await vendorBill.save();

        return res.status(200).json({
            success: true,
            message: "Payment verified and recorded successfully",
            data: {
                vendorBill,
                payment,
            },
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

// Auto-assign analytics category (simulated ML model)
exports.autoAssignAnalytics = async (req, res) => {
    try {
        const { productName, amount } = req.body;

        if (!productName) {
            return res.status(400).json({
                success: false,
                message: "Product name is required",
            });
        }

        // Simulate ML model for analytics assignment
        const analytics = await AnalyticMaster.find({ status: 'active' });
        
        if (analytics.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    analyticsCategory: null,
                    exceedsBudget: false,
                    confidence: 0,
                },
            });
        }

        // Simple keyword matching simulation
        const productLower = productName.toLowerCase();
        let selectedAnalytics = null;
        let confidence = 0.3;

        for (const analytic of analytics) {
            const analyticLower = analytic.name.toLowerCase();
            if (productLower.includes(analyticLower) || analyticLower.includes(productLower)) {
                selectedAnalytics = analytic;
                confidence = 0.8;
                break;
            }
        }

        // If no match found, assign randomly for demo
        if (!selectedAnalytics) {
            selectedAnalytics = analytics[Math.floor(Math.random() * analytics.length)];
            confidence = 0.4;
        }

        // Check budget if amount provided
        let exceedsBudget = false;
        if (amount && selectedAnalytics) {
            const budget = await Budget.findOne({
                budgetAnalyticId: selectedAnalytics._id,
                status: { $in: ['confirmed', 'revised'] }
            });

            if (budget) {
                const totalSpent = budget.actualExpenses || 0;
                const totalApproved = budget.approvedBudget || 0;
                const newTotal = totalSpent + amount;

                if (newTotal > totalApproved) {
                    exceedsBudget = true;
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                analyticsCategory: selectedAnalytics,
                exceedsBudget,
                confidence,
            },
        });
    } catch (error) {
        console.error("Auto assign analytics error:", error);
        return res.status(500).json({
            success: false,
            message: "Error assigning analytics",
            error: error.message,
        });
    }
};

// Generate PDF for vendor bill
exports.generateVendorBillPDF = async (req, res) => {
    try {
        const { id } = req.params;

        const vendorBill = await VendorBill.findById(id)
            .populate("vendorId", "name email phone address")
            .populate("lines.budgetAnalyticId", "name")
            .populate("createdBy", "firstName lastName email");

        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        // Create PDF document
        const doc = new PDFDocument({ 
            margin: 40,
            size: 'A4'
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Bill-${vendorBill.billNumber}.pdf`);

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
           .text('VENDOR BILL', 50, 30, { align: 'center' });

        doc.fontSize(12)
           .fillColor('white')
           .font('Helvetica')
           .text('Budget Management System', 50, 55, { align: 'center' });

        // Reset position and color
        doc.y = 120;
        doc.fillColor(textColor);

        // Bill Header Section with background
        doc.rect(40, doc.y - 10, doc.page.width - 80, 80).fill(accentColor).stroke('#fecaca');
        
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text(`Bill #${vendorBill.billNumber}`, 60, doc.y + 10);
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor(textColor)
           .text(`Bill Date: ${new Date(vendorBill.billDate).toLocaleDateString()}`, 60, doc.y + 8)
           .text(`Due Date: ${new Date(vendorBill.dueDate).toLocaleDateString()}`, 60, doc.y + 5)
           .text(`Status: ${vendorBill.status.toUpperCase()}`, 60, doc.y + 5)
           .text(`Payment Status: ${vendorBill.paymentStatus.replace('_', ' ').toUpperCase()}`, 60, doc.y + 5);
        
        if (vendorBill.reference) {
            doc.text(`Reference: ${vendorBill.reference}`, 60, doc.y + 5);
        }

        doc.y += 60;

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
        
        const vendorName = vendorBill.vendorId?.name || 'N/A';
        const vendorEmail = vendorBill.vendorId?.email || 'N/A';
        const vendorPhone = vendorBill.vendorId?.phone || 'N/A';
        const vendorAddress = formatAddress(vendorBill.vendorId?.address);

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
        doc.rect(50, tableTop - 5, doc.page.width - 100, 25).fill('#fef7f7').stroke('#fecaca');

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

        vendorBill.lines.forEach((line, index) => {
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
                   .fillColor('#3b82f6')
                   .text('⚠ Exceeds Budget', itemX, yPosition + 12);
                doc.fontSize(10).fillColor(textColor);
            }
            
            yPosition += 30;
        });

        // Total section
        yPosition += 10;
        doc.rect(50, yPosition - 5, doc.page.width - 100, 50).fill(primaryColor);
        
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('white');
        
        doc.text('GRAND TOTAL:', priceX - 60, yPosition + 8);
        doc.text(`₹${vendorBill.grandTotal.toFixed(2)}`, totalX, yPosition + 6);
        
        doc.text('PAID AMOUNT:', priceX - 60, yPosition + 20);
        doc.text(`₹${vendorBill.paidAmount.toFixed(2)}`, totalX, yPosition + 18);
        
        doc.text('DUE AMOUNT:', priceX - 60, yPosition + 32);
        doc.text(`₹${vendorBill.dueAmount.toFixed(2)}`, totalX, yPosition + 30);

        // Notes section
        if (vendorBill.notes && vendorBill.notes.trim() !== '') {
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
               .text(vendorBill.notes, 60, doc.y, { width: 480 });
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

// Send vendor bill to vendor via email
exports.sendVendorBillToVendor = async (req, res) => {
    try {
        const { id } = req.params;

        const vendorBill = await VendorBill.findById(id)
            .populate("vendorId", "name email phone address")
            .populate("lines.budgetAnalyticId", "name")
            .populate("createdBy", "firstName lastName");

        if (!vendorBill) {
            return res.status(404).json({
                success: false,
                message: "Vendor Bill not found",
            });
        }

        if (!vendorBill.vendorId?.email) {
            return res.status(400).json({
                success: false,
                message: "Vendor email not found",
            });
        }

        // Prepare email content
        const emailSubject = `Vendor Bill: ${vendorBill.billNumber}`;
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6;">Vendor Bill</h2>
                
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <p><strong>Bill Number:</strong> ${vendorBill.billNumber}</p>
                    <p><strong>Bill Date:</strong> ${new Date(vendorBill.billDate).toLocaleDateString()}</p>
                    <p><strong>Due Date:</strong> ${new Date(vendorBill.dueDate).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${vendorBill.status.toUpperCase()}</p>
                    <p><strong>Payment Status:</strong> ${vendorBill.paymentStatus.replace('_', ' ').toUpperCase()}</p>
                    ${vendorBill.reference ? `<p><strong>Reference:</strong> ${vendorBill.reference}</p>` : ''}
                </div>

                <h3 style="color: #3b82f6;">Vendor Details</h3>
                <p><strong>Name:</strong> ${vendorBill.vendorId.name}</p>

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
                        ${vendorBill.lines.map(line => `
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
                        <tr><td><strong>Grand Total:</strong></td><td style="text-align: right;"><strong>₹${vendorBill.grandTotal.toFixed(2)}</strong></td></tr>
                        <tr><td>Paid Amount:</td><td style="text-align: right;">₹${vendorBill.paidAmount.toFixed(2)}</td></tr>
                        <tr><td><strong>Amount Due:</strong></td><td style="text-align: right;"><strong>₹${vendorBill.dueAmount.toFixed(2)}</strong></td></tr>
                    </table>
                </div>

                ${vendorBill.notes ? `<p><strong>Notes:</strong> ${vendorBill.notes}</p>` : ''}

                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated email. Please do not reply directly to this message.
                </p>
            </div>
        `;

        // Send email
        const emailResult = await mailSender(
            vendorBill.vendorId.email,
            emailSubject,
            emailBody
        );

        // Check if email sending failed
        if (typeof emailResult === 'string' && emailResult.includes('error')) {
            console.warn("Email sending failed:", emailResult);
            return res.status(200).json({
                success: true,
                message: "Vendor Bill processed successfully, but email could not be sent. Please send manually.",
                data: vendorBill,
                emailError: emailResult,
            });
        }

        // Update vendor bill
        vendorBill.sentToVendor = true;
        vendorBill.sentDate = new Date();
        await vendorBill.save();

        return res.status(200).json({
            success: true,
            message: `Vendor Bill sent to ${vendorBill.vendorId.email}`,
            data: vendorBill,
        });
    } catch (error) {
        console.error("Send email error:", error);
        return res.status(500).json({
            success: false,
            message: "Error sending vendor bill",
            error: error.message,
        });
    }
};

// Create vendor bill from purchase order
exports.createFromPurchaseOrder = async (req, res) => {
    try {
        const { poId } = req.params;

        const purchaseOrder = await PurchaseOrder.findById(poId)
            .populate("vendorId", "name email phone address")
            .populate("lines.budgetAnalyticId", "name");

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: "Purchase Order not found",
            });
        }

        if (purchaseOrder.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: "Only confirmed purchase orders can be converted to bills",
            });
        }

        // Check if bill already exists for this PO
        const existingBill = await VendorBill.findOne({ purchaseOrderId: poId });
        if (existingBill) {
            return res.status(400).json({
                success: false,
                message: "Vendor Bill already exists for this Purchase Order",
            });
        }

        // Generate bill number
        const billNumber = await VendorBill.getNextBillNumber();

        // Create vendor bill from PO data
        const vendorBill = await VendorBill.create({
            billNumber,
            vendorId: purchaseOrder.vendorId._id,
            purchaseOrderId: purchaseOrder._id,
            reference: purchaseOrder.reference,
            billDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lines: purchaseOrder.lines.map(line => ({
                productName: line.productName,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
                budgetAnalyticId: line.budgetAnalyticId,
                exceedsBudget: line.exceedsBudget,
            })),
            notes: purchaseOrder.notes,
            createdBy: req.user.id,
        });

        // Ensure totals are calculated correctly
        vendorBill.calculateTotals();
        await vendorBill.save();

        // Populate the response
        await vendorBill.populate([
            { path: 'vendorId', select: 'name email phone address' },
            { path: 'purchaseOrderId', select: 'poNumber' },
            { path: 'lines.budgetAnalyticId', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return res.status(201).json({
            success: true,
            message: "Vendor Bill created from Purchase Order successfully",
            data: vendorBill,
        });
    } catch (error) {
        console.error("Create bill from PO error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating vendor bill from purchase order",
            error: error.message,
        });
    }
};