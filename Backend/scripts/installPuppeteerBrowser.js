import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer";

const isTruthy = (value = "") => ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());

const shouldSkipDownload = isTruthy(process.env.PUPPETEER_SKIP_DOWNLOAD);
if (shouldSkipDownload) {
  console.log("[postinstall] PUPPETEER_SKIP_DOWNLOAD=true, skipping browser install.");
  process.exit(0);
}

// Set cache directory for Render/cloud environments
if (!process.env.PUPPETEER_CACHE_DIR) {
  const cacheDir = path.join(process.cwd(), ".cache", "puppeteer");
  process.env.PUPPETEER_CACHE_DIR = cacheDir;
  console.log(`[postinstall] Setting PUPPETEER_CACHE_DIR to: ${cacheDir}`);
}

let bundledPath = "";
try {
  bundledPath = String(puppeteer.executablePath?.() || "");
} catch (_) {
  bundledPath = "";
}

if (bundledPath && fs.existsSync(bundledPath)) {
  console.log(`[postinstall] Puppeteer browser already available at: ${bundledPath}`);
  process.exit(0);
}

console.log("[postinstall] Installing Chrome for Puppeteer...");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const installResult = spawnSync(
  npxCommand,
  ["puppeteer", "browsers", "install", "chrome"],
  { stdio: "inherit", env: process.env }
);

if (installResult.status !== 0) {
  console.error("[postinstall] Failed to install Puppeteer browser.");
  process.exit(installResult.status || 1);
}

try {
  const installedPath = String(puppeteer.executablePath?.() || "");
  if (installedPath && fs.existsSync(installedPath)) {
    console.log(`[postinstall] Puppeteer browser installed at: ${installedPath}`);
  } else {
    console.warn("[postinstall] Browser install command completed, but executable was not detected.");
  }
} catch (_) {
  console.warn("[postinstall] Browser installed, but executable path check failed.");
}
