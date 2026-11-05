import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import internsRoutes from "./modules/interns/interns.routes";
import adminAttendanceRoutes from "./modules/attendance/admin-attendance.routes";
import { supabaseAdmin } from "./config/supabase";
import {
  authenticate,
  authorize,
} from "./middlewares/auth.middleware";

const app = express();
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.use(cors({
  origin: [
      "http://localhost:5173",
      "https://jonathan-wijaya-fullstack-developer.vercel.app",
    ],
  credentials: true,
}));

app.use(express.json());

app.use("/api/admin/interns", internsRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/admin/attendance", adminAttendanceRoutes);

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Attendance API is running!",
  });
});

app.get("/", (_req, res) => {
  res.json({
    message: "Detikcom Attendance API is running",
    status: "OK",
  });
});
export default app;