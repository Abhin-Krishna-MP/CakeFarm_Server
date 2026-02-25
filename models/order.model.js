import mongoose from "mongoose";
import {
  calculateSubtotal,
  getOrderExpiryDate,
  getYesterdaysDate,
} from "../utils/helper.js";
import { generateUUID, generateOrderToken } from "../utils/uuid.js";

// Define OrderItem Sub-schema
const orderItemSchema = new mongoose.Schema(
  {
    orderItemsId: {
      type: String,
      required: true,
      default: () => generateUUID(),
    },
    productId: {
      type: String,
      required: true,
      ref: "Product",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

// Define OrderStatus Sub-schema
const orderStatusSchema = new mongoose.Schema(
  {
    orderStatusId: {
      type: String,
      required: true,
      default: () => generateUUID(),
    },
    status: {
      type: String,
      enum: ["processing", "placed", "completed", "delivered", "expired", "cancelled"],
      default: "processing",
    },
  },
  { timestamps: true }
);

// Define Order Schema
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUUID(),
    },
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    pickUpTime: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: String,
      required: true,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderNumber: {
      type: Number,
    },
    orderItems: [orderItemSchema],
    orderStatus: orderStatusSchema,
    // Digital ticket fields
    orderToken: {
      type: String,
      unique: true,
      sparse: true, // sparse so pre-existing orders without a token don't collide on null
    },
    ticketStatus: {
      type: String,
      enum: ["active", "delivered"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Auto-increment orderNumber
orderSchema.pre("save", async function () {
  if (this.isNew) {
    const lastOrder = await mongoose.model("Order").findOne().sort({ orderNumber: -1 }).lean();
    this.orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;
  }
});

// Create Order Model
const Order = mongoose.model("Order", orderSchema);

class OrderModel {
  static getOrderById = async (orderId) => {
    try {
      const order = await Order.findOne({ orderId }).lean();
      return order;
    } catch (error) {
      console.log("error while getting order: " + error);
      throw error;
    }
  };

  // update order Status
  static updateOrderStatus = async (orderId, status) => {
    try {
      const result = await Order.updateOne(
        { orderId },
        { 
          $set: { 
            "orderStatus.status": status,
            "orderStatus.updatedAt": new Date()
          } 
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.log("error while updating order status:", error);
      return false;
    }
  };

  // get a single order by its secure token (for QR code verification)
  static getOrderByToken = async (orderToken) => {
    try {
      const order = await Order.findOne({ orderToken }).lean();
      if (!order) return null;

      const { Product } = await import("./product.model.js");
      const { User } = await import("./user.model.js");

      const user = await User.findOne({ userId: order.userId }).lean();

      const transformedItems = [];
      for (const item of order.orderItems) {
        const product = await Product.findOne({ productId: item.productId }).lean();

        transformedItems.push({
          orderId: order.orderId,
          userId: order.userId,
          pickUpTime: order.pickUpTime,
          expiryDate: order.expiryDate,
          total: order.total,
          orderNumber: order.orderNumber,
          orderToken: order.orderToken,
          ticketStatus: order.ticketStatus || "active",
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          orderItemsId: item.orderItemsId,
          productId: item.productId,
          quantity: item.quantity,
          subtotal: item.subtotal,
          orderStatusId: order.orderStatus.orderStatusId,
          status: order.orderStatus.status,
          productName: product?.productName,
          image: product?.image,
          rating: product?.rating,
          description: product?.description,
          vegetarian: product?.vegetarian,
          price: product?.price,
          categoryId: product?.categoryId,
          isLunchItem: product?.isLunchItem || false,
          user: user
            ? {
                userId: user.userId,
                username: user.username,
                email: user.email,
                registerNumber: user.registerNumber,
                department: user.department,
                semester: user.semester,
                division: user.division,
              }
            : null,
        });
      }

      return transformedItems;
    } catch (error) {
      console.log("error while getting order by token: " + error);
      throw error;
    }
  };

  // mark order ticket as delivered (triggered by admin QR scan)
  static markAsDelivered = async (orderToken) => {
    try {
      const updated = await Order.findOneAndUpdate(
        { orderToken },
        { $set: { ticketStatus: "delivered", "orderStatus.status": "delivered" } },
        { new: true }
      );
      if (!updated) return null;
      return {
        orderId: updated.orderId,
        orderStatusId: updated.orderStatus.orderStatusId,
      };
    } catch (error) {
      console.log("error while marking order as delivered: " + error);
      return null;
    }
  };

  // method to create an order
  static createOrder = async (userId, cart = {}) => {
    // How the cart object looks like
    // cart = {
    //   pickUpTime: "2304980234",
    //   cartItems: [
    //     {
    //       productId: "",
    //       quantity: ""
    //     }, ...
    //   ]
    // }

    try {
      const orderId = generateUUID();
      const pickUpTime = cart.pickUpTime;
      const cartItems = cart.cartItems || [];

      // create order items with subtotals
      const orderItems = [];
      let total = 0;

      for (const product of cartItems) {
        const orderItemsId = generateUUID();
        const { productId, quantity } = product;

        // calculate the subtotal for each order item
        const subtotal = await calculateSubtotal(productId, quantity);
        total += subtotal;

        orderItems.push({
          orderItemsId,
          productId,
          quantity,
          subtotal,
        });
      }

      // create order status
      const orderStatusId = generateUUID();
      const orderStatus = {
        orderStatusId,
        status: "placed", // directly set to placed after creation
      };

      // create new order document
      const order = new Order({
        orderId,
        userId,
        pickUpTime,
        expiryDate: getOrderExpiryDate().toString(),
        total,
        orderItems,
        orderStatus,
        orderToken: generateOrderToken(), // unique secure token for digital ticket QR code
        ticketStatus: "active",
      });

      await order.save();

      return orderId;
    } catch (error) {
      console.log("error while placing order : ", error);
      throw error;
    }
  };

  // update order status to expired for order placed yesterday
  static expireOrders = async () => {
    console.log("Call triggered for expiring orders !");
    try {
      const result = await Order.updateMany(
        {
          expiryDate: { $lte: getYesterdaysDate().toString() },
          "orderStatus.status": { $in: ["processing", "placed"] },
        },
        {
          $set: {
            "orderStatus.status": "expired",
            "orderStatus.updatedAt": new Date(),
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.log("error while expiring orders : ", error);
      return false;
    }
  };

  // get user order information
  static getAllUserOrders = async (userId) => {
    try {
      const userOrders = await Order.find({ userId })
        .sort({ orderNumber: -1 })
        .lean();

      // Manually fetch product details for each order item
      const { Product } = await import("./product.model.js");
      
      // Transform the data to match the original SQL join format
      const transformedOrders = [];
      for (const order of userOrders) {
        for (const item of order.orderItems) {
          // Fetch product details
          const product = await Product.findOne({ productId: item.productId }).lean();
          
          transformedOrders.push({
            orderId: order.orderId,
            userId: order.userId,
            pickUpTime: order.pickUpTime,
            expiryDate: order.expiryDate,
            total: order.total,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            orderItemsId: item.orderItemsId,
            productId: item.productId,
            quantity: item.quantity,
            subtotal: item.subtotal,
            orderToken: order.orderToken,
            ticketStatus: order.ticketStatus || "active",
            orderStatusId: order.orderStatus.orderStatusId,
            status: order.orderStatus.status,
            // Product details
            productName: product?.productName,
            image: product?.image,
            rating: product?.rating,
            description: product?.description,
            vegetarian: product?.vegetarian,
            price: product?.price,
            categoryId: product?.categoryId,
            isLunchItem: product?.isLunchItem || false,
          });
        }
      }

      return transformedOrders;
    } catch (error) {
      console.log("error while getting user orders : ", error);
      throw error;
    }
  };

  // get all orders (for admin)
  static getAllOrders = async () => {
    try {
      const allOrders = await Order.find({})
        .sort({ orderNumber: -1 })
        .lean();

      // Manually fetch product and user details for each order
      const { Product } = await import("./product.model.js");
      const { User } = await import("./user.model.js");
      
      // Transform the data to include user and product information
      const transformedOrders = [];
      for (const order of allOrders) {
        // Fetch user details
        const user = await User.findOne({ userId: order.userId }).lean();
        
        for (const item of order.orderItems) {
          // Fetch product details
          const product = await Product.findOne({ productId: item.productId }).lean();
          
          transformedOrders.push({
            orderId: order.orderId,
            userId: order.userId,
            pickUpTime: order.pickUpTime,
            expiryDate: order.expiryDate,
            total: order.total,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            orderItemsId: item.orderItemsId,
            productId: item.productId,
            quantity: item.quantity,
            subtotal: item.subtotal,
            orderToken: order.orderToken,
            ticketStatus: order.ticketStatus || "active",
            orderStatusId: order.orderStatus.orderStatusId,
            status: order.orderStatus.status,
            // Product details
            productName: product?.productName,
            image: product?.image,
            rating: product?.rating,
            description: product?.description,
            vegetarian: product?.vegetarian,
            price: product?.price,
            categoryId: product?.categoryId,
            isLunchItem: product?.isLunchItem || false,
            // User details
            user: user ? {
              userId: user.userId,
              username: user.username,
              email: user.email,
              registerNumber: user.registerNumber,
              department: user.department,
              semester: user.semester,
              division: user.division,
            } : null,
          });
        }
      }

      return transformedOrders;
    } catch (error) {
      console.log("error while getting all orders : ", error);
      throw error;
    }
  };
}

export default OrderModel;
export { Order };
