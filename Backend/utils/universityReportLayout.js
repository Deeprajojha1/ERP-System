const DEFAULT_HEADER = Object.freeze({
  universityName: "HARIDWAR UNIVERSITY, ROORKEE",
  departmentName: "Department - N/A",
  courseLine: "Course - N/A",
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toCellRef = (columnIndex) => {
  let index = Number(columnIndex || 1);
  let label = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    index = Math.floor((index - 1) / 26);
  }
  return label || "A";
};

export const buildUniversityReportPdfHtml = ({
  reportTitle = "Award Sheet",
  details = [],
  headers = [],
  rows = [],
  header = {},
} = {}) => {
  const {
    universityName = DEFAULT_HEADER.universityName,
    departmentName = DEFAULT_HEADER.departmentName,
    courseLine = DEFAULT_HEADER.courseLine,
  } = header || {};

  const detailMarkup = details
    .filter((item) => item && (item.label || item.value))
    .map(
      (item) =>
        `<p class="info"><b>${escapeHtml(item.label)}:</b> ${escapeHtml(item.value ?? "N/A")}</p>`
    )
    .join("");

  const headMarkup = headers
    .map((head) => `<th>${escapeHtml(head)}</th>`)
    .join("");

  const rowMarkup = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, index) => {
            const textAlign = index === 2 ? "left" : "center";
            return `<td style="text-align:${textAlign}">${escapeHtml(cell ?? "")}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: "Times New Roman", serif; margin: 20px 30px; color: #111; }
    .title-1 { text-align: center; font-size: 22px; font-weight: 700; margin: 0; }
    .title-2 { text-align: center; font-size: 16px; font-weight: 700; margin: 4px 0; }
    .title-3 {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      margin: 4px 0;
      background: #ffd700;
      padding: 3px 6px;
    }
    .title-4 { text-align: center; font-size: 14px; font-weight: 700; margin: 4px 0; }
    .info { font-size: 12px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; }
    thead th { font-weight: 700; background: #f7f7f7; }
  </style>
</head>
<body>
  <h1 class="title-1">${escapeHtml(universityName)}</h1>
  <h2 class="title-2">${escapeHtml(departmentName)}</h2>
  <h3 class="title-3">${escapeHtml(courseLine)}</h3>
  <h4 class="title-4">${escapeHtml(reportTitle)}</h4>
  ${detailMarkup}
  <table>
    <thead><tr>${headMarkup}</tr></thead>
    <tbody>${rowMarkup}</tbody>
  </table>
</body>
</html>`;
};

export const applyUniversityReportWorksheetLayout = ({
  worksheet,
  reportTitle = "Award Sheet",
  details = [],
  headers = [],
  rows = [],
  columnWidths = [],
  header = {},
} = {}) => {
  if (!worksheet) return;
  if (!Array.isArray(headers) || !headers.length) return;

  const totalColumns = headers.length;
  const endCol = toCellRef(totalColumns);
  const {
    universityName = DEFAULT_HEADER.universityName,
    departmentName = DEFAULT_HEADER.departmentName,
    courseLine = DEFAULT_HEADER.courseLine,
  } = header || {};

  const headerRows = [
    universityName,
    departmentName,
    courseLine,
    reportTitle,
  ];

  headerRows.forEach((value, index) => {
    const rowNumber = index + 1;
    worksheet.mergeCells(`A${rowNumber}:${endCol}${rowNumber}`);
    const cell = worksheet.getCell(`A${rowNumber}`);
    cell.value = value;
    cell.font = {
      bold: true,
      name: "Times New Roman",
      size: rowNumber === 1 ? 20 : rowNumber === 2 ? 15 : rowNumber === 3 ? 12 : 13,
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    if (rowNumber === 3) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
    }
  });

  const detailRows = details.filter((item) => item && (item.label || item.value));
  const detailStartRow = 5;
  detailRows.forEach((item, index) => {
    const rowNumber = detailStartRow + index;
    worksheet.mergeCells(`A${rowNumber}:${endCol}${rowNumber}`);
    const cell = worksheet.getCell(`A${rowNumber}`);
    cell.value = `${item.label}: ${item.value ?? "N/A"}`;
    cell.font = { bold: true, size: 11, name: "Times New Roman" };
    cell.alignment = { horizontal: "left", vertical: "middle" };
  });

  const tableHeaderRow = detailStartRow + detailRows.length + 1;
  worksheet.getRow(tableHeaderRow).values = headers;
  worksheet.getRow(tableHeaderRow).font = { bold: true, size: 11, name: "Times New Roman" };
  worksheet.getRow(tableHeaderRow).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  rows.forEach((row, index) => {
    worksheet.getRow(tableHeaderRow + 1 + index).values = row;
  });

  worksheet.columns = headers.map((headerText, index) => ({
    key: `c${index + 1}`,
    width: Number(columnWidths[index] || Math.max(14, String(headerText).length + 4)),
  }));

  const endRow = Math.max(tableHeaderRow, tableHeaderRow + rows.length);
  for (let rowIndex = 1; rowIndex <= endRow; rowIndex += 1) {
    for (let colIndex = 1; colIndex <= totalColumns; colIndex += 1) {
      const cell = worksheet.getCell(rowIndex, colIndex);
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }

  for (let rowIndex = tableHeaderRow + 1; rowIndex <= endRow; rowIndex += 1) {
    for (let colIndex = 1; colIndex <= totalColumns; colIndex += 1) {
      worksheet.getCell(rowIndex, colIndex).alignment = {
        horizontal: colIndex === 3 ? "left" : "center",
        vertical: "middle",
      };
    }
  }
};
