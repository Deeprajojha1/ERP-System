/**
 * AttendanceCalendar.jsx - Attendance Calendar Modal Component
 *
 * Interactive calendar showing course-specific attendance
 *
 * Note: React 18+ with new JSX transform - no need to import React
 */

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import './AttendanceCalendar.css';

const getDayInfo = (dateValue, sessionsByDate, selectedCourse) => {
  const dayKey = dayjs(dateValue).format('YYYY-MM-DD');
  const daySessions = sessionsByDate[dayKey] || [];
  const attendance = selectedCourse
    ? daySessions.filter((s) => s.courseCode === selectedCourse.courseCode)
    : daySessions;

  const presentCount = attendance.filter((s) => s.status === 'present').length;
  const absentCount = attendance.filter((s) => s.status === 'absent').length;

  return {
    attendance,
    presentCount,
    absentCount,
    hasPresent: presentCount > 0,
    hasAbsent: absentCount > 0,
    isMixed: presentCount > 0 && absentCount > 0,
    isAllPresent: presentCount > 0 && absentCount === 0,
    isAllAbsent: absentCount > 0 && presentCount === 0,
  };
};

const AttendanceDay = ({ day, outsideCurrentMonth, sessionsByDate, selectedCourse, ...other }) => {
  const info = getDayInfo(day, sessionsByDate, selectedCourse);
  const hasAttendance = info.attendance.length > 0 && !outsideCurrentMonth;

  return (
    <PickersDay
      {...other}
      day={day}
      outsideCurrentMonth={outsideCurrentMonth}
      sx={{
        position: 'relative',
        ...(hasAttendance && info.isAllPresent ? { backgroundColor: 'rgba(76, 175, 80, 0.1)' } : {}),
        ...(hasAttendance && info.isAllAbsent ? { backgroundColor: 'rgba(244, 67, 54, 0.1)' } : {}),
        ...(hasAttendance && info.isMixed ? { backgroundColor: 'rgba(255, 152, 0, 0.1)' } : {}),
        ...(hasAttendance && info.hasPresent
          ? {
              '&::before': {
                content: '""',
                position: 'absolute',
                bottom: 4,
                left: info.hasAbsent ? 'calc(50% - 6px)' : '50%',
                transform: 'translateX(-50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
              },
            }
          : {}),
        ...(hasAttendance && info.hasAbsent
          ? {
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 4,
                left: info.hasPresent ? 'calc(50% + 6px)' : '50%',
                transform: 'translateX(-50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#F44336',
              },
            }
          : {}),
      }}
    />
  );
};

const AttendanceCalendar = ({ attendanceData, onClose, selectedCourse }) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const sessionsByDate = useMemo(() => {
    const map = {};
    (attendanceData || []).forEach((entry) => {
      const course = entry.course || {};
      const sessions = entry.recentSessions || [];
      sessions.forEach((session) => {
        const dateStr = dayjs(session.date).format('YYYY-MM-DD');
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

  const getSelectedDateDetails = () => {
    const attendance = getDayInfo(selectedDate, sessionsByDate, selectedCourse).attendance;
    if (attendance.length === 0) {
      return <p className="no-classes">No attendance data for this date</p>;
    }

    return (
      <div className="date-details">
        <h4>Attendance on {dayjs(selectedDate).format('ddd, DD MMM YYYY')}</h4>
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

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={selectedDate}
                onChange={(nextValue) => setSelectedDate(nextValue || dayjs())}
                className="attendance-calendar attendance-calendar-mui"
                slots={{ day: AttendanceDay }}
                slotProps={{
                  day: {
                    sessionsByDate,
                    selectedCourse,
                  },
                }}
              />
            </LocalizationProvider>

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
