const express = require("express")
const router = express.Router()
const { logedout, logedin, isBlocked } = require('../middleware/usersAuth')
const { getHome, getLogin, getSignup, doSignup, getOtp, verifyReferelCode,  loadReferalPage ,submitOtp, resendOtp, doLogin, doLogout , googleCallback, productDetails, aboutpage, cartAndWishlistCount } = require("../controllers/userController/userController")
const { submitMail, submitMailPost, forgotOtppage, forgotOtpSubmit, resetPasswordPage, resendOTP,resetPassword } = require('../controllers/userController/forgotPassword')
const { viewUserProfile, EditUserProfile, updateUserProfile, changePassword, updatePassword, myOrders, orderDetails, verify, walletpage, retryPayment } = require('../controllers/userController/profile')
const { addAddress, addAddressPost, manageAddress, editAddress, editAddressPost, deleteAddress } = require('../controllers/userController/addressManagement')
const { loadCartPage, addToCart, removeFromCart, updateCart, checkOutOfStock } = require('../controllers/userController/cart')
const { loadCheckoutPage, placeorder, orderSuccess, validateCoupon, applyCoupon, removeCoupon } = require('../controllers/userController/checkoutManagement')
const { getProduct, searchAndSort } = require('../controllers/userController/shopManagement')
const { showWishlistPage, addToWishList, removeFromWishList } = require('../controllers/userController/wishlistManagement')
const { addMoneyToWallet , verifyPayment }= require('../controllers/userController/walletManagement')
const { payment_failed, cancelOrder,returnOrder, cancelOneProduct , returnOneProduct, getInvoice,checkAddressPost }= require('../controllers/userController/orderManagement')
require('../middleware/googleAuth')
const passport = require('passport');
const store = require("../middleware/multer")


// Google authentication

router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleCallback)


// Get Home Page

router.get("/", getHome)


// Login & Logout

router.get("/login", logedout, getLogin)
router.post('/login', doLogin)
router.get('/logout', doLogout)

// Cart and wishlist count

router.get("/cart-wishlist-count",logedin,cartAndWishlistCount)

// Signup

// 🔹 Signup
router.get("/signup", logedout, getSignup);
router.post('/signup', logedout, doSignup);

// 🔹 OTP Verification
router.get('/otp/submit', logedout, getOtp);
router.post('/otp/submit', logedout, submitOtp);
router.get('/otp/resend', logedout, resendOtp);

//referals

router.post('/verifyReferalCode',verifyReferelCode)


// Forgot Password

router.get('/password/forgot', logedout, submitMail);
router.post('/password/forgot', logedout, submitMailPost);
router.get('/password/otp', logedout, forgotOtppage);
router.post('/password/otp', forgotOtpSubmit);
router.post('/password/otp/resend', resendOTP);
router.get('/password/reset', logedout, resetPasswordPage);
router.post('/password/reset', logedout, resetPassword);


// Shop Page

router.get('/shop', getProduct)
router.post('/search',searchAndSort)


// Product Detail Page

router.get('/productDetails/:id', productDetails)


// User Profile Page

router.get('/profile', logedin, isBlocked, viewUserProfile)
router.get('/edit_profile', logedin, isBlocked, EditUserProfile)
router.post('/edit_profile/:id', logedin, isBlocked, store.single('image'), updateUserProfile)
router.get('/changePassword', logedin, isBlocked, changePassword)
router.post('/updatePassword', logedin, isBlocked, updatePassword)
router.get('/add_address', logedin, isBlocked, addAddress)
router.get('/addresses', logedin, isBlocked, manageAddress)
router.post('/add_address', logedin, isBlocked, addAddressPost)
router.get('/edit_address/:id', logedin, isBlocked, editAddress)
router.post('/edit_address/:id', logedin, isBlocked, editAddressPost)
router.get('/delete_address/:id', logedin, isBlocked, deleteAddress)


// Order Page

router.get('/myOrders', logedin, isBlocked, myOrders)
router.get('/orderDetails/:id', logedin, isBlocked, orderDetails)
router.post('/verifyPayment', logedin, isBlocked, verify)
router.post('/retry-payment/:id',logedin, isBlocked, retryPayment)

// Cart Page

router.get('/cart', logedin, isBlocked, loadCartPage)
router.post('/addtocart/:id', logedin, isBlocked, addToCart)
router.post('/removeFromCart', logedin, isBlocked, removeFromCart)
router.post('/updatecart', logedin, isBlocked, updateCart)
router.post('/checkOutOfStock', logedin, isBlocked, checkOutOfStock);


//wallet

router.get('/wallet', logedin, isBlocked,walletpage)
router.post('/addmoneytowallet', logedin, isBlocked,addMoneyToWallet)
router.post('/verify_Payment', logedin, isBlocked,verifyPayment)


// Checkout Page

router.get('/cart/checkout', logedin, isBlocked, loadCheckoutPage)
router.post('/placeOrder', logedin, isBlocked, placeorder)
router.get('/orderPlaced', logedin, isBlocked, orderSuccess)
router.get('/payment_failed', logedin , isBlocked , payment_failed)
router.post('/checkout/add-address', checkAddressPost);


router.post('/validate_coupon', logedin, isBlocked, validateCoupon)
router.post('/apply_coupon',logedin, isBlocked, applyCoupon)
router.post('/remove_coupon', logedin, isBlocked, removeCoupon)




// Wishlist Page

router.get('/wishlist', logedin, isBlocked, showWishlistPage)
router.post('/addtowishlist', logedin, isBlocked, addToWishList)
router.post('/removeFromWishList', logedin, isBlocked, removeFromWishList)

// cancellation of order

router.put('/cancel-order/:id', logedin, isBlocked, cancelOrder);
router.put('/return-order/:id', logedin, isBlocked, returnOrder);
router.put('/cancel-one-product', logedin, isBlocked, cancelOneProduct);
router.put('/return-one-product', logedin, isBlocked, returnOneProduct);

// Invoice

router.get('/get_invoice', logedin, isBlocked, getInvoice)



router.get('/about', aboutpage)





module.exports = router