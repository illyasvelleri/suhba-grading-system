var express = require('express');
var router = express.Router();
const adminController = require("../controllers/adminController");
const { adminLoginLimiter } = require("../utils/rateLimit");
const { isAdmin } = require("../middlewares/auth");

// Admin Login Page Render
router.get('/', (req, res) => {
  res.render("admin/login"); // Create admin/login.hbs Page
});

/// Admin Login System with Username & Password
router.post("/login", adminLoginLimiter, adminController.login);

router.get("/dashboard", isAdmin, adminController.dashboard);

router.get("/logout", isAdmin, adminController.logout);

router.post("/section", isAdmin, adminController.createSection);

router.get("/section/delete/:id", isAdmin, adminController.deleteSection);

router.get("/view-section/:id", isAdmin, adminController.viewSection);

router.post("/table/create", isAdmin, adminController.createTable);

router.delete("/table/delete/:id", isAdmin, adminController.deleteTable);

router.get("/table/edit/:id", isAdmin, adminController.editTablePage);

router.post("/table/update/:id", isAdmin, adminController.updateTable);
module.exports = router;