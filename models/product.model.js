import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { generateUUID } from "../utils/uuid.js";

// Define Product Schema
const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUUID(),
    },
    productName: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    description: {
      type: String,
      required: true,
    },
    vegetarian: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    categoryId: {
      type: String,
      required: true,
      ref: "Category",
    },
    isLunchItem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create Product Model
const Product = mongoose.model("Product", productSchema);

class ProductModel {
  static createProduct = async (product = {}) => {
    try {
      // generate a unique id for each product
      const productId = generateUUID();

      // create new product document
      const newProduct = new Product({
        productId,
        productName: product.productName,
        image: product.image,
        rating: product.rating,
        description: product.description,
        vegetarian: product.vegetarian,
        price: product.price,
        categoryId: product.categoryId,
        isLunchItem: product.isLunchItem || false,
      });

      await newProduct.save();

      const createdProduct = await this.getProductById(productId);
      return createdProduct; // return the created product
    } catch (error) {
      console.log("error while creating product", error);
      throw new ApiError(500, error.message);
    }
  };

  // update products
  static updateProducts = async (productId, updateFields = {}) => {
    try {
      const result = await Product.updateOne(
        { productId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        throw new ApiError(404, "product not found");
      }

      const updatedProduct = await this.getProductById(productId);
      return updatedProduct;
    } catch (error) {
      console.log("error updating the product", error);
      throw new ApiError(404, error.message);
    }
  };

  // Get the product from product Id
  static getProductById = async (productId) => {
    try {
      const product = await Product.findOne({ productId }).lean();
      return product;
    } catch (error) {
      console.log("Error getting product from db", error);
      throw new ApiError(404, error.message);
    }
  };

  // Get the product by name
  static getProductsByName = async (productName) => {
    try {
      const products = await Product.find({
        productName: { $regex: productName, $options: "i" },
      })
        .sort({ productName: 1 })
        .lean();

      return products;
    } catch (error) {
      console.log("Error getting product from db", error);
      throw new ApiError(404, error.message);
    }
  };

  // Get all products
  static getAllProducts = async () => {
    try {
      const products = await Product.find({}).lean();
      return products;
    } catch (error) {
      console.log("Error getting products", error);
      throw new ApiError(404, error.message);
    }
  };

  // Get all lunch products
  static getLunchProducts = async () => {
    try {
      const lunchProducts = await Product.find({ isLunchItem: true }).lean();
      return lunchProducts;
    } catch (error) {
      console.log("Error getting lunch products", error);
      throw new ApiError(404, error.message);
    }
  };

  // Get products by category
  static getProductsByCategoryName = async (categoryName) => {
    try {
      // Import Category model to perform lookup
      const { Category } = await import("./categories.model.js");
      
      const categories = await Category.find({
        categoryName: { $regex: categoryName, $options: "i" },
      }).lean();

      if (!categories.length) {
        return [];
      }

      const categoryIds = categories.map((cat) => cat.categoryId);
      const products = await Product.find({
        categoryId: { $in: categoryIds },
      }).lean();

      return products;
    } catch (error) {
      console.log("error getting categorized products", error);
      return error;
    }
  };

  // get products by category ID
  static getProductsByCategoryId = async (categoryId) => {
    try {
      const products = await Product.find({ categoryId }).lean();
      return products;
    } catch (error) {
      console.log("error while fetching products by categoryId", error);
      return error;
    }
  };

  // delete products
  static deleteProductById = async (productId) => {
    try {
      const result = await Product.deleteOne({ productId });

      // return true if product deleted
      if (result.deletedCount > 0) {
        return true;
      }

      // return false if product not deleted
      return false;
    } catch (error) {
      console.log("error deleting product", error);
      throw new ApiError(404, error.message);
    }
  };
}

export { ProductModel, Product };
