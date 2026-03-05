import Student from "../models/Student.js";
import { renderPdfBufferFromHtml } from "./pdfController.js";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getRequestBaseUrl = (req) => {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${protocol}://${host}`;
};

const encodeUrlPath = (pathValue = "") =>
  String(pathValue)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const resolveProfileImageUrl = (req, profileImage) => {
  const rawValue = String(profileImage || "").trim();
  if (!rawValue) return "";

  // Already absolute / embeddable formats.
  if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith("data:")) return rawValue;

  const base = getRequestBaseUrl(req);
  const normalized = rawValue.replace(/\\/g, "/").replace(/^\.\//, "");

  // Handle all common relative variants persisted in DB.
  if (normalized.startsWith("/uploads/")) {
    return `${base}/${encodeUrlPath(normalized)}`;
  }
  if (normalized.startsWith("uploads/")) {
    return `${base}/${encodeUrlPath(normalized)}`;
  }
  if (normalized.startsWith("/profile-images/")) {
    return `${base}/uploads/${encodeUrlPath(normalized)}`;
  }
  if (normalized.startsWith("profile-images/")) {
    return `${base}/uploads/${encodeUrlPath(normalized)}`;
  }

  const fileName = normalized.split("/").filter(Boolean).pop() || "";
  if (!fileName) return "";
  return `${base}/uploads/profile-images/${encodeURIComponent(fileName)}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const buildCardData = (req, studentDoc) => {
  const user = studentDoc?.user || {};
  const department = studentDoc?.department || {};
  const group = studentDoc?.group || {};
  const discipline = studentDoc?.disciplineStatus || {};

  return {
    id: String(studentDoc?._id || ""),
    name: user?.name || "N/A",
    email: user?.email || "N/A",
    phoneNumber: user?.phoneNumber || "N/A",
    enrollmentNumber: studentDoc?.enrollmentNumber || "N/A",
    department: department?.name || "N/A",
    program: studentDoc?.program ? String(studentDoc.program).toUpperCase() : "N/A",
    semester: studentDoc?.semester ?? "N/A",
    academicYear: studentDoc?.academicYear || "N/A",
    group: group?.name || "N/A",
    status: discipline?.currentStatus || "clear",
    profileImageUrl: resolveProfileImageUrl(
      req,
      user?.profileImageUrl || user?.profileImage || studentDoc?.profileImage
    ),
  };
};

const buildSingleCardMarkup = (card) => {
  const showImage = Boolean(card.profileImageUrl);
  const statusText = String(card.status || "clear").toUpperCase();

  return `
    <article class="id-card-shell">
      <header class="id-card-header">
        <div class="brand-copy">
          <h1>Haridwar University</h1>
          <p>Official Student Identity Card</p>
        </div>
        <span class="status-badge">${escapeHtml(statusText)}</span>
      </header>

      <section class="id-card-body">
        <div class="photo-slot">
          ${
            showImage
              ? `<img src="${escapeHtml(card.profileImageUrl)}" alt="Student photo" />`
              : `<div class="photo-placeholder">PHOTO</div>`
          }
        </div>
        <div class="meta-grid">
          <div><label>Name</label><p>${escapeHtml(card.name)}</p></div>
          <div><label>Enrollment No.</label><p>${escapeHtml(card.enrollmentNumber)}</p></div>
          <div><label>Department</label><p>${escapeHtml(card.department)}</p></div>
          <div><label>Program</label><p>${escapeHtml(card.program)}</p></div>
          <div><label>Semester</label><p>${escapeHtml(card.semester)}</p></div>
          <div><label>Academic Year</label><p>${escapeHtml(card.academicYear)}</p></div>
          <div><label>Section / Group</label><p>${escapeHtml(card.group)}</p></div>
          <div><label>Contact</label><p>${escapeHtml(card.phoneNumber)}</p></div>
        </div>
      </section>

      <footer class="id-card-footer">
        <span>Student ID: ${escapeHtml(card.id)}</span>
        <span>Issued: ${escapeHtml(formatDate(new Date()))}</span>
      </footer>
    </article>
  `;
};

const buildCardsDocument = (cards) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Student ID Cards</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Segoe UI", Arial, sans-serif;
          background: #f1f5f9;
          color: #0f172a;
        }
        .page-wrap {
          min-height: 100vh;
          padding: 14mm 10mm;
          display: grid;
          gap: 10mm;
          justify-content: center;
          align-content: start;
        }
        .id-card-shell {
          width: 86mm;
          min-height: 54mm;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          background: linear-gradient(160deg, #ffffff, #eff6ff);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
          overflow: hidden;
          page-break-inside: avoid;
        }
        .id-card-header {
          background: linear-gradient(120deg, #1e3a8a, #0ea5e9);
          color: #ffffff;
          padding: 8px 10px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .brand-copy h1 {
          margin: 0;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 700;
          letter-spacing: 0.2px;
        }
        .brand-copy p {
          margin: 2px 0 0;
          font-size: 10px;
          opacity: 0.92;
        }
        .status-badge {
          border: 1px solid rgba(255,255,255,0.45);
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
        }
        .id-card-body {
          display: grid;
          grid-template-columns: 26mm 1fr;
          gap: 8px;
          padding: 8px 10px 6px;
        }
        .photo-slot {
          width: 26mm;
          height: 32mm;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .photo-slot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-placeholder {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.8px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px 8px;
          align-content: start;
        }
        .meta-grid label {
          display: block;
          margin: 0 0 1px;
          font-size: 8px;
          color: #475569;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .meta-grid p {
          margin: 0;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.3;
          word-break: break-word;
        }
        .id-card-footer {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          border-top: 1px solid #dbeafe;
          padding: 6px 10px 8px;
          font-size: 8.5px;
          color: #334155;
          font-weight: 600;
        }
        .id-card-page {
          page-break-after: always;
        }
        .id-card-page:last-child {
          page-break-after: auto;
        }
      </style>
    </head>
    <body>
      ${cards
        .map(
          (card) => `
            <section class="page-wrap id-card-page">
              ${buildSingleCardMarkup(card)}
            </section>
          `
        )
        .join("")}
    </body>
  </html>
`;

const findStudentOr404 = async (res, query) => {
  const student = await Student.findOne(query)
    .populate("user", "name email phoneNumber profileImage")
    .populate("department", "name code")
    .populate("group", "name roomNo");

  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return null;
  }
  return student;
};

