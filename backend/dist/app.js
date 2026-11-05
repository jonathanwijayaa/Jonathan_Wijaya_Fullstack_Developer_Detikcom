"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const attendance_routes_1 = __importDefault(require("./modules/attendance/attendance.routes"));
const interns_routes_1 = __importDefault(require("./modules/interns/interns.routes"));
const admin_attendance_routes_1 = __importDefault(require("./modules/attendance/admin-attendance.routes"));
const app = (0, express_1.default)();
app.use((req, _res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
});
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "https://jonathan-wijaya-fullstack-developer.vercel.app",
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api/admin/interns", interns_routes_1.default);
app.use("/api/auth", auth_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/attendance", attendance_routes_1.default);
app.use("/api/admin/attendance", admin_attendance_routes_1.default);
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
exports.default = app;
//# sourceMappingURL=app.js.map