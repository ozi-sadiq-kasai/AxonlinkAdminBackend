import bcrypt from "bcrypt";
import { prisma } from "../prisma.js";
import { audit } from "../services/authService.js";
import { sendPasswordResetCode } from "../services/emailService.js";
import { randomResetCode } from "../utils/tokens.js";

const ROLE_DEFINITIONS = [
  { key: "SUPER_ADMIN", label: "Super Admin", permissions: ["FULL_ACCESS", "USERS", "REFERRAL", "ACTIVITY", "REPORT", "SYSTEM_CONTROL", "NOTIFICATION"] },
  { key: "ADMIN", label: "Operational Admin", permissions: ["REFERRAL", "ACTIVITY", "NOTIFICATION"] },
  { key: "SUPPORT", label: "Support Admin", permissions: ["USERS", "ACTIVITY", "NOTIFICATION"] },
  { key: "AUDITOR", label: "Compliance Admin", permissions: ["USERS", "SYSTEM_CONTROL"] },
];

const adminSelect = {
  id: true, email: true, firstName: true, lastName: true, phone: true, role: true,
  status: true, lastLoginAt: true, createdAt: true, updatedAt: true,
};

export async function adminManagementOverview(_req, res, next) {
  try {
    const [admins, auditLogs] = await Promise.all([
      prisma.adminUser.findMany({ select: adminSelect, orderBy: { createdAt: "desc" } }),
      prisma.adminAuditLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
    ]);
    const roles = ROLE_DEFINITIONS.map((role) => ({
      ...role,
      adminCount: admins.filter((admin) => admin.role === role.key).length,
      lastUpdated: admins.filter((admin) => admin.role === role.key).reduce((latest, admin) => admin.updatedAt > latest ? admin.updatedAt : latest, new Date(0)),
    }));
    return res.json({
      overview: {
        totalAdmins: admins.length,
        activeAdmins: admins.filter((admin) => admin.status === "ACTIVE").length,
        superAdmins: admins.filter((admin) => admin.role === "SUPER_ADMIN").length,
        adminRoles: roles.filter((role) => role.adminCount > 0).length,
        suspendedAdmins: admins.filter((admin) => admin.status === "SUSPENDED").length,
      },
      roles,
      admins,
      auditLogs,
    });
  } catch (error) { next(error); }
}

export async function adminProfile(req, res, next) {
  try {
    const admin = await prisma.adminUser.findUnique({ where: { id: req.params.id }, select: adminSelect });
    if (!admin) return res.status(404).json({ message: "Administrator not found." });
    const [auditLogs, sessions] = await Promise.all([
      prisma.adminAuditLog.findMany({ where: { adminId: admin.id }, take: 50, orderBy: { createdAt: "desc" } }),
      prisma.adminSession.findMany({ where: { userId: admin.id }, take: 30, orderBy: { createdAt: "desc" }, select: { id: true, userAgent: true, ipAddress: true, createdAt: true, revokedAt: true, expiresAt: true } }),
    ]);
    const role = ROLE_DEFINITIONS.find((entry) => entry.key === admin.role);
    return res.json({ admin, role, auditLogs, sessions });
  } catch (error) { next(error); }
}

export async function updateAdmin(req, res, next) {
  try {
    const data = {};
    if (req.body.role !== undefined) {
      if (!ROLE_DEFINITIONS.some((role) => role.key === req.body.role)) return res.status(400).json({ message: "Invalid administrator role." });
      data.role = req.body.role;
    }
    if (req.body.status !== undefined) {
      if (!["ACTIVE", "SUSPENDED", "DISABLED"].includes(req.body.status)) return res.status(400).json({ message: "Invalid administrator status." });
      if (req.params.id === req.admin.id && req.body.status !== "ACTIVE") return res.status(400).json({ message: "You cannot suspend your own account." });
      data.status = req.body.status;
    }
    if (!Object.keys(data).length) return res.status(400).json({ message: "No supported changes supplied." });
    const admin = await prisma.adminUser.update({ where: { id: req.params.id }, data, select: adminSelect });
    await audit(req, "ADMIN_ACCOUNT_UPDATED", data, admin.id);
    return res.json({ admin });
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Administrator not found." });
    next(error);
  }
}

export async function sendAdminReset(req, res, next) {
  try {
    const admin = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!admin) return res.status(404).json({ message: "Administrator not found." });
    const code = randomResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.$transaction([
      prisma.passwordResetCode.updateMany({ where: { userId: admin.id, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.passwordResetCode.create({ data: { userId: admin.id, codeHash: await bcrypt.hash(code, 10), expiresAt } }),
    ]);
    await sendPasswordResetCode({ email: admin.email, firstName: admin.firstName, code });
    await audit(req, "ADMIN_PASSWORD_RESET_SENT", undefined, admin.id);
    return res.json({ message: "Password reset instructions sent." });
  } catch (error) { next(error); }
}
