import { Router } from "express";
import { createInvitation, forgotPassword, login, logout, me, refresh, resetPassword, signup, verifyResetCode } from "../controllers/authController.js";
import { authLimiter, requireAdmin, requireRole, resetLimiter } from "../middleware/security.js";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.post("/forgot-password", resetLimiter, forgotPassword);
router.post("/verify-reset-code", resetLimiter, verifyResetCode);
router.post("/reset-password", resetLimiter, resetPassword);
router.get("/me", requireAdmin, me);
router.post("/invitations", requireAdmin, requireRole("SUPER_ADMIN"), createInvitation);

export default router;
