import { existsSync } from "fs";
import { spawnSync } from "child_process";

const shouldInstall =
  process.env.RENDER === "true"
  || process.env.PUPPETEER_INSTALL_ON_BUILD === "true";

if (!shouldInstall) {
  console.log("[postinstall] Skipping Chromium install");
  process.exit(0);
}

const cliPath = "./node_modules/puppeteer/lib/cjs/puppeteer/node/cli.js";
if (!existsSync(cliPath)) {
  console.warn("[postinstall] Puppeteer CLI not found, skipping Chromium install");
  process.exit(0);
}

console.log("[postinstall] Installing Chromium for Puppeteer...");
const result = spawnSync(
  process.execPath,
  [cliPath, "browsers", "install", "chrome"],
  { stdio: "inherit", env: process.env }
);

if (result.status !== 0) {
  console.error("[postinstall] Chromium installation failed");
  process.exit(result.status || 1);
}

console.log("[postinstall] Chromium installed successfully");
