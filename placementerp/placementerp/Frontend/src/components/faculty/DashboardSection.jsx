import { Calendar, Clock, Users, BookOpen, Bell, AlertCircle, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ClipLoader } from "react-spinners";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import {
  fetchFacultyAlerts,
  selectFacultyAlerts,
  selectFacultyAlertsLoadState,
} from "../../redux/facultyDashboardSlice";

export default function DashboardSection({ facultyData }) {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const alerts = useSelector(selectFacultyAlerts);
  const alertsLoadState = useSelector(selectFacultyAlertsLoadState);
  
  const todaySchedule = Array.isArray(facultyData?.todaySchedule)
    ? facultyData.todaySchedule
    : [];
  const facultyName = facultyData?.user?.name || "Faculty";
  const departmentName = 
    facultyData?.facultyDetails?.department?.name || 
    facultyData?.roleDetails?.department?.name || 
    "Department";
  const designation = 
    facultyData?.facultyDetails?.designation || 
    facultyData?.roleDetails?.designation || 
    "Faculty";
  const employeeId = 
    facultyData?.facultyDetails?.employeeId || 
    facultyData?.roleDetails?.employeeId || 
    "";
  const alertsLoading = alertsLoadState === ADMIN_LOAD_STATES.PENDING;

  useEffect(() => {
    if (!apiBase || alertsLoadState !== ADMIN_LOAD_STATES.INITIAL) return;
    dispatch(fetchFacultyAlerts({ apiBase }));
  }, [apiBase, alertsLoadState, dispatch]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      default:
        return "#3b82f6";
    }
  };

  // Get current time to determine class status
  const getCurrentStatus = (lectureNumber) => {
    const currentHour = new Date().getHours();
    const lectureStartHours = [8, 9, 10, 11, 13, 14, 15, 16];
    const lectureHour = lectureStartHours[lectureNumber - 1] || 8;

    if (currentHour > lectureHour) return { label: "Completed", color: "completed" };
    if (currentHour === lectureHour) return { label: "Ongoing", color: "ongoing" };
    return { label: "Scheduled", color: "scheduled" };
  };

  const getLectureTime = (lectureNumber) => {
    const times = [
      ["08:30", "09:20"],
      ["09:30", "10:20"],
      ["10:30", "11:20"],
      ["11:30", "12:20"],
      ["13:00", "13:50"],
      ["14:00", "14:50"],
      ["15:00", "15:50"],
      ["16:00", "16:50"],
    ];
    return times[lectureNumber - 1] || ["--:--", "--:--"];
  };

  const nextClass = !todaySchedule.length
    ? null
    : [...todaySchedule].sort(
        (a, b) => Number(a.lectureNumber || 0) - Number(b.lectureNumber || 0)
      )[0];

  const classesByStatus = todaySchedule.reduce(
    (acc, lecture) => {
      const status = getCurrentStatus(lecture.lectureNumber).color;
      if (status === "completed") acc.completed += 1;
      if (status === "ongoing") acc.ongoing += 1;
      if (status === "scheduled") acc.scheduled += 1;
      return acc;
    },
    { completed: 0, ongoing: 0, scheduled: 0 }
  );

  const unreadHighPriority = alerts.filter((item) =>
    ["urgent", "warning"].includes(item?.priority)
  ).length;

    return (
      <section className="faculty-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">Welcome back, {facultyName.split(" ").pop()}!</h2>
          <p className="faculty-section-subtitle">Here is your academic overview for today</p>
        </div>
        <div className="faculty-dashboard-chip">
          <Sparkles size={16} />
          <span>{unreadHighPriority} priority alert(s)</span>
        </div>
      </div>

      <div className="faculty-stats-grid">
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Today's Classes</p>
            <div className="faculty-stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
              <Users size={20} />
            </div>
          </div>
          <p className="faculty-stat-value">{todaySchedule.length}</p>
          <p className="faculty-stat-subtitle">{facultyData?.today || "Today"}</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Department</p>
            <div className="faculty-stat-icon" style={{ background: "#d1fae5", color: "#065f46" }}>
              <BookOpen size={20} />
            </div>
          </div>
          <p className="faculty-stat-value" style={{ fontSize: "20px" }}>
            {departmentName}
          </p>
          <p className="faculty-stat-subtitle">Active</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Designation</p>
            <div className="faculty-stat-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
              <Calendar size={20} />
            </div>
          </div>
          <p className="faculty-stat-value" style={{ fontSize: "18px" }}>
            {designation}
          </p>
          <p className="faculty-stat-subtitle">{employeeId}</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Next Class</p>
            <div className="faculty-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
              <Clock size={20} />
            </div>
          </div>
          <p className="faculty-stat-value" style={{ fontSize: "20px" }}>
            {nextClass ? getLectureTime(nextClass.lectureNumber)[0] : "No classes"}
          </p>
          <p className="faculty-stat-subtitle">
            {nextClass ? nextClass.course?.courseName?.substring(0, 20) : "Today"}
          </p>
        </div>
      </div>

      <div className="faculty-dashboard-grid">
        <div className="faculty-card faculty-schedule-card">
          <h3 className="faculty-card-title">Today's Schedule</h3>
          {todaySchedule.length === 0 ? (
            <div className="faculty-empty-state">
              <Calendar size={48} color="#94a3b8" />
              <p>No classes scheduled for today</p>
            </div>
          ) : (
            <div className="faculty-card-content">
              <div className="faculty-schedule-summary-strip">
                <span className="faculty-pill faculty-pill-ongoing">
                  Ongoing: {classesByStatus.ongoing}
                </span>
                <span className="faculty-pill faculty-pill-scheduled">
                  Scheduled: {classesByStatus.scheduled}
                </span>
                <span className="faculty-pill faculty-pill-completed">
                  Completed: {classesByStatus.completed}
                </span>
              </div>
              {todaySchedule.map((lecture) => {
                const [startTime, endTime] = getLectureTime(lecture.lectureNumber);
                const status = getCurrentStatus(lecture.lectureNumber);
                return (
                  <div key={lecture.lectureNumber} className="faculty-schedule-item">
                    <div className="faculty-schedule-time">
                      <p className="faculty-schedule-lecture">Lecture {lecture.lectureNumber}</p>
                      <p className="faculty-schedule-hours">
                        {startTime} - {endTime}
                      </p>
                    </div>
                    <div className="faculty-schedule-details">
                      <p className="faculty-schedule-course">{lecture.course?.courseName || "Course"}</p>
                      <p className="faculty-schedule-info">
                        {lecture.course?.code || ""} | {lecture.group?.name || "Group"} | Room {lecture.group?.roomNo || "N/A"}
                      </p>
                    </div>
                    <span className={`faculty-schedule-badge ${status.color}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="faculty-card faculty-alerts-card">
          <h3 className="faculty-card-title">
            <Bell size={20} style={{ marginRight: "8px" }} />
            Notifications
          </h3>
          {alertsLoading ? (
            <div className="faculty-loading-inline">
              <ClipLoader size={24} color="#0284c7" />
              <span>Loading notifications...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="faculty-empty-state">
              <AlertCircle size={48} color="#94a3b8" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="faculty-alerts-content">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert._id}
                  className="faculty-alert-item"
                  style={{ borderLeftColor: getPriorityColor(alert.priority) }}
                >
                  <div className="faculty-alert-header">
                    <h4 className="faculty-alert-title">{alert.title}</h4>
                    <span className={`faculty-alert-priority priority-${alert.priority}`}>{alert.priority}</span>
                  </div>
                  <p className="faculty-alert-message">{alert.message}</p>
                  <p className="faculty-alert-time">
                    {new Date(alert.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
