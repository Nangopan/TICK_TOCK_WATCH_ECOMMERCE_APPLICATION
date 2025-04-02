const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");
const User = require("../../model/userSchema");
const argon2 = require("argon2");
const userHelper = require("../../helpers/user.helper");
const Cart = require("../../model/cartSchema");
const Wishlist = require('../../model/wishlistSchema')
const Order = require("../../model/orderSchema");
const HttpStatus = require('../../httpStatus');
const Referral=require("../../model/referralSchema")
const {v4:uuidv4}=require("uuid")
const Banners=require("../../model/bannerSchema")


const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;



let otp;
let userOtp;
let userEmail;
let hashedPassword;
let userRegData;
let userData;
let redeemAmount
let referalAmount
let OwnerId



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
      {
        $lookup: {
          from: "productoffers",
          localField: "_id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      {
        $addFields: {
          productOffer: { $ifNull: [{ $arrayElemAt: ["$productOffer", 0] }, null] },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          description: 1,
          stock: 1,
          popularity: 1,
          bestSelling: 1,
          imageUrl: 1,
          category: {
            _id: 1,
            category: 1,
            imageUrl: 1,
            isListed: 1,
            bestSelling: 1,
          },
          discountPrice: {
            $cond: {
              if: { $and: [{ $eq: ["$productOffer.currentStatus", true] }, { $gt: ["$productOffer.discountPrice", 0] }] },
              then: "$productOffer.discountPrice",  
              else: null,  
            },
          },
        },
      },
    ]);
   const banners= await Banners.find({active: true}).lean()
    console.log(banners);
    console.log("Aggregated Product Details 1:", Products);

    const category = await Category.find({ isListed: true }).lean();
    res.render("user/home", { category, Products, userData,banners});
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};






const getLogin = async (req, res) => {
  const regSuccessMsg = "User registered successfully..!!";
  const blockMsg = "User has been Blocked..!!";
  const mailErr = "Incorrect email or password..!!";
  const successMessage = "Password reset successfully!";

  try {
    const enteredEmail = req.session.enteredEmail || ""; 
    const enteredPassword = req.session.enteredPassword || "";
    req.session.enteredEmail = "";
    req.session.enteredPassword = "";


    if (req.session.mailErr) {
      res.render("user/login", { mailErr, enteredEmail, enteredPassword  });
      req.session.mailErr = false;
    } else if (req.session.regSuccessMsg) {
      res.render("user/login", { regSuccessMsg, enteredEmail, enteredPassword  });
      req.session.regSuccessMsg = false;
    } else if (req.session.successMessage) {
      res.render("user/login", { successMessage, enteredEmail, enteredPassword  });
      req.session.successMessage = false;
    } else if (req.session.blockMsg) {
      res.render("user/login", { blockMsg, enteredEmail, enteredPassword  });
      req.session.blockMsg = false;
    } else {
      res.render("user/login", { enteredEmail , enteredPassword });
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
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
          req.session.blockMsg = true;
          req.session.enteredEmail = email; 
          req.session.enteredPassword = password;
          res.redirect("/login");
        }
      } else {
        req.session.mailErr = true;
        req.session.enteredEmail = email; 
        req.session.enteredPassword = password;
        res.redirect("/login");
      }
    } else {
      req.session.mailErr = true;
      req.session.enteredEmail = email; 
      req.session.enteredPassword = password;
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
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
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};
 
//cart and wishlistcount
const cartAndWishlistCount = async (req, res) => { 
  try {
    if (!req.session.user) {
      return res.json({ cartCount: 0, wishlistCount: 0 });
    }

    const userId = req.session.user._id;

    
    const cartItems = await Cart.find({ userId });
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0); 

    
    const wishlist = await Wishlist.findOne({ user: userId });
    const wishlistCount = wishlist && Array.isArray(wishlist.productId) ? wishlist.productId.length : 0;

    res.json({ cartCount, wishlistCount });
  } catch (error) {
    console.error("Error fetching counts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



//Renders the signup page.
const getSignup = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    console.error("Error loading signup page:", error.message);
  }
};

const doSignup = async (req, res) => {
  try {
    const hashedPassword = await userHelper.hashPassword(req.body.password);
    const userEmail = req.body.email;
    const userMobile = req.body.phone;
    const userRegData = req.body;

    const userExist = await User.findOne({ email: userEmail }).lean();
    const mobileExist = await User.findOne({ mobile: userMobile }).lean();

    if (!userExist && !mobileExist) {
      const { otp, otpTimestamp } = await userHelper.verifyEmail(userEmail);

      if (!otp) {
        return res.render("user/signup", { message: "Error generating OTP. Try again." });
      }

      req.session.userEmail = userEmail;
      req.session.userRegData = userRegData;
      req.session.hashedPassword = hashedPassword;
      req.session.otp = otp;
      req.session.otpTimestamp = otpTimestamp;

      return res.render("user/referal");
    }

    res.render("user/signup", {
      message: userExist ? "!!User Already Exists!!" : "",
      message1: mobileExist ? "!!Mobile Number Already Exists!!" : "",
    });
  } catch (error) {
    console.error("Error during signup: ", error);
    res.render("user/signup", { message: "An error occurred. Please try again." });
  }
};

const loadReferalPage=async(req,res)=>{
  try{
    res.render('user/referals')
  }catch(error){
    console.log(error)
  }
}

//post referral offer 

