import axios from "./axiosInstance";

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
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
};

export const downloadPdfFromHtml = async (
  apiBase,
  { html, fileName = "report.pdf", options = {}, fallbackToPrint = true },
) => {
  try {
    const res = await axios.post(
      `${apiBase}/user/pdf/render`,
      { html, fileName: sanitizeFileName(fileName), options },
      { withCredentials: true, responseType: "blob" },
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
  try {
    const res = await axios.post(
      `${apiBase}/user/pdf/render`,
      { html, fileName: sanitizeFileName(fileName), options },
      { withCredentials: true, responseType: "blob" },
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
