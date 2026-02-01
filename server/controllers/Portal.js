const CustomerInvoice = require("../models/CustomerInvoice");
const VendorBill = require("../models/VendorBill");
const Contact = require("../models/Contact");
const SalesOrder = require("../models/SalesOrder");
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
        const userEmail = req.user.email;
        let contactId = req.user.contactId;

        // If no contactId linked, try to find contact by email
        if (!contactId) {
            const contact = await Contact.findOne({ email: userEmail }).lean();
            if (contact) {
                contactId = contact._id;
            }
        }

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

        console.log('📧 Portal Query - Email:', req.user.email);
        console.log('🔗 Contact ID:', contactId);
        console.log('👤 Contact Name:', contact.name);

        // Find invoices where user is the customer (CustomerInvoice model uses customerId)
        const customerInvoices = await CustomerInvoice.find({
            customerId: contactId,
            status: { $ne: 'cancelled' }
        })
            .select('invoiceNo invoiceDate dueDate grandTotal paidViaCash paidViaBank paymentStatus status')
            .sort({ invoiceDate: -1 })
            .lean();

        console.log('📄 Found Customer Invoices:', customerInvoices.length);
        if (customerInvoices.length > 0) {
            console.log('📄 Invoice Numbers:', customerInvoices.map(inv => inv.invoiceNo));
        }

        // Find bills where user is the vendor (VendorBill model uses vendorId)
        const vendorBills = await VendorBill.find({
            vendorId: contactId,
            status: { $ne: 'cancelled' }
        })
            .select('billNo billDate dueDate grandTotal paidViaCash paidViaBank paymentStatus status')
            .sort({ billDate: -1 })
            .lean();

        console.log('🧾 Found Vendor Bills:', vendorBills.length);
        if (vendorBills.length > 0) {
            console.log('🧾 Bill Numbers:', vendorBills.map(bill => bill.billNo));
        }

        // Also get Sales Orders for the customer
        const salesOrders = await SalesOrder.find({
            customerId: contactId,
            status: { $ne: 'cancelled' }
        })
            .select('soNumber soDate dueDate grandTotal paidViaCash paidViaBank paymentStatus status')
            .sort({ soDate: -1 })
            .lean();

        console.log('🛒 Found Sales Orders:', salesOrders.length);
        if (salesOrders.length > 0) {
            console.log('🛒 Sales Order Numbers:', salesOrders.map(so => so.soNumber));
        }

        // Determine which type of documents to return
        // If user has invoices, they're a customer. If bills, they're a vendor.
        // Include both invoices and sales orders for customers
        if (customerInvoices.length > 0 || salesOrders.length > 0 || vendorBills.length === 0) {
            documentType = 'invoice';
            
            // Map customer invoices
            const invoiceDocs = customerInvoices.map(inv => ({
                id: inv._id,
                documentNo: inv.invoiceNo,
                documentDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                totalAmount: inv.grandTotal,
                paidAmount: (inv.paidViaCash || 0) + (inv.paidViaBank || 0),
                amountDue: inv.grandTotal - ((inv.paidViaCash || 0) + (inv.paidViaBank || 0)),
                status: mapPaymentStatus(inv.paymentStatus, inv.status),
                type: 'invoice',
            }));

            // Map sales orders
            const salesOrderDocs = salesOrders.map(so => ({
                id: so._id,
                documentNo: so.soNumber,
                documentDate: so.soDate,
                dueDate: so.dueDate,
                totalAmount: so.grandTotal,
                paidAmount: (so.paidViaCash || 0) + (so.paidViaBank || 0),
                amountDue: so.grandTotal - ((so.paidViaCash || 0) + (so.paidViaBank || 0)),
                status: mapPaymentStatus(so.paymentStatus, so.status),
                type: 'sales_order',
            }));

            // Combine and sort by date
            documents = [...invoiceDocs, ...salesOrderDocs].sort((a, b) => 
                new Date(b.documentDate) - new Date(a.documentDate)
            );
        } else {
            documentType = 'bill';
            documents = vendorBills.map(bill => ({
                id: bill._id,
                documentNo: bill.billNo,
                documentDate: bill.billDate,
                dueDate: bill.dueDate,
                totalAmount: bill.grandTotal,
                paidAmount: (bill.paidViaCash || 0) + (bill.paidViaBank || 0),
                amountDue: bill.grandTotal - ((bill.paidViaCash || 0) + (bill.paidViaBank || 0)),
                status: mapPaymentStatus(bill.paymentStatus, bill.status),
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
 * Map payment status to user-friendly status
 */
function mapPaymentStatus(paymentStatus, documentStatus) {
    // If document is cancelled or draft, use that status
    if (documentStatus === 'cancelled') return 'cancelled';
    if (documentStatus === 'draft') return 'draft';
    
    // Otherwise use payment status
    if (paymentStatus === 'paid') return 'paid';
    if (paymentStatus === 'partial') return 'partial';
    return 'not_paid';
}

/**
 * Get payment details for initiating payment
 */
exports.getPaymentDetails = async (req, res) => {
    try {
        const { documentId, documentType } = req.params;
        const userEmail = req.user.email;

        // Find contact by email (email matching)
        const contact = await Contact.findOne({ email: userEmail });
        if (!contact) {
            return res.status(400).json({
                success: false,
                message: "Contact not found for your email",
            });
        }
        const contactId = contact._id;

        let document;
        let customerInfo;

        if (documentType === 'invoice') {
            document = await CustomerInvoice.findOne({
                _id: documentId,
                customerId: contactId
            }).populate('customerId', 'name email phone');

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found or access denied",
                });
            }

            customerInfo = {
                name: document.customerId.name,
                email: document.customerId.email,
                phone: document.customerId.phone || '',
            };
        } else if (documentType === 'bill') {
            document = await VendorBill.findOne({
                _id: documentId,
                vendorId: contactId
            }).populate('vendorId', 'name email phone');

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Bill not found or access denied",
                });
            }

            customerInfo = {
                name: document.vendorId.name,
                email: document.vendorId.email,
                phone: document.vendorId.phone || '',
            };
        } else if (documentType === 'sales_order') {
            document = await SalesOrder.findOne({
                _id: documentId,
                customerId: contactId
            }).populate('customerId', 'name email phone');

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Sales order not found or access denied",
                });
            }

            customerInfo = {
                name: document.customerId.name,
                email: document.customerId.email,
                phone: document.customerId.phone || '',
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
                documentNo: document.invoiceNo || document.billNo || document.soNumber,
                documentDate: document.invoiceDate || document.billDate || document.soDate,
                dueDate: document.dueDate,
                totalAmount: document.grandTotal,
                paidAmount: (document.paidViaCash || 0) + (document.paidViaBank || 0),
                amountDue: document.grandTotal - ((document.paidViaCash || 0) + (document.paidViaBank || 0)),
                status: document.paymentStatus,
                customerInfo,
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
        const userEmail = req.user.email;

        // Find contact by email
        const contact = await Contact.findOne({ email: userEmail });
        if (!contact) {
            return res.status(400).json({
                success: false,
                message: "Contact not found for your email",
            });
        }
        const contactId = contact._id;

        if (!documentId || !documentType || !amount) {
            return res.status(400).json({
                success: false,
                message: "Document ID, type, and amount are required",
            });
        }

        let document;

        // Validate document ownership and get document
        if (documentType === 'invoice') {
            document = await CustomerInvoice.findOne({
                _id: documentId,
                customerId: contactId,
                status: { $ne: 'cancelled' }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found or access denied",
                });
            }

            if (document.paymentStatus === 'paid') {
                return res.status(400).json({
                    success: false,
                    message: "Invoice is already paid",
                });
            }
        } else if (documentType === 'bill') {
            document = await VendorBill.findOne({
                _id: documentId,
                vendorId: contactId,
                status: { $ne: 'cancelled' }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Bill not found or access denied",
                });
            }

            if (document.paymentStatus === 'paid') {
                return res.status(400).json({
                    success: false,
                    message: "Bill is already paid",
                });
            }
        } else if (documentType === 'sales_order') {
            document = await SalesOrder.findOne({
                _id: documentId,
                customerId: contactId,
                status: { $ne: 'cancelled' }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Sales order not found or access denied",
                });
            }

            if (document.paymentStatus === 'paid') {
                return res.status(400).json({
                    success: false,
                    message: "Sales order is already paid",
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid document type",
            });
        }

        // Create Razorpay order
        // Receipt ID must be under 40 characters
        const timestamp = Date.now().toString().slice(-8); // Last 8 digits
        const docIdShort = documentId.toString().slice(-8); // Last 8 chars of ID
        const receipt = `${documentType.slice(0, 3)}_${docIdShort}_${timestamp}`.slice(0, 40);
        
        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: "INR",
            receipt: receipt,
            notes: {
                documentId: documentId,
                documentType: documentType,
                contactId: contactId.toString(),
                documentNo: document.invoiceNo || document.billNo || document.soNumber,
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

        const userEmail = req.user.email;

        // Find contact by email
        const contact = await Contact.findOne({ email: userEmail });
        if (!contact) {
            return res.status(400).json({
                success: false,
                message: "Contact not found for your email",
            });
        }
        const contactId = contact._id;

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
            Model = CustomerInvoice;
            document = await Model.findOne({
                _id: documentId,
                customerId: contactId,
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found or access denied",
                });
            }

            documentNo = document.invoiceNo;
        } else if (documentType === 'bill') {
            Model = VendorBill;
            document = await Model.findOne({
                _id: documentId,
                vendorId: contactId,
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Bill not found or access denied",
                });
            }

            documentNo = document.billNo;
        } else if (documentType === 'sales_order') {
            Model = SalesOrder;
            document = await Model.findOne({
                _id: documentId,
                customerId: contactId,
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Sales order not found or access denied",
                });
            }

            documentNo = document.soNumber;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid document type",
            });
        }

        // Update payment amounts (using paidViaCash/paidViaBank structure)
        const paymentAmount = parseFloat(amount);
        document.paidViaBank = (document.paidViaBank || 0) + paymentAmount;
        const totalPaid = (document.paidViaCash || 0) + (document.paidViaBank || 0);

        // Update payment status based on total paid
        if (totalPaid >= document.grandTotal) {
            document.paymentStatus = 'paid';
        } else if (totalPaid > 0) {
            document.paymentStatus = 'partial';
        } else {
            document.paymentStatus = 'not_paid';
        }

        // Confirm draft documents when payment is received
        if (document.status === 'draft' && paymentAmount > 0) {
            document.status = 'confirmed';
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

/**
 * Get My Profile
 * 
 * Returns the contact information for the logged-in portal user
 */
exports.getMyProfile = async (req, res) => {
    try {
        const userEmail = req.user.email;
        let contactId = req.user.contactId;

        // If no contactId linked, try to find contact by email
        if (!contactId) {
            const contact = await Contact.findOne({ email: userEmail }).lean();
            if (contact) {
                contactId = contact._id;
            }
        }

        if (!contactId) {
            return res.status(400).json({
                success: false,
                message: "Your account is not linked to a contact. Please contact admin.",
            });
        }

        const contact = await Contact.findById(contactId).select('-__v');

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact information not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: contact,
        });
    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching profile information",
            error: error.message,
        });
    }
};

