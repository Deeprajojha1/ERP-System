import axios from "./axiosInstance";

const sanitizeFileName = (name = "report.pdf") =>
  String(name)
    .replace(/[^\w.\-]/g, "_")
    .replace(/_{2,}/g, "_");

export const downloadPdfFromHtml = async (
  apiBase,
  { html, fileName = "report.pdf", options = {} },
) => {
  const res = await axios.post(
    `${apiBase}/user/pdf/render`,
    { html, fileName: sanitizeFileName(fileName), options },
    { withCredentials: true, responseType: "blob" },
  );

  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeFileName(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
