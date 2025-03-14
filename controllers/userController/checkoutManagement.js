const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");
const Order = require("../../model/orderSchema");
const Coupon = require("../../model/couponSchema");
const Razorpay = require('razorpay');
const HttpStatus = require('../../httpStatus');

const mongoose = require("mongoose");
const ObjectId = require("mongoose");




// const loadCheckoutPage = async (req, res) => {
//   try {
//     let userData = await User.findById(req.session.user._id).lean();
//     const ID = new mongoose.Types.ObjectId(userData._id);

//     const addressData = await Address.find({ userId: userData._id }).lean();
//     let coupon = await Coupon.find().lean();

//     const subTotal = await Cart.aggregate([
//       {
//         $match: {
//           userId: ID,
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           total: { $sum: "$subTotal" },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           total: 1,
//         },
//       },
//     ]);

//     let cart = await Cart.aggregate([
//       {
//         $match: {
//           userId: ID,
//         },
//       },
//       {
//         $lookup: {
//           from: "products",
//           foreignField: "_id",
//           localField: "product_Id",
//           as: "productData",
//         },
//       },
//       {
//         $unwind: {
//           path: "$productData",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "productoffers", 
//           localField: "productData._id",
//           foreignField: "productId",
//           as: "productOffer",
//         },
//       },
//       {
//         $unwind: {
//           path: "$productOffer",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           userId: 1,
//           quantity: 1,
//           value: 1,
//           productName: "$productData.name",
//           productPrice: {
//             $cond: {
//               if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] },
//               then: "$productOffer.discountPrice",
//               else: "$productData.price",
//             },
//           },
//           productDescription: "$productData.description",
//           productImage: "$productData.imageUrl",
//         },
//       },
//     ]);

