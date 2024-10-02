const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./routes/index");
const { errorHandler } = require("./core/utils/errorHandler");
const path = require("path");

const app = express();

// CORS Options
const corsOptions = {
  origin: "*", // Specify allowed origins
  methods: ["GET", "POST", "PUT", "DELETE"], // Specify the allowed methods
};

// Security middlewares
app.use(cors(corsOptions));
app.use(helmet());

// Body parser
app.use(express.json());
app.use("/api/bots", express.static(path.join(__dirname, "../bots")));

// Request logging
app.use(morgan("combined"));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use("/api/v1", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
