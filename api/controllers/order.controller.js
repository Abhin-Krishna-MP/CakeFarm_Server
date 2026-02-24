import OrderModel from "../models/order.model.js";
import { LunchSettingsModel } from "../models/lunchSettings.model.js";
import { ProductModel, Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { transformUserOrderData } from "../utils/helper.js";

export const placeOrder = asyncHandler(async (req, res) => {
  const cart = req.body;
  const userId = req.user.userId;

  // Check if any cart items are lunch items — if so, verify ordering is still open
  if (cart.cartItems && cart.cartItems.length > 0) {
    const productIds = cart.cartItems.map((item) => item.productId);
    const products = await Product.find({ productId: { $in: productIds } }).lean();
    const hasLunchItem = products.some((p) => p.isLunchItem);

    if (hasLunchItem) {
      const isOpen = await LunchSettingsModel.isOrderingOpen();
      if (!isOpen) {
        throw new ApiError(400, "Lunch ordering time has passed. Cannot place lunch order.");
      }
    }
  }

  const orderId = await OrderModel.createOrder(userId, cart); // fucntion returns the orderId

  if (!orderId) {
    throw new ApiError(500, "Error creating order");
  }

  // Emit socket event to notify admin panel of new order
  const io = req.app.get("io");
  if (io) {
    io.emit("newOrder", { orderId, userId });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { orderId }, "Order created successfully"));
});

// update order status route (only for admin)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatusId, status } = req.query;

  if (!orderStatusId && !status) {
    throw new ApiError(400, "orderStatusId and status must be provided");
  }

  const orderStatRes = await OrderModel.updateOrderStatus(
    orderStatusId,
    status
  );

  if (!orderStatRes) {
    throw new ApiError(500, "error updating order status");
  }

  // Emit socket event to notify admin panel of order status update
  const io = req.app.get("io");
  if (io) {
    io.emit("orderStatusUpdated", { orderStatusId, status });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Order updated successfully"));
});

// get all user orders
export const getAllUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const userOrders = await OrderModel.getAllUserOrders(userId);

  if (!userOrders) {
    throw new ApiError(500, "Error while getting user orders ");
  }

  const filteredOrders = await transformUserOrderData(userOrders);

  // console.log("filtered orders ", filteredOrders);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { userOrders: filteredOrders },
        "order fetched successfully"
      )
    );
});

// get all orders (admin only)
export const getAllOrders = asyncHandler(async (req, res) => {
  const allOrders = await OrderModel.getAllOrders();

  if (!allOrders) {
    throw new ApiError(500, "Error while getting all orders");
  }

  const filteredOrders = await transformUserOrderData(allOrders);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { userOrders: filteredOrders },
        "orders fetched successfully"
      )
    );
});

// GET /api/v1/users/order/verify/:token — public, resolves QR scan for any viewer
export const getOrderByToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Order token is required");
  }

  const orderRows = await OrderModel.getOrderByToken(token);

  if (!orderRows || orderRows.length === 0) {
    throw new ApiError(404, "Order not found or invalid token");
  }

  const filteredOrder = await transformUserOrderData(orderRows);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { order: filteredOrder[0] }, "Order fetched successfully")
    );
});

// PATCH /api/v1/admin/update-ticket-status — admin only, marks ticket as delivered
export const markOrderDelivered = asyncHandler(async (req, res) => {
  const { orderToken } = req.body;

  if (!orderToken) {
    throw new ApiError(400, "orderToken is required");
  }

  const result = await OrderModel.markAsDelivered(orderToken);

  if (!result) {
    throw new ApiError(404, "Order not found or already marked as delivered");
  }

  // Broadcast via Socket.io:
  // 1. orderDelivered — updates the client ticket UI
  // 2. orderStatusUpdated — updates the admin Orders panel in real-time
  const io = req.app.get("io");
  if (io) {
    io.emit("orderDelivered", { orderToken });
    // orderStatusId here is the order's orderId (matches how the frontend identifies orders)
    io.emit("orderStatusUpdated", { orderStatusId: result.orderId, status: "delivered" });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { orderToken }, "Order marked as delivered successfully")
    );
});
