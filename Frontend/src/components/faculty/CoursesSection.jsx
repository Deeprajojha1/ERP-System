import { useMemo, useState } from "react";
import { BookOpen, Users, CalendarDays } from "lucide-react";
import CourseWorkspaceSection from "./CourseWorkspaceSection";

const getUniqueCourses = (facultyData) => {
  const routine = facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine || {};
  const map = new Map();

  Object.entries(routine).forEach(([, slots]) => {
    Object.values(slots || {}).forEach((item) => {
      const course = item?.course;
      const group = item?.group;
      if (!course) return;

      const courseId = course?._id || course?.id;
      if (!courseId) return;

      if (!map.has(courseId)) {
        map.set(courseId, {
          ...course,
          _id: courseId,
          groups: new Set(),
          totalStudents: 0,
        });
      }

      if (group) {
        const bucket = map.get(courseId);
        const groupId = group?._id || group?.id;
        if (groupId && !bucket.groups.has(groupId)) {
          bucket.groups.add(groupId);
          const count = Array.isArray(group?.studentIds) ? group.studentIds.length : 0;
          bucket.totalStudents += count;
        }
      }
    });
  });

  return Array.from(map.values()).map((course) => ({
    ...course,
    groupsCount: course.groups.size,
  }));
};

export default function CoursesSection({ facultyData }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const courses = useMemo(() => getUniqueCourses(facultyData), [facultyData]);

  if (selectedCourse) {
    return (
      <CourseWorkspaceSection
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
      />
    );
  }

  return (
    <section className="faculty-section courses-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">Course Workspace</h2>
          <p className="faculty-section-subtitle">
            Open a course to manage materials, assignments, and quizzes.
          </p>
        </div>
      </div>

      <div className="faculty-stats-grid">
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Courses</span>
            <div className="faculty-stat-icon" style={{ background: "#dbeafe" }}>
              <BookOpen size={20} color="#2563eb" />
            </div>
          </div>
          <p className="faculty-stat-value">{courses.length}</p>
        </div>

        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Groups Covered</span>
            <div className="faculty-stat-icon" style={{ background: "#fef3c7" }}>
              <CalendarDays size={20} color="#b45309" />
            </div>
          </div>
          <p className="faculty-stat-value">
            {courses.reduce((sum, item) => sum + item.groupsCount, 0)}
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="faculty-card">
          <div className="faculty-empty-state">
            <BookOpen size={48} color="#94a3b8" />
            <p>No assigned courses found.</p>
          </div>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <button
              key={course._id}
              type="button"
              className="faculty-course-card"
              onClick={() => setSelectedCourse(course)}
            >
              <div className="faculty-course-header">
                <div className="faculty-course-icon">
                  <BookOpen size={20} />
                </div>
                <div className="faculty-course-info">
                  <h3 className="faculty-course-name">
                    {course.courseName || course.title || "Untitled Course"}
                  </h3>
                  <p className="faculty-course-code">{course.code || "N/A"}</p>
                </div>
              </div>

              <div className="faculty-course-meta">
                <Users size={14} />
                <span>{course.groupsCount} Group(s)</span>
              </div>

              <p className="faculty-course-dept">
                {course.department?.name || "Department"} | Semester {course.semester || "-"} | Credit {course.credit || 0}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
