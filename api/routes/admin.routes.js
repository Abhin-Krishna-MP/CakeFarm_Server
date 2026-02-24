import {
  createCategory,
  createProduct,
  deleteProduct,
  deleteUser,
  updateProduct,
  updateCategory,
  deleteCategory,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/admin.controller.js";
import { getAllOrders, updateOrderStatus, markOrderDelivered } from "../controllers/order.controller.js";
import { getAllUsers } from "../controllers/user.controllers.js";
import { verifyAdmin } from "../middlewares/admin.authMiddleware.js";
import { verifyJwt } from "../middlewares/jwt.authMiddleware.js";
import { productValidator } from "../validators/product.validators.js";
import { validate } from "../validators/validate.js";
import { Router } from "express";

const router = Router();

// secured admin routes

// get all users
router.route("/get-all-users").get(verifyJwt, verifyAdmin, getAllUsers);

// get all orders
router.route("/get-all-orders").get(verifyJwt, verifyAdmin, getAllOrders);

// delete
// router.route("/user/:userId").delete(verifyJwt, verifyAdmin, deleteUser);
router.route("/user/:userId").delete(deleteUser);

// product routes
router
  .route("/create-category")
  .post(validate, verifyJwt, verifyAdmin, createCategory);
router
  .route("/update-category/:categoryId")
  .put(validate, verifyJwt, verifyAdmin, updateCategory);
router
  .route("/delete-category/:categoryId")
  .delete(verifyJwt, verifyAdmin, deleteCategory);
router
  .route("/create-product")
  .post(productValidator(), validate, verifyJwt, verifyAdmin, createProduct);
router
  .route("/update-product/:productId")
  .put(validate, verifyJwt, verifyAdmin, updateProduct);
router
  .route("/delete-product/:productId")
  .delete(verifyJwt, verifyAdmin, deleteProduct);
router
  .route("/update-order-status")
  // .patch(validate, verifyJwt, verifyAdmin, updateOrderStatus);
  .patch(updateOrderStatus);

// Digital ticket: mark an order as delivered via scanned QR token
router
  .route("/update-ticket-status")
  .patch(verifyJwt, verifyAdmin, markOrderDelivered);

// Department routes
router.route("/departments").get(verifyJwt, verifyAdmin, getDepartments);
router.route("/departments").post(verifyJwt, verifyAdmin, createDepartment);
router.route("/departments/:departmentId").put(verifyJwt, verifyAdmin, updateDepartment);
router.route("/departments/:departmentId").delete(verifyJwt, verifyAdmin, deleteDepartment);

export default router;
