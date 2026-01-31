/**
 * Seed Script for Portal Users and Test Documents
 * 
 * Creates:
 * - Portal users linked to existing contacts
 * - Sample invoices for customer testing
 * - Sample bills for vendor testing
 * 
 * RUN: node scripts/seedPortalData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const User = require('../models/User');
const Contact = require('../models/Contact');
const Invoice = require('../models/Invoice');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const AnalyticMaster = require('../models/AnalyticMaster');

// Store created IDs
const createdIds = {
    portalUsers: {},
    invoices: {},
    bills: {},
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
 * Get an admin user for createdBy field
 */
async function getAdminUser() {
    // Try to find ANY user to attribute creation to
    let user = await User.findOne({ accountType: 'admin' });

    if (!user) {
        // Fallback to any user (e.g. system seed user)
        user = await User.findOne({});
    }

    if (!user) {
        // Create a temporary admin user if absolutely no users exist
        try {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            user = await User.create({
                firstName: 'System',
                lastName: 'Admin',
                email: 'admin.seed@test.com',
                password: hashedPassword,
                accountType: 'admin',
            });
            console.log('  + Created temp admin user for seeding');
        } catch (err) {
            throw new Error('Failed to find or create admin user: ' + err.message);
        }
    }
    return user;
}

/**
 * Create portal users linked to contacts
 */
