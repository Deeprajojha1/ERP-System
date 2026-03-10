import ExcelJS from "exceljs";
import { format as csvFormat } from "fast-csv";
import { applyUniversityReportWorksheetLayout } from "../utils/universityReportLayout.js";

const sanitizeFileName = (name = "report") =>
  String(name)
    .replace(/[^\w.\-]/g, "_")
    .replace(/_{2,}/g, "_");

const toObjectRows = (rows) =>
  Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object") : [];

const getHeaders = (rows) => {
  const keys = new Set();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
};

const buildCsvPrefix = (reportMeta = {}) => {
  const title = String(reportMeta?.reportTitle || "Report").trim();
  const details = normalizeDetailLines(reportMeta?.details);
  const departmentName = String(reportMeta?.departmentName || "Department - N/A").trim();
  const courseLine = String(reportMeta?.courseLine || "Course - N/A").trim();
  const lines = [
    "HARIDWAR UNIVERSITY, ROORKEE",
    departmentName,
    courseLine,
    title,
    ...details.map((item) => `${item.label}: ${item.value}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
};

const buildCsvBuffer = async (rows, headers, reportMeta = {}) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const csvStream = csvFormat({ headers });

    csvStream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    csvStream.on("error", reject);

    rows.forEach((row) => csvStream.write(row));
    csvStream.end();

    csvStream.on("end", () => {
      const csvContent = Buffer.concat(chunks);
      const prefix = buildCsvPrefix(reportMeta);
      resolve(Buffer.concat([Buffer.from(prefix, "utf8"), csvContent]));
    });
  });

const normalizeDetailLines = (details = []) =>
  Array.isArray(details)
    ? details
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const label = String(item.label || "").trim();
          const value = String(item.value ?? "").trim();
          if (!label && !value) return null;
          return { label: label || "Detail", value: value || "-" };
        })
        .filter(Boolean)
    : [];

const buildExcelBuffer = async (
  rows,
  headers,
  sheetName = "Report",
  reportMeta = {}
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  applyUniversityReportWorksheetLayout({
    worksheet,
    reportTitle: String(reportMeta?.reportTitle || sheetName || "Report"),
    details: normalizeDetailLines(reportMeta?.details),
    headers,
    rows: rows.map((row) => headers.map((header) => row?.[header] ?? "")),
    header: {
      universityName: String(reportMeta?.universityName || "HARIDWAR UNIVERSITY, ROORKEE"),
      departmentName: String(reportMeta?.departmentName || "Department - N/A"),
      courseLine: String(reportMeta?.courseLine || "Course - N/A"),
    },
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
};

export const exportTabularData = async (req, res) => {
  try {
    const { format, rows, fileName, sheetName, reportMeta } = req.body || {};
    const normalizedFormat = String(format || "").toLowerCase();

    if (!["csv", "xlsx"].includes(normalizedFormat)) {
      return res.status(400).json({
        message: 'format must be either "csv" or "xlsx"',
      });
    }

    const objectRows = toObjectRows(rows);
    if (!objectRows.length) {
      return res.status(400).json({
        message: "rows must be a non-empty array of objects",
      });
    }

    const headers = getHeaders(objectRows);
    const baseFileName = sanitizeFileName(fileName || "report").replace(/\.(csv|xlsx)$/i, "");

    if (normalizedFormat === "csv") {
      const csvBuffer = await buildCsvBuffer(objectRows, headers, reportMeta || {});
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${baseFileName}.csv"`);
      return res.status(200).send(csvBuffer);
    }

    const excelBuffer = await buildExcelBuffer(
      objectRows,
      headers,
      sheetName || "Report",
      reportMeta || {}
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${baseFileName}.xlsx"`);
    return res.status(200).send(excelBuffer);
  } catch (error) {
    console.error("[Export] exportTabularData failed:", error.message || error);
    return res.status(500).json({
      message: error.message || "Failed to export data",
    });
  }
};


