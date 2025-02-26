
// Get Login Page

const getLogin = async (req, res) => {
    try {
      res.render("admin/login", { layout: "adminLayout", isLoginPage: true });
    } catch (error) {
      console.log(error);
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
      console.log(error);
    }
  };
  
  
  // Logout
  
  const doLogout = async (req, res) => {
    try {
      req.session.admin = null;    
      res.redirect("/admin/login");
    } catch (error) {
      console.log(error);
    }
  };
  
  module.exports = {
    getLogin,  
    doLogin,
    doLogout
  };