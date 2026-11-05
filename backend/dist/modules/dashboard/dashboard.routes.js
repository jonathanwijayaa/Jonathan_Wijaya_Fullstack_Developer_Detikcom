"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("./dashboard.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/admin", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("ADMIN"), dashboard_controller_1.getAdminDashboard);
router.get("/admin/recent-attendance", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("ADMIN"), dashboard_controller_1.getRecentAttendance);
router.get("/intern", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("INTERN"), dashboard_controller_1.getInternDashboard);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map