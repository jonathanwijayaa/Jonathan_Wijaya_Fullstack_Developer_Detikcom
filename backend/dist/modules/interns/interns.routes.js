"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const interns_controller_1 = require("./interns.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("ADMIN"));
router.get("/", interns_controller_1.getAllInterns);
router.post("/", interns_controller_1.createIntern);
router.put("/:id", interns_controller_1.updateIntern);
router.delete("/:id", interns_controller_1.deleteIntern);
exports.default = router;
//# sourceMappingURL=interns.routes.js.map