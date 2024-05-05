const nodemailer = require("nodemailer");

// Generate a random OTP
const auth = (otp, email) => {
  // Send the OTP to the user's email address
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.email,
      pass: process.env.emailpass,
    },
  });

  const mailOptions = {
    from: process.env.email,
    to: email,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("OTP sent successfully");
    }
  });
};

module.exports = auth;
