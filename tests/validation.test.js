import test from "node:test";
import assert from "node:assert/strict";
import { getPasswordErrors, isValidEmail, normalizeEmail } from "../src/utils/validation.js";

test("normalizes and validates administrator email addresses", () => {
  assert.equal(normalizeEmail(" Admin@Axonlink.AI "), "admin@axonlink.ai");
  assert.equal(isValidEmail("admin@axonlink.ai"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("requires a strong administrator password", () => {
  assert.equal(getPasswordErrors("Axonlink1!").length, 0);
  assert.ok(getPasswordErrors("password").length >= 3);
});
