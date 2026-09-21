import nodemailer from "nodemailer";

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const provider = () => (process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();

function emailConfigured() {
  const keys = provider() === "resend" ? ["RESEND_API_KEY", "EMAIL_FROM"] : ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"];
  const configured = ["smtp", "resend"].includes(provider()) && keys.every((key) => process.env[key]?.trim());
  if (!configured && process.env.NODE_ENV === "production") throw new Error("Admin email is not configured.");
  return configured;
}

async function sendMail(message) {
  if (provider() === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ ...message, from: process.env.EMAIL_FROM.trim(), to: [message.to] }),
    });
    // Do not log provider payloads, which can contain recipient information.
    if (!response.ok) throw new Error(`Admin email provider rejected delivery (HTTP ${response.status}).`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 15000,
    socketTimeout: 15000,
  });
  await transporter.sendMail(message);
}

export async function sendPasswordResetCode({ email, firstName, code }) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[development] Password reset code for ${email}: ${code}`);
    return;
  }

  await sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "Axonlink Admin <no-reply@axonlink.ai>",
    to: email,
    subject: "Your Axonlink Admin password reset code",
    text: `Hello ${firstName}, your Axonlink Admin password reset code is ${code}. It expires shortly.`,
    html: `<p>Hello ${escape(firstName)},</p><p>Your Axonlink Admin password reset code is <strong>${escape(code)}</strong>.</p><p>It expires shortly. If you did not request this, ignore this email.</p>`,
  });
}

export async function sendAdminInvitation({ email, firstName, inviteUrl, role }) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[development] Admin invitation for ${email}: ${inviteUrl}`);
    return false;
  }

  await sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "Axonlink Admin <no-reply@axonlink.ai>",
    to: email,
    subject: "You have been invited to Axonlink Admin",
    text: `Hello ${firstName}, you have been invited as ${role}. Complete your account setup here: ${inviteUrl}`,
    html: `<p>Hello ${escape(firstName)},</p><p>You have been invited to Axonlink Admin as <strong>${escape(role)}</strong>.</p><p><a href="${escape(inviteUrl)}">Complete your account setup</a></p><p>This invitation expires in 72 hours.</p>`,
  });
  return true;
}

export async function sendAdminCommunicationEmail({ email, title, message }) {
  if (!emailConfigured()) return false;
  await sendMail({ from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "Axonlink Admin <no-reply@axonlink.ai>", to: email, subject: title, text: message, html: `<h1>${escape(title)}</h1><p>${escape(message).replaceAll("\n", "<br>")}</p>` });
  return true;
}
