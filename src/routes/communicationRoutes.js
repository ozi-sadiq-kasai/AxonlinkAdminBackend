import { Router } from "express";
import { cancelCommunication, createCommunication, deleteCommunication, getCommunication, listCommunications, retryCommunication, updateCommunication } from "../controllers/communicationController.js";
import { requireAdmin, requireRole } from "../middleware/security.js";
const router = Router(); router.use(requireAdmin, requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"));
router.get("/", listCommunications); router.get("/:id", getCommunication);
router.post("/", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), createCommunication); router.patch("/:id", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), updateCommunication);
router.delete("/:id", requireRole("SUPER_ADMIN"), deleteCommunication); router.post("/:id/cancel", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), cancelCommunication); router.post("/:id/retry", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), retryCommunication);
export default router;