const verifyReferelCode = async (req, res) => {
  try {
    const referalCode = req.body.referalCode;
    console.log("referalCode: ", referalCode);

    const Owner = await Referral.findOne({ referralCode: referalCode });
    
    if (!Owner) {
      return res.json({ message: "Invalid referral code!" });
    }

    console.log("Owner: ", Owner);
    const OwnerId = Owner.userId;
    const referalAmount = 200;
    const redeemAmount = 100;

    req.session.redeemAmount = redeemAmount;
    req.session.OwnerId = OwnerId;
    req.session.referalAmount = referalAmount;
    
    res.json({ message: "Referral code verified successfully!" });
  } catch (error) {
    console.error("Error verifying referral code: ", error.message);
    res.status(500).json({ message: "An error occurred while verifying the referral code." });
  }
};




//Renders the OTP submission page
const getOtp = (req, res) => {
  try {
    res.render("user/submitOtp");
  } catch (error) {
    console.error("Error loading OTP page:", error.message);
  }
};

// Handles OTP submission and user registration.
const submitOtp = async (req, res) => {
  try {
    let userOtp = req.body.otp;
    if (!req.session.otp || !req.session.otpTimestamp) {
      return res.status(400).json({ error: "Session expired. Please request a new OTP." });
    }

    if (Date.now() - req.session.otpTimestamp > 60000) {
      req.session.otp = null;
      req.session.otpTimestamp = null;
      return res.status(400).json({ error: "OTP expired. Please request a new OTP." });
    }

    userOtp = Array.isArray(userOtp) ? userOtp.join("") : userOtp.toString().trim();

    if (userOtp === req.session.otp.toString().trim()) {
      if (!req.session.userRegData) {
        return res.status(400).json({ error: "Session expired. Please start the registration process again." });
      }

      const newUser = await User.create({
        name: req.session.userRegData.name,
        email: req.session.userRegData.email,
        mobile: req.session.userRegData.phone,
        password: req.session.hashedPassword,
        isVerified: true,
        isBlocked: false,
      });
      
      const userId = newUser._id;
      const { redeemAmount, referalAmount, OwnerId } = req.session;

      if (redeemAmount) {
        await User.updateOne(
          { _id: userId },
          {
            $inc: { wallet: redeemAmount },
            $push: {
              history: {
                amount: redeemAmount,
                status: 'Referred',
                date: Date.now(),
              },
            },
          }
        );
      }

      const generateReferalCode = uuidv4();
      await new Referral({
        userId: userId,
        referralCode: generateReferalCode,
      }).save();

      if (referalAmount && OwnerId) {
        await User.updateOne(
          { _id: OwnerId },
          {
            $inc: { wallet: referalAmount },
            $push: {
              history: {
                amount: referalAmount,
                status: "Referred",
                date: Date.now(),
              },
            },
          }
        );
      }
      
      req.session.regSuccessMsg = true;
      req.session.otp = null;
      req.session.otpTimestamp = null;
      req.session.userRegData = null;
      req.session.hashedPassword = null;
      req.session.redeemAmount = null;
      req.session.OwnerId = null;
      req.session.referalAmount = null;

      return res.status(200).json({ success: true, redirectUrl: "/login" });
    } else {
      return res.status(400).json({ error: "Incorrect OTP" });
    }
  } catch (error) {
    console.error("Error submitting OTP: ", error);
    return res.status(500).json({ error: "An error occurred while submitting the OTP." });
  }
};

// Resends OTP to the user.
const resendOtp = async (req, res) => {
  try {
    if (!req.session.userRegData || !req.session.userRegData.email) {
      return res.status(400).json({ error: "User email not found in session." });
    }

    const userEmail = req.session.userRegData.email.trim();
    if (!userEmail) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    const { otp, otpTimestamp } = await userHelper.verifyEmail(userEmail);
    if (!otp) {
      return res.status(500).json({ error: "Failed to generate OTP. Try again." });
    }

    req.session.otp = otp;
    req.session.otpTimestamp = otpTimestamp;

    return res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to resend OTP" });
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
      { $match: { _id: new ObjectId(productID) } }, 
      {
        $lookup: {
          from: "productoffers",  
          localField: "_id",  
          foreignField: "productId",  
          as: "productOffer", 
        },
      },
      {
        $unwind: {
          path: "$productOffer",  
          preserveNullAndEmptyArrays: true,  
        },
      },
    ]);
    
    let product = products[0];
    console.log(product)

    if (!product.productOffer) {
      product.productOffer = {};
    }

    let productExistInCart;
    let productExistInWishlist
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

      const ProductExist1 = await Wishlist.find({
        user: new ObjectId(userData._id),
        productId: new ObjectId(productID),
      });

      console.log('ProductExist1', ProductExist1);
      if (ProductExist1.length===0) {
        productExistInWishlist = false;
      } else {
        productExistInWishlist = true;
      }

      res.render("user/productDetails", {
        product,
        outOfStock,
        productExistInCart,
        ProductExist,
        productExistInWishlist,
        ProductExist1,
        userData,
        
      });
    } else {
      res.render("user/productDetails", {
        product,
        outOfStock,
        productExistInCart: false,
        productExistInWishlist: false,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


const aboutpage = async (req, res) => {
  try {
      res.render('user/about', {userData})

  } catch (error) {
      console.log(error.message);
      res.status(HttpStatus.InternalServerError).send("Internal Server Error");

  }
}




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
  aboutpage,
  cartAndWishlistCount,
  verifyReferelCode,
  loadReferalPage,
};
