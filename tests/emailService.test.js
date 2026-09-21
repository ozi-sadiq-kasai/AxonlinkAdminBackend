import test from "node:test";
import assert from "node:assert/strict";
import { sendPasswordResetCode, sendAdminInvitation, sendAdminCommunicationEmail } from "../src/services/emailService.js";

function configure(t) {
  const previous = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "production", EMAIL_PROVIDER: "resend", RESEND_API_KEY: "test-key", EMAIL_FROM: "admin@example.com" });
  t.after(() => { process.env = previous; });
}

test("all admin email flows use the Resend API and escape user HTML", async (t) => {
  configure(t);
  const messages = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    messages.push(JSON.parse(options.body));
    return { ok: true };
  });
  await sendPasswordResetCode({ email: "recipient@example.com", firstName: "<script>", code: "123456" });
  assert.equal(await sendAdminInvitation({ email: "recipient@example.com", firstName: "<script>", inviteUrl: 'https://example.com/?token=a&next="b"', role: "ADMIN" }), true);
  assert.equal(await sendAdminCommunicationEmail({ email: "recipient@example.com", title: "<title>", message: "hello\n<world>" }), true);
  assert.equal(messages.length, 3);
  for (const message of messages) {
    assert.equal(message.from, "admin@example.com");
    assert.deepEqual(message.to, ["recipient@example.com"]);
    assert.ok(!message.html.includes("<script>"));
  }
  assert.match(messages[1].html, /&amp;next=&quot;b&quot;/);
});

test("provider rejection fails delivery without exposing its response", async (t) => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 403 }));
  await assert.rejects(sendPasswordResetCode({ email: "recipient@example.com", firstName: "Test", code: "123456" }), /HTTP 403/);
});

test("missing production credentials cannot silently skip delivery", async (t) => {
  configure(t);
  delete process.env.RESEND_API_KEY;
  await assert.rejects(sendAdminCommunicationEmail({ email: "recipient@example.com", title: "Test", message: "Test" }), /not configured/);
});
