import ExcelJS from "exceljs";
import { format as csvFormat } from "fast-csv";

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

const buildCsvBuffer = async (rows, headers) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const csvStream = csvFormat({ headers });

    csvStream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    csvStream.on("end", () => resolve(Buffer.concat(chunks)));
    csvStream.on("error", reject);

    rows.forEach((row) => csvStream.write(row));
    csvStream.end();
  });

const buildExcelBuffer = async (rows, headers, sheetName = "Report") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(14, String(header).length + 4),
  }));

  rows.forEach((row) => worksheet.addRow(row));

  const firstRow = worksheet.getRow(1);
  firstRow.font = { bold: true };
  firstRow.alignment = { vertical: "middle" };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
};

export const exportTabularData = async (req, res) => {
  try {
    const { format, rows, fileName, sheetName } = req.body || {};
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
      const csvBuffer = await buildCsvBuffer(objectRows, headers);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${baseFileName}.csv"`);
      return res.status(200).send(csvBuffer);
    }

    const excelBuffer = await buildExcelBuffer(objectRows, headers, sheetName || "Report");
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
