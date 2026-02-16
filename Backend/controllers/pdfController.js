import puppeteer from "puppeteer";

export const renderPdfFromHtml = async (req, res) => {
  let browser = null;

  try {
    const { html, fileName, options } = req.body || {};

    if (!html || typeof html !== "string") {
      return res.status(400).json({
        message: "html is required and must be a string",
      });
    }

    const launchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

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
