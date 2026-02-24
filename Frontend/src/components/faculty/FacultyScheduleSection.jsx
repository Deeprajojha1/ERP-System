import { useMemo, useState } from "react";
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
];

const LECTURE_SLOTS = [
  { id: "1", label: "08:30 - 09:20" },
  { id: "2", label: "09:30 - 10:20" },
  { id: "3", label: "10:30 - 11:20" },
  { id: "4", label: "11:30 - 12:20" },
  { id: "5", label: "13:00 - 13:50" },
  { id: "6", label: "14:00 - 14:50" },
  { id: "7", label: "15:00 - 15:50" },
  { id: "8", label: "16:00 - 16:50" },
];

const getSlotLabel = (slotId) =>
  LECTURE_SLOTS.find((slot) => slot.id === String(slotId))?.label || `Lecture ${slotId}`;

const getCurrentDayIndex = () => {
  const jsDay = new Date().getDay();
  if (jsDay === 0) return 0;
  return Math.min(jsDay - 1, DAYS_OF_WEEK.length - 1);
};

export default function FacultyScheduleSection({ facultyData }) {
  const [viewMode, setViewMode] = useState("week"); // "week" | "day"
  const [selectedDay, setSelectedDay] = useState(getCurrentDayIndex());

  const routine = facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine;

  // Parse routine data into schedule format
  const schedule = useMemo(() => {
    const scheduleMap = {};

    DAYS_OF_WEEK.forEach((day) => {
      scheduleMap[day.id] = {};
      const sourceRoutine = routine || {};
      const dayData =
        sourceRoutine[day.id] ||
        sourceRoutine[day.label] ||
        sourceRoutine[day.label.toLowerCase()] ||
        {};

      Object.entries(dayData).forEach(([slot, item]) => {
        if (item?.course && item?.group) {
          scheduleMap[day.id][slot] = {
            course: item.course,
            group: item.group,
            slot,
          };
        }
      });
    });

    return scheduleMap;
  }, [routine]);

  // Get selected day schedule
  const daySchedule = useMemo(() => {
    const dayId = DAYS_OF_WEEK[selectedDay]?.id;
    const selected = schedule[dayId] || {};
    return Object.values(selected).sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
  }, [schedule, selectedDay]);

  // Count total classes
  const totalClasses = useMemo(() => {
    return Object.values(schedule).reduce((total, dayMap) => total + Object.keys(dayMap).length, 0);
  }, [schedule]);

  const navigateDay = (direction) => {
    setSelectedDay((prev) => {
      const next = prev + direction;
      if (next < 0) return DAYS_OF_WEEK.length - 1;
      if (next >= DAYS_OF_WEEK.length) return 0;
      return next;
    });
  };

  return (
    <section className="faculty-section faculty-schedule-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">My Schedule</h2>
          <p className="faculty-section-subtitle">View your weekly teaching schedule</p>
        </div>
        <div className="faculty-view-toggle">
          <button
            type="button"
            className={`faculty-toggle-btn ${viewMode === "day" ? "active" : ""}`}
            onClick={() => setViewMode("day")}
          >
            Day View
          </button>
          <button
            type="button"
            className={`faculty-toggle-btn ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Week View
          </button>
        </div>
      </div>

      <div className="faculty-stats-grid">
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Total Classes</span>
            <div className="faculty-stat-icon" style={{ background: "#dbeafe" }}>
              <Calendar size={20} color="#2563eb" />
            </div>
          </div>
          <p className="faculty-stat-value">{totalClasses}</p>
          <p className="faculty-stat-subtitle">This week</p>
        </div>
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Today's Classes</span>
            <div className="faculty-stat-icon" style={{ background: "#d1fae5" }}>
              <Clock size={20} color="#10b981" />
            </div>
          </div>
          <p className="faculty-stat-value">
            {Object.keys(schedule[DAYS_OF_WEEK[getCurrentDayIndex()]?.id] || {}).length}
          </p>
          <p className="faculty-stat-subtitle">{DAYS_OF_WEEK[getCurrentDayIndex()]?.label}</p>
        </div>
      </div>

      {viewMode === "day" ? (
        <div className="faculty-card">
          <div className="faculty-day-header">
            <button
              type="button"
              className="faculty-nav-btn"
              onClick={() => navigateDay(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="faculty-day-title">
              {DAYS_OF_WEEK[selectedDay]?.label}
              {selectedDay === getCurrentDayIndex() && (
                <span className="faculty-today-badge">Today</span>
              )}
            </h3>
            <button
              type="button"
              className="faculty-nav-btn"
              onClick={() => navigateDay(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {daySchedule.length === 0 ? (
            <div className="faculty-empty-state">
              <Calendar size={48} color="#94a3b8" />
              <p>No classes scheduled for {DAYS_OF_WEEK[selectedDay]?.label}</p>
            </div>
          ) : (
            <div className="faculty-schedule-list">
              {daySchedule.map((item, index) => (
                <div key={index} className="faculty-schedule-item">
                  <div className="faculty-schedule-time">
                    <Clock size={16} />
                    <span>{getSlotLabel(item.slot)}</span>
                  </div>
                  <div className="faculty-schedule-details">
                    <h4 className="faculty-schedule-course">
                      {item.course?.courseName || item.course?.title || "Course"}
                    </h4>
                    <p className="faculty-schedule-code">
                      {item.course?.code || "N/A"}
                    </p>
                  </div>
                  <div className="faculty-schedule-meta">
                    <div className="faculty-schedule-group">
                      <Users size={14} />
                      <span>{item.group?.name || "Group"}</span>
                    </div>
                    <div className="faculty-schedule-room">
                      <MapPin size={14} />
                      <span>{item.group?.roomNo || "TBA"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="faculty-card faculty-week-card">
          <div className="faculty-timetable-container">
            <table className="faculty-timetable">
              <thead>
                <tr>
                  <th className="faculty-tt-header-cell">Time</th>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <th
                      key={day.id}
                      className={`faculty-tt-header-cell ${index === getCurrentDayIndex() ? "today" : ""}`}
                    >
                      {day.label.substring(0, 3)}
                      {index === getCurrentDayIndex() && (
                        <span className="faculty-today-dot" />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LECTURE_SLOTS.map((slot) => (
                  <tr key={slot.id}>
                    <td className="faculty-tt-time-cell">{slot.label}</td>
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                      const classItem = schedule[day.id]?.[slot.id];
                      return (
                        <td
                          key={day.id}
                          className={`faculty-tt-cell ${dayIndex === getCurrentDayIndex() ? "today-col" : ""} ${classItem ? "has-class" : ""}`}
                        >
                          {classItem ? (
                            <div className="faculty-tt-class">
                              <span className="faculty-tt-course">
                                {classItem.course?.code || "Course"}
                              </span>
                              <span className="faculty-tt-group">
                                {classItem.group?.name || ""}
                              </span>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
