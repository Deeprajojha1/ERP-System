const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildUniversityPdfHtml = ({
  reportTitle = "Award Sheet",
  details = [],
  headers = [],
  rows = [],
  universityName = "HARIDWAR UNIVERSITY, ROORKEE",
  departmentName = "Department - N/A",
  courseLine = "Course - N/A",
} = {}) => {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeDetails = Array.isArray(details) ? details : [];

  const detailMarkup = safeDetails
    .filter((item) => item && (item.label || item.value))
    .map(
      (item) =>
        `<p class="info"><b>${escapeHtml(item.label)}:</b> ${escapeHtml(item.value ?? "N/A")}</p>`
    )
    .join("");

  const headerMarkup = safeHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("");

  const rowMarkup = safeRows
    .map((row) => {
      const cells = Array.isArray(row) ? row : [];
      return `<tr>${cells
        .map((cell, index) => {
          const align = index === 2 ? "left" : "center";
          return `<td style="text-align:${align}">${escapeHtml(cell ?? "")}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: "Times New Roman", serif; margin: 20px 30px; color: #111827; }
          .title-1 { text-align: center; margin: 0; font-size: 38px; font-weight: 700; }
          .title-2 { text-align: center; margin: 2px 0; font-size: 18px; font-weight: 700; }
          .title-3 {
            text-align: center;
            margin: 8px 0 4px;
            font-size: 16px;
            font-weight: 700;
            background: #ffd700;
            padding: 4px 6px;
          }
          .title-4 { text-align: center; margin: 4px 0 10px; font-size: 16px; font-weight: 700; }
          .info { margin: 2px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #4b5563; padding: 8px 6px; font-size: 12px; text-align: center; }
          th { background: #f8fafc; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1 class="title-1">${escapeHtml(universityName)}</h1>
        <h2 class="title-2">${escapeHtml(departmentName)}</h2>
        <h3 class="title-3">${escapeHtml(courseLine)}</h3>
        <h4 class="title-4">${escapeHtml(reportTitle)}</h4>
        ${detailMarkup}
        <table>
          <thead>
            <tr>${headerMarkup}</tr>
          </thead>
          <tbody>${rowMarkup}</tbody>
        </table>
      </body>
    </html>
  `;
};

