import { useState, useMemo } from "react";
import { BookOpen } from "lucide-react";
import CourseWorkspaceSection from "./CourseWorkspaceSection";

export default function CoursesSection({ facultyData }) {
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Extract courses from faculty routine
  const courses = useMemo(() => {
    const routine =
      facultyData?.facultyDetails?.routine ||
      facultyData?.roleDetails?.routine ||
      {};

    const courseMap = new Map();
    const courseList = [];

    Object.values(routine).forEach((daySchedule) => {
      Object.values(daySchedule || {}).forEach((slot) => {
        if (slot?.course && !courseMap.has(slot.course._id)) {
          courseMap.set(slot.course._id, slot.course);
          courseList.push(slot.course);
        }
      });
    });

    return courseList;
  }, [facultyData]);

  const handleOpenCourse = (course) => {
    setSelectedCourse(course);
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
  };

  if (selectedCourse) {
    return (
      <CourseWorkspaceSection
        course={selectedCourse}
        onBack={handleBackToCourses}
      />
    );
  }

  return (
    <section className="faculty-section courses-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">My Courses</h2>
          <p className="faculty-section-subtitle">
            View and manage your assigned courses
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="faculty-empty-state">
          <BookOpen size={48} color="#94a3b8" />
          <p>No courses assigned</p>
          <span className="faculty-empty-subtitle">
            Courses assigned to you will appear here
          </span>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <button
              key={course._id}
              type="button"
              onClick={() => handleOpenCourse(course)}
              className="faculty-course-card"
            >
              <div className="faculty-course-header">
                <div className="faculty-course-icon">
                  <BookOpen size={24} />
                </div>
                <div className="faculty-course-info">
                  <h3 className="faculty-course-name">{course.courseName}</h3>
                  <p className="faculty-course-code">{course.code}</p>
                </div>
              </div>
              <div className="faculty-course-meta">
                <span>Semester {course.semester}</span>
                <span>-</span>
                <span>{course.credit} Credits</span>
              </div>
              <div className="faculty-course-dept">
                {course.department?.name || "Department"}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
