"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("./attendance.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("INTERN"));
router.post("/check-in", attendance_controller_1.checkIn);
router.post("/check-out", attendance_controller_1.checkOut);
router.get("/me", attendance_controller_1.getMyAttendance);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map