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
    from: process.env.EMAIL_FROM || "Axonlink Admin <no-reply@axonlink.ai>",
    to: email,
    subject: "Your Axonlink Admin password reset code",
    text: `Hello ${firstName}, your Axonlink Admin password reset code is ${code}. It expires shortly.`,
    html: `<p>Hello ${firstName},</p><p>Your Axonlink Admin password reset code is <strong>${code}</strong>.</p><p>It expires shortly. If you did not request this, ignore this email.</p>`,
  });
}
