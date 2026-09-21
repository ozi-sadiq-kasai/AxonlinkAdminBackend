import assert from "node:assert/strict";
import test from "node:test";
import { inspectConfiguration, requiredInProduction } from "../src/config.js";

test("admin environment audit reports no missing variables for a complete deployment", () => {
  const environment = Object.fromEntries(requiredInProduction.map((name) => [name, "configured"]));
  Object.assign(environment, { EMAIL_PROVIDER: "resend", RESEND_API_KEY: "test-key", EMAIL_FROM: "admin@example.com" });
  assert.deepEqual(inspectConfiguration(environment), []);
});

test("admin environment audit includes its shared API connection", () => {
  const missing = inspectConfiguration({});
  assert.ok(missing.includes("AXONLINK_APP_API_URL"));
  assert.ok(missing.includes("AXONLINK_SERVICE_SECRET"));
});

test("bootstrap secret can be removed after initial setup", () => {
  const environment = Object.fromEntries(requiredInProduction.map((name) => [name, "configured"]));
  Object.assign(environment, { SMTP_HOST: "smtp.example.com", SMTP_USER: "user", SMTP_PASSWORD: "secret" });
  assert.deepEqual(inspectConfiguration(environment), []);
});

test("Resend requires its key and sender instead of SMTP credentials", () => {
  const missing = inspectConfiguration({ EMAIL_PROVIDER: "resend" });
  assert.ok(missing.includes("RESEND_API_KEY"));
  assert.ok(missing.includes("EMAIL_FROM"));
  assert.ok(!missing.includes("SMTP_HOST"));
});

test("unknown email providers fail the deployment check", () => {
  assert.ok(inspectConfiguration({ EMAIL_PROVIDER: "invalid" }).includes("EMAIL_PROVIDER (use resend or smtp)"));
});
