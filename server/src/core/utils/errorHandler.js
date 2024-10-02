// // errorHandler.js

// class AppError extends Error {
//   constructor(message, statusCode) {
//     super(message);
//     this.statusCode = statusCode;
//     this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
//     this.isOperational = true;

//     Error.captureStackTrace(this, this.constructor);
//   }
// }

// const catchAsync = (fn) => {
//   return (req, res, next) => {
//     fn(req, res, next).catch(next);
//   };
// };

// const handleCastErrorDB = (err) => {
//   const message = `Invalid ${err.path}: ${err.value}.`;
//   return new AppError(message, 400);
// };

// const handleDuplicateFieldsDB = (err) => {
//   const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
//   const message = `Duplicate field value: ${value}. Please use another value!`;
//   return new AppError(message, 400);
// };

// const handleValidationErrorDB = (err) => {
//   const errors = Object.values(err.errors).map((el) => el.message);
//   const message = `Invalid input data. ${errors.join(". ")}`;
//   return new AppError(message, 400);
// };

// const handleJWTError = () =>
//   new AppError("Invalid token. Please log in again!", 401);

// const handleJWTExpiredError = () =>
//   new AppError("Your token has expired! Please log in again.", 401);

// const handleMulterError = (err) => {
//   if (err.code === "LIMIT_FILE_SIZE") {
//     return new AppError("File is too large. Max size is 5MB.", 400);
//   }
//   if (err.code === "LIMIT_UNEXPECTED_FILE") {
//     return new AppError("Too many files or wrong field name.", 400);
//   }
//   return new AppError("Error uploading file.", 400);
// };

// const sendErrorDev = (err, res) => {
//   res.status(err.statusCode).json({
//     status: err.status,
//     error: err,
//     message: err.message,
//     stack: err.stack,
//   });
// };

// const sendErrorProd = (err, res) => {
//   // Operational, trusted error: send message to client
//   if (err.isOperational) {
//     res.status(err.statusCode).json({
//       status: err.status,
//       message: err.message,
//     });
//   } else {
//     // 1) Log error
//     console.error("ERROR 💥", err);

//     // 2) Send generic message
//     res.status(500).json({
//       status: "error",
//       message: "Something went very wrong!",
//     });
//   }
// };

// const errorHandler = (err, req, res, next) => {
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || "error";

//   if (process.env.NODE_ENV === "development") {
//     sendErrorDev(err, res);
//   } else if (process.env.NODE_ENV === "production") {
//     let error = { ...err };
//     error.message = err.message;

//     if (error.name === "CastError") error = handleCastErrorDB(error);
//     if (error.code === 11000) error = handleDuplicateFieldsDB(error);
//     if (error.name === "ValidationError")
//       error = handleValidationErrorDB(error);
//     if (error.name === "JsonWebTokenError") error = handleJWTError();
//     if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
//     if (error.name === "MulterError") error = handleMulterError(error);

//     // Mongoose Error Handling
//     if (error.name === "MongoError") {
//       if (error.code === 11000) {
//         error = handleDuplicateFieldsDB(error);
//       } else {
//         error = new AppError("Database operation failed", 500);
//       }
//     }

//     // Handle other Mongoose errors
//     if (error instanceof Error && error.name.includes("Mongo")) {
//       error = new AppError("Database operation failed", 500);
//     }

//     sendErrorProd(error, res);
//   }
// };

// module.exports = { AppError, catchAsync, errorHandler };

// ghlErrors.js
class GHLError extends Error {
  constructor(message, statusCode = 500, errorCode = "GHL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class GHLAuthError extends GHLError {
  constructor(message) {
    super(message, 401, "GHL_AUTH_ERROR");
  }
}

class GHLResourceNotFoundError extends GHLError {
  constructor(resourceType) {
    super(`${resourceType} not found`, 404, "GHL_RESOURCE_NOT_FOUND");
  }
}

class GHLTokenRefreshError extends GHLError {
  constructor(message = "Failed to refresh access token") {
    super(message, 401, "GHL_TOKEN_REFRESH_ERROR");
  }
}

module.exports = {
  GHLError,
  GHLAuthError,
  GHLResourceNotFoundError,
  GHLTokenRefreshError,
};

// GHLAuth.js
const axios = require("axios");
const {
  GHLAuthError,
  GHLResourceNotFoundError,
  GHLTokenRefreshError,
} = require("./ghlErrors");

class GHLAuth {
  constructor(companyModel) {
    this.companyModel = companyModel;
    this.baseURL = process.env.GHL_API_DOMAIN;
    this.clientId = process.env.GHL_APP_CLIENT_ID;
    this.clientSecret = process.env.GHL_APP_CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI;
  }

