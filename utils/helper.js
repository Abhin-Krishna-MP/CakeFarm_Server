import { ProductModel } from "../models/product.model.js";
import dotenv from "dotenv";

// confiugure the dotenv instance
dotenv.config();

export const filterObject = (obj, filterFields = []) => {
  const filteredObject = Object.keys(obj).reduce((acc, key) => {
    if (filterFields.includes(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});

  return filteredObject;
};

export const calculateSubtotal = async (productId, quantity) => {
  try {
    const product = await ProductModel.getProductById(productId);
    
    if (!product) {
      throw new Error(`Product not found with id: ${productId}`);
    }

    const price = parseInt(product.price) || 0;
    return price * quantity; // return subtotal
  } catch (error) {
    console.log("Error calculating subtotal:", error.message);
    throw error;
  }
};

export const getOrderExpiryDate = () => {
  const EDate = new Date();
  const expiryDays = parseInt(process.env.ORDER_EXPIRY_DAYS) || 1;
  EDate.setDate(EDate.getDate() + expiryDays);
  return Date.parse(EDate); // parse the Date object into milliseconds
};

export const getYesterdaysDate = () => {
  const YDate = new Date();
  YDate.setDate(YDate.getDate() - 1);
  return Date.parse(YDate); // parse the Date object into milliseconds
};

// filters and rearranges the raw data of user placed orders
export const transformUserOrderData = (rawUserOrderData) => {
  return new Promise((resolve, reject) => {
    try {
      const filteredData = rawUserOrderData.reduce((result, order) => {
        // check if the orderId already exists if so push the order items to same orderId object
        const existingOrder = result?.find((o) => o.orderId === order.orderId);

        if (existingOrder) {
          existingOrder.items.push({
            orderItemsId: order.orderItemsId,
            productId: order.productId,
            productName: order.productName,
            image: order.image,
            rating: order.rating,
            description: order.description,
            vegetarian: order.vegetarian,
            price: order.price,
            quantity: order.quantity,
            subtotal: order.subtotal,
            categoryId: order.categoryId,
            isLunchItem: order.isLunchItem || false,
            createdAt: order.createdAt,
          });
        } else {
          result?.push({
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            status: order.status, // Add both for compatibility
            orderToken: order.orderToken,
            ticketStatus: order.ticketStatus || "active",
            pickUpTime: order.pickUpTime,
            expiryDate: order.expiryDate,
            total: order.total,
            userId: order.userId,
            user: order.user || null, // Include user info
            createdAt: order.createdAt,
            items: [
              {
                orderItemsId: order.orderItemsId,
                productId: order.productId,
                productName: order.productName,
                image: order.image,
                rating: order.rating,
                description: order.description,
                vegetarian: order.vegetarian,
                price: order.price,
                quantity: order.quantity,
                subtotal: order.subtotal,
                categoryId: order.categoryId,
                isLunchItem: order.isLunchItem || false,
                createdAt: order.createdAt,
              },
            ],
          });
        }

        return result;
      }, []);

      resolve(filteredData);
    } catch (error) {
      reject(error);
    }
  });
};
