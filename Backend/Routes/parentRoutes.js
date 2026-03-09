import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isParent from "../middlewares/isParent.js";
import feeRateLimit from "../middlewares/feeRateLimit.js";
import feeSecurityHeaders from "../middlewares/feeSecurityHeaders.js";
import {
  createParentRazorpayOrder,
  getParentDashboard,
  getParentFeeProfile,
  parentLogin,
  verifyParentRazorpayPayment,
} from "../controllers/parentController.js";

const router = express.Router();

router.post("/login", parentLogin);
router.get("/dashboard", isAuth, isParent, getParentDashboard);
router.get("/fee/profile", isAuth, isParent, feeSecurityHeaders, feeRateLimit, getParentFeeProfile);
router.post(
  "/fee/payment/razorpay/order",
  isAuth,
  isParent,
  feeSecurityHeaders,
  feeRateLimit,
  createParentRazorpayOrder
);
router.post(
  "/fee/payment/razorpay/verify",
  isAuth,
  isParent,
  feeSecurityHeaders,
  feeRateLimit,
  verifyParentRazorpayPayment
);

export default router;
