import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const getLaunchArgs = () => [
  ...(process.platform === "linux"
    ? [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-zygote",
        "--single-process",
      ]
    : []),
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-features=site-per-process,Translate,IsolateOrigins",
];

const getExecutableCandidates = () => {
  const candidates = [];

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
  }

  try {
    const bundledPath = puppeteer.executablePath?.();
    if (bundledPath) candidates.push(bundledPath);
  } catch (_) {
    // no-op
  }

  candidates.push(
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable"
  );

  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );
  }

  return [...new Set(candidates.filter(Boolean))];
};

const getCachedChromeExecutable = () => {
  const baseCacheDir =
    process.env.PUPPETEER_CACHE_DIR
    || (process.env.RENDER ? "/opt/render/.cache/puppeteer" : null);

  if (!baseCacheDir) {
    return null;
  }

  const chromeBaseDir = path.join(baseCacheDir, "chrome");
  if (!fs.existsSync(chromeBaseDir)) {
    return null;
  }

  try {
    const platformDirs = fs.readdirSync(chromeBaseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("linux-"))
      .map((entry) => entry.name)
      .sort();

    for (let i = platformDirs.length - 1; i >= 0; i -= 1) {
      const candidate = path.join(
        chromeBaseDir,
        platformDirs[i],
        "chrome-linux64",
        "chrome"
      );
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  } catch (_) {
    return null;
  }

  return null;
};

const launchBrowser = async () => {
  const args = getLaunchArgs();
  const errors = [];

  const dynamicCachedChrome = getCachedChromeExecutable();
  const executableCandidates = dynamicCachedChrome
    ? [...new Set([dynamicCachedChrome, ...getExecutableCandidates()])]
    : getExecutableCandidates();

  for (const executablePath of executableCandidates) {
    try {
      return await puppeteer.launch({
        headless: "new",
        executablePath,
        args,
      });
    } catch (error) {
      errors.push(`${executablePath}: ${error.message}`);
    }
  }

  try {
    return await puppeteer.launch({
      headless: "new",
      args,
    });
  } catch (error) {
    errors.push(`default: ${error.message}`);
  }

  throw new Error(
    `Unable to launch Chromium for PDF rendering. Tried: ${errors.join(" | ")}`
  );
};

export const renderPdfFromHtml = async (req, res) => {
  let browser = null;

  try {
    const { html, fileName, options } = req.body || {};

    if (!html || typeof html !== "string") {
      return res.status(400).json({
        message: "html is required and must be a string",
      });
    }

    browser = await launchBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 45000,
      });
    } catch (error) {
      // Some hosts never reach network-idle for synthetic HTML. Fallback to DOM ready.
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
    }

    const pdfBuffer = await page.pdf({
      format: options?.format || "A4",
      landscape: Boolean(options?.landscape),
      printBackground: options?.printBackground !== false,
      margin: options?.margin || {
        top: "16mm",
        right: "12mm",
        bottom: "16mm",
        left: "12mm",
      },
    });

    const safeFileName = String(fileName || "report.pdf")
      .replace(/[^\w.\-]/g, "_")
      .replace(/_{2,}/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFileName.endsWith(".pdf") ? safeFileName : `${safeFileName}.pdf`}"`,
    );

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[PDF] renderPdfFromHtml failed:", error.message || error);
    return res.status(500).json({
      message: error.message || "Failed to generate PDF",
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        // no-op
      }
    }
  }
};