async function seedPortalUsers() {
    console.log('\n👤 PORTAL USERS');
    console.log('-'.repeat(40));

    // Find existing contacts
    const azureInterior = await Contact.findOne({ email: 'azure.interior@test.com' });
    const shivFurniture = await Contact.findOne({ email: 'shiv.furniture@test.com' });

    if (!azureInterior || !shivFurniture) {
        console.log('  ! Contacts not found. Run seedTestData.js first.');
        return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('portal123', 10);

    // Vendor portal user (Azure Interior)
    await findOrCreate(
        User,
        { email: 'vendor.portal@test.com' },
        {
            firstName: 'Azure',
            lastName: 'Vendor',
            email: 'vendor.portal@test.com',
            password: hashedPassword,
            accountType: 'portal',
            contactId: azureInterior._id,
        },
        createdIds.portalUsers,
        'Vendor Portal User'
    );

    // Customer portal user (Shiv Furniture)
    await findOrCreate(
        User,
        { email: 'customer.portal@test.com' },
        {
            firstName: 'Shiv',
            lastName: 'Customer',
            email: 'customer.portal@test.com',
            password: hashedPassword,
            accountType: 'portal',
            contactId: shivFurniture._id,
        },
        createdIds.portalUsers,
        'Customer Portal User'
    );
}

/**
 * Create sample invoices for customer testing
 */
async function seedInvoices(adminUserId) {
    console.log('\n🧾 SAMPLE INVOICES (for Customer)');
    console.log('-'.repeat(40));

    const shivFurniture = await Contact.findOne({ email: 'shiv.furniture@test.com' });
    const product = await Product.findOne({ name: 'Table' });
    const analytic = await AnalyticMaster.findOne({ name: 'Diwali' });

    if (!shivFurniture || !product || !analytic) {
        console.log('  ! Required data not found. Run seedTestData.js first.');
        return;
    }

    // Invoice 1 - Paid
    await findOrCreate(
        Invoice,
        { invoiceNumber: 'INV/2026/0001' },
        {
            invoiceNumber: 'INV/2026/0001',
            customer: shivFurniture._id,
            invoiceDate: new Date('2026-01-05'),
            dueDate: new Date('2026-02-05'),
            status: 'paid',
            lines: [{
                product: product._id,
                description: 'Wooden Table',
                quantity: 2,
                unitPrice: 15000,
                subtotal: 30000,
                analyticMaster: analytic._id,
            }],
            subtotalAmount: 30000,
            totalAmount: 30000,
            paidAmount: 30000,
            balanceAmount: 0,
            createdBy: adminUserId,
        },
        createdIds.invoices,
        'Invoice 1 (Paid)'
    );

    // Invoice 2 - Partial
    await findOrCreate(
        Invoice,
        { invoiceNumber: 'INV/2026/0002' },
        {
            invoiceNumber: 'INV/2026/0002',
            customer: shivFurniture._id,
            invoiceDate: new Date('2026-01-15'),
            dueDate: new Date('2026-02-15'),
            status: 'sent',
            lines: [{
                product: product._id,
                description: 'Wooden Table Premium',
                quantity: 3,
                unitPrice: 18000,
                subtotal: 54000,
                analyticMaster: analytic._id,
            }],
            subtotalAmount: 54000,
            totalAmount: 54000,
            paidAmount: 20000,
            balanceAmount: 34000,
            createdBy: adminUserId,
        },
        createdIds.invoices,
        'Invoice 2 (Partial)'
    );

    // Invoice 3 - Not Paid
    await findOrCreate(
        Invoice,
        { invoiceNumber: 'INV/2026/0003' },
        {
            invoiceNumber: 'INV/2026/0003',
            customer: shivFurniture._id,
            invoiceDate: new Date('2026-01-25'),
            dueDate: new Date('2026-02-25'),
            status: 'sent',
            lines: [{
                product: product._id,
                description: 'Executive Table',
                quantity: 1,
                unitPrice: 45000,
                subtotal: 45000,
                analyticMaster: analytic._id,
            }],
            subtotalAmount: 45000,
            totalAmount: 45000,
            paidAmount: 0,
            balanceAmount: 45000,
            createdBy: adminUserId,
        },
        createdIds.invoices,
        'Invoice 3 (Not Paid)'
    );
}

/**
 * Create sample bills for vendor testing
 */
async function seedBills(adminUserId) {
    console.log('\n📄 SAMPLE BILLS (for Vendor)');
    console.log('-'.repeat(40));

    const azureInterior = await Contact.findOne({ email: 'azure.interior@test.com' });
    const product = await Product.findOne({ name: 'Chair' });
    const analytic = await AnalyticMaster.findOne({ name: 'Diwali' });

    if (!azureInterior || !product || !analytic) {
        console.log('  ! Required data not found. Run seedTestData.js first.');
        return;
    }

    // Bill 1 - Paid
    await findOrCreate(
        Bill,
        { billNumber: 'BILL/2026/0001' },
        {
            billNumber: 'BILL/2026/0001',
            vendor: azureInterior._id,
            billDate: new Date('2026-01-03'),
            dueDate: new Date('2026-02-03'),
            status: 'paid',
            lines: [{
                product: product._id,
                description: 'Wooden Chair Set',
                quantity: 10,
                unitPrice: 3000,
                subtotal: 30000,
                analyticMaster: analytic._id,
            }],
            subtotalAmount: 30000,
            totalAmount: 30000,
            paidAmount: 30000,
            balanceAmount: 0,
            createdBy: adminUserId,
        },
        createdIds.bills,
        'Bill 1 (Paid)'
    );

    // Bill 2 - Partial
    await findOrCreate(
        Bill,
        { billNumber: 'BILL/2026/0002' },
        {
            billNumber: 'BILL/2026/0002',
            vendor: azureInterior._id,
            billDate: new Date('2026-01-12'),
            dueDate: new Date('2026-02-12'),
            status: 'confirmed',
            lines: [{
                product: product._id,
                description: 'Premium Chair Set',
                quantity: 20,
                unitPrice: 4500,
                subtotal: 90000,
                analyticMaster: analytic._id,
            }],
            subtotalAmount: 90000,
            totalAmount: 90000,
            paidAmount: 40000,
            balanceAmount: 50000,
            createdBy: adminUserId,
        },
        createdIds.bills,
        'Bill 2 (Partial)'
    );

    // Bill 3 - Not Paid
    await findOrCreate(
        Bill,
        { billNumber: 'BILL/2026/0003' },
        {
            billNumber: 'BILL/2026/0003',
            vendor: azureInterior._id,
            billDate: new Date('2026-01-28'),
            dueDate: new Date('2026-02-28'),
            status: 'confirmed',
            lines: [{
                product: product._id,
                description: 'Office Chair Bulk Order',
                quantity: 50,
                unitPrice: 3500,
                subtotal: 175000,
                analyticMaster: analytic._id,
            }],
            subtotalAmount: 175000,
            totalAmount: 175000,
            paidAmount: 0,
            balanceAmount: 175000,
            createdBy: adminUserId,
        },
        createdIds.bills,
        'Bill 3 (Not Paid)'
    );
}

/**
 * Print summary
 */
function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PORTAL DATA SUMMARY');
    console.log('='.repeat(60));

    console.log('\n👤 Portal Users:');
    Object.entries(createdIds.portalUsers).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n🧾 Invoices (Customer):');
    Object.entries(createdIds.invoices).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n📄 Bills (Vendor):');
    Object.entries(createdIds.bills).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🔑 PORTAL LOGIN CREDENTIALS');
    console.log('='.repeat(60));
    console.log(`
VENDOR PORTAL:
  Email:    vendor.portal@test.com
  Password: portal123
  → Will see Bills from Azure Interior

CUSTOMER PORTAL:
  Email:    customer.portal@test.com
  Password: portal123
  → Will see Invoices for Shiv Furniture
`);
}

/**
 * Main function
 */
async function main() {
    console.log('='.repeat(60));
    console.log('🌱 PORTAL DATA SEED SCRIPT');
    console.log('='.repeat(60));

    try {
        // Connect to MongoDB
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected to MongoDB');

        // Get admin user
        const adminUser = await getAdminUser();
        console.log(`\n👤 Using admin: ${adminUser.email}`);

        // Seed data
        await seedPortalUsers();
        await seedInvoices(adminUser._id);
        await seedBills(adminUser._id);

        // Print summary
        printSummary();

        console.log('\n✅ Portal data seeded successfully!');

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
