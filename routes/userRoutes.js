var express = require('express');
var router = express.Router();
const userController = require('../controllers/userController');
const { userLoginLimiter } = require('../utils/rateLimit');
const { isUser } = require('../middlewares/auth');


// /* GET home page. */
router.get('/', function (req, res, next) {
  res.send('curently working for this');
});

// User Registration Page Render
router.get('/register', (req, res) => {
  res.render('user/register'); // Create user/register.hbs Page
});

// User Registration System with userName and Password
router.post('/register', userController.register);

// User Login Page Render
router.get('/login', (req, res) => {
  res.render('user/login'); // Create user/login.hbs Page
});

// User Login System
router.post('/login', userLoginLimiter, userController.login);

// User Dashboard Page (Protected Route)
router.get('/dashboard', isUser, userController.dashboard);

// View Section (Check if user has a table in this section)
router.get("/view-section/:id", isUser, userController.viewSection);
// Edit Table Page (Load existing table if user has one)
// router.post("/table/save/:id", isUser, userController.saveTable);

// Update Table (Save only allowed columns)
router.post("/table/save/:id", isUser, userController.saveTable);

// Show user profile page
router.get("/profile", isUser, userController.profile);

// Update user profile
router.post("/profile", isUser, userController.updateProfile);

// User Logout
router.get('/logout', isUser, userController.logout);

module.exports = router;
