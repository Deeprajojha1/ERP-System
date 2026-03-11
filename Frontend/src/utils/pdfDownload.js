import axios from "./axiosInstance";

const getPdfRenderMode = () =>
  String(import.meta.env.VITE_PDF_RENDER_MODE || "").trim().toLowerCase();

const shouldUseClientOnlyPdf = () => {
  const mode = getPdfRenderMode();
  if (mode === "client") return true;
  if (mode === "server") return false;

  if (typeof window !== "undefined") {
    const host = String(window.location?.hostname || "").toLowerCase();
    // Safe default for hosted frontends where backend memory is constrained.
    if (host.endsWith("vercel.app")) return true;
  }

  return false;
};

const PDF_RENDER_TIMEOUT_MS = 120000;

const sanitizeFileName = (name = "report.pdf") =>
  String(name)
    .replace(/[^\w.-]/g, "_")
    .replace(/_{2,}/g, "_");

const triggerBlobDownload = (blobData, fileName) => {
  const blob = new Blob([blobData], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeFileName(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const openBlobInNewTab = (blobData) => {
  const blob = new Blob([blobData], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    URL.revokeObjectURL(url);
    return false;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
};

const readBlobText = async (blobLike) => {
  if (!blobLike) return "";
  if (typeof blobLike.text === "function") {
    return blobLike.text();
  }
  return "";
};

const extractErrorMessage = async (error) => {
  const fallback = "Failed to download PDF";
  const responseData = error?.response?.data;

  if (!responseData) return fallback;

  try {
    const rawText = await readBlobText(responseData);
    if (!rawText) return fallback;
    const parsed = JSON.parse(rawText);
    return parsed?.message || fallback;
  } catch {
    return fallback;
  }
};

const openPrintFallback = (html) => {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return false;
    }

    doc.open();
    doc.write(html);
    doc.close();

    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        window.setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1200);
      }
    }, 300);

    return true;
  } catch {
    return false;
  }
};

export const downloadPdfFromHtml = async (
  apiBase,
  { html, fileName = "report.pdf", options = {}, fallbackToPrint = true },
) => {
  if (shouldUseClientOnlyPdf()) {
    if (fallbackToPrint && html) {
      const printed = openPrintFallback(html);
      if (printed) return;
    }
    throw new Error("Failed to download PDF");
  }

  try {
    const res = await axios.post(
      `${apiBase}/user/pdf/render`,
      { html, fileName: sanitizeFileName(fileName), options },
      { withCredentials: true, responseType: "blob", timeout: PDF_RENDER_TIMEOUT_MS },
    );

    triggerBlobDownload(res.data, fileName);
    return;
  } catch (error) {
    const message = await extractErrorMessage(error);
    if (fallbackToPrint && html) {
      const printed = openPrintFallback(html);
      if (printed) return;
    }
    throw new Error(message);
  }
};

export const openPdfFromHtml = async (
  apiBase,
  { html, fileName = "report.pdf", options = {}, fallbackToPrint = true },
) => {
  if (shouldUseClientOnlyPdf()) {
    if (fallbackToPrint && html) {
      const printed = openPrintFallback(html);
      if (printed) return;
    }
    throw new Error("Failed to open PDF");
  }

  try {
    const res = await axios.post(
      `${apiBase}/user/pdf/render`,
      { html, fileName: sanitizeFileName(fileName), options },
      { withCredentials: true, responseType: "blob", timeout: PDF_RENDER_TIMEOUT_MS },
    );

    const opened = openBlobInNewTab(res.data);
    if (!opened) {
      triggerBlobDownload(res.data, fileName);
    }
    return;
  } catch (error) {
    const message = await extractErrorMessage(error);
    if (fallbackToPrint && html) {
      const printed = openPrintFallback(html);
      if (printed) return;
    }
    throw new Error(message);
  }
};
