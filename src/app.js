import "dotenv/config";
import express from "express";
import { assertConfiguration, config } from "./config.js";
import { corsMiddleware, securityHeaders } from "./middleware/security.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import appDataRoutes from "./routes/appDataRoutes.js";
import systemControlRoutes from "./routes/systemControlRoutes.js";
import communicationRoutes from "./routes/communicationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import deletionRequestRoutes from "./routes/deletionRequestRoutes.js";
import { startCommunicationScheduler } from "./services/communicationService.js";

assertConfiguration();

const app = express();
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "axonlink-admin-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/app", appDataRoutes);
app.use("/api/system-control", systemControlRoutes);
app.use("/api/communications", communicationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/deletion-requests", deletionRequestRoutes);
app.get("/account-deletion", (_req, res) => {
  const destination = new URL("/account-deletion?scope=ADMIN", config.appApiUrl);
  if (config.nodeEnv === "production" && destination.protocol !== "https:") return res.status(503).send("Account deletion is not configured.");
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, destination.toString());
});

app.use((_req, res) => res.status(404).json({ message: "Route not found." }));
app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error." });
});

if (process.env.NODE_ENV !== "test") {
  startCommunicationScheduler();
  app.listen(config.port, () => console.log(`Axonlink Admin API listening on port ${config.port}`));
}

export default app;
