"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.changePassword = changePassword;
const zod_1 = require("zod");
const supabase_1 = require("../../config/supabase");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const changePasswordSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
async function login(req, res) {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password format",
        });
    }
    const { email, password } = validation.data;
    const { data, error } = await supabase_1.supabaseAuth.auth.signInWithPassword({
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
    const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
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
    const mustChangePassword = profile.role === "INTERN" && password === "intern";
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
async function changePassword(req, res) {
    try {
        const user = res.locals.user;
        const validation = changePasswordSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: validation.error.issues?.[0]?.message || "Invalid password format",
            });
        }
        const { newPassword } = validation.data;
        const { error } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(user.id, {
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
    }
    catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
//# sourceMappingURL=auth.controller.js.map