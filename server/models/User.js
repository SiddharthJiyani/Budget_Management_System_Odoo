const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        default: ""
    },
    firstName: {
        type: String,
        default: "",
        trim: true
    },
    lastName: {
        type: String,
        default: "",
        trim: true
    },
    loginId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        minlength: 6,
        maxlength: 12
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
    },
    googleId: {
        type: String,
        default: null,
    },
    accountType: {
        type: String,
        enum: ['portal', 'admin'],
        default: 'portal',
        required: [true]
    },
    // Link portal users to their Contact record (for invoice/bill filtering)
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        default: null,
    },
    profilePhoto: {
        type: String,
        default: "https://t4.ftcdn.net/jpg/05/49/98/39/240_F_549983970_bRCkYfk0P6PP5fKbMhZMIb07mCJ6esXL.jpg"
    },
    favorites: {
        type: [String],
        default: []
    },
    token: {
        type: String
    }


}, {
    timestamps: true
});


const User = mongoose.model('User', userSchema);
module.exports = User;