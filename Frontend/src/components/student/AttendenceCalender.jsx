/**
 * AttendanceCalendar.jsx - Attendance Calendar Modal Component
 *
 * Interactive calendar showing course-specific attendance
 *
 * Note: React 18+ with new JSX transform - no need to import React
 */

import { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './AttendanceCalendar.css';

const AttendanceCalendar = ({ attendanceData, onClose, selectedCourse }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const sessionsByDate = useMemo(() => {
    const map = {};
    (attendanceData || []).forEach((entry) => {
      const course = entry.course || {};
      const sessions = entry.recentSessions || [];
      sessions.forEach((session) => {
        const dateStr = formatDate(new Date(session.date));
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push({
          courseId: course._id,
          courseCode: course.code || 'N/A',
          courseName: course.courseName || 'Course',
          status: session.status || 'no-data',
        });
      });
    });
    return map;
  }, [attendanceData]);

  const getAttendanceForDate = (date) => {
    const dateStr = formatDate(date);
    const daySessions = sessionsByDate[dateStr] || [];
    if (selectedCourse) {
      return daySessions.filter(
        (s) => s.courseCode === selectedCourse.courseCode
      );
    }
    return daySessions;
  };

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const attendance = getAttendanceForDate(date);
    if (attendance.length === 0) return null;

    const presentCount = attendance.filter((s) => s.status === 'present').length;
    const absentCount = attendance.filter((s) => s.status === 'absent').length;

    return (
      <div className="calendar-tile-content">
        {presentCount > 0 && <div className="present-dot"></div>}
        {absentCount > 0 && <div className="absent-dot"></div>}
      </div>
    );
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const attendance = getAttendanceForDate(date);
    if (attendance.length === 0) return null;

    const presentCount = attendance.filter((s) => s.status === 'present').length;
    const absentCount = attendance.filter((s) => s.status === 'absent').length;

    if (absentCount > 0 && presentCount === 0) return 'all-absent';
    if (presentCount > 0 && absentCount === 0) return 'all-present';
    if (presentCount > 0 && absentCount > 0) return 'mixed-attendance';

    return null;
  };

  const getSelectedDateDetails = () => {
    const attendance = getAttendanceForDate(selectedDate);
    if (attendance.length === 0) {
      return <p className="no-classes">No attendance data for this date</p>;
    }

    return (
      <div className="date-details">
        <h4>Attendance on {selectedDate.toDateString()}</h4>
        <div className="classes-list">
          {attendance.map((entry, index) => (
            <div
              key={`${entry.courseCode}-${entry.status}-${index}`}
              className={`class-item ${entry.status}`}
            >
              <div className="class-info">
                <span className="course-code">{entry.courseCode}</span>
                <span className="course-name">{entry.courseName}</span>
              </div>
              <div className={`status-indicator ${entry.status}`}>
                <span>
                  {entry.status === 'present'
                    ? 'Present'
                    : entry.status === 'absent'
                    ? 'Absent'
                    : 'No Data'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-modal-overlay">
      <div className="calendar-modal">
        <div className="calendar-header">
          <h3>
            {selectedCourse
              ? `${selectedCourse.courseCode} - Attendance Calendar`
              : 'Attendance Calendar'}
          </h3>
          <button className="close-button" onClick={onClose}>X</button>
        </div>

        <div className="calendar-content">
          <div className="calendar-section">
            {selectedCourse && (
              <div className="course-info-header">
                <h4>{selectedCourse.courseName}</h4>
                <p>Instructor: {selectedCourse.instructor || 'N/A'}</p>
                <p>Schedule: {selectedCourse.schedule || 'N/A'}</p>
              </div>
            )}

            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={getTileContent}
              tileClassName={getTileClassName}
              className="attendance-calendar"
            />

            <div className="legend">
              <div className="legend-item">
                <div className="legend-dot present"></div>
                <span>Present</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot absent"></div>
                <span>Absent</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot mixed"></div>
                <span>Mixed</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            {getSelectedDateDetails()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
