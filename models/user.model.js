import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { generateUUID } from "../utils/uuid.js";
import jwt from "jsonwebtoken";

// Define User Schema
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateUUID(),
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false, // Not required for Google OAuth users
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    avatar: {
      type: String,
      default: "noProfile.png",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    registerNumber: {
      type: String,
      required: false,
    },
    department: {
      type: String,
      required: false,
    },
    semester: {
      type: String,
      required: false,
    },
    division: {
      type: String,
      required: false,
    },
    favourites: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Create User Model
const User = mongoose.model("User", userSchema);

class UserModel {
  // generate access token using jsonwebtoken
  static generateAccessToken = async (user) => {
    const accessToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET_KEY,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    return accessToken;
  };

  // generate refresh token
  static getRefreshToken = async (user) => {
    const refreshToken = jwt.sign(
      {
        userId: user.userId,
      },
      process.env.ACCESS_REFRESH_TOKEN_SECRET_KEY,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
    return refreshToken;
  };

  static createUser = async (email, username, password, academicFields = {}) => {
    try {
      // hash the password using bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // generate a userId for the user
      const userId = generateUUID();

      // create new user document
      const user = new User({
        userId,
        username,
        email,
        password: hashedPassword,
        avatar: "noProfile.png",
        ...Object.fromEntries(
          Object.entries(academicFields).filter(([, v]) => v !== undefined && v !== "")
        ),
      });

      // save the user in db
      await user.save();

      // return the created user
      const createdUser = await this.getUserById(userId);
      return createdUser;
    } catch (error) {
      console.error("Error registering user: ", error.message);
      throw error;
    }
  };

  // delete the user from the database
  static deleteUserById = async (userId) => {
    try {
      const result = await User.deleteOne({ userId });
      return result.deletedCount > 0;
    } catch (error) {
      console.log("error deleting user: ", error.message);
      return false;
    }
  };

  // get user by userId
  static getUserById = async (userId) => {
    try {
      const user = await User.findOne({ userId }).lean();
      return user;
    } catch (error) {
      console.error("Error getting user from db", error);
      throw error;
    }
  };

  // get user info for login
  // critical function
  static getUserForLogin = async (email) => {
    try {
      const user = await User.findOne({ email }).lean();
      return user; // return user info with credentials for verification purposes
    } catch (error) {
      console.log("error getting user info : ", error);
      throw error;
    }
  };

  // get user by email
  static getUserByEmail = async (email) => {
    try {
      const user = await User.findOne({ email }).lean();
      if (!user) return null; // return null if user is not found with email
      return user;
    } catch (error) {
      console.error("Error getting user from db", error);
      throw error;
    }
  };

  static updateUser = async (userId, updateFields = {}) => {
    try {
      // MongoDB automatically updates the updatedAt field with timestamps: true
      const result = await User.updateOne({ userId }, { $set: updateFields });

      if (result.modifiedCount > 0 || result.matchedCount > 0) {
        const updatedUser = await this.getUserById(userId);
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error("Error updating user: ", error.message);
      throw error;
    }
  };

  static getFavourites = async (userId) => {
    try {
      const user = await User.findOne({ userId }, { favourites: 1 }).lean();
      return user?.favourites || [];
    } catch (error) {
      console.error("Error getting favourites:", error);
      throw error;
    }
  };

  static toggleFavourite = async (userId, productId) => {
    try {
      // Use atomic operators to add or remove in a single DB round-trip
      const user = await User.findOne({ userId });
      if (!user) return null;
      const idx = user.favourites.indexOf(productId);
      if (idx === -1) {
        user.favourites.push(productId);
      } else {
        user.favourites.splice(idx, 1);
      }
      await user.save();
      return user.favourites;
    } catch (error) {
      console.error("Error toggling favourite:", error);
      throw error;
    }
  };

  static getAllUsers = async () => {
    try {
      const users = await User.find(
        {},
        { password: 0, __v: 0 }
      ).lean();
      return users;
    } catch (error) {
      console.log("Error getting user from db", error);
      throw error;
    }
  };
}

export { UserModel, User };
