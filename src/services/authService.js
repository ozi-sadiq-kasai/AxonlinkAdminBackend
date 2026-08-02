import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { hashToken, signAccessToken, signRefreshToken } from "../utils/tokens.js";
import { publicAdmin } from "../utils/validation.js";

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    maxAge: config.refreshDays * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  };
}

export async function createAuthenticatedSession(user, req) {
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, sessionId);
  const expiresAt = new Date(Date.now() + config.refreshDays * 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      userAgent: req.get("user-agent")?.slice(0, 500),
      ipAddress: req.ip,
    },
  });

  return {
    refreshToken,
    payload: { accessToken: signAccessToken(user), admin: publicAdmin(user) },
  };
}

export async function audit(req, action, metadata = undefined, targetId = undefined) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: req.admin?.id,
      action,
      targetType: targetId ? "AdminUser" : undefined,
      targetId,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")?.slice(0, 500),
    },
  }).catch(() => {});
}

export function secureEqual(left, right) {
  const first = Buffer.from(String(left || ""));
  const second = Buffer.from(String(right || ""));
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
