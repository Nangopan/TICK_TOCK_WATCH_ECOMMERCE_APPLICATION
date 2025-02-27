const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const User = require("../../model/userSchema");
const { Address } = require("../../model/addressSchema");
const Order = require("../../model/orderSchema");
const Razorpay = require('razorpay');

const mongoose = require("mongoose");
const ObjectId = require("mongoose");

const loadCheckoutPage = async (req, res) => {
  try {
    let userData = await User.findById(req.session.user._id).lean();
    const ID = new mongoose.Types.ObjectId(userData._id);

    const addressData = await Address.find({ userId: userData._id }).lean();
    // let coupon = await Coupon.find().lean();

    const subTotal = await Cart.aggregate([
      {
        $match: {
          userId: ID,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$value" },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]);
    let cart = await Cart.aggregate([
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
        $project: {
          _id: 1,
          userId: 1,
          quantity: 1,
          value: 1,
          productName: { $arrayElemAt: ["$productData.name", 0] },
          productPrice: { $arrayElemAt: ["$productData.price", 0] },
          productDescription: { $arrayElemAt: ["$productData.description", 0] },
          productImage: { $arrayElemAt: ["$productData.imageUrl", 0] },
        },
      },
    ]);
    console.log(cart);

    res.render("user/checkout", {
      userData,
      addressData,
      subTotal: subTotal[0].total,
      cart,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const placeorder = async (req, res) => {
  try {
    console.log("place order ");
    userData = req.session.user;
    const ID = new mongoose.Types.ObjectId(userData._id);
    const addressId = req.body.selectedAddress;
    const payMethod = req.body.selectedPayment;
    const totalamount = req.body.amount;
    console.log("Request dot body  ", addressId, payMethod, totalamount);

    console.log('Coupon data:', req.body.couponData); // To check if the couponData is passed
console.log('Coupon Name:', req.body.couponName); // To check the coupon name value

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
        $project: {
          product_Id: 1,
          userId: 1,
          quantity: 1,
          value: 1,
          name: { $arrayElemAt: ["$productData.name", 0] },
          price: { $arrayElemAt: ["$productData.price", 0] },
          productDescription: { $arrayElemAt: ["$productData.description", 0] },
          image: { $arrayElemAt: ["$productData.imageUrl", 0] },
        },
      },
    ]);
    console.log(productInCart);

    let productDet = productInCart.map((item) => {
      return {
        _id: item.product_Id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image[0],
      };
    });

    console.log(productDet, "aggregated cart prods");

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



    // Save the order
    let saveOrder = async () => {
      const order = new Order({
        userId: ID,
        product: productDet,
        address: addressId,
        orderId: ordeId,
        total: grandTotal,
        paymentMethod: payMethod,
        discountAmt: discountAmt,
        amountAfterDscnt: grandTotal,  // The grand total after discount + delivery charge
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

      const deletedCart = await Cart.deleteMany({
        userId: ID,
      }).lean();

      console.log(deletedCart, "deletedCart");
    };

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
        const newWallet = req.body.updateWallet;

        await User.findByIdAndUpdate(
          userData._id,
          { $set: { wallet: newWallet + 50 } },
          { new: true }
        );

        await saveOrder();

        res.json({ walletSucess: true });
      }
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};




const orderSuccess = async (req, res) => {
  try {
    res.render("user/orderPlaced", {
      title: "Order Placed",
      userData,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};






module.exports = {
  loadCheckoutPage,
  placeorder,
  orderSuccess,
};
