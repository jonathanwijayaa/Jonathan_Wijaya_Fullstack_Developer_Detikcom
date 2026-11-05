import { Request, Response } from "express";
import { z } from "zod";
import { supabaseAuth, supabaseAdmin } from "../../config/supabase";
import { AuthUser } from "../../middlewares/auth.middleware";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export async function login(req: Request, res: Response) {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password format",
    });
  }

  const { email, password } = validation.data;

  const { data, error } =
    await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

  if (error || !data.session) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Ambil role dan profil dari database
  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("users")
      .select("id, name, email, role")
      .eq("id", data.user.id)
      .single();

  if (profileError || !profile) {
    return res.status(403).json({
      success: false,
      message: "User profile has not been configured",
    });
  }

  const mustChangePassword =
    profile.role === "INTERN" && password === "intern";

  return res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken: data.session.access_token,
    expiresAt: data.session.expires_at,
    mustChangePassword,
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      mustChangePassword,
    },
  });
}

export async function changePassword(req: Request, res: Response) {
  try {
    const user = res.locals.user as AuthUser;

    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.issues?.[0]?.message || "Invalid password format",
      });
    }

    const { newPassword } = validation.data;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
