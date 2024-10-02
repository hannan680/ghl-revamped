const express = require("express");
const industryController = require("./industryController");
// const checkApiKey = require("../middlewares/checkApiKey");

const router = express.Router();

// Route to create a new industry
router.get("/", industryController.getAllIndustries);
router.post("/", industryController.createIndustry);
router.post("/many", industryController.insertManyIndustries);
router.get(
  "/:locationId/previousAnswers",
  industryController.getPreviousAnswers
);

module.exports = router;
