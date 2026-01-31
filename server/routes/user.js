const express = require("express");
const jwt = require("jsonwebtoken");
const { signup, login, sendotp, forgotPassword } = require("../controllers/Auth");
const passport = require("../config/passport");
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/sendotp", sendotp);
router.post("/forgotpassword", forgotPassword);

// Check if Google OAuth is configured
const isGoogleConfigured = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret && 
         clientId !== 'your_google_client_id_here' && 
         clientSecret !== 'your_google_client_secret_here';
};

// Google OAuth routes
router.get("/google", (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
    });
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.redirect("http://localhost:5173/login?error=google_not_configured");
  }
  
  passport.authenticate("google", { session: false, failureRedirect: "/login" }, (err, user) => {
    if (err || !user) {
      return res.redirect("http://localhost:5173/login?error=auth_failed");
    }
    
    // Generate JWT token for the user
    const token = jwt.sign(
      { email: user.email, id: user._id, role: user.accountType },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    
    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  })(req, res, next);
});

// Get current user (for verifying token)
router.get("/me", require("../middleware/auth").auth, async (req, res) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Check if Google OAuth is available
router.get("/google/status", (req, res) => {
  res.json({ 
    success: true, 
    googleEnabled: isGoogleConfigured() 
  });
});

module.exports = router;
