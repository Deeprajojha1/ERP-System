import axios from "./axiosInstance";

const getPdfRenderMode = () =>
  String(import.meta.env.VITE_PDF_RENDER_MODE || "").trim().toLowerCase();

const shouldUseClientOnlyPdf = () => {
  const mode = getPdfRenderMode();
  if (mode === "client") return true;
  if (mode === "server") return false;
  // Default to server rendering so download works without print fallback.
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

export const downloadPdfFromHtml = async (
  apiBase,
  { html, fileName = "report.pdf", options = {} },
) => {
  if (shouldUseClientOnlyPdf()) {
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
    throw new Error(message);
  }
};

export const openPdfFromHtml = async (
  apiBase,
  { html, fileName = "report.pdf", options = {} },
) => {
  if (shouldUseClientOnlyPdf()) {
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
    throw new Error(message);
  }
};
