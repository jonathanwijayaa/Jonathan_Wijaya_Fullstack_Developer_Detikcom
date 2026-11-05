"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const supabase_1 = require("../config/supabase");
async function authenticate(req, res, next) {
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
        const { data, error } = await supabase_1.supabaseAuth.auth.getUser(token);
        if (error || !data.user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }
        // Ambil role dari database, bukan dari request
        const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
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
        if (profile.role !== "ADMIN" &&
            profile.role !== "INTERN") {
            return res.status(403).json({
                success: false,
                message: "Invalid user role",
            });
        }
        res.locals.user = profile;
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
// Role authorization middleware
function authorize(...allowedRoles) {
    return (_req, res, next) => {
        const user = res.locals.user;
        if (!user || !allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource",
            });
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map