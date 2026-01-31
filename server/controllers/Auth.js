const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const forgotPasswordTemplate = require("../mail/templates/forgotPasswordTemplate");

// Signup function
exports.signup = async (req, res) => {
  try {
    // Destructure fields from the request body
    const { email, password, confirmPassword, accountType, otp } = req.body;
    // Check if All Details are there or not
    if (!email || !password || !confirmPassword || !accountType || !otp) {
      return res.status(403).send({
        success: false,
        message: "All Fields are required",
      });
    }

    // Check if password and confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and Confirm Password do not match. Please try again.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please sign in to continue.",
      });
    }

    const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
    console.log(response);
    if (response.length === 0) {
      // OTP not found for the email
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      });
    } else if (otp !== response[0].otp) {
      // Invalid OTP
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create entry in db

    const user = await User.create({
      email,
      password: hashedPassword,
      accountType: accountType,
    });
    return res.status(200).json({
      success: true,
      user,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again.",
    });
  }
};

// Login function
exports.login = async (req, res) => {
  try {
    // Get email and password from request body
    const { email, password } = req.body;

    // Check if email or password is missing
    if (!email || !password) {
      // Return 400 Bad Request status code with error message
      return res.status(400).json({
        success: false,
        message: `Please Fill up All the Required Fields`,
      });
    }

    // check if user exists in db
    // Find user with provided email
    const user = await User.findOne({ email });

    // If user not found with provided email
    if (!user) {
      // Return 401 Unauthorized status code with error message
      return res.status(401).json({
        success: false,
        message: `User is not Registered with Us Please SignUp to Continue`,
      });
    }

    //generate JWT token after matching password and compare password

    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { email: user.email, id: user._id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      // Save token to user document in database
      user.token = token;
      user.password = undefined;
      // Set cookie for token and return success response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };
      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: `User Login Success`,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: `Password is incorrect`,
      });
    }
  } catch (error) {
    console.error(error);
    // Return 500 Internal Server Error status code with error message
    return res.status(500).json({
      success: false,
      message: `Login Failure Please Try Again`,
    });
  }
};

// Send OTP For Email Verification
exports.sendotp = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user with provided email
    const checkUserPresent = await User.findOne({ email });
    // to be used in case of signup

    // If user found with provided email
    if (checkUserPresent) {
      // Return 401 Unauthorized status code with error message
      return res.status(401).json({
        success: false,
        message: `User is Already Registered`,
      });
    }

    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    // check unique otp -- Brute force approach
    const result = await OTP.findOne({ otp: otp });
    console.log("Result is Generate OTP Func");
    console.log("OTP", otp);
    console.log("Result", result); // why is result null? -> kyunki OTP.findOne() returns null if no otp is found
    while (result) {
      //-> to check if otp is unique or not
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
      });
    }
    const otpPayload = { email, otp };
    const otpBody = await OTP.create(otpPayload);
    console.log("OTP Body", otpBody);
    res.status(200).json({
      success: true,
      message: `OTP Sent Successfully`,
      otp,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Function for Forgot Password - Send Email
exports.forgotPassword = async (req, res) => {
	try {
		const { email } = req.body;

		// Check if user exists with provided email
		const
			user = await User.findOne ({ email });   
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User with this email does not exist.",
			});
		}

		// Generate a reset token (JWT or any random token)
		const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1h", //  
		});

		// Frontend link for resetting password
		const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;


		const subject = 'Password Reset Request';
		const body = forgotPasswordTemplate(user?.firstName,resetUrl);

			await mailSender(email , subject , body);

		return res.status(200).json({
			success: true,
			message: "Password reset email sent successfully.",
		});
	}
	catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "Failed to send password reset email. Please try again.",
		});
	}
}


