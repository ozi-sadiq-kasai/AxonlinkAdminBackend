import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const hashToken = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export const randomResetCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: "admin-access" }, config.accessSecret, {
    expiresIn: config.accessTtl,
    issuer: "axonlink-admin-api",
    audience: "axonlink-admin-frontend",
  });
}

export function signRefreshToken(user, sessionId) {
  return jwt.sign({ sub: user.id, sid: sessionId, type: "admin-refresh" }, config.refreshSecret, {
    expiresIn: `${config.refreshDays}d`,
    issuer: "axonlink-admin-api",
    audience: "axonlink-admin-frontend",
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshSecret, {
    issuer: "axonlink-admin-api",
    audience: "axonlink-admin-frontend",
  });
}

export function signPasswordResetToken(user, resetCodeId) {
  return jwt.sign({ sub: user.id, rid: resetCodeId, type: "admin-password-reset" }, config.resetSecret, {
    expiresIn: "10m",
    issuer: "axonlink-admin-api",
    audience: "axonlink-admin-frontend",
  });
}

export function verifyPasswordResetToken(token) {
  return jwt.verify(token, config.resetSecret, {
    issuer: "axonlink-admin-api",
    audience: "axonlink-admin-frontend",
  });
}
