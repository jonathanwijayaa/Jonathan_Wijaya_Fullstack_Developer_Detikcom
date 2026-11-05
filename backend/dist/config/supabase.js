"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabaseAuth = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !publishableKey || !secretKey) {
    throw new Error("Supabase environment variables are missing");
}
exports.supabaseAuth = (0, supabase_js_1.createClient)(supabaseUrl, publishableKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    }
});
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, secretKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});
//# sourceMappingURL=supabase.js.map