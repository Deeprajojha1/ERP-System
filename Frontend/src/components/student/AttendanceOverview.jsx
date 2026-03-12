/**
 * AttendanceOverview.jsx - Attendance Summary Component
 *
 * Displays overall attendance statistics.
 *
 * Note: React 18+ with new JSX transform - no need to import React
 */
import './AttendanceOverview.css';

const AttendanceOverview = ({ overallAttendance, attendanceData }) => {
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
  const attendanceStatus =
    overallPercentage >= 90
      ? 'Excellent consistency'
      : overallPercentage >= 75
      ? 'On track for minimum criteria'
      : 'Needs improvement to reach 75%';

  return (
    <div className="attendance-overview">
      <div className="overall-attendance">
        <div className="attendance-overview-header">
          <h3>Overall Attendance</h3>
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
              <span className="circle-label">Attendance</span>
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
        <p
          className={`attendance-status-note ${
            overallPercentage >= 75 ? 'ok' : 'risk'
          }`}
        >
          {attendanceStatus}
        </p>
      </div>
    </div>
  );
};

export default AttendanceOverview;
