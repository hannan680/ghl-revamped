// File: aiCategoryRoutes.js

const express = require("express");
const aiCategoryController = require("./aiCategoryController");

const router = express.Router();

router.post("/", aiCategoryController.createAiCategory);
router.get("/", aiCategoryController.getAllAiCategories);
router.get("/:id", aiCategoryController.getAiCategoryById);
router.put("/:id", aiCategoryController.updateAiCategory);
router.delete("/:id", aiCategoryController.deleteAiCategory);

module.exports = router;
