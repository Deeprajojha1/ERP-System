/**
 * CoursesDetails.jsx - Course Cards Display Component
 * 
 * Displays all enrolled courses as interactive cards
 * Each card shows course information and attendance
 * Cards are clickable to view course-specific attendance calendar
 * 
 * @param {Object} props - Component props
 * @param {Array} props.coursesData - Array of course objects
 * @param {Function} props.onCourseClick - Callback when course is clicked
 * @returns {JSX.Element} Course cards grid
 * 
 * Note: React 18+ with new JSX transform - no need to import React
 */

import './CoursesDetails.css';

const CoursesDetails = ({ coursesData, onCourseClick }) => {
  /**
   * Get color based on attendance percentage
   * @param {number} percentage - Attendance percentage
   * @returns {string} Color code
   */
  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return '#0ea5a6';
    if (percentage >= 75) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="courses-details-container">
      <h3>Course Details</h3>
      <div className="courses-grid">
        {coursesData.length === 0 ? (
          <p className="no-courses">No courses assigned yet.</p>
        ) : (
          coursesData.map(course => (
          <div 
            key={course.id} 
            className="course-card"
            onClick={() => onCourseClick(course)}
          >
            {/* Course Header */}
            <div className="course-header">
              <div className="course-code-name">
                <h4>{course.courseCode}</h4>
                <p className="course-name">{course.courseName}</p>
              </div>
              <div className="credits-badge">
                {course.credits} Credits
              </div>
            </div>
            
            {/* Course Information */}
            <div className="course-info">
              <div className="info-item">
                <span className="info-label">Instructor:</span>
                <span className="info-value">{course.instructor || 'Deepraj Ojha'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Schedule:</span>
                <span className="info-value">{course.schedule || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Room:</span>
                <span className="info-value">{course.room || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Classes:</span>
                <span className="info-value">{course.totalClasses ?? 0}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Attended:</span>
                <span className="info-value">{course.attendedClasses ?? 0}</span>
              </div>
            </div>

            {/* Attendance Section */}
            <div className="attendance-section">
              <div className="attendance-header">
                <span>Attendance</span>
                <span 
                  className="attendance-percentage"
                  style={{ color: getAttendanceColor(course.attendancePercentage || 0) }}
                >
                  {course.attendancePercentage ?? 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${course.attendancePercentage || 0}%`,
                    backgroundColor: getAttendanceColor(course.attendancePercentage || 0)
                  }}
                ></div>
              </div>
              <div className="attendance-status">
                {course.attendancePercentage >= 75 ? (
                  <span className="status-good">✓ Good Attendance</span>
                ) : (
                  <span className="status-warning">⚠ Below Required (75%)</span>
                )}
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CoursesDetails;
