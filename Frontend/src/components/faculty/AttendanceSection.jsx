import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck2, Users, Clock, BookOpen, ArrowRight } from "lucide-react";

const getRoutineCourses = (facultyData) => {
  const routine = facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine || {};
  const map = new Map();

  Object.entries(routine).forEach(([day, slots]) => {
    Object.entries(slots || {}).forEach(([slot, item]) => {
      const course = item?.course;
      const group = item?.group;
      if (!course || !group) return;

      const courseId = course?._id || course?.id;
      const groupId = group?._id || group?.id;
      if (!courseId || !groupId) return;

      const key = `${courseId}-${groupId}`;
      if (!map.has(key)) {
        map.set(key, {
          id: courseId,
          groupId,
          code: course?.code || "N/A",
          title: course?.courseName || course?.title || "Untitled Course",
          groupName: group?.name || "Group",
          room: group?.roomNo || "N/A",
          students: Array.isArray(group?.studentIds) ? group.studentIds.length : null,
          lectureCount: 0,
          schedule: [],
        });
      }

      const row = map.get(key);
      row.lectureCount += 1;
      row.schedule.push(`${day} (${slot})`);
    });
  });

  return Array.from(map.values()).map((course) => ({
    ...course,
    scheduleLabel: course.schedule.slice(0, 2).join(", "),
  }));
};

export default function AttendanceSection({ facultyData }) {
  const navigate = useNavigate();

  const courses = useMemo(() => getRoutineCourses(facultyData), [facultyData]);

  return (
    <section className="faculty-section courses-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">Attendance Management</h2>
          <p className="faculty-section-subtitle">
            Select a course and open the attendance register.
          </p>
        </div>
      </div>

      <div className="faculty-stats-grid">
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Active Courses</span>
            <div className="faculty-stat-icon" style={{ background: "#dbeafe" }}>
              <BookOpen size={20} color="#2563eb" />
            </div>
          </div>
          <p className="faculty-stat-value">{courses.length}</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Total Lecture Slots</span>
            <div className="faculty-stat-icon" style={{ background: "#dcfce7" }}>
              <CalendarCheck2 size={20} color="#16a34a" />
            </div>
          </div>
          <p className="faculty-stat-value">
            {courses.reduce((sum, item) => sum + item.lectureCount, 0)}
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="faculty-card">
          <div className="faculty-empty-state">
            <CalendarCheck2 size={48} color="#94a3b8" />
            <p>No courses found in your routine.</p>
          </div>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <button
              key={`${course.id}-${course.groupId}`}
              type="button"
              className="faculty-course-card"
              onClick={() => navigate(`/faculty/course/${course.id}?groupId=${course.groupId}`)}
            >
              <div className="faculty-course-header">
                <div className="faculty-course-icon">
                  <CalendarCheck2 size={20} />
                </div>
                <div className="faculty-course-info">
                  <h3 className="faculty-course-name">{course.title}</h3>
                  <p className="faculty-course-code">{course.code}</p>
                </div>
              </div>

              <div className="faculty-course-meta">
                <Users size={14} />
                <span>{course.groupName}</span>
              </div>

              <div className="faculty-course-dept">
                <p>
                  <Clock size={14} /> {course.scheduleLabel || "Schedule unavailable"}
                </p>
                <p>Room: {course.room}</p>
                <p>
                  Students: {course.students === null ? "N/A" : course.students}
                </p>
                <p className="faculty-course-open-link">
                  Mark attendance <ArrowRight size={14} />
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
