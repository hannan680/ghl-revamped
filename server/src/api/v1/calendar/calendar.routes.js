const express = require("express");
const calendarController = require("./calendarController");

const router = express.Router();

router.get("/", calendarController.getCalendars);

module.exports = router;
