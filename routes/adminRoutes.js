var express = require('express');
var router = express.Router();
const adminController = require("../controllers/adminController");


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

// router.post("/table/update/:id", adminController.updateTable);

module.exports = router;