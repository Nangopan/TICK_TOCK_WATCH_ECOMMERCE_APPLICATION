const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");
const User = require("../../model/userSchema");
const mongoose = require("mongoose");

let userData;

const getProduct = async (req, res) => {
  try {
    const userData = req.session.user;

    const catName = await Product.aggregate([
      {
        $match: {
          isBlocked: false,
        },
      },
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

    const newProduct = await Product.find()
      .sort({ createdOn: -1 })
      .limit(3)
      .lean();

    let page = 1;
    if (req.query.page) {
      page = parseInt(req.query.page);
    }

    const limit = 6;
    const loadCatData = await Category.find().lean();
    const proData = await Product.find({ isBlocked: false })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category", "category")
      .lean();

    const count = await Product.countDocuments({ isBlocked: false });
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("user/shop", {
      proData,
      pages,
      currentPage: page,
      userData,
      currentFunction: "getProductsPage",
      catName,
      loadCatData,
      newProduct,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const searchAndSort = async (req, res) => {
  const { searchQuery, sortOption, categoryFilter, page, limit } = req.body;

  const matchStage = { $match: {} };
  if (searchQuery) {
    matchStage.$match.name = { $regex: searchQuery, $options: "i" };
  }
  if (categoryFilter) {
    matchStage.$match.category = new mongoose.Types.ObjectId(categoryFilter);
  }

  // Construct the sort stage
  const sortStage = { $sort: {} };
  switch (sortOption) {
    case "priceAsc":
      sortStage.$sort.price = 1;
      break;
    case "priceDesc":
      sortStage.$sort.price = -1;
      break;
    case "nameAsc":
      sortStage.$sort.name = 1;
      break;
    case "nameDesc":
      sortStage.$sort.name = -1;
      break;
    case "newArrivals":
      sortStage.$sort.createdAt = -1;
      break;
    case "popularity":
      sortStage.$sort.popularity = -1;
      break;
    default:
      sortStage.$sort.createdAt = 1;
  }

  const skipStage = { $skip: (page - 1) * limit };
  const limitStage = { $limit: limit };

  const products = await Product.aggregate([
    matchStage, // Assuming this is the initial matching stage
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true, // Ensure products without categories are still included
      },
    },
    {
      $lookup: {
        from: "productoffers",  // Lookup with productoffers collection
        localField: "_id",  // Product's ID field
        foreignField: "productId",  // Field in productoffers referencing Product
        as: "productOffer",
      },
    },
    {
      $unwind: {
        path: "$productOffer",
        preserveNullAndEmptyArrays: true, // Ensure products without offers are still included
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
        productOffer: 1,  // Include all fields from the productOffer
        discountPrice: {
          $cond: {
            if: { $eq: ["$productOffer.currentStatus", true] },  // If currentStatus is true
            then: "$productOffer.discountPrice",  // Show discountPrice if offer is active
            else: "$price",  // Otherwise, show price as discountPrice
          },
        },
      },
    },
    sortStage, // Sorting stage
    skipStage, // Skipping stage for pagination
    limitStage, // Limit stage for pagination
  ]);
  
  console.log(products);
  

  const totalProducts = await Product.countDocuments(matchStage.$match);

  res.json({ products, totalProducts });
};
module.exports = {
  getProduct,
  searchAndSort
};
