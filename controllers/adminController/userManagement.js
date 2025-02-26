const User = require("../../model/userSchema");
const fs = require("fs");
const path = require("path");

// Get User Page

const usersPage = async (req, res) => {
  try {
    var page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    let limit = 3;
    const users = await User.find({})
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .lean();
    const count = await User.find({}).countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    res.render("admin/userManagement", {
      admin: true,
      pages,
      currentPage: page,
      users,
      layout: "adminLayout",
    });
  } catch (error) {}
};

//Block User

const blockUser = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findById(id);
    const newBlock = user.isBlocked;

    await User.findByIdAndUpdate(id, {
      $set: {
        isBlocked: !newBlock,
      },
    });
    res.redirect("/admin/users");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  usersPage,
  blockUser,
};
