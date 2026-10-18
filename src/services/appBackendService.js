import jwt from "jsonwebtoken";
import { config } from "../config.js";

function serviceToken(admin) {
  if (!config.appServiceSecret) throw Object.assign(new Error("Axonlink app service connection is not configured."), { statusCode: 503 });
  return jwt.sign({ type: "admin-service", adminId: admin.id, adminRole: admin.role }, config.appServiceSecret, {
    issuer: "axonlink-admin-backend",
    audience: "axonlink-app-backend",
    expiresIn: "2m",
  });
}

export async function appBackendRequest(admin, path, { method = "GET", body, timeoutMs = 12000 } = {}) {
  let response;
  try {
    response = await fetch(`${path === "/dashboard" ? (process.env.AXONLINK_DASHBOARD_API_URL || config.appApiUrl).replace(/\/$/, "") : config.appApiUrl}/internal/admin/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${serviceToken(admin)}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw Object.assign(new Error("The Axonlink app service is unavailable."), { statusCode: 503 });
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(payload?.message || "The Axonlink app request failed."), { statusCode: response.status });
  return payload;
}
