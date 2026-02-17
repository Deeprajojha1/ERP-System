import { Calendar, Clock, Users, BookOpen } from "lucide-react";

export default function DashboardSection({ facultyData }) {
  const todaySchedule = facultyData?.todaySchedule || [];
  const facultyName = facultyData?.user?.name || "Faculty";
  const departmentName = facultyData?.facultyDetails?.department?.name || "Department";

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

  return (
    <section className="faculty-section">
      <div className="faculty-section-header">
        <h2 className="faculty-section-title">Welcome back, {facultyName.split(" ").pop()}!</h2>
        <p className="faculty-section-subtitle">Here is your academic overview for today</p>
      </div>

      <div className="faculty-stats-grid">
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Today's Classes</p>
            <div className="faculty-stat-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              <Users size={20} />
            </div>
          </div>
          <p className="faculty-stat-value">{todaySchedule.length}</p>
          <p className="faculty-stat-subtitle">{facultyData?.today || "Today"}</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Department</p>
            <div className="faculty-stat-icon" style={{ background: '#d1fae5', color: '#065f46' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <p className="faculty-stat-value" style={{ fontSize: '20px' }}>{departmentName}</p>
          <p className="faculty-stat-subtitle">Active</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Designation</p>
            <div className="faculty-stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Calendar size={20} />
            </div>
          </div>
          <p className="faculty-stat-value" style={{ fontSize: '18px' }}>{facultyData?.facultyDetails?.designation || "Faculty"}</p>
          <p className="faculty-stat-subtitle">{facultyData?.facultyDetails?.employeeId || ""}</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <p className="faculty-stat-title">Next Class</p>
            <div className="faculty-stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
              <Clock size={20} />
            </div>
          </div>
          <p className="faculty-stat-value" style={{ fontSize: '20px' }}>
            {todaySchedule.length > 0 ? getLectureTime(todaySchedule[0].lectureNumber)[0] : "No classes"}
          </p>
          <p className="faculty-stat-subtitle">
            {todaySchedule.length > 0 ? todaySchedule[0].course?.courseName?.substring(0, 20) : "Today"}
          </p>
        </div>
      </div>

      <div className="faculty-card">
        <h3 className="faculty-card-title">Today's Schedule</h3>
        {todaySchedule.length === 0 ? (
          <div className="faculty-empty-state">
            <Calendar size={48} className="faculty-empty-icon" />
            <p className="faculty-empty-text">No classes scheduled for today</p>
          </div>
        ) : (
          <div className="faculty-card-content">
            {todaySchedule.map((lecture) => {
              const [startTime, endTime] = getLectureTime(lecture.lectureNumber);
              const status = getCurrentStatus(lecture.lectureNumber);
              return (
                <div key={lecture.lectureNumber} className="faculty-schedule-item">
                  <div className="faculty-schedule-time">
                    <p className="faculty-schedule-lecture">Lecture {lecture.lectureNumber}</p>
                    <p className="faculty-schedule-hours">{startTime} - {endTime}</p>
                  </div>
                  <div className="faculty-schedule-details">
                    <p className="faculty-schedule-course">{lecture.course?.courseName || "Course"}</p>
                    <p className="faculty-schedule-info">
                      {lecture.course?.code || ""} • {lecture.group?.name || "Group"} • Room {lecture.group?.roomNo || "N/A"}
                    </p>
                  </div>
                  <span className={`faculty-schedule-badge ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
