import { useState, useMemo } from "react";
import { ArrowRight, BookOpen, GraduationCap, Layers3, Sparkles } from "lucide-react";
import CourseWorkspaceSection from "./CourseWorkspaceSection";
import { facultyUi } from "./uiTokens";

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
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <div>
          <h2 className={facultyUi.title}>My Courses</h2>
          <p className={facultyUi.subtitle}>
            View and manage your assigned courses
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className={facultyUi.empty}>
          <BookOpen size={48} color="#94a3b8" />
          <p className="m-0 mt-3">No courses assigned</p>
          <span className="mt-1 block text-sm text-slate-400">
            Courses assigned to you will appear here
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <button
              key={course._id}
              type="button"
              onClick={() => handleOpenCourse(course)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)] min-h-[188px]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-80" />
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <BookOpen size={21} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-[1.05rem] font-semibold leading-tight text-slate-900 group-hover:text-blue-700">
                      {course.courseName}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">{course.code}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                  <Sparkles size={12} />
                  Active
                </span>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  <Layers3 size={12} />
                  Semester {course.semester}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  <GraduationCap size={12} />
                  {course.credit} Credits
                </span>
              </div>
              <div className="text-sm font-medium text-slate-700">
                {course.department?.name || "Department"}
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                Open workspace <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
