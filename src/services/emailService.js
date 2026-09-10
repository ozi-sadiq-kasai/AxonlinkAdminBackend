import nodemailer from "nodemailer";

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export async function sendPasswordResetCode({ email, firstName, code }) {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[development] Password reset code for ${email}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "Axonlink Admin <no-reply@axonlink.ai>",
    to: email,
    subject: "Your Axonlink Admin password reset code",
    text: `Hello ${firstName}, your Axonlink Admin password reset code is ${code}. It expires shortly.`,
    html: `<p>Hello ${firstName},</p><p>Your Axonlink Admin password reset code is <strong>${code}</strong>.</p><p>It expires shortly. If you did not request this, ignore this email.</p>`,
  });
}

export async function sendAdminInvitation({ email, firstName, inviteUrl, role }) {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[development] Admin invitation for ${email}: ${inviteUrl}`);
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "Axonlink Admin <no-reply@axonlink.ai>",
    to: email,
    subject: "You have been invited to Axonlink Admin",
    text: `Hello ${firstName}, you have been invited as ${role}. Complete your account setup here: ${inviteUrl}`,
    html: `<p>Hello ${firstName},</p><p>You have been invited to Axonlink Admin as <strong>${role}</strong>.</p><p><a href="${inviteUrl}">Complete your account setup</a></p><p>This invitation expires in 72 hours.</p>`,
  });
  return true;
}

export async function sendAdminCommunicationEmail({ email, title, message }) {
  if (!smtpConfigured()) return false;
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
  const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.EMAIL_FROM || "Axonlink Admin <no-reply@axonlink.ai>", to: email, subject: title, text: message, html: `<h1>${escape(title)}</h1><p>${escape(message).replaceAll("\n", "<br>")}</p>` });
  return true;
}
