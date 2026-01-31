const Invoice = require("../models/Invoice");
const Bill = require("../models/Bill");
const Contact = require("../models/Contact");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Portal Controller
 * 
 * API endpoints for portal users (customers and vendors) to view
 * their invoices/bills and initiate payments.
 */

/**
 * Get My Invoices/Bills
 * 
 * Returns invoices (for customers) or bills (for vendors) based on
 * the logged-in user's linked contact record.
 * 
 * Backend determines what to show based on contact type.
 */
exports.getMyInvoices = async (req, res) => {
    try {
        const userId = req.user.id;
        const contactId = req.user.contactId;

        if (!contactId) {
            return res.status(400).json({
                success: false,
                message: "Your account is not linked to a contact. Please contact admin.",
            });
        }

        // Check if contact exists and determine type
        const contact = await Contact.findById(contactId).lean();

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Linked contact not found",
            });
        }

        let documents = [];
        let documentType = 'unknown';

        // Try to find invoices where user is the customer
        const customerInvoices = await Invoice.find({
            customer: contactId,
            status: { $ne: 'cancelled' }
        })
            .select('invoiceNumber invoiceDate dueDate totalAmount paidAmount balanceAmount status')
            .sort({ invoiceDate: -1 })
            .lean();

        // Try to find bills where user is the vendor
        const vendorBills = await Bill.find({
            vendor: contactId,
            status: { $ne: 'cancelled' }
        })
            .select('billNumber billDate dueDate totalAmount paidAmount balanceAmount status')
            .sort({ billDate: -1 })
            .lean();

        // Determine which type of documents to return
        // If user has invoices, they're a customer. If bills, they're a vendor.
        // If both, prioritize invoices (customer facing).
        if (customerInvoices.length > 0 || vendorBills.length === 0) {
            documentType = 'invoice';
            documents = customerInvoices.map(inv => ({
                id: inv._id,
                documentNo: inv.invoiceNumber,
                documentDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                totalAmount: inv.totalAmount,
                paidAmount: inv.paidAmount || 0,
                amountDue: inv.balanceAmount || inv.totalAmount,
                status: mapStatus(inv.status, inv.paidAmount, inv.totalAmount),
                type: 'invoice',
            }));
        } else {
            documentType = 'bill';
            documents = vendorBills.map(bill => ({
                id: bill._id,
                documentNo: bill.billNumber,
                documentDate: bill.billDate,
                dueDate: bill.dueDate,
                totalAmount: bill.totalAmount,
                paidAmount: bill.paidAmount || 0,
                amountDue: bill.balanceAmount || bill.totalAmount,
                status: mapStatus(bill.status, bill.paidAmount, bill.totalAmount),
                type: 'bill',
            }));
        }

        return res.status(200).json({
            success: true,
            message: "Documents retrieved successfully",
            data: {
                documentType,
                contactName: contact.name,
                documents,
                totalCount: documents.length,
            },
        });

    } catch (error) {
        console.error("Get my invoices error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving documents",
            error: error.message,
        });
    }
};

/**
 * Map internal status to payment status
 */
function mapStatus(status, paidAmount, totalAmount) {
    if (status === 'paid') return 'paid';
    if (paidAmount > 0 && paidAmount < totalAmount) return 'partial';
    return 'not_paid';
}

/**
 * Get payment details for initiating payment
 */
exports.getPaymentDetails = async (req, res) => {
    try {
        const { documentId, documentType } = req.params;
        const contactId = req.user.contactId;

        if (!contactId) {
            return res.status(400).json({
                success: false,
                message: "Account not linked to contact",
            });
        }

        let document;
        let customerInfo;

        if (documentType === 'invoice') {
            document = await Invoice.findOne({
                _id: documentId,
                customer: contactId
            }).populate('customer', 'name email phone');

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found or access denied",
                });
            }

            customerInfo = {
                name: document.customer.name,
                email: document.customer.email,
                phone: document.customer.phone || '',
            };
        } else if (documentType === 'bill') {
            document = await Bill.findOne({
                _id: documentId,
                vendor: contactId
            }).populate('vendor', 'name email phone');

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Bill not found or access denied",
                });
            }

            customerInfo = {
                name: document.vendor.name,
                email: document.vendor.email,
                phone: document.vendor.phone || '',
            };
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid document type",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                documentNo: document.invoiceNumber || document.billNumber,
                amount: document.balanceAmount || document.totalAmount,
                customerName: customerInfo.name,
                customerEmail: customerInfo.email,
                customerPhone: customerInfo.phone,
            },
        });

    } catch (error) {
        console.error("Get payment details error:", error);
        return res.status(500).json({
            success: false,
            message: "Error getting payment details",
            error: error.message,
        });
    }
};

