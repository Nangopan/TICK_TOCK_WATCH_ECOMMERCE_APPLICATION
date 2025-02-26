const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const User = require("../../model/userSchema");
const { Address } = require("../../model/addressSchema");
const Order = require("../../model/orderSchema");

const mongoose = require("mongoose");
const ObjectId = require("mongoose");

const ordersPage = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.session.user_id });
    var page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    console.log(page);
    let limit = 3;

    const ordersData = await Order.find()
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .lean();
    const count = await Order.find({}).countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    console.log(ordersData);
    res.render("admin/orders", {
      admin: true,
      pages,
      currentPage: page,
      ordersData,
      layout: "adminLayout",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};
const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const IDORDER = new mongoose.Types.ObjectId(orderId);

    const myOrderDetails = await Order.findOne({ _id: orderId }).lean();
    const address = await Address.findOne({
      _id: myOrderDetails.address,
    }).lean();
    console.log(address, "myOrderDetails");
    const orderedProDet = await Order.aggregate([
      {
        $match: { _id: IDORDER },
      },
      {
        $unwind: "$product",
      },
      {
        $unwind: "$product", 
      },
      {
        $project: {
          _id: 0,
          product: 1,
        },
      },
    ]);
    console.log(orderedProDet);
    res.render("admin/order_Details", {
      admin: true,
      orderedProDet,
      layout: "adminlayout",
      address,
      myOrderDetails,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const changeStatus = async (req, res) => {
  try {
    const orderID = req.params.id;
    const status = req.body.status;
    const changeStatus = await Order.findByIdAndUpdate(
      orderID,
      {
        $set: {
          status: status,
        },
      },
      {
        new: true,
      }
    );
    res.redirect("/admin/orders");
    console.log(status, "query");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  ordersPage,
  orderDetails,
  changeStatus,
};