//     console.log("final->.......",cart);
//     console.log("Subtotal:", subTotal);
//     const cartData = await Cart.find({ userId: ID }).lean();
//     console.log("Cart Data:", cartData);~
//     res.render("user/checkout", {
//       userData,
//       addressData,
//       subTotal: subTotal[0]?.total || 0, 
//       cart,
//       coupon,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(HttpStatus.InternalServerError).send("Internal Server Error");
//   }
// };

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    let userData = await User.findById(userId).lean();
    const ID = new mongoose.Types.ObjectId(userId);

    // Fetch user address data
    const addressData = await Address.find({ userId }).lean();

    // Fetch available coupons
    // Fetch only usable coupons (not used by the current user)
    const coupon = await Coupon.find({
      $or: [
        { usedBy: { $ne: userData._id } }, // Not used by this user
        { usedBy: { $exists: false } },    // Not assigned to any user
        { isUsed: false }                  // If you track usage with a boolean field
      ]
    }).lean();

    // Get the cart data to match product IDs and quantities
  const cartItems = await Cart.find({ userId: ID }).lean();

    const cartItemtoRender = await Cart.find({ userId: ID })
  .populate({
    path: "product_Id", // Populate product details
    model: "Product",
  })
  .lean(); 

  console.log("cartItems_______________________________",cartItems)
  
  console.log("cartItems_______________________________",cartItemtoRender)

    // If no items in cart, return an empty response for cart details
    if (!cartItems.length) {
      return res.render("user/checkout", {
        userData,
        addressData,
        subTotal: 0,
        cart: [],
        coupon,
      });
    }

    // Fetch all products that are in the user's cart from the Product collection
    const productIds = cartItems.map((item) => item.product_Id);
    const products = await Product.aggregate([
      {
        $match: { _id: { $in: productIds } },
      },
      {
        $lookup: {
          from: "productoffers", // Match product offers
          localField: "_id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      {
        $unwind: {
          path: "$productOffer",
          preserveNullAndEmptyArrays: true, // Include products without offers
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          stock:1,
          price: {
            $cond: {
              if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] },
              then: "$productOffer.discountPrice",
              else: "$price",
            },
          },
          description: 1,
          imageUrl: 1,
        },
      },
    ]);

    // Combine cart quantities and product data
    const cart = cartItems.map((cartItem) => {
      const product = products.find((p) => p._id.equals(cartItem.product_Id));
      return {
        ...cartItem,
        productName: product?.name || "Unknown Product",
        productPrice: product?.price || 0,
        productStock: product?.stock,
        productDescription: product?.description || "No description available",
        productImage: product?.imageUrl || "default_image.png",
        value: (product?.price || 0) * cartItem.quantity,
      };
    });

    // Calculate the subtotal
    const subTotal = cart.reduce((total, item) => total + item.value, 0);

    console.log("Final Cart:", cart);
    console.log("Subtotal:", subTotal);

    res.render("user/checkout", {
      userData,
      addressData,
      subTotal,
      cart,
      coupon,
    });
  } catch (error) {
    console.log("Error loading checkout page:", error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const placeorder = async (req, res) => {
  try {
    console.log("place order ", req.body);
    let userData = req.session.user;
    const ID = new mongoose.Types.ObjectId(userData._id);
    const addressId = req.body.selectedAddress;
    const payMethod = req.body.selectedPayment;
    const totalamount = req.body.amount;
    console.log("Request dot body  ", addressId, payMethod, totalamount);

    console.log('Coupon data:', req.body.couponData); 
    console.log('Coupon Name:', req.body.couponName); 

    const result = Math.random().toString(36).substring(2, 7);
    const id = Math.floor(100000 + Math.random() * 900000);
    const ordeId = result + id;

    const productInCart = await Cart.aggregate([
      {
        $match: {
          userId: ID,
        },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "product_Id",
          as: "productData",
        },
      },
      {
        $unwind: {
          path: "$productData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "productoffers",
          localField: "productData._id",
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
      {
        $project: {
          product_Id: 1,
          userId: 1,
          quantity: 1,
          name: "$productData.name",
          productDescription: "$productData.description",
          image: "$productData.imageUrl",
          discountPrice:  {
            $cond: {
              if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] }, 
              then: "$productOffer.discountPrice", 
              else: "$productData.price", 
            },
          },
          stock: "$productData.stock",
        },
      }
      
    ]);
    
 
    
    
    console.log("product in cart =======>",productInCart);

    let productDet = productInCart.map((item) => {
      return {
        _id: item.product_Id,
        name: item.name,
        price: item.discountPrice,
        quantity: item.quantity,
        image: item.image[0],
        stock: item.stock,
      };
    });



    console.log("aggregated cart prods-------->",productDet);

    for (let product of productDet) {
      if (product.quantity > product.stock) {
        return res.json({
          message: `Insufficient stock for product: ${product.name}. Available stock: ${product.stock}`,
        });
      }
    }

    console.log("stock...........>",'product.stock')

    // Apply coupon if present
    let finalTotal = totalamount;
    let discountAmt = 0;

    if (req.body.couponData) {
      console.log(req.body.couponData)
      finalTotal = req.body.couponData.newTotal;
      discountAmt = req.body.couponData.discountAmt;
    }

    const DELIVERY_CHARGE = 50;
    const grandTotal = finalTotal + DELIVERY_CHARGE;

    let saveOrder = async () => {
      console.log("paymentMethod", payMethod)
      const order = new Order({  
        userId: ID,
        product: productDet,
        address: addressId,
        orderId: ordeId,
        total: grandTotal,
        paymentMethod: payMethod,
        discountAmt: discountAmt,
        amountAfterDscnt: grandTotal,  
        coupon: req.body.couponName ? req.body.couponName : "",
        couponUsed: req.body.couponData ? true : false,
      });

      if (req.body.status) {
        order.status = "Payment Failed";
        console.log("Payment Failed  ", order.status)
    }

      const ordered = await order.save();
      console.log(ordered, "ordersaved DATAAAA");

      productDet.forEach(async (product) => {
        await Product.updateMany(
          { _id: product._id },
          { $inc: { stock: -product.quantity, bestSelling:1 } }
        );
      });
      productDet.forEach(async (product) => {
        const populatedProd= await Product.findById(product._id).populate("category").lean()
        await Category.updateMany({ _id: populatedProd.category._id }, { $inc: { bestSelling:1} });

    })

    // Mark the coupon as used after the order is placed
    if (req.body.couponData) {
      await Coupon.updateOne(
        { code: req.body.couponName },
        { $addToSet: { usedBy: ID } }
      );
    }


      const deletedCart = await Cart.deleteMany({
        userId: ID,
      }).lean();

      console.log(deletedCart, "deletedCart");
    };
//save order ends
    if (addressId) {
      if (payMethod === "cash-on-delivery") {
        console.log("CASH ON DELIVERY");
        await saveOrder();
        res.json({ COD: true });
      } else if (payMethod === "razorpay") {
        const amount = grandTotal;
        let instance = new Razorpay({
          key_id: "rzp_test_RgbHBDrROekluj",
          key_secret: "uRixJRQVnd8RCggLiHa5SEaG",
        });
        const order = await instance.orders.create({
          amount: amount * 100,
          currency: "INR",
          receipt: "Manikandan",
        });
        await saveOrder();

        res.json({
          razorPaySucess: true,
          order,
          amount,
        });
      } else if (payMethod === "wallet") {
        console.log('inside the wallettttttttttt')

        const newWallet = req.body.updateWallet;

        const userWallet = await User.findByIdAndUpdate(
          userData._id,
          { $set: { wallet: newWallet } },
          { new: true }
        );

        console.log("userwalet" , userWallet)

        const userHistory = await User.updateOne(
          {_id:userData._id},
          {
            $push:{
              history:{
                amount:grandTotal,
                status:"Amount Debited",
                date:Date.now()
              }
            }
          }
        )

        console.log("userHistory  ", userHistory)


        await saveOrder();

        res.json({ walletSucess: true });
      }
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};




const orderSuccess = async (req, res) => {
  try {

    res.render("user/orderPlaced", {
      title: "Order Placed",
      userData: req.session.user,
    });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const validateCoupon = async (req, res) => {
  try {
    const { couponVal, subTotal } = req.body;
    console.log(couponVal, subTotal);
    const coupon = await Coupon.findOne({ code: couponVal });

    if (!coupon) {
      res.json("invalid");
    } else if (coupon.expiryDate < new Date()) {
      res.json("expired");
    } else if (subTotal < coupon.minPurchase) {
      res.json("Minimum Amount Required");
    } else {
      const couponId = coupon._id;
      const discount = coupon.discount;
      const userId = req.session.user._id;

      const isCpnAlredyUsed = await Coupon.findOne({
        _id: couponId,
        usedBy: { $in: [userId] },
      });

      if (isCpnAlredyUsed) {
        res.json("already used");
      } else {
        
        const discnt = Number(discount);
        const discountAmt = (subTotal * discnt) / 100;
        const newTotal = subTotal - discountAmt;

        const user = User.findById(userId);

        res.json({
          discountAmt,
          newTotal,
          discount,
          succes: "succes",
        });
      }
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const applyCoupon = async (req, res) => {
  try {
    const { couponVal, subTotal } = req.body;
    const coupon = await Coupon.findOne({ code: couponVal });
    const userId = req.session.user._id;

    if (!coupon) {
      return res.json({ status: "invalid" });
    } else if (coupon.expiryDate < new Date()) {
      return res.json({ status: "expired" });
    } else if (coupon.usedBy.includes(userId)) {
      return res.json({ status: "already_used" });
    } else if (subTotal < coupon.minPurchase) {
      return res.json({ status: "min_purchase_not_met" });
    } else {
  
      await Coupon.updateOne(
        { _id: coupon._id },
        { $addToSet: { usedBy: userId } }
      );

     
      let discountAmt = (subTotal * coupon.discount) / 100;
      if (discountAmt > coupon.maxDiscount) {
        discountAmt = coupon.maxDiscount;
      }
      const newTotal = subTotal - discountAmt;

      return res.json({
        discountAmt,
        newTotal,
        discount: coupon.discount,
        status: "applied",
        couponVal,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(HttpStatus.InternalServerError).json({ status: "error", error });
  }
};



const removeCoupon = async (req, res) => {
  try {
    const { couponVal, subTotal } = req.body;
    const coupon = await Coupon.findOne({ code: couponVal });
    const userId = req.session.user._id;

    if (!coupon) {
      return res.json({ status: "invalid" });
    } else if (!coupon.usedBy.includes(userId)) {
      return res.json({ status: "not_used" });
    } else {
      await Coupon.updateOne(
        { _id: coupon._id },
        { $pull: { usedBy: userId } }
      );
      const discountAmt = 0;
      const newTotal = subTotal;

      return res.json({
        discountAmt,
        newTotal,
        discount: coupon.discount,
        status: "removed",
        couponVal,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(HttpStatus.InternalServerError).json({ status: "error", error });
  }
};



module.exports = {
  loadCheckoutPage,
  placeorder,
  orderSuccess,
  validateCoupon,
  applyCoupon,
  removeCoupon,
};