  async refreshAccessToken(resourceId) {
    try {
      const company = await this.companyModel.findOne({
        $or: [{ companyId: resourceId }, { locationId: resourceId }],
      });

      if (!company) {
        throw new GHLResourceNotFoundError("Company or Location");
      }

      const refreshToken = company.refresh_token;
      const userType = company.locationId ? "Location" : "Company";

      const response = await axios.post(
        "https://services.leadconnectorhq.com/oauth/token",
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          user_type: userType,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      await this.companyModel.findOneAndUpdate(
        { _id: company._id },
        {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_in: response.data.expires_in,
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof GHLError) throw error;

      console.error("Error refreshing access token:", error);
      throw new GHLTokenRefreshError(error.message);
    }
  }

  createAxiosInstance(resourceId) {
    const axiosInstance = axios.create({
      baseURL: this.baseURL,
    });

    axiosInstance.interceptors.request.use(
      async (requestConfig) => {
        try {
          const accessToken = await this.getAccessToken(resourceId);
          if (!accessToken) {
            throw new GHLAuthError("No access token available");
          }
          requestConfig.headers["Authorization"] = `Bearer ${accessToken}`;
          return requestConfig;
        } catch (error) {
          throw new GHLAuthError(
            "Failed to set authorization header: " + error.message
          );
        }
      },
      (error) =>
        Promise.reject(
          new GHLAuthError("Request interceptor error: " + error.message)
        )
    );

    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newAccessToken = await this.refreshAccessToken(resourceId);
            originalRequest.headers[
              "Authorization"
            ] = `Bearer ${newAccessToken.access_token}`;
            return axiosInstance(originalRequest);
          } catch (err) {
            throw new GHLTokenRefreshError(
              "Failed to refresh token in response interceptor"
            );
          }
        }

        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }

  async getAccessToken(resourceId) {
    try {
      const company = await this.companyModel.findOne({
        $or: [{ companyId: resourceId }, { locationId: resourceId }],
      });

      if (!company) {
        throw new GHLResourceNotFoundError("Company or Location");
      }

      return company.access_token;
    } catch (error) {
      if (error instanceof GHLError) throw error;
      throw new GHLAuthError("Failed to get access token: " + error.message);
    }
  }

  async getTokens(code) {
    try {
      const response = await axios.post(
        "https://services.leadconnectorhq.com/oauth/token",
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: this.redirectUri,
          user_type: "Company",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new GHLAuthError("Failed to get tokens: " + error.message);
    }
  }

  async getLocationAccessToken(companyId, locationId) {
    try {
      const company = await this.companyModel.findOne({ companyId });

      if (!company) {
        throw new GHLResourceNotFoundError("Company");
      }

      const accessToken = company.access_token;
      const axiosInstance = this.createAxiosInstance(companyId);

      const response = await axiosInstance.post(
        "https://services.leadconnectorhq.com/oauth/locationToken",
        new URLSearchParams({
          companyId,
          locationId,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${accessToken}`,
            Version: "2021-07-28",
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof GHLError) throw error;
      throw new GHLAuthError(
        "Failed to get location access token: " + error.message
      );
    }
  }
}

module.exports = GHLAuth;

// errorHandler.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const handleMulterError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("File is too large. Max size is 5MB.", 400);
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Too many files or wrong field name.", 400);
  }
  return new AppError("Error uploading file.", 400);
};

// New GHL error handler
const handleGHLError = (err) => {
  return new AppError(err.message, err.statusCode);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR 💥", err);

    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
    if (error.name === "MulterError") error = handleMulterError(error);
    if (error instanceof GHLError) error = handleGHLError(error);

    if (error.name === "MongoError") {
      if (error.code === 11000) {
        error = handleDuplicateFieldsDB(error);
      } else {
        error = new AppError("Database operation failed", 500);
      }
    }

    if (error instanceof Error && error.name.includes("Mongo")) {
      error = new AppError("Database operation failed", 500);
    }

    sendErrorProd(error, res);
  }
};

module.exports = { AppError, catchAsync, errorHandler };
