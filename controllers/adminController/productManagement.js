const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const productOffer = require("../../model/proOfferSchema");
const fs = require("fs");
const path = require("path");
const HttpStatus = require('../../httpStatus');


// Get Product Page
const showProduct = async (req, res) => {
  try {
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 4;
    const product = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "Category",
        },
      },
      { $unwind: "$Category" },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit * 1,
      },
    ]);
    const count = await Product.find({}).countDocuments();
    const totalPages = Math.ceil(count / limit); 
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    console.log(product,pages);    
    res.render("admin/product", { layout: "adminLayout", product, pages });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



// Get Add Product Page
const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({}).lean();
    const productExists = req.session.productExists;
    req.session.productExists = null; 

    res.render("admin/add_product", { layout: "adminLayout", category, productExists });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



// Add New Product
const addProduct = async (req, res) => {
  try {
    const { name, price, description, category, stock } = req.body;
    const files = req.files;
    const images = [];
    files.forEach((file) => {
      const image = file.filename;
      images.push(image);
    });

    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") }, 
    });

    if (existingProduct) {
      req.session.productExists = true;
      return res.redirect("/admin/addProduct"); 
    }

    const newProduct = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      stock: req.body.stock,
      //imageUrl: req.body.image
      imageUrl: images,
    });
    await newProduct
      .save()
      .then((result) => {
        res.redirect("/admin/product");
        console.log(newProduct);
      })
      .catch((err) => console.log(err));
  } catch (error) {
    console.error("Error creating Product:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



// Get Edit Product Page
const showeditProduct = async (req, res) => {
  try {
    let productId = req.params.id;

    const productData = await Product.findById(productId).lean();
    console.log(productData);
    const categories = await Category.find().lean();
    categories.forEach((category) => {
      category.isSelected = category._id.toString() === productData.category.toString();
    });

    console.log('categories   ',categories )
    res.render("admin/editProduct", {
      productData,
      categories,
      layout: "adminLayout",
    });
  } catch (error) {
    console.error("Error creating Product:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



// Update Product
const updateProduct = async (req, res) => {
  try {
    const proId = req.params.id;
    const product = await Product.findById(proId);

    const exImage = product.imageUrl;
    const files = req.files;
    let updImages = [];

    if (files && files.length > 0) {
      const newImages = files.map((file) => file.filename);
      updImages = [...exImage, ...newImages];
    } else {
      updImages = exImage;
    }

    const { name, price, description, category, stock } = req.body;
    

    await Product.findByIdAndUpdate(
      proId,
      {
        name: name,
        price: price,
        description: description,
        category: category,
        stock: stock,
        isBlocked: false,
        imageUrl: updImages,
      },
      { new: true }
    );

    if (product.price !== price) {
      const existingOffer = await productOffer.findOne({
        productId: product._id,
        currentStatus: true, 
      });

      if (existingOffer) {
        const newDiscountPrice = price - (price * existingOffer.productOfferPercentage) / 100;
        existingOffer.discountPrice = newDiscountPrice;
        await existingOffer.save();
      }
    }


    req.session.productSave = true;
    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const deleteProdImage = async (req, res) => {
  try {
    const { id, image } = req.query;

    console.log(`ID: ${id}, Image Index: ${image}`);

    const product = await Product.findById(id);
    if (!product) {
      return res.status(HttpStatus.NotFound).send({ error: "Product not found" });
    }

    const deletedImage = product.imageUrl.splice(image, 1)[0];
    if (!deletedImage) {
      return res.status(HttpStatus.NotFound).send({ error: "Image not found" });
    }
    console.log("Deleted image:", deletedImage);

    await product.save();
    const imagePath = path.join(
      __dirname,
      `../../public/assets/imgs/products/${deletedImage}`
    );
    console.log("Image path:", imagePath);

    // Check if the file exists before attempting to delete it
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    } else {
      return res.status(HttpStatus.NotFound).send({ error: "Image file not found" });
    }

    res.status(200).send({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error); 
    res.status(HttpStatus.InternalServerError).send("InternalServerError");
  }
};



// Block Product
const blockProduct = async (req, res) => {
  try {
    const { id } = req.body;
    console.log(id);
    const prod = await Product.findOne({ _id: id }).lean();
    const block = prod.isBlocked;
    await Product.findByIdAndUpdate(id, { $set: { isBlocked: !block } });
  } catch (error) {
    console.log(error.message); 
    res.status(HttpStatus.InternalServerError).send("InternalServerError");
  }
};



module.exports = {
  showProduct,
  addProductPage,
  addProduct,
  showeditProduct,
  updateProduct,
  deleteProdImage,
  blockProduct,
};
