// src/core/domain/entities/ghlAuth.entity.js

const axios = require("axios");

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
        throw new Error("Company or Location not found");
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
      console.error("Error refreshing access token:", error);
      throw error;
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
          if (accessToken) {
            requestConfig.headers["Authorization"] = `Bearer ${accessToken}`;
          }
        } catch (e) {
          console.error(e);
        }
        return requestConfig;
      },
      (error) => Promise.reject(error)
    );

    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newAccessToken = await this.refreshAccessToken(resourceId);
            originalRequest.headers[
              "Authorization"
            ] = `Bearer ${newAccessToken.access_token}`;
            return axiosInstance(originalRequest);
          } catch (err) {
            console.error("Error refreshing access token:", err);
            return Promise.reject(err);
          }
        }

        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }

  async getAccessToken(resourceId) {
    const company = await this.companyModel.findOne({
      $or: [{ companyId: resourceId }, { locationId: resourceId }],
    });

    return company ? company.access_token : null;
  }

  async getTokens(code) {
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
  }

  async getLocationAccessToken(companyId, locationId) {
    try {
      const company = await this.companyModel.findOne({ companyId });

      if (!company) {
        throw new Error("Company not found");
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
      console.error("Error fetching location access token:", error);
      throw error;
    }
  }
}

module.exports = GHLAuth;
