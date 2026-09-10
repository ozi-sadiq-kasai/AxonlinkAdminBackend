const requiredInProduction = [
  "DATABASE_URL",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "RESET_TOKEN_SECRET",
];

export function assertConfiguration() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = requiredInProduction.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5040),
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  accessSecret: process.env.ACCESS_TOKEN_SECRET || "development-access-token-secret-change-me",
  refreshSecret: process.env.REFRESH_TOKEN_SECRET || "development-refresh-token-secret-change-me",
  resetSecret: process.env.RESET_TOKEN_SECRET || "development-reset-token-secret-change-me",
  accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  resetCodeMinutes: Number(process.env.RESET_CODE_MINUTES || 10),
  bootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET || "",
  frontendUrl: (process.env.ADMIN_FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""),
  appApiUrl: (process.env.AXONLINK_APP_API_URL || "http://localhost:5030").replace(/\/$/, ""),
  appServiceSecret: process.env.AXONLINK_SERVICE_SECRET || (process.env.NODE_ENV === "production" ? "" : "development-admin-service-secret-change-me"),
};
