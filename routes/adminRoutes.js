const express = require('express')
const router = express.Router()
const { getLogin, doLogin, doLogout,getDashboard,loadReviews } = require("../controllers/adminController/adminController")
const { showProduct, addProductPage, addProduct, blockProduct, showeditProduct, updateProduct, deleteProdImage } = require('../controllers/adminController/productManagement');
const { addCategoryPage, addNewCategory, showCategoryPage, unListCategory, showEditCategory, updateCategory } = require('../controllers/adminController/categoryManagement');
const { usersPage, blockUser } = require('../controllers/adminController/userManagement');
const { ordersPage, orderDetails, changeStatus } = require('../controllers/adminController/ordersManagement');
const { couponPage, addCouponPage, addCouponPost, editCouponPage, editCouponPost, deleteCoupon } = require('../controllers/adminController/couponManagement');
const {loadBanner,addBanner,addBannerPost,editBanner,deleteBanner, updateBannerPost}=require("../controllers/adminController/bannerManagement")

const{ productOfferPage, addProductOfferPage, addProductOffer, editProductOfferPage, editProductOffer, deleteProductOffer, categoryOfferPage, addCategoryOfferPage, addCategoryOffer, editCategoryOfferPage, editCategoryOffer, deleteCategoryOffer } = require('../controllers/adminController/offerManagement');
const {  loadDashboard, getSales,getChartData}=require('../controllers/adminController/dashBoardManagement');
const { isLogin, isLogout } = require("../middleware/adminAuth")
const store = require('../middleware/multer');
const { walletManagement, transactionDetails } = require('../controllers/adminController/walletManagement');

// Admin Login & Logout

router.get("/admin/login", isLogout , getLogin)
router.post("/admin/login" , isLogout, doLogin)
router.get("/admin/logout",  doLogout)

router.get('/admin/home', isLogin, loadDashboard)


// Product Page

router.get('/admin/product',  showProduct)
router.get('/admin/addProduct', isLogin ,  addProductPage)
router.post('/admin/addProduct', isLogin, store.array('image', 5), addProduct)
router.put('/admin/blockProduct', isLogin, blockProduct)
router.post('/admin/unlistCategory', isLogin, unListCategory)
router.get('/admin/editProduct/:id', isLogin, showeditProduct)
router.post('/admin/updateProduct/:id', isLogin, store.array('image', 5), updateProduct)
router.delete('/admin/product_img_delete', isLogin, deleteProdImage)


// Category Page

router.get('/admin/addCategory',isLogin  , addCategoryPage)
router.post('/admin/addCategory', isLogin , store.single('image'), addNewCategory)
router.get('/admin/category',  isLogin, showCategoryPage)
router.get('/admin/editCategory/:id',  showEditCategory)
router.post('/admin/updateCategory/:id' , store.single('image') , updateCategory )



// Users Page

router.get('/admin/users', isLogin, usersPage) 
router.put('/admin/blockuser', isLogin, blockUser)


// Orders Page 

router.get('/admin/orders', isLogin, ordersPage)
router.get('/admin/order_details/:id', isLogin, orderDetails)
router.post('/admin/change_status/:id', isLogin, changeStatus)


// coupon

router.get('/admin/coupons',isLogin,couponPage)
router.get('/admin/addcoupon',isLogin,addCouponPage)
router.post('/admin/add_coupon', isLogin, addCouponPost)
router.get('/admin/editcoupon/:id', editCouponPage);
router.post('/admin/editcoupon/:id', editCouponPost);
router.delete('/admin/delete_coupon',isLogin,deleteCoupon)


// product offer

router.get('/admin/productOffers', isLogin, productOfferPage)
router.get('/admin/addProOffers', isLogin, addProductOfferPage)
router.post('/admin/addProOffers', isLogin, addProductOffer)
router.get('/admin/editProductOffer/:id', isLogin, editProductOfferPage)
router.post("/admin/editProductOffer/:id", isLogin, editProductOffer);
router.delete('/admin/deleteProOffer/:id', isLogin, deleteProductOffer)

// category offer

router.get('/admin/categoryOffers', isLogin, categoryOfferPage)
router.get('/admin/addCatOffers', isLogin, addCategoryOfferPage)
router.post('/admin/addCatOffers', isLogin, addCategoryOffer)
router.get('/admin/editCategoryOffer/:id', isLogin, editCategoryOfferPage)
router.post("/admin/editCategoryOffer/:id", isLogin, editCategoryOffer);
router.delete('/admin/deleteCatOffer/:id', isLogin, deleteCategoryOffer)

// dashboard sales report and chart

router.get('/admin/get_sales',isLogin, getSales)
router.get('/admin/get_chart_data',isLogin, getChartData)


// banners

router.get('/admin/banners', loadBanner)
router.get('/admin/add_banner', addBanner)
router.post('/admin/add_banner', store.single('image'),addBannerPost)
router.get('/admin/delete_banner',deleteBanner)
router.get('/admin/edit_banner/:id' ,editBanner)
router.post('/admin/edit_banner/:id' , store.single('image'),  updateBannerPost )



//wallet 

router.get('/admin/wallet' , walletManagement)
router.get('/admin/wallet/:transactionId', transactionDetails);

module.exports = router


