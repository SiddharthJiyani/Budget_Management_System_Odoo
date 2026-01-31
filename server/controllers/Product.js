const Product = require("../models/Product");
const Category = require("../models/Category");

// Create Product
exports.createProduct = async (req, res) => {
    try {
        const { name, category, salesPrice, purchasePrice } = req.body;

        // Validate required fields
        if (!name || !category || salesPrice === undefined || purchasePrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Product name, category, sales price, and purchase price are required",
            });
        }

        // Validate that category exists
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({
                success: false,
                message: "Invalid category. Please select a valid category.",
            });
        }

        // Create product
        const product = await Product.create({
            name,
            category,
            salesPrice,
            purchasePrice,
            status: 'new',
            createdBy: req.user.id,
        });

        // Populate category before sending response
        await product.populate('category');

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product,
        });
    } catch (error) {
        console.error("Create product error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating product",
            error: error.message,
        });
    }
};

// Get all products with filtering
exports.getAllProducts = async (req, res) => {
    try {
        const { status, category, search, page = 1, limit = 10 } = req.query;

        // Build query
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (category) {
            query.category = category;
        }
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Execute query with pagination
        const products = await Product.find(query)
            .populate('category', 'name color description')
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);


        const count = await Product.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Products retrieved successfully",
            data: {
                products,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalProducts: count,
            },
        });
    } catch (error) {
        console.error("Get products error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving products",
            error: error.message,
        });
    }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id)
            .populate('category', 'name color description')
            .populate('createdBy', 'firstName lastName email');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product retrieved successfully",
            data: product,
        });
    } catch (error) {
        console.error("Get product error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving product",
            error: error.message,
        });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, salesPrice, purchasePrice, status } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Validate category if provided
        if (category) {
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category. Please select a valid category.",
                });
            }
            product.category = category;
        }

        // Update fields
        if (name) product.name = name;
        if (salesPrice !== undefined) product.salesPrice = salesPrice;
        if (purchasePrice !== undefined) product.purchasePrice = purchasePrice;
        if (status) product.status = status;

        await product.save();
        await product.populate('category');

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product,
        });
    } catch (error) {
        console.error("Update product error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating product",
            error: error.message,
        });
    }
};

// Archive product (soft delete)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        product.status = 'archived';
        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product archived successfully",
            data: product,
        });
    } catch (error) {
        console.error("Delete product error:", error);
        return res.status(500).json({
            success: false,
            message: "Error archiving product",
            error: error.message,
        });
    }
};

// Unarchive product (restore)
exports.unarchiveProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        product.status = 'new';
        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product restored successfully",
            data: product,
        });
    } catch (error) {
        console.error("Unarchive product error:", error);
        return res.status(500).json({
            success: false,
            message: "Error restoring product",
            error: error.message,
        });
    }
};

// Permanent delete product
exports.permanentDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        await Product.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Product permanently deleted",
        });
    } catch (error) {
        console.error("Permanent delete product error:", error);
        return res.status(500).json({
            success: false,
            message: "Error permanently deleting product",
            error: error.message,
        });
    }
};

