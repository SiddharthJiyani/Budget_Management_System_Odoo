const Category = require("../models/Category");
const Product = require("../models/Product");

// Helper to check if a string looks like a MongoDB ObjectId
const isMongoId = (str) => /^[a-f0-9]{24}$/i.test(str);

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const { name, description, color } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        // Prevent creating categories with ID-like names
        if (isMongoId(name.trim())) {
            return res.status(400).json({
                success: false,
                message: "Invalid category name. Please use a descriptive name.",
            });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category already exists",
                data: existingCategory,
            });
        }

        const category = await Category.create({
            name: name.trim(),
            description,
            color,
            createdBy: req.user.id,
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
        });
    } catch (error) {
        console.error("Create category error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating category",
            error: error.message,
        });
    }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find()
            .populate('createdBy', 'firstName lastName email')
            .sort({ name: 1 });

        // Filter out categories with invalid (ID-like) names
        const validCategories = categories.filter(cat => 
            cat.name && !isMongoId(cat.name)
        );

        return res.status(200).json({
            success: true,
            message: "Categories retrieved successfully",
            data: validCategories,
        });
    } catch (error) {
        console.error("Get categories error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving categories",
            error: error.message,
        });
    }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id)
            .populate('createdBy', 'firstName lastName email');

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Count products in this category
        const productCount = await Product.countDocuments({ category: id });

        return res.status(200).json({
            success: true,
            message: "Category retrieved successfully",
            data: {
                ...category.toObject(),
                productCount,
            },
        });
    } catch (error) {
        console.error("Get category error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving category",
            error: error.message,
        });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Check if name is being changed and if it's already taken
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Category name already in use",
                });
            }
        }

        if (name) category.name = name;
        if (description !== undefined) category.description = description;
        if (color) category.color = color;

        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (error) {
        console.error("Update category error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating category",
            error: error.message,
        });
    }
};

// Delete category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Check if any products are using this category
        const productCount = await Product.countDocuments({ category: id });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. ${productCount} product(s) are using this category.`,
            });
        }

        await Category.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        console.error("Delete category error:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting category",
            error: error.message,
        });
    }
};

// Cleanup invalid categories (with ID-like names)
exports.cleanupInvalidCategories = async (req, res) => {
    try {
        // Find all categories with ID-like names
        const allCategories = await Category.find();
        const invalidCategories = allCategories.filter(cat => isMongoId(cat.name));

        if (invalidCategories.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No invalid categories found",
                data: { deletedCount: 0 },
            });
        }

        // Delete invalid categories that aren't being used by products
        let deletedCount = 0;
        const skippedCategories = [];

        for (const cat of invalidCategories) {
            const productCount = await Product.countDocuments({ category: cat._id });
            if (productCount === 0) {
                await Category.findByIdAndDelete(cat._id);
                deletedCount++;
            } else {
                skippedCategories.push({
                    id: cat._id,
                    name: cat.name,
                    productCount,
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Cleanup complete. Deleted ${deletedCount} invalid categories.`,
            data: {
                deletedCount,
                skippedCategories,
            },
        });
    } catch (error) {
        console.error("Cleanup categories error:", error);
        return res.status(500).json({
            success: false,
            message: "Error cleaning up categories",
            error: error.message,
        });
    }
};
