import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isGateSecurity from "../middlewares/isGateSecurity.js";
import {
  getWardenOutpasses,
  scanWardenOutpassQr,
} from "../controllers/wardenDashboardController.js";

const router = express.Router();

const allowAllHostelsForGate = (req, _res, next) => {
  req.allowAllHostelsForGate = true;
  next();
};

router.get("/outpasses", isAuth, isGateSecurity, allowAllHostelsForGate, getWardenOutpasses);
router.post("/outpasses/scan", isAuth, isGateSecurity, allowAllHostelsForGate, scanWardenOutpassQr);
router.get("/outpass", isAuth, isGateSecurity, allowAllHostelsForGate, getWardenOutpasses);
router.post("/outpass/scan", isAuth, isGateSecurity, allowAllHostelsForGate, scanWardenOutpassQr);

export default router;
