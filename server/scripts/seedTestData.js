/**
 * Seed Script for Auto-Analytical Engine Testing
 * 
 * Creates mock master data for testing:
 * - Partner Tags
 * - Contacts (Vendors & Customers)
 * - Product Categories
 * - Products
 * - Analytics Masters
 * - Auto-Analytical Rules
 * - Budget (optional)
 * 
 * SAFETY:
 * - Checks for existing records by unique name
 * - Does NOT create duplicates
 * - Logs IDs of created documents
 * 
 * RUN: node scripts/seedTestData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Contact = require('../models/Contact');
const Product = require('../models/Product');
const Category = require('../models/Category');
const PartnerTag = require('../models/PartnerTag');
const AnalyticMaster = require('../models/AnalyticMaster');
const AutoAnalyticalModel = require('../models/AutoAnalyticalModel');
const Budget = require('../models/Budget');
const User = require('../models/User');

// Store created IDs for reference
const createdIds = {
    partnerTags: {},
    contacts: {},
    categories: {},
    products: {},
    analytics: {},
    rules: {},
    budgets: {},
};

/**
 * Helper: Find or create a document
 */
async function findOrCreate(Model, searchQuery, createData, idStore, key) {
    try {
        let doc = await Model.findOne(searchQuery);

        if (doc) {
            console.log(`  ✓ Already exists: ${key}`);
            idStore[key] = doc._id;
            return { doc, created: false };
        }

        doc = await Model.create(createData);
        console.log(`  + Created: ${key} (ID: ${doc._id})`);
        idStore[key] = doc._id;
        return { doc, created: true };
    } catch (error) {
        console.error(`  ✗ Error creating ${key}:`, error.message);
        return { doc: null, created: false, error };
    }
}

/**
 * Get or create a system user for createdBy field
 */
async function getSystemUser() {
    let user = await User.findOne({ email: 'system@test.com' });

    if (!user) {
        // Try to find any existing user
        user = await User.findOne({});

        if (!user) {
            console.log('  ! No users found. Creating seed user...');
            user = await User.create({
                firstName: 'System',
                lastName: 'Seed',
                email: 'system@test.com',
                password: 'test123456',
                accountType: 'Admin',
            });
            console.log(`  + Created system user: ${user._id}`);
        } else {
            console.log(`  ✓ Using existing user: ${user.email}`);
        }
    }

    return user;
}

/**
 * STEP 1: Create Partner Tags
 */
async function seedPartnerTags(userId) {
    console.log('\n📌 PARTNER TAGS');
    console.log('-'.repeat(40));

    const tags = [
        { name: 'furniture', displayName: 'Furniture', color: '#8B4513' },
        { name: 'wood', displayName: 'Wood', color: '#D2691E' },
        { name: 'electronics', displayName: 'Electronics', color: '#4169E1' },
        { name: 'lighting', displayName: 'Lighting', color: '#FFD700' },
    ];

    for (const tag of tags) {
        await findOrCreate(
            PartnerTag,
            { name: tag.name },
            { ...tag, createdBy: userId },
            createdIds.partnerTags,
            tag.displayName
        );
    }
}

/**
 * STEP 2: Create Contacts (Vendors & Customers)
 */
async function seedContacts(userId) {
    console.log('\n👥 CONTACTS');
    console.log('-'.repeat(40));

    // Vendor 1: Azure Interior (furniture + wood tags)
    await findOrCreate(
        Contact,
        { email: 'azure.interior@test.com' },
        {
            name: 'Azure Interior',
            email: 'azure.interior@test.com',
            phone: '+91-9876543210',
            address: {
                street: '123 Furniture Lane',
                city: 'Jodhpur',
                state: 'Rajasthan',
                country: 'India',
                pincode: '342001',
            },
            partnerTags: [
                createdIds.partnerTags['Furniture'],
                createdIds.partnerTags['Wood'],
            ].filter(Boolean),
            status: 'confirmed',
            createdBy: userId,
        },
        createdIds.contacts,
        'Azure Interior'
    );

    // Vendor 2: Bright Lights Co (electronics + lighting tags)
    await findOrCreate(
        Contact,
        { email: 'bright.lights@test.com' },
        {
            name: 'Bright Lights Co',
            email: 'bright.lights@test.com',
            phone: '+91-9876543211',
            address: {
                street: '456 Electric Avenue',
                city: 'Mumbai',
                state: 'Maharashtra',
                country: 'India',
                pincode: '400001',
            },
            partnerTags: [
                createdIds.partnerTags['Electronics'],
                createdIds.partnerTags['Lighting'],
            ].filter(Boolean),
            status: 'confirmed',
            createdBy: userId,
        },
        createdIds.contacts,
        'Bright Lights Co'
    );

    // Customer: Shiv Furniture
    await findOrCreate(
        Contact,
        { email: 'shiv.furniture@test.com' },
        {
            name: 'Shiv Furniture',
            email: 'shiv.furniture@test.com',
            phone: '+91-9876543212',
            address: {
                street: '789 Customer Street',
                city: 'Jaipur',
                state: 'Rajasthan',
                country: 'India',
                pincode: '302001',
            },
            status: 'confirmed',
            createdBy: userId,
        },
        createdIds.contacts,
        'Shiv Furniture'
    );
}

