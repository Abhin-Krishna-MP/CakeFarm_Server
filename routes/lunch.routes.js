import { Router } from "express";
import {
  getLunchSettings,
  updateLunchSettings,
  checkLunchOrderingStatus,
  getLunchProducts,
} from "../controllers/lunch.controller.js";
import { verifyJwt } from "../middlewares/jwt.authMiddleware.js";
import { verifyAdmin } from "../middlewares/admin.authMiddleware.js";

const router = Router();

// Admin routes
router.route("/settings").get(verifyJwt, verifyAdmin, getLunchSettings);
router.route("/settings").put(verifyJwt, verifyAdmin, updateLunchSettings);

// Public/Client routes
router.route("/status").get(checkLunchOrderingStatus);
router.route("/products").get(getLunchProducts);

export default router;
