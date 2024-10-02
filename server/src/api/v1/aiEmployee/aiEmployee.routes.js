const express = require("express");
const aiEmployeeController = require("./aiEmployeeController");
const { upload } = require("../../../core/configs/multer");

const router = express.Router();

router.post("/", upload.single("image"), aiEmployeeController.createAiEmployee);
router.get("/", aiEmployeeController.getAllAiEmployees);
router.get("/published", aiEmployeeController.getPublishedEmployees);
router.get("/draft", aiEmployeeController.getDraftEmployees);
router.get("/:id", aiEmployeeController.getAiEmployeeById);
router.get(
  "/category/:categoryId",
  aiEmployeeController.getAiEmployeesByCategory
);
router.put("/:id", aiEmployeeController.updateAiEmployee);
router.delete("/:id", aiEmployeeController.deleteAiEmployee);
module.exports = router;