/**
 * STEP 3: Create Product Categories
 */
async function seedCategories(userId) {
    console.log('\n📦 PRODUCT CATEGORIES');
    console.log('-'.repeat(40));

    const categories = [
        { name: 'Wooden Furniture', description: 'Furniture made from wood', color: '#8B4513' },
        { name: 'Lighting', description: 'Lighting fixtures and equipment', color: '#FFD700' },
        { name: 'Electronics', description: 'Electronic devices and accessories', color: '#4169E1' },
    ];

    for (const cat of categories) {
        await findOrCreate(
            Category,
            { name: cat.name },
            { ...cat, createdBy: userId },
            createdIds.categories,
            cat.name
        );
    }
}

/**
 * STEP 4: Create Products
 */
async function seedProducts(userId) {
    console.log('\n🛒 PRODUCTS');
    console.log('-'.repeat(40));

    const products = [
        {
            name: 'Table',
            category: createdIds.categories['Wooden Furniture'],
            salesPrice: 15000,
            purchasePrice: 10000,
        },
        {
            name: 'Chair',
            category: createdIds.categories['Wooden Furniture'],
            salesPrice: 5000,
            purchasePrice: 3000,
        },
        {
            name: 'LED Light',
            category: createdIds.categories['Lighting'],
            salesPrice: 2000,
            purchasePrice: 1200,
        },
        {
            name: 'Desktop Monitor',
            category: createdIds.categories['Electronics'],
            salesPrice: 25000,
            purchasePrice: 18000,
        },
    ];

    for (const prod of products) {
        if (!prod.category) {
            console.log(`  ✗ Skipping ${prod.name} - category not found`);
            continue;
        }

        await findOrCreate(
            Product,
            { name: prod.name },
            { ...prod, status: 'confirmed', createdBy: userId },
            createdIds.products,
            prod.name
        );
    }
}

/**
 * STEP 5: Create Analytics Masters (Cost Centers)
 */
async function seedAnalytics(userId) {
    console.log('\n📊 ANALYTICS MASTERS');
    console.log('-'.repeat(40));

    const analytics = [
        {
            name: 'Diwali',
            description: 'Diwali 2026 Event Expenses',
            type: 'Expense',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
        },
        {
            name: 'Furniture Expo 2026',
            description: 'International Furniture Exhibition',
            type: 'Expense',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-03-31'),
        },
        {
            name: 'Office Renovation',
            description: 'Office renovation and modernization',
            type: 'Expense',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-06-30'),
        },
    ];

    for (const analytic of analytics) {
        await findOrCreate(
            AnalyticMaster,
            { name: analytic.name },
            { ...analytic, status: 'confirmed', createdBy: userId },
            createdIds.analytics,
            analytic.name
        );
    }
}

/**
 * STEP 6: Create Auto-Analytical Rules
 */
