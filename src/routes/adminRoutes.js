import { Router } from "express";
import { adminManagementOverview, adminProfile, sendAdminReset, updateAdmin } from "../controllers/adminController.js";
import { requireAdmin, requireRole } from "../middleware/security.js";

const router = Router();
router.use(requireAdmin, requireRole("SUPER_ADMIN"));
router.get("/overview", adminManagementOverview);
router.get("/:id", adminProfile);
router.patch("/:id", updateAdmin);
router.post("/:id/password-reset", sendAdminReset);

export default router;
