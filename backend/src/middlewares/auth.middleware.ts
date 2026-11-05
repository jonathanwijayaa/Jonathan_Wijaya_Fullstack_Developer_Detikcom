import { Request, Response, NextFunction } from "express";
import {
  supabaseAuth,
  supabaseAdmin,
} from "../config/supabase";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "INTERN";
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Validasi token ke Supabase Auth
    const { data, error } =
      await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Ambil role dari database, bukan dari request
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("users")
        .select("id, name, email, role")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        message: "User profile not found",
      });
    }

    if (
      profile.role !== "ADMIN" &&
      profile.role !== "INTERN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role",
      });
    }

    res.locals.user = profile as AuthUser;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Role authorization middleware
export function authorize(...allowedRoles: AuthUser["role"][]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as AuthUser | undefined;

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}