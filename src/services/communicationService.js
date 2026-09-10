import { prisma } from "../prisma.js";
import { appBackendRequest } from "./appBackendService.js";
import { sendAdminCommunicationEmail } from "./emailService.js";

export const AUDIENCES = ["ALL_USERS", "PATIENTS", "CLINICIANS", "FACILITIES", "ADMINS"];
export const CHANNELS = ["PUSH", "EMAIL", "SMS"];

export function normalizeCommunication(body = {}) {
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const audiences = [...new Set(Array.isArray(body.audiences) ? body.audiences : [])];
  const channels = [...new Set(Array.isArray(body.channels) ? body.channels : [])];
  if (!title || title.length > 160) throw Object.assign(new Error("A title of up to 160 characters is required."), { statusCode: 400 });
  if (!message || message.length > 20000) throw Object.assign(new Error("A message of up to 20,000 characters is required."), { statusCode: 400 });
  if (!audiences.length || audiences.some((item) => !AUDIENCES.includes(item))) throw Object.assign(new Error("Choose at least one valid audience."), { statusCode: 400 });
  if (!channels.length || channels.some((item) => !CHANNELS.includes(item))) throw Object.assign(new Error("Choose at least one valid delivery channel."), { statusCode: 400 });
  return { title, message, audiences, channels, contentBlocks: Array.isArray(body.contentBlocks) ? body.contentBlocks.slice(0, 30) : null, imageUrl: String(body.imageUrl || "").trim() || null, documentUrl: String(body.documentUrl || "").trim() || null };
}

export async function deliverCommunication(item, { claimed = false } = {}) {
  if (!claimed) await prisma.adminCommunication.update({ where: { id: item.id }, data: { status: "SENDING", failureReason: null } });
  try {
    const result = await appBackendRequest({ id: item.createdById, role: "SUPER_ADMIN" }, "/communications/deliver", { method: "POST", timeoutMs: 120000, body: { communicationId: item.id, title: item.title, message: item.message, audiences: item.audiences, channels: item.channels, contentBlocks: item.contentBlocks, imageUrl: item.imageUrl, documentUrl: item.documentUrl } });
    let adminRecipients = 0, adminEmailDelivered = 0;
    if ((item.audiences.includes("ADMINS") || item.audiences.includes("ALL_USERS")) && item.channels.includes("EMAIL")) {
      const admins = await prisma.adminUser.findMany({ where: { status: "ACTIVE" }, select: { email: true } }); adminRecipients = admins.length;
      const deliveries = await Promise.allSettled(admins.map((admin) => sendAdminCommunicationEmail({ email: admin.email, title: item.title, message: item.message })));
      adminEmailDelivered = deliveries.filter((entry) => entry.status === "fulfilled" && entry.value).length;
    }
    if (item.audiences.includes("ADMINS") || item.audiences.includes("ALL_USERS")) {
      const admins = await prisma.adminUser.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
      await prisma.adminNotification.createMany({ data: admins.map((admin) => ({ userId: admin.id, title: item.title, message: item.message, imageUrl: item.imageUrl, linkUrl: item.documentUrl })) });
    }
    return prisma.adminCommunication.update({ where: { id: item.id }, data: { status: result.failed ? "FAILED" : "DELIVERED", sentAt: new Date(), failureReason: result.failureReason || null, recipientCount: (result.recipientCount || 0) + adminRecipients, pushDelivered: result.pushDelivered || 0, emailDelivered: (result.emailDelivered || 0) + adminEmailDelivered, smsDelivered: result.smsDelivered || 0 } });
  } catch (error) {
    await prisma.adminCommunication.update({ where: { id: item.id }, data: { status: "FAILED", sentAt: new Date(), failureReason: error.message } });
    throw error;
  }
}

export function startCommunicationScheduler() {
  const timer = setInterval(async () => {
    const due = await prisma.adminCommunication.findMany({ where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } }, take: 10, orderBy: { scheduledFor: "asc" } }).catch(() => []);
    for (const item of due) {
      const claim = await prisma.adminCommunication.updateMany({ where: { id: item.id, status: "SCHEDULED" }, data: { status: "SENDING", failureReason: null } }).catch(() => ({ count: 0 }));
      if (claim.count) await deliverCommunication(item, { claimed: true }).catch((error) => console.error("Scheduled communication failed", item.id, error.message));
    }
  }, 30000);
  timer.unref?.();
}
