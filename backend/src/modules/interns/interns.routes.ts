import { Router } from "express";
import {
  getAllInterns,
  createIntern,
  updateIntern,
  deleteIntern,
} from "./interns.controller";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", getAllInterns);
router.post("/", createIntern);
router.put("/:id", updateIntern);
router.delete("/:id", deleteIntern);

export default router;