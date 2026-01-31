const nodemailer = require("nodemailer")

const mailSender = async (email, title, body) => {
  try {
    let transporter = nodemailer.createTransport({
      service: 'gmail', // Use Gmail service
      host: process.env.MAIL_HOST,
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    let info = await transporter.sendMail({
      from: `"Budget Management System" <${process.env.MAIL_USER}>`,
      to: `${email}`,
      subject: `${title}`,
      html: `${body}`,
    })
    console.log("Email sent successfully:", info.response)
    return info
  } catch (error) {
    console.log("Email sending error:", error.message)
    return error.message
  }
}

module.exports = mailSender
