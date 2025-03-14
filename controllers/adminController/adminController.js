const HttpStatus = require('../../httpStatus');
const Reviews=require("../../model/reviewSchema")

// Load Login Page
const getLogin = async (req, res) => {
  try {
    res.render("admin/login", { layout: "adminLayout", isLoginPage: true });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).json({ message: "Something went wrong"});
  }
};



// Login
const doLogin = async (req, res) => {
  try {
    const admin = {
      mail: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    };

    let adminMail = req.body.email;
    let adminPass = req.body.password;

    if (admin.mail === adminMail && admin.password === adminPass) {
      req.session.admin = admin;
      console.log(req.session)
      res.redirect("/admin/home");
    } else {
      res.render("admin/login", {
        layout: "adminLayout",
        message: "Invalid Credential",
        isLoginPage: true,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("InternalServerError");
  }
};


// Logout

const doLogout = async (req, res) => {
  try {
    req.session.admin = null;    
    res.redirect("/admin/login");
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("InternalServerError");
  }
};

const getDashboard = async(req, res)=>{
  try {
    res.render('admin/home', {layout: 'adminLayout'})
  } catch (error) {
    
  }
}


const loadReviews = async (req, res) => {
  try {

    const reviews = await Reviews.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $unwind: "$productDetails"
      }
    ])
    console.log(reviews)


    console.log("REVIEWSSSSSSSSSSS", reviews)

    res.render('admin/reviews', { reviews, layout: 'adminlayout' })

  } catch (error) {

  }
};

module.exports = {
  getLogin,  
  doLogin,
  doLogout,
  getDashboard,
  loadReviews,
};
