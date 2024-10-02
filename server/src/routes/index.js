const express = require("express");
const authRouter = require("../api/v1/auth/auth.routes");
const customValueRouter = require("../api/v1/customValue/customValue.routes");
const calendarRouter = require("../api/v1/calendar/calendar.routes");
const industryRouter = require("../api/v1/Industry/industry.routes");
const aiChatRouter = require("../api/v1/aiChat/aiChat.routes");
const aiEmployeeRouter = require("../api/v1/aiEmployee/aiEmployee.routes");
const aiCategoryRouter = require("../api/v1/aiCategory/aiCategory.routes");
const generatedPromptRouter = require("../api/v1/prompt/prompt.routes");

const router = express.Router();

// Mounting the different routers
router.use("/auth", authRouter);
router.use("/customValue", customValueRouter);
router.use("/calendar", calendarRouter);
router.use("/industries", industryRouter);
router.use("/aiChat", aiChatRouter);
router.use("/aiEmployees", aiEmployeeRouter);
router.use("/aiCategories", aiCategoryRouter);
router.use("/prompt", generatedPromptRouter);

module.exports = router;
