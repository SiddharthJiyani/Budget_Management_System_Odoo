const PurchaseOrder = require("../models/PurchaseOrder");
const Contact = require("../models/Contact");
const Product = require("../models/Product");

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
            // Check product exists
            const product = await Product.findById(line.productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${line.productId}`,
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
            productId: line.productId,
            budgetAnalyticId: line.budgetAnalyticId || null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.quantity * line.unitPrice,
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
                const product = await Product.findById(line.productId);
                if (!product) {
                    return res.status(404).json({
                        success: false,
                        message: `Product not found: ${line.productId}`,
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
                productId: line.productId,
                budgetAnalyticId: line.budgetAnalyticId || null,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.quantity * line.unitPrice,
            }));
        }

        if (reference !== undefined) purchaseOrder.reference = reference;
        if (poDate) purchaseOrder.poDate = poDate;

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