/**
 * Get My Stats
 * 
 * Returns statistics about invoices/bills for the portal user
 */
exports.getMyStats = async (req, res) => {
    try {
        const userEmail = req.user.email;
        let contactId = req.user.contactId;

        // If no contactId linked, try to find contact by email
        if (!contactId) {
            const contact = await Contact.findOne({ email: userEmail }).lean();
            if (contact) {
                contactId = contact._id;
            }
        }

        if (!contactId) {
            return res.status(400).json({
                success: false,
                message: "Your account is not linked to a contact. Please contact admin.",
            });
        }

        const contact = await Contact.findById(contactId).lean();

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact information not found",
            });
        }

        let stats = {
            totalInvoices: 0,
            pendingInvoices: 0,
            totalAmount: 0,
            pendingAmount: 0,
        };

        // Check if this is a vendor (has vendorBills) or customer (has invoices)
        const vendorBillsExist = await VendorBill.exists({ vendorId: contactId });

        if (vendorBillsExist) {
            // This is a vendor - get bill stats
            const bills = await VendorBill.find({ vendorId: contactId }).lean();
            
            stats.totalInvoices = bills.length;
            stats.pendingInvoices = bills.filter(b => b.paymentStatus !== 'paid').length;
            stats.totalAmount = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
            stats.pendingAmount = bills.reduce((sum, b) => {
                if (b.paymentStatus !== 'paid') {
                    const totalPaid = (b.paidViaCash || 0) + (b.paidViaBank || 0);
                    return sum + (b.grandTotal - totalPaid);
                }
                return sum;
            }, 0);
        } else {
            // This is a customer - get invoice and sales order stats
            const invoices = await CustomerInvoice.find({ customerId: contactId }).lean();
            const salesOrders = await SalesOrder.find({ customerId: contactId }).lean();
            
            const allDocs = [...invoices, ...salesOrders];
            
            stats.totalInvoices = allDocs.length;
            stats.pendingInvoices = allDocs.filter(doc => doc.paymentStatus !== 'paid').length;
            stats.totalAmount = allDocs.reduce((sum, doc) => sum + (doc.grandTotal || 0), 0);
            stats.pendingAmount = allDocs.reduce((sum, doc) => {
                if (doc.paymentStatus !== 'paid') {
                    const totalPaid = (doc.paidViaCash || 0) + (doc.paidViaBank || 0);
                    return sum + (doc.grandTotal - totalPaid);
                }
                return sum;
            }, 0);
        }

        return res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error("Get stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching statistics",
            error: error.message,
        });
    }
};
