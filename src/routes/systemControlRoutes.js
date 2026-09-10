import { Router } from "express";
import { getSystemControl, updateSystemControl } from "../controllers/systemControlController.js";
import { requireAdmin, requireRole } from "../middleware/security.js";

const router = Router();
router.use(requireAdmin, requireRole("SUPER_ADMIN", "AUDITOR"));
router.get("/", getSystemControl);
router.patch("/", requireRole("SUPER_ADMIN", "AUDITOR"), updateSystemControl);
export default router;
