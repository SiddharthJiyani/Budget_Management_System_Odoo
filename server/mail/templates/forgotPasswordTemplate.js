const forgotPasswordTemplate = (name, link) => {
    return `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 5px;">
        <h2>Hello,${name}</h2>
        <p>You recently requested to reset your password for your account. Click the button below to reset it. This password reset is only valid for the next 30 minutes.</p>
        <p style="text-align: center;">
            <a href="${link}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #007bff; border-radius: 5px; text-decoration: none;">Reset Password</a>
        </p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
        <p>Thank you,<br>LNMIIT Team</p>
    `
}

module.exports = forgotPasswordTemplate;

