import { Router } from "express";
import {
  checkIn,
  checkOut,
  getMyAttendance,
} from "./attendance.controller";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, authorize("INTERN"));

router.post("/check-in", checkIn);
router.post("/check-out", checkOut);
router.get("/me", getMyAttendance);

export default router;