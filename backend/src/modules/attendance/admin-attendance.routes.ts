import { Router } from "express";
import {
  getAllAttendance,
  getAttendanceReport,
  correctAttendance,
} from "./attendance.controller";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", getAllAttendance);
router.get("/report", getAttendanceReport);
router.patch("/:id", correctAttendance);
router.post("/correct", correctAttendance);

export default router;
