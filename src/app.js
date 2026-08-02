import "dotenv/config";
import express from "express";
import { assertConfiguration, config } from "./config.js";
import { corsMiddleware, securityHeaders } from "./middleware/security.js";
import authRoutes from "./routes/authRoutes.js";

assertConfiguration();

const app = express();
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "axonlink-admin-api" }));
app.use("/api/auth", authRoutes);

app.use((_req, res) => res.status(404).json({ message: "Route not found." }));
app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Server error." });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => console.log(`Axonlink Admin API listening on port ${config.port}`));
}

export default app;
