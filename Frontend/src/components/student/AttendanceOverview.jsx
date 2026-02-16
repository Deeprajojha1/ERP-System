import toast from "react-hot-toast";
import { useSelector } from "react-redux";
/**
 * AttendanceOverview.jsx - Attendance Summary Component
 * 
 * Displays overall attendance statistics and download functionality
 * 
 * Note: React 18+ with new JSX transform - no need to import React
 */
import { FiDownload } from 'react-icons/fi';
import './AttendanceOverview.css';
import { downloadPdfFromHtml } from "../../utils/pdfDownload";

const AttendanceOverview = ({ overallAttendance, attendanceData, studentData }) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const summaryFromOverall = overallAttendance && typeof overallAttendance === 'object'
    ? {
        totalClasses: overallAttendance.totalSessions || 0,
        totalAttended: overallAttendance.presentCount || 0,
        percentage: typeof overallAttendance.percentage === 'number'
          ? overallAttendance.percentage
          : 0,
      }
    : null;

  const summaryFromCourses = Array.isArray(attendanceData)
    ? attendanceData.reduce(
        (acc, item) => {
          acc.totalClasses += item.totalSessions || 0;
          acc.totalAttended += item.presentCount || 0;
          return acc;
        },
        { totalClasses: 0, totalAttended: 0 }
      )
    : { totalClasses: 0, totalAttended: 0 };

  const totalClasses = summaryFromOverall
    ? summaryFromOverall.totalClasses
    : summaryFromCourses.totalClasses;
  const totalAttended = summaryFromOverall
    ? summaryFromOverall.totalAttended
    : summaryFromCourses.totalAttended;
  const overallPercentage = summaryFromOverall
    ? summaryFromOverall.percentage
    : totalClasses > 0
    ? Number(((totalAttended / totalClasses) * 100).toFixed(1))
    : 0;

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return '#0ea5a6';
    if (percentage >= 75) return '#f59e0b';
    return '#ef4444';
  };

  const exportToPDF = async () => {
    try {
      const esc = (value = "") =>
        String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
              h1 { margin: 0 0 6px; font-size: 24px; }
              h2 { margin: 0 0 8px; color: #4b5563; font-weight: 500; }
              .meta { color: #6b7280; margin-bottom: 18px; }
              .stats { margin-top: 8px; }
              .stats div { margin: 6px 0; }
              .label { font-weight: 700; display: inline-block; width: 160px; }
            </style>
          </head>
          <body>
            <h1>Student Attendance Report</h1>
            <h2>${esc(studentData?.personalInfo?.name || "Student")}</h2>
            <div class="meta">
              ID: ${esc(studentData?.personalInfo?.studentId || "-")} |
              Roll: ${esc(studentData?.academicInfo?.rollNumber || "-")}
            </div>
            <div class="stats">
              <div><span class="label">Total Classes:</span> ${esc(totalClasses)}</div>
              <div><span class="label">Classes Attended:</span> ${esc(totalAttended)}</div>
              <div><span class="label">Overall Attendance:</span> ${esc(overallPercentage)}%</div>
            </div>
            <div style="margin-top: 24px; color: #6b7280; font-size: 12px;">
              Generated on: ${esc(new Date().toLocaleDateString())}
            </div>
          </body>
        </html>
      `;

      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: `${studentData?.personalInfo?.name || "Student"}_Attendance_Report.pdf`,
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.', {
        icon: '\u274C',
      });
    }
  };

  return (
    <div className="attendance-overview">
      <div className="overall-attendance">
        <div className="attendance-header">
          <h3>Overall Attendance</h3>
          <button className="download-btn" onClick={exportToPDF} title="Download Attendance Report">
            <FiDownload className="download-icon" />
          </button>
        </div>
        
        <div className="attendance-circle">
          <div 
            className="circle-progress"
            style={{
              background: `conic-gradient(${getAttendanceColor(overallPercentage)} ${overallPercentage * 3.6}deg, #e0e0e0 0deg)`
            }}
          >
            <div className="circle-inner">
              <span className="percentage">{overallPercentage}%</span>
              <span className="label">Attendance</span>
            </div>
          </div>
        </div>
        
        <div className="attendance-stats">
          <div className="stat">
            <span className="stat-value">{totalAttended}</span>
            <span className="stat-label">Classes Attended</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalClasses}</span>
            <span className="stat-label">Total Classes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceOverview;