export const getMyIdCard = async (req, res) => {
  try {
    const student = await findStudentOr404(res, {
      user: req.userId,
      isDeleted: { $ne: true },
    });
    if (!student) return;

    const card = buildCardData(req, student);
    const html = buildCardsDocument([card]);
    const pdfBuffer = await renderPdfBufferFromHtml(html, {
      format: "A4",
      printBackground: true,
      margin: { top: "6mm", right: "6mm", bottom: "6mm", left: "6mm" },
    });

    const fileName = `${card.enrollmentNumber || "student"}_id_card.pdf`
      .replace(/[^\w.-]/g, "_")
      .replace(/_{2,}/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[ID Card] getMyIdCard failed:", error.message || error);
    return res.status(500).json({
      message: error.message || "Failed to download ID card",
    });
  }
};

export const downloadStudentIdCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await findStudentOr404(res, {
      _id: studentId,
      isDeleted: { $ne: true },
    });
    if (!student) return;

    const card = buildCardData(req, student);
    const html = buildCardsDocument([card]);
    const pdfBuffer = await renderPdfBufferFromHtml(html, {
      format: "A4",
      printBackground: true,
      margin: { top: "6mm", right: "6mm", bottom: "6mm", left: "6mm" },
    });

    const fileName = `${card.enrollmentNumber || "student"}_id_card.pdf`
      .replace(/[^\w.-]/g, "_")
      .replace(/_{2,}/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[ID Card] downloadStudentIdCard failed:", error.message || error);
    return res.status(500).json({
      message: error.message || "Failed to download student ID card",
    });
  }
};

export const bulkDownloadStudentIdCards = async (req, res) => {
  try {
    const inputIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
    const dedupedIds = [
      ...new Set(inputIds.map((id) => String(id || "").trim()).filter(Boolean)),
    ];

    if (!dedupedIds.length) {
      return res.status(400).json({
        message: "studentIds is required and must be a non-empty array",
      });
    }

    const students = await Student.find({
      _id: { $in: dedupedIds },
      isDeleted: { $ne: true },
    })
      .populate("user", "name email phoneNumber profileImage")
      .populate("department", "name code")
      .populate("group", "name roomNo");

    if (!students.length) {
      return res.status(404).json({
        message: "No students found for the given IDs",
      });
    }

    const cards = students.map((studentDoc) => buildCardData(req, studentDoc));
    const html = buildCardsDocument(cards);
    const pdfBuffer = await renderPdfBufferFromHtml(html, {
      format: "A4",
      printBackground: true,
      margin: { top: "6mm", right: "6mm", bottom: "6mm", left: "6mm" },
    });

    const fileName = `student_id_cards_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[ID Card] bulkDownloadStudentIdCards failed:", error.message || error);
    return res.status(500).json({
      message: error.message || "Failed to bulk download ID cards",
    });
  }
};