/**
 * Create Payment Order
 * 
 * Creates a Razorpay order for paying an invoice or bill.
 * Validates user owns the document before creating order.
 */
exports.createPaymentOrder = async (req, res) => {
    try {
        const { documentId, documentType, amount } = req.body;
        const contactId = req.user.contactId;

        if (!contactId) {
            return res.status(400).json({
                success: false,
                message: "Account not linked to contact",
            });
        }

        if (!documentId || !documentType || !amount) {
            return res.status(400).json({
                success: false,
                message: "Document ID, type, and amount are required",
            });
        }

        let document;

        // Validate document ownership and get document
        if (documentType === 'invoice') {
            document = await Invoice.findOne({
                _id: documentId,
                customer: contactId,
                status: { $ne: 'cancelled' }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found or access denied",
                });
            }

            if (document.status === 'paid') {
                return res.status(400).json({
                    success: false,
                    message: "Invoice is already paid",
                });
            }
        } else if (documentType === 'bill') {
            document = await Bill.findOne({
                _id: documentId,
                vendor: contactId,
                status: { $ne: 'cancelled' }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Bill not found or access denied",
                });
            }

            if (document.status === 'paid') {
                return res.status(400).json({
                    success: false,
                    message: "Bill is already paid",
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid document type",
            });
        }

        // Create Razorpay order
        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: "INR",
            receipt: `${documentType}_${documentId}_${Date.now()}`,
            notes: {
                documentId: documentId,
                documentType: documentType,
                contactId: contactId.toString(),
                documentNo: document.invoiceNumber || document.billNumber,
            },
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: true,
            message: "Payment order created successfully",
            order,
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

/**
 * Verify Payment and Update Document
 * 
 * Verifies Razorpay payment signature and updates the invoice/bill
 * with payment information (paidAmount, balanceAmount, status).
 */
exports.verifyPaymentAndUpdate = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            documentId,
            documentType,
            amount,
        } = req.body;

        const contactId = req.user.contactId;

        if (!contactId) {
            return res.status(400).json({
                success: false,
                message: "Account not linked to contact",
            });
        }

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Missing payment verification details",
            });
        }

        if (!documentId || !documentType || !amount) {
            return res.status(400).json({
                success: false,
                message: "Document details are required",
            });
        }

        // Verify payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed - invalid signature",
            });
        }

        // Payment verified, now update the document
        let document;
        let Model;
        let documentNo;

        if (documentType === 'invoice') {
            Model = Invoice;
            document = await Model.findOne({
                _id: documentId,
                customer: contactId,
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found or access denied",
                });
            }

            documentNo = document.invoiceNumber;
        } else if (documentType === 'bill') {
            Model = Bill;
            document = await Model.findOne({
                _id: documentId,
                vendor: contactId,
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Bill not found or access denied",
                });
            }

            documentNo = document.billNumber;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid document type",
            });
        }

        // Update payment amounts
        const paymentAmount = parseFloat(amount);
        document.paidAmount = (document.paidAmount || 0) + paymentAmount;
        document.balanceAmount = document.totalAmount - document.paidAmount;

        // Update status based on payment
        if (document.balanceAmount <= 0) {
            document.status = 'paid';
            document.balanceAmount = 0; // Ensure it's exactly 0
        } else if (document.paidAmount > 0 && document.balanceAmount > 0) {
            // Partial payment - keep current status or set to 'sent'/'confirmed'
            if (documentType === 'invoice' && document.status === 'draft') {
                document.status = 'sent';
            } else if (documentType === 'bill' && document.status === 'draft') {
                document.status = 'confirmed';
            }
        }

        // Save the updated document
        await document.save();

        return res.status(200).json({
            success: true,
            message: "Payment verified and document updated successfully",
            data: {
                documentNo,
                paidAmount: document.paidAmount,
                balanceAmount: document.balanceAmount,
                totalAmount: document.totalAmount,
                status: document.status,
                payment: {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                },
            },
        });
    } catch (error) {
        console.error("Verify payment and update error:", error);
        return res.status(500).json({
            success: false,
            message: "Error verifying payment and updating document",
            error: error.message,
        });
    }
};
