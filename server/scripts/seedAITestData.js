/**
 * Seed AI Test Data
 * 
 * Creates realistic mock data to test the AI recommendation system:
 * - Vendors with varied purchase histories
 * - Purchase orders with different analytics assignments
 * - Patterns for AI to learn from
 * 
 * Usage: node server/scripts/seedAITestData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Product = require('../models/Product');
const Category = require('../models/Category');
const AnalyticMaster = require('../models/AnalyticMaster');
const PurchaseOrder = require('../models/PurchaseOrder');
const User = require('../models/User');

async function seedAITestData() {
    try {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║        Seed AI Test Data - Using Existing Products        ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        // Connect to database
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected\n');

        // Get or create admin user
        let adminUser = await User.findOne({ accountType: 'admin' });
        if (!adminUser) {
            adminUser = await User.create({
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@test.com',
                password: '$2a$10$YourHashedPasswordHere', // Dummy hash
                accountType: 'admin',
            });
            console.log('✅ Created admin user\n');
        } else {
            console.log(`✅ Using existing admin user: ${adminUser.email}\n`);
        }

        // Fetch existing products and analytics
        const products = await Product.find().populate('category').lean();
        const analytics = await AnalyticMaster.find().lean();

        if (products.length === 0 || analytics.length === 0) {
            console.log('❌ No products or analytics found! Run seedTestData.js first');
            return;
        }

        console.log(`📦 Found ${products.length} existing products`);
        console.log(`📊 Found ${analytics.length} existing analytics\n`);

        // Create vendors (using Contact model - no type field needed)
        console.log('👥 Creating vendors (contacts)...');
        const vendorData = [
            {
                name: 'Office Supplies Co.',
                email: 'contact@officesupplies.com',
                phone: '1234567890',
                partnerTags: [],
            },
            {
                name: 'Tech Hardware Ltd.',
                email: 'sales@techhardware.com',
                phone: '9876543210',
                partnerTags: [],
            },
            {
                name: 'Furniture Plus',
                email: 'info@furnitureplus.com',
                phone: '5555555555',
                partnerTags: [],
            },
            {
                name: 'Stationery World',
                email: 'orders@stationeryworld.com',
                phone: '4444444444',
                partnerTags: [],
            },
        ];

        // Check if vendors already exist or create new ones
        let vendors = [];
        for (const vData of vendorData) {
            let vendor = await Contact.findOne({ email: vData.email });
            if (!vendor) {
                try {
                    vendor = await Contact.create({
                        ...vData,
                        createdBy: adminUser._id,
                    });
                    console.log(`   ✅ Created vendor: ${vendor.name}`);
                } catch (error) {
                    if (error.code === 11000) {
                        // Email exists - find and use it
                        vendor = await Contact.findOne({ email: vData.email });
                        console.log(`   ℹ️  Using existing contact: ${vendor.name}`);
                    } else {
                        throw error;
                    }
                }
            } else {
                console.log(`   ℹ️  Using existing contact: ${vendor.name}`);
            }
            vendors.push(vendor);
        }
        console.log(`✅ Total vendor contacts available: ${vendors.length}\n`);

        // Create purchase orders with patterns for AI to learn
        console.log('📝 Creating purchase orders with patterns...\n');

        const purchaseOrders = [];
        const startDate = new Date('2024-01-01');

        // Pattern 1: Office Supplies Co. always uses first analytic for office products
        const officeVendor = vendors[0];
        const officeProducts = products.filter(p => 
            p.name.toLowerCase().includes('chair') || 
            p.name.toLowerCase().includes('desk') ||
            p.name.toLowerCase().includes('pen')
        ).slice(0, 3);

        console.log(`Pattern 1: ${officeVendor.name} → ${analytics[0]?.name || 'First Analytics'}`);
        for (let i = 0; i < 5; i++) {
            const product = officeProducts[i % officeProducts.length];
            if (!product) continue;

            const orderDate = new Date(startDate);
            orderDate.setDate(orderDate.getDate() + (i * 7));

            purchaseOrders.push({
                poNumber: 'TEMP', // Will be set later with timestamp
                vendorId: officeVendor._id,
                poDate: orderDate,
                status: 'confirmed',
                lines: [{
                    productId: product._id,
                    description: product.name,
                    quantity: Math.floor(Math.random() * 10) + 1,
                    unitPrice: Math.floor(Math.random() * 1000) + 100,
                    lineTotal: 0, // Will be calculated
                    budgetAnalyticId: analytics[0]?._id,
                    autoAssigned: true,
                    autoAssignmentDetails: {
                        source: 'manual_seeding',
                        confidence: 1.0,
                        reason: 'Pattern for AI learning',
                    }
                }],
                subTotal: 0,
                taxAmount: 0,
                totalAmount: 0,
                createdBy: adminUser._id,
            });
        }

        // Pattern 2: Tech Hardware Ltd. uses second analytic for tech products
        if (vendors.length > 1 && analytics.length > 1) {
            const techVendor = vendors[1];
            const techProducts = products.filter(p => 
                p.name.toLowerCase().includes('laptop') || 
                p.name.toLowerCase().includes('monitor') ||
                p.name.toLowerCase().includes('keyboard')
            ).slice(0, 3);

            console.log(`Pattern 2: ${techVendor.name} → ${analytics[1]?.name || 'Second Analytics'}`);
            for (let i = 0; i < 5; i++) {
                const product = techProducts[i % techProducts.length] || products[0];
                const orderDate = new Date(startDate);
                orderDate.setDate(orderDate.getDate() + (i * 7) + 3);

                purchaseOrders.push({
                    poNumber: 'TEMP', // Will be set later with timestamp
                    vendorId: techVendor._id,
                    poDate: orderDate,
                    status: 'confirmed',
                    lines: [{
                        productId: product._id,
                        description: product.name,
                        quantity: Math.floor(Math.random() * 5) + 1,
                        unitPrice: Math.floor(Math.random() * 5000) + 500,
                        lineTotal: 0,
                        budgetAnalyticId: analytics[1]?._id,
                        autoAssigned: true,
                        autoAssignmentDetails: {
                            source: 'manual_seeding',
                            confidence: 1.0,
                            reason: 'Pattern for AI learning',
                        }
                    }],
                    subTotal: 0,
                    taxAmount: 0,
                    totalAmount: 0,
                    createdBy: adminUser._id,
                });
            }
        }

        // Pattern 3: Mixed vendors with third analytic
        if (vendors.length > 2 && analytics.length > 2) {
            const furnitureVendor = vendors[2];
            console.log(`Pattern 3: ${furnitureVendor.name} → ${analytics[2]?.name || 'Third Analytics'}`);
            
            for (let i = 0; i < 4; i++) {
                const product = products[i % products.length];
                const orderDate = new Date(startDate);
                orderDate.setDate(orderDate.getDate() + (i * 10));

                purchaseOrders.push({
                    poNumber: 'TEMP', // Will be set later with timestamp
                    vendorId: furnitureVendor._id,
                    poDate: orderDate,
                    status: 'confirmed',
                    lines: [{
                        productId: product._id,
                        description: product.name,
                        quantity: Math.floor(Math.random() * 8) + 2,
                        unitPrice: Math.floor(Math.random() * 2000) + 200,
                        lineTotal: 0,
                        budgetAnalyticId: analytics[2]?._id,
                        autoAssigned: false, // Some manual assignments
                        autoAssignmentDetails: {
                            source: 'manual_seeding',
                            confidence: 1.0,
                            reason: 'Pattern for AI learning',
                        }
                    }],
                    subTotal: 0,
                    taxAmount: 0,
                    totalAmount: 0,
                    createdBy: adminUser._id,
                });
            }
        }

        // Calculate totals for all orders
        purchaseOrders.forEach(po => {
            po.lines.forEach(line => {
                line.lineTotal = line.quantity * line.unitPrice;
            });
            po.subTotal = po.lines.reduce((sum, line) => sum + line.lineTotal, 0);
            po.taxAmount = po.subTotal * 0.18; // 18% tax
            po.totalAmount = po.subTotal + po.taxAmount;
        });

        // Delete existing test POs first
        const deleteResult = await PurchaseOrder.deleteMany({ 
            'lines.autoAssignmentDetails.source': 'manual_seeding'
        });
        console.log(`   Deleted ${deleteResult.deletedCount} existing test purchase orders\n`);

        // Insert new POs with unique PO numbers
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        purchaseOrders.forEach((po, index) => {
            po.poNumber = `PO-TEST-${timestamp}-${String(index + 1).padStart(3, '0')}`;
        });

        const createdPOs = await PurchaseOrder.create(purchaseOrders);
        console.log(`✅ Created ${createdPOs.length} purchase orders\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('SUMMARY - AI Test Data Ready');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📊 Database Contents:');
        console.log(`   Vendors: ${vendors.length}`);
        console.log(`   Products: ${products.length}`);
        console.log(`   Analytics: ${analytics.length}`);
        console.log(`   Purchase Orders: ${createdPOs.length}\n`);

        console.log('🎯 AI Learning Patterns Created:');
        console.log(`   Pattern 1: ${officeVendor.name} → ${analytics[0]?.name} (5 orders)`);
        if (vendors.length > 1 && analytics.length > 1) {
            console.log(`   Pattern 2: ${vendors[1].name} → ${analytics[1]?.name} (5 orders)`);
        }
        if (vendors.length > 2 && analytics.length > 2) {
            console.log(`   Pattern 3: ${vendors[2].name} → ${analytics[2]?.name} (4 orders)`);
        }

        console.log('\n✅ AI test data seeded successfully!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Run test: node scripts/testAIRecommendation.js');
        console.log('   2. Add API key to .env: GEMINI_API_KEY=your_key');
        console.log('   3. Enable AI: AI_RECOMMENDATION_ENABLED=true\n');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from database');
    }
}

seedAITestData();
