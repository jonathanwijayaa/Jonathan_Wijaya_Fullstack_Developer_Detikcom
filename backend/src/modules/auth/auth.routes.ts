import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, changePassword } from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Rate limiting untuk endpoint login: maks 15 request per 15 menit per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

router.post("/login", loginLimiter, login);
router.post("/change-password", authenticate, changePassword);

export default router;
