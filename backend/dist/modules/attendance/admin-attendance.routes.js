"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("./attendance.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("ADMIN"));
router.get("/", attendance_controller_1.getAllAttendance);
router.get("/report", attendance_controller_1.getAttendanceReport);
router.patch("/:id", attendance_controller_1.correctAttendance);
router.post("/correct", attendance_controller_1.correctAttendance);
exports.default = router;
//# sourceMappingURL=admin-attendance.routes.js.map