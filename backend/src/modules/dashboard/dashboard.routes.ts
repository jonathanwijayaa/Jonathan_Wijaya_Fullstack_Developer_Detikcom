import { Router } from "express";
import {
  getAdminDashboard,
  getInternDashboard,
  getRecentAttendance,
} from "./dashboard.controller";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  getAdminDashboard
);
router.get(
  "/admin/recent-attendance",
  authenticate,
  authorize("ADMIN"),
  getRecentAttendance
);
router.get(
  "/intern",
  authenticate,
  authorize("INTERN"),
  getInternDashboard
);

export default router;