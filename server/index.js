const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const { CLIENT_URLS } = require("./config/api");
const database = require('./config/database');
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const { cloudinaryConnect } = require("./config/cloudinary");
const passport = require("./config/passport");
const User = require("./models/User");
const bcrypt = require("bcrypt");

const port = process.env.PORT || 4000;

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

// File upload middleware
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
}));

// CORS configuration
const allowedOrigins = new Set(CLIENT_URLS);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Connecting to database
database.connectDB();

seedDemoUsers().catch((error) => {
    console.error('Demo user seeding failed:', error);
});

// Connect to Cloudinary
cloudinaryConnect();

async function seedDemoUsers() {
    const demoUsers = [
        {
            email: 'demo-admin@example.com',
            loginId: 'demo-admin',
            password: 'Demo@1234',
            firstName: 'Demo',
            lastName: 'Admin',
            accountType: 'admin',
        },
        {
            email: 'demo-portal@example.com',
            loginId: 'demo-portal',
            password: 'Demo@1234',
            firstName: 'Demo',
            lastName: 'Portal',
            accountType: 'portal',
        },
    ];

    for (const demoUser of demoUsers) {
        const hashedPassword = await bcrypt.hash(demoUser.password, 10);
        await User.findOneAndUpdate(
            { $or: [{ email: demoUser.email }, { loginId: demoUser.loginId }] },
            {
                $set: {
                    ...demoUser,
                    name: `${demoUser.firstName} ${demoUser.lastName}`,
                    password: hashedPassword,
                },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );
    }
}

// Routes
const userRoutes = require("./routes/user");
const fileUploadRoutes = require("./routes/fileUpload");
const paymentRoutes = require("./routes/payment");
// Master Data routes
const contactRoutes = require("./routes/contact");
const productRoutes = require("./routes/product");
const categoryRoutes = require("./routes/category");
const partnerTagRoutes = require("./routes/partnerTag");
const analyticMasterRoutes = require("./routes/analyticMaster");
const budgetRoutes = require("./routes/budget");
const purchaseOrderRoutes = require("./routes/purchaseOrder");
const vendorRoutes = require("./routes/vendor");
const autoAnalyticalModelRoutes = require("./routes/autoAnalyticalModel");
const portalRoutes = require("./routes/portal");
const vendorBillRoutes = require("./routes/vendorBill");
const salesOrderRoutes = require("./routes/salesOrder");
const customerInvoiceRoutes = require("./routes/customerInvoice");

app.use("/api/auth", userRoutes);
app.use("/api/files", fileUploadRoutes);
app.use("/api/payment", paymentRoutes);
// Mount Master Data routes
app.use("/api/contacts", contactRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/partner-tags", partnerTagRoutes);
app.use("/api/analytics", analyticMasterRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/auto-analytical", autoAnalyticalModelRoutes);
// Portal routes for customers and vendors
app.use("/api/portal", portalRoutes);
app.use("/api/vendor-bills", vendorBillRoutes);
app.use("/api/sales-orders", salesOrderRoutes);
app.use("/api/customer-invoices", customerInvoiceRoutes);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
