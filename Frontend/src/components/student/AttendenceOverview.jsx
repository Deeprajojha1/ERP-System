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
    return percentage >= 75 ? "#22c55e" : "#ef4444";
  };
  const isAttendanceHealthy = overallPercentage >= 75;
  const attendanceStatus =
    overallPercentage >= 90
      ? 'Excellent consistency'
      : overallPercentage >= 75
      ? 'On track for minimum criteria'
      : 'Needs improvement to reach 75%';

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
        <div className="attendance-overview-header relative z-10">
          <h3>Overall Attendance</h3>
          <button
            className="download-btn transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95"
            onClick={exportToPDF}
            title="Download Attendance Report"
          >
            <FiDownload className="download-icon" />
          </button>
        </div>
        
        <div className="attendance-circle relative z-10">
          <div 
            className="circle-progress transition-all duration-300"
            style={{
              background: `conic-gradient(${getAttendanceColor(overallPercentage)} ${overallPercentage * 3.6}deg, #e0e0e0 0deg)`
            }}
          >
            <div className="circle-inner">
              <span className={`percentage ${isAttendanceHealthy ? "healthy" : "risk"} transition-all duration-300`}>
                {overallPercentage}%
              </span>
              <span className="circle-label">Attendance</span>
            </div>
          </div>
        </div>
        
        <div className="attendance-stats relative z-10 !mt-6 !flex !flex-wrap !items-center !justify-center !gap-8">
          <div className="stat group relative w-full max-w-sm cursor-pointer overflow-hidden rounded-xl p-4 transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg sm:w-64">
            <div className="absolute left-0 top-0 h-full w-0 bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-in-out group-hover:w-full" />
            <div className="relative z-10 transition-colors duration-300 group-hover:text-white">
              <span className="stat-value !text-gray-800 transition-colors duration-300 group-hover:!text-white">
                {totalAttended}
              </span>
              <span className="stat-label !text-gray-500 transition-colors duration-300 group-hover:!text-white">
                Classes Attended
              </span>
            </div>
          </div>
          <div className="stat group relative w-full max-w-sm cursor-pointer overflow-hidden rounded-xl p-4 transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg sm:w-64">
            <div className="absolute left-0 top-0 h-full w-0 bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500 ease-in-out group-hover:w-full" />
            <div className="relative z-10 transition-colors duration-300 group-hover:text-white">
              <span className="stat-value !text-gray-800 transition-colors duration-300 group-hover:!text-white">
                {totalClasses}
              </span>
              <span className="stat-label !text-gray-500 transition-colors duration-300 group-hover:!text-white">
                Total Classes
              </span>
            </div>
          </div>
        </div>
        <p
          className={`attendance-status-note ${
            overallPercentage >= 75 ? 'ok' : 'risk'
          } relative z-10`}
        >
          {attendanceStatus}
        </p>
      </div>
    </div>
  );
};

export default AttendanceOverview;
