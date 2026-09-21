import "dotenv/config";
import { inspectConfiguration } from "./config.js";

const missing = inspectConfiguration(process.env);
if (missing.length) {
  console.error(`Admin environment is incomplete:\n- ${missing.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Admin environment contains every required production variable.");
}
