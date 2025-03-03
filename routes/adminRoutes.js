var express = require('express');
var router = express.Router();
const adminController = require("../controllers/adminController");

// Admin Login Page Render
router.get("/login", (req, res) => {
  res.render("admin/login"); // Create admin/login.hbs Page
});

// Admin Login System with Username & Password
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    req.session.isAdmin = true; // Set Admin Session
    res.redirect("/admin/dashboard"); // Redirect to Admin Dashboard
  } else {
    res.send("Invalid Username or Password ❌");
  }
});



/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send("suhba admin login");
});

router.get("/dashboard", adminController.dashboard);

router.post("/section", adminController.createSection);

router.get("/section/delete/:id", adminController.deleteSection);

router.get("/section/:id", adminController.viewSection);

router.post("/table/create", adminController.createTable);

router.get("/view-section/:id", adminController.viewSection);

router.delete("/table/delete/:id", adminController.deleteTable);


router.get("/table/edit/:id", adminController.editTablePage);

router.post("/table/update/:id", adminController.updateTable);

module.exports = router;