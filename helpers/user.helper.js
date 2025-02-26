const nodemailer = require("nodemailer");
const argon2 = require("argon2");

//Email verification

const verifyEmail = async (email) => {
  try {
    const otp = generateOtp();
    console.log("Sending OTP to:", email); // Log the recipient email

    const transporter = nodemailer.createTransport({
      service:'gmail',
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.USER_MAIL,
        pass: process.env.USER_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailoptions = {
      from: "process.env.USER_MAIL",
      to: email,

      subject: "OTP Verification",
      text: `Welcome to Tick-Tock !!! This is your OTP:  ${otp}`      
    };

    transporter.sendMail(mailoptions, (error) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent",otp);
      }
      
    });
    return otp;
    
  } catch (error) {
    console.log(error);
  }
}

//gennerate otp

const generateOtp = () => {
  otp = `${Math.floor(1000 + Math.random() * 9000)}`;
  return otp;
};

//password hashing

const hashPassword = async (pasword) => {
  try {
    const passwordHash = await argon2.hash(pasword);
    return passwordHash;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { verifyEmail, generateOtp, hashPassword };
