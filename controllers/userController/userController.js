const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");
const User = require("../../model/userSchema");
const argon2 = require("argon2");
const userHelper = require("../../helpers/user.helper");
const Cart = require("../../model/cartSchema");
const Order = require("../../model/orderSchema");

const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

let otp;
let userOtp;
let userEmail;
let hashedPassword;
let userRegData;
let userData;

// Homepage

const getHome = async (req, res) => {
  try {
    const userData = req.session.user;

   

    const Products = await Product.aggregate([
      { $match: { isBlocked: false } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
    ]);
    
    console.log(Products);
    
    
    console.log(Products);
    
    console.log("Aggregated Product Details 1:", Products);


    const category = await Category.find({ isListed: true }).lean();
    res.render("user/home", { category, Products, userData });
  } catch (error) {
    console.log(error);
  }
};

// Get Login Page

const getLogin = async (req, res) => {
  const regSuccessMsg = "User registered sucessfully..!!";
  const blockMsg = "User has been Blocked..!!";
  const mailErr = "Incorrect email or password..!!";
  const successMessage = "Password reset successfully!";

  try {
    if (req.session.mailErr) {
      res.render("user/login", { mailErr });
      req.session.mailErr = false;
    } else if (req.session.regSuccessMsg) {
      res.render("user/login", { regSuccessMsg });
      req.session.regSuccessMsg = false;
    } else if (req.session.successMessage) {
      res.render("user/login", { successMessage });
      req.session.successMessage = false;
    } else if (req.session.blockMsg) {
      res.render("user/login", { blockMsg });
      req.session.blockMsg = false;
    } else {
      res.render("user/login");
    }
  } catch (error) {
    console.log(error);
  }
};

// Do Login

const doLogin = async (req, res) => {
  try {
    let email = req.body.email;
    let password = req.body.password;
    userData = await User.findOne({ email: email });

    if (userData) {
      if (await argon2.verify(userData.password, password)) {
        const isBlocked = userData.isBlocked;

        if (!isBlocked) {
          req.session.LoggedIn = true;
          req.session.user = userData;
          res.redirect("/");
        } else {
          //userData = null
          req.session.blockMsg = true;
          res.redirect("/login");
        }
      } else {
        req.session.mailErr = true;
        res.redirect("/login");
      }
    } else {
      req.session.mailErr = true;
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error);
  }
};

// Do Logout

const doLogout = async (req, res) => {
  try {
    req.session.user= null    
    userData = null;
    res.redirect("/login");    
  } catch (error) {
    console.log(error.message);
  }
};

// Get Signup Page

const getSignup = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    console.log(error);
  }
};

// Do Signup

const doSignup = async (req, res) => {
  try {
    let message = "",
      message1 = "";
    hashedPassword = await userHelper.hashPassword(req.body.password);
    userEmail = req.body.email;
    userMobile = req.body.phone;
    userRegData = req.body;

    const userExist = await User.findOne({ email: userEmail }).lean();
    const mobileExist = await User.findOne({ mobile: userMobile }).lean();
    if (!userExist && !mobileExist) {
      otp = await userHelper.verifyEmail(userEmail);
      res.render("user/submitOtp");
    } else {
      if (userExist) {
        req.session.message = true;
        message = "!!User Already Exist!!";
      }

      if (mobileExist) {
        req.session.message1 = true;
        message1 = "!!Mobile Number Already Exist!!";
      }

      res.render("user/signup", { message, message1 });
    }
  } catch (error) {
    console.log(error);
  }
};

// Get otp page

const getOtp = (req, res) => {
  try {
    res.render("user/submitOtp");
  } catch (error) {
    console.log(error);
  }
};

// Submit Otp

const submitOtp = async (req, res) => {
  try {
    userOtp = req.body.otp;

    if (userOtp == otp) {
      const user = new User({
        name: userRegData.name,
        email: userRegData.email,
        mobile: userRegData.phone,
        password: hashedPassword,
        isVerified: true,
        isBlocked: false,
      });
      await user.save();
      req.session.regSuccessMsg = true;
      res.json({ success: true, redirectUrl: "/" });
    } else {
      otpError = "incorrect otp";
      res.json({ error: otpError });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: "An error occurred while submitting the OTP." });
  }
};

// Resend Otp

const resendOtp = async (req, res) => {
  try {
    if (userEmail) {
      otp = await userHelper.verifyEmail(userEmail);
      console.log("Sending OTP to:", userEmail, otp); // Fixed variable name
      res.json({ success: true, message: "OTP resent successfully" }); // Send success response
    } else {
      res.json({ error: "User email not found. Please restart signup." });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: "An error occurred while resending OTP." });
  }
};

//google callback

const googleCallback = async (req, res) => {
  try {
    userData = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { name: req.user.displayName, isVerified: true } },
      { upsert: true, new: true }
    );
    console.log(userData);

    if (userData.isBlocked) {
      req.session.blockMsg = true;
      res.redirect("/login");
    } else {
      req.session.LoggedIn = true;
      req.session.user = userData;
      res.redirect("/");
    }
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
};

// Get Product Page

const productDetails = async (req, res) => {
  try {
    const userData = req.session.user;
    const productID = req.params.id;
    console.log("Product ID: ", productID);
    
    const products = await Product.aggregate([
      { $match: { _id: new ObjectId(productID) } }, // Match product by productID
    ]);
    
    let product = products[0];
    console.log(product)

    let productExistInCart;
    let outOfStock;

    await Product.updateOne(
      {
        _id: productID,
      },
      {
        $inc: {
          popularity: 1,
        },
      }
    );

    if (product.stock === 0) {
      outOfStock = true;
    }



    if (userData) {
      const ProductExist = await Cart.find({
        userId: userData._id,
        product_Id: productID,
      });

      console.log(ProductExist);
      if (ProductExist.length === 0) {
        productExistInCart = false;
      } else {
        productExistInCart = true;
      }

      res.render("user/productDetails", {
        product,
        outOfStock,
        productExistInCart,
        ProductExist,
        userData,
        
      });
    } else {
      res.render("user/productDetails", {
        product,
        outOfStock,
        productExistInCart: false,
      });
    }
  } catch (error) {}
};



module.exports = {
  getHome,
  getLogin,
  getSignup,
  doSignup,
  getOtp,
  submitOtp,
  resendOtp,
  doLogin,
  doLogout,
  googleCallback,
  productDetails,
 
};
