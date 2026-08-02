import bcrypt from "bcrypt";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { audit, createAuthenticatedSession, hashPassword, refreshCookieOptions, secureEqual } from "../services/authService.js";
import { sendPasswordResetCode } from "../services/emailService.js";
import { parseCookies } from "../utils/cookies.js";
import { hashToken, randomResetCode, randomToken, signPasswordResetToken, verifyPasswordResetToken, verifyRefreshToken } from "../utils/tokens.js";
import { getPasswordErrors, isValidEmail, normalizeEmail, publicAdmin } from "../utils/validation.js";

const GENERIC_LOGIN_ERROR = "Invalid email or password.";
const GENERIC_RESET_RESPONSE = "If an eligible account exists, a verification code has been sent.";

function setRefreshCookie(res, token) {
  res.cookie("axonlink_admin_refresh", token, refreshCookieOptions());
}

export async function signup(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const password = String(req.body.password || "");
    const inviteToken = String(req.body.inviteToken || "").trim();
    const passwordErrors = getPasswordErrors(password);

    if (!isValidEmail(email) || !firstName || !lastName || passwordErrors.length) {
      return res.status(400).json({ message: "Invalid signup details.", errors: passwordErrors });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
    if (existing) return res.status(409).json({ message: "This administrator account cannot be created." });

    let role = "SUPER_ADMIN";
    let invitation = null;
    if (inviteToken) {
      invitation = await prisma.adminInvitation.findUnique({ where: { tokenHash: hashToken(inviteToken) } });
      if (!invitation || invitation.email !== email || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
        return res.status(400).json({ message: "Invalid or expired invitation." });
      }
      role = invitation.role;
    } else {
      const bootstrapSecret = req.get("x-admin-bootstrap-secret");
      const adminCount = await prisma.adminUser.count();
      if (adminCount > 0 || !config.bootstrapSecret || !secureEqual(bootstrapSecret, config.bootstrapSecret)) {
        return res.status(403).json({ message: "A valid administrator invitation is required." });
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.adminUser.create({
        data: { email, firstName, lastName, passwordHash: await hashPassword(password), role },
      });
      if (invitation) await tx.adminInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      return created;
    });

    const session = await createAuthenticatedSession(user, req);
    setRefreshCookie(res, session.refreshToken);
    req.admin = user;
    await audit(req, "ADMIN_SIGNUP", { role: user.role }, user.id);
    return res.status(201).json(session.payload);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const user = isValidEmail(email) ? await prisma.adminUser.findUnique({ where: { email } }) : null;

    if (!user || user.status !== "ACTIVE" || (user.lockedUntil && user.lockedUntil > new Date())) {
      return res.status(401).json({ message: GENERIC_LOGIN_ERROR });
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts >= 5 ? 0 : attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null },
      });
      return res.status(401).json({ message: GENERIC_LOGIN_ERROR });
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const session = await createAuthenticatedSession(updatedUser, req);
    setRefreshCookie(res, session.refreshToken);
    req.admin = updatedUser;
    await audit(req, "ADMIN_LOGIN", undefined, updatedUser.id);
    return res.json(session.payload);
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = parseCookies(req.headers.cookie).axonlink_admin_refresh;
    if (!token) return res.status(401).json({ message: "Refresh token required." });
    const payload = verifyRefreshToken(token);
    if (payload.type !== "admin-refresh") return res.status(401).json({ message: "Invalid refresh token." });

    const session = await prisma.adminSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.userId !== payload.sub || session.tokenHash !== hashToken(token) || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    await prisma.adminSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const nextSession = await createAuthenticatedSession(session.user, req);
    setRefreshCookie(res, nextSession.refreshToken);
    return res.json(nextSession.payload);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired refresh token." });
  }
}

export async function logout(req, res, next) {
  try {
    const token = parseCookies(req.headers.cookie).axonlink_admin_refresh;
    if (token) await prisma.adminSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
    res.clearCookie("axonlink_admin_refresh", refreshCookieOptions());
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const user = isValidEmail(email) ? await prisma.adminUser.findUnique({ where: { email } }) : null;

    if (user?.status === "ACTIVE") {
      const code = randomResetCode();
      const expiresAt = new Date(Date.now() + config.resetCodeMinutes * 60 * 1000);
      await prisma.$transaction([
        prisma.passwordResetCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
        prisma.passwordResetCode.create({ data: { userId: user.id, codeHash: await bcrypt.hash(code, 10), expiresAt } }),
      ]);
      await sendPasswordResetCode({ email: user.email, firstName: user.firstName, code });
    }

    return res.json({ message: GENERIC_RESET_RESPONSE });
  } catch (error) {
    next(error);
  }
}

export async function verifyResetCode(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const user = isValidEmail(email) ? await prisma.adminUser.findUnique({ where: { email } }) : null;
    const resetCode = user ? await prisma.passwordResetCode.findFirst({ where: { userId: user.id, usedAt: null }, orderBy: { createdAt: "desc" } }) : null;

    if (!resetCode || resetCode.expiresAt <= new Date() || resetCode.attempts >= 5 || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }
    if (!(await bcrypt.compare(code, resetCode.codeHash))) {
      await prisma.passwordResetCode.update({ where: { id: resetCode.id }, data: { attempts: { increment: 1 } } });
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    return res.json({ resetToken: signPasswordResetToken(user, resetCode.id) });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const password = String(req.body.password || "");
    const errors = getPasswordErrors(password);
    if (errors.length) return res.status(400).json({ message: "Password does not meet requirements.", errors });

    const payload = verifyPasswordResetToken(String(req.body.resetToken || ""));
    if (payload.type !== "admin-password-reset") return res.status(400).json({ message: "Invalid or expired reset token." });
    const resetCode = await prisma.passwordResetCode.findUnique({ where: { id: payload.rid } });
    if (!resetCode || resetCode.userId !== payload.sub || resetCode.usedAt || resetCode.expiresAt <= new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    await prisma.$transaction([
      prisma.adminUser.update({ where: { id: payload.sub }, data: { passwordHash: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null } }),
      prisma.passwordResetCode.update({ where: { id: resetCode.id }, data: { usedAt: new Date() } }),
      prisma.adminSession.updateMany({ where: { userId: payload.sub, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return res.json({ message: "Password reset successfully." });
  } catch (error) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") return res.status(400).json({ message: "Invalid or expired reset token." });
    next(error);
  }
}

export async function me(req, res) {
  return res.json({ admin: publicAdmin(req.admin) });
}

export async function createInvitation(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const role = String(req.body.role || "ADMIN");
    const allowedRoles = ["ADMIN", "SUPPORT", "AUDITOR", "SUPER_ADMIN"];
    if (!isValidEmail(email) || !allowedRoles.includes(role)) return res.status(400).json({ message: "Invalid invitation details." });

    const token = randomToken();
    const invitation = await prisma.adminInvitation.create({
      data: { email, role, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), createdById: req.admin.id },
    });
    await audit(req, "ADMIN_INVITATION_CREATED", { email, role }, invitation.id);
    return res.status(201).json({ invitation: { id: invitation.id, email, role, expiresAt: invitation.expiresAt, token } });
  } catch (error) {
    next(error);
  }
}
