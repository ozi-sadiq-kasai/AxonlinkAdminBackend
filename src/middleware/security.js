import cors from "cors";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../prisma.js";

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin not allowed by CORS.");
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Admin-Bootstrap-Secret"],
});

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  next();
}

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
export const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

export async function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : "";
    if (!token) return res.status(401).json({ message: "Authentication required." });

    const payload = jwt.verify(token, config.accessSecret, {
      issuer: "axonlink-admin-api",
      audience: "axonlink-admin-frontend",
    });
    if (payload.type !== "admin-access") return res.status(401).json({ message: "Invalid access token." });

    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || admin.status !== "ACTIVE") return res.status(401).json({ message: "Admin account is unavailable." });
    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) return res.status(403).json({ message: "Insufficient permission." });
    next();
  };
}
