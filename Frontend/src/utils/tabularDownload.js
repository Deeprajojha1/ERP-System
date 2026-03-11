import axios from "./axiosInstance";

const TABULAR_EXPORT_TIMEOUT_MS = 120000;

const sanitizeFileName = (name = "report") =>
  String(name)
    .replace(/[^\w.-]/g, "_")
    .replace(/_{2,}/g, "_");

const triggerBlobDownload = (blobData, fileName) => {
  const blob = new Blob([blobData]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeFileName(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const readBlobText = async (blobLike) => {
  if (!blobLike) return "";
  if (typeof blobLike.text === "function") return blobLike.text();
  return "";
};

const extractErrorMessage = async (error) => {
  const fallback = "Failed to export file";
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

export const downloadTabularFile = async (
  apiBase,
  { rows, format, fileName, sheetName = "Report", reportMeta = null }
) => {
  try {
    const normalizedFormat = String(format || "").toLowerCase();
    const extension = normalizedFormat === "csv" ? "csv" : "xlsx";
    const finalFileName = sanitizeFileName(fileName || `report.${extension}`);

    const res = await axios.post(
      `${apiBase}/user/export/tabular`,
      {
        rows,
        format: normalizedFormat,
        fileName: finalFileName,
        sheetName,
        reportMeta,
      },
      {
        withCredentials: true,
        responseType: "blob",
        timeout: TABULAR_EXPORT_TIMEOUT_MS,
      }
    );

    triggerBlobDownload(res.data, finalFileName);
  } catch (error) {
    const message = await extractErrorMessage(error);
    throw new Error(message);
  }
};