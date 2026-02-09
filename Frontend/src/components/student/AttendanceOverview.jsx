/**
 * AttendanceOverview.jsx - Attendance Summary Component
 * 
 * Displays overall attendance statistics and download functionality
 * 
 * Note: React 18+ with new JSX transform - no need to import React
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './AttendanceOverview.css';

const AttendanceOverview = ({ overallAttendance, attendanceData, studentData }) => {
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
      const exportContent = document.createElement('div');
      exportContent.style.padding = '20px';
      exportContent.style.fontFamily = 'Arial, sans-serif';
      exportContent.style.backgroundColor = 'white';
      exportContent.style.width = '800px';
      
      exportContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Student Attendance Report</h1>
          <h2 style="color: #666; font-weight: normal;">${studentData.personalInfo.name}</h2>
          <p style="color: #666;">ID: ${studentData.personalInfo.studentId} | Roll: ${studentData.academicInfo.rollNumber}</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>This is an official attendance report</p>
        </div>
      `;
      
      document.body.appendChild(exportContent);
      const canvas = await html2canvas(exportContent, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(exportContent);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${studentData.personalInfo.name}_Attendance_Report.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="attendance-overview">
      <div className="overall-attendance">
        <div className="attendance-header">
          <h3>Overall Attendance</h3>
          <button className="download-btn" onClick={exportToPDF} title="Download Attendance Report">
            <span className="download-icon">📥</span>
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