async function seedRules(userId) {
    console.log('\n⚙️  AUTO-ANALYTICAL RULES');
    console.log('-'.repeat(40));

    // RULE 1: Category-based (Wooden Furniture → Furniture Expo 2026)
    await findOrCreate(
        AutoAnalyticalModel,
        { name: 'Category: Wooden Furniture' },
        {
            name: 'Category: Wooden Furniture',
            description: 'Assign all wooden furniture purchases to Furniture Expo 2026',
            productCategoryId: createdIds.categories['Wooden Furniture'],
            analyticsId: createdIds.analytics['Furniture Expo 2026'],
            status: 'confirmed',
            createdBy: userId,
        },
        createdIds.rules,
        'Rule: Category Wooden Furniture'
    );

    // Small delay to ensure different updatedAt for tie-breaker testing
    await new Promise(resolve => setTimeout(resolve, 100));

    // RULE 2: Partner-based (Azure Interior → Diwali)
    await findOrCreate(
        AutoAnalyticalModel,
        { name: 'Partner: Azure Interior' },
        {
            name: 'Partner: Azure Interior',
            description: 'Assign all Azure Interior purchases to Diwali budget',
            partnerId: createdIds.contacts['Azure Interior'],
            analyticsId: createdIds.analytics['Diwali'],
            status: 'confirmed',
            createdBy: userId,
        },
        createdIds.rules,
        'Rule: Partner Azure Interior'
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // RULE 3: Category + Partner (Most specific - Azure Interior + Wooden Furniture → Diwali)
    await findOrCreate(
        AutoAnalyticalModel,
        { name: 'Partner + Category: Azure Interior + Wooden Furniture' },
        {
            name: 'Partner + Category: Azure Interior + Wooden Furniture',
            description: 'Most specific rule: Azure Interior vendor + Wooden Furniture category → Diwali',
            partnerId: createdIds.contacts['Azure Interior'],
            productCategoryId: createdIds.categories['Wooden Furniture'],
            analyticsId: createdIds.analytics['Diwali'],
            status: 'confirmed',
            createdBy: userId,
        },
        createdIds.rules,
        'Rule: Partner + Category'
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // RULE 4: Product-specific (LED Light → Office Renovation)
    await findOrCreate(
        AutoAnalyticalModel,
        { name: 'Product: LED Light' },
        {
            name: 'Product: LED Light',
            description: 'Assign all LED Light purchases to Office Renovation',
            productId: createdIds.products['LED Light'],
            analyticsId: createdIds.analytics['Office Renovation'],
            status: 'confirmed',
            createdBy: userId,
        },
        createdIds.rules,
        'Rule: Product LED Light'
    );
}

/**
 * STEP 7: Create Budget (Optional)
 */
async function seedBudget(userId) {
    console.log('\n💰 BUDGETS');
    console.log('-'.repeat(40));

    const diwaliAnalyticsId = createdIds.analytics['Diwali'];
    const furnitureExpoId = createdIds.analytics['Furniture Expo 2026'];
    const officeRenovationId = createdIds.analytics['Office Renovation'];

    if (!diwaliAnalyticsId) {
        console.log('  ✗ Diwali analytics not found, skipping budget');
        return;
    }

    await findOrCreate(
        Budget,
        { name: 'Annual Budget 2026' },
        {
            name: 'Annual Budget 2026',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            status: 'confirmed',
            lines: [
                {
                    analyticMasterId: diwaliAnalyticsId,
                    budgetedAmount: 500000,
                    achievedAmount: 0,
                },
                furnitureExpoId && {
                    analyticMasterId: furnitureExpoId,
                    budgetedAmount: 200000,
                    achievedAmount: 0,
                },
                officeRenovationId && {
                    analyticMasterId: officeRenovationId,
                    budgetedAmount: 150000,
                    achievedAmount: 0,
                },
            ].filter(Boolean),
            createdBy: userId,
        },
        createdIds.budgets,
        'Annual Budget 2026'
    );
}

/**
 * Print Summary
 */
function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 SEED DATA SUMMARY');
    console.log('='.repeat(60));

    console.log('\n📌 Partner Tags:');
    Object.entries(createdIds.partnerTags).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n👥 Contacts:');
    Object.entries(createdIds.contacts).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n📦 Categories:');
    Object.entries(createdIds.categories).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n🛒 Products:');
    Object.entries(createdIds.products).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n📊 Analytics:');
    Object.entries(createdIds.analytics).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n⚙️  Rules:');
    Object.entries(createdIds.rules).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n💰 Budgets:');
    Object.entries(createdIds.budgets).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ EXPECTED TEST SCENARIOS');
    console.log('='.repeat(60));
    console.log(`
1. PO with Vendor=Azure Interior, Product=Chair
   → Should auto-assign: "Diwali" (Rule: Partner + Category, score=2)

2. PO with Vendor=Bright Lights Co, Product=Chair
   → Should auto-assign: "Furniture Expo 2026" (Rule: Category only, score=1)

3. PO with any Vendor, Product=LED Light
   → Should auto-assign: "Office Renovation" (Rule: Product specific, score=1)

4. Manual override should be respected on subsequent edits
`);
}

/**
 * Main function
 */
async function main() {
    console.log('='.repeat(60));
    console.log('🌱 AUTO-ANALYTICAL ENGINE - SEED DATA SCRIPT');
    console.log('='.repeat(60));

    try {
        // Connect to MongoDB
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected to MongoDB');

        // Get system user
        console.log('\n👤 Getting system user...');
        const user = await getSystemUser();
        const userId = user._id;

        // Seed data in order (respecting dependencies)
        await seedPartnerTags(userId);
        await seedCategories(userId);
        await seedContacts(userId);
        await seedProducts(userId);
        await seedAnalytics(userId);
        await seedRules(userId);
        await seedBudget(userId);

        // Print summary
        printSummary();

        console.log('\n✅ Seed script completed successfully!');

    } catch (error) {
        console.error('\n❌ Seed script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
main();
