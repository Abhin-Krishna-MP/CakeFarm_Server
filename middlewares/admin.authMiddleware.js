import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyAdmin = asyncHandler(async (req, res, next) => {
  // req.user should already be set by verifyJwt middleware
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request - user not authenticated");
  }

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admins can access this route");
  }

  next();
});
