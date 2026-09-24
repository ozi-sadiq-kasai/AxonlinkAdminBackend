import { Router } from "express";
import { requireAdmin, requireRole } from "../middleware/security.js";
import { listDeletionRequests, getDeletionRequest, updateDeletionRequest } from "../controllers/deletionRequestController.js";
const router = Router();
router.use(requireAdmin, requireRole("SUPER_ADMIN"));
router.get("/", listDeletionRequests);
router.get("/:id", getDeletionRequest);
router.patch("/:id", updateDeletionRequest);
export default router;
