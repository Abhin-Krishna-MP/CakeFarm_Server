import { LunchSettingsModel } from "../models/lunchSettings.model.js";
import { ProductModel } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get lunch settings (admin)
export const getLunchSettings = asyncHandler(async (req, res) => {
  const settings = await LunchSettingsModel.getSettings();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { settings }, "Lunch settings fetched successfully")
    );
});

// Update lunch settings (admin)
export const updateLunchSettings = asyncHandler(async (req, res) => {
  const { orderDeadlineTime, isEnabled } = req.body;

  if (!orderDeadlineTime) {
    throw new ApiError(400, "Order deadline time is required");
  }

  const settings = await LunchSettingsModel.updateSettings({
    orderDeadlineTime,
    isEnabled: isEnabled !== undefined ? isEnabled : true,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { settings }, "Lunch settings updated successfully")
    );
});

// Check if lunch ordering is open (client)
export const checkLunchOrderingStatus = asyncHandler(async (req, res) => {
  const isOpen = await LunchSettingsModel.isOrderingOpen();
  const settings = await LunchSettingsModel.getSettings();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isOpen, orderDeadlineTime: settings.orderDeadlineTime },
        "Lunch ordering status fetched successfully"
      )
    );
});

// Get all lunch products (client/admin)
export const getLunchProducts = asyncHandler(async (req, res) => {
  const lunchProducts = await ProductModel.getLunchProducts();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { products: lunchProducts },
        "Lunch products fetched successfully"
      )
    );
});
