const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const database = require('./config/database');
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const { cloudinaryConnect } = require("./config/cloudinary");
const passport = require("./config/passport");

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
const corsOptions = {
    origin: "http://localhost:5173", // Replace with your frontend URL
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Connecting to database
database.connectDB();

// Connect to Cloudinary
cloudinaryConnect();

// Routes
const userRoutes = require("./routes/user");
const fileUploadRoutes = require("./routes/fileUpload");
const paymentRoutes = require("./routes/payment");

app.use("/api/auth", userRoutes);
app.use("/api/files", fileUploadRoutes);
app.use("/api/payment", paymentRoutes);


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
