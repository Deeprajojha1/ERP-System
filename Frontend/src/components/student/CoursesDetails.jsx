import { useMemo, useState } from "react";
import DetailsQuiz from "./DetailsQuiz";
import DetailsAssignment from "./DetailsAssignment";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCheck,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiFolder,
  FiMapPin,
  FiMessageSquare,
  FiSearch,
  FiShare2,
  FiSliders,
} from "react-icons/fi";

import "./CoursesDetails.css";

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "submitted", label: "Submitted" },
  { id: "graded", label: "Graded" },
];
const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CoursesDetails = ({ coursesData, roleDetails }) => {
  const [searchValue, setSearchValue] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeAssignmentCourse, setActiveAssignmentCourse] = useState(null);
  const [activeCourseDetail, setActiveCourseDetail] = useState(null);
  const [activeAssignmentDetail, setActiveAssignmentDetail] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [activeQuizDetail, setActiveQuizDetail] = useState(false);

  const handleQuizClick = () => setActiveQuizDetail(true);

  const handleAssignmentClick = (item) => {
    const label = item?.cta?.toLowerCase() || "";
    if (label.includes("quiz")) {
      handleQuizClick();
      return;
    }

    setActiveAssignmentDetail({
      ...item,
      totalScore: item?.totalScore ?? null,
      grade: item?.grade ?? null,
      attachments: Array.isArray(item?.attachments) ? item.attachments : [],
      submission: item?.submission || null,
      instructions: item?.instructions || "No instructions available from API.",
    });
  };

  const resolvedCourses = useMemo(() => {
    if (Array.isArray(coursesData) && coursesData.length > 0) {
      return coursesData.map((course) => ({
        id: course.id,
        courseCode: course.courseCode || "N/A",
        courseName: course.courseName || "Course",
        semester: course.semester ? `Sem ${course.semester}` : "N/A",
        credits: course.credits !== undefined ? `${course.credits} Credits` : "N/A",
        courseType: course.courseType || "N/A",
        faculty: course.instructor || "N/A",
        schedule: course.schedule || "Schedule Not Available",
        room: course.room || "Room N/A",
        assignments:
          Number(course.assignmentsCount) ||
          (Array.isArray(course.assignments) ? course.assignments.length : 0),
        status: course.status || "N/A",
        assignmentItems: Array.isArray(course.assignments) ? course.assignments : [],
        raw: course,
      }));
    }
    return [];
  }, [coursesData]);

  const academicInfoLabel = useMemo(() => {
    const academicYear =
      roleDetails?.academicYear ||
      coursesData?.[0]?.academicYear ||
      coursesData?.[0]?.year ||
      null;
    const semesterValue = roleDetails?.semester ?? coursesData?.[0]?.semester ?? null;
    const semester = semesterValue ? `Semester ${semesterValue}` : null;
    if (academicYear && semester) return `Academic Year: ${academicYear} - ${semester}`;
    if (academicYear) return `Academic Year: ${academicYear}`;
    if (semester) return semester;
    return "Academic details unavailable";
  }, [coursesData, roleDetails]);

  const filteredCourses = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return resolvedCourses;
    return resolvedCourses.filter((course) => {
      return (
        course.courseCode.toLowerCase().includes(query) ||
        course.courseName.toLowerCase().includes(query) ||
        course.faculty.toLowerCase().includes(query)
      );
    });
  }, [resolvedCourses, searchValue]);

  const assignmentsToShow = useMemo(() => {
    const source = (activeAssignmentCourse?.assignmentItems || [])
      .map((item, index) => {
        const normalizedStatus = String(item?.status || "pending").toLowerCase();
        const safeStatus = STATUS_TABS.some((tab) => tab.id === normalizedStatus)
          ? normalizedStatus
          : "pending";
        return {
          id: item?._id || item?.id || `assignment-${index + 1}`,
          courseCode: activeAssignmentCourse?.courseCode || "N/A",
          courseName: activeAssignmentCourse?.courseName || "Course",
          title: item?.title || item?.name || "Untitled assignment",
          category: item?.category || item?.type || "Assignment",
          status: safeStatus,
          posted: formatDateTime(item?.postedAt || item?.createdAt),
          due: formatDateTime(item?.dueDate || item?.dueAt),
          duration: item?.duration || null,
          message: item?.message || "",
          cta: item?.cta || (safeStatus === "pending" ? "View Assignment" : null),
          grade: item?.grade || null,
        };
      })
      .filter((item) => {
        const statusMatch = item.status === selectedStatus;
        if (!activeAssignmentCourse) return statusMatch;
        return (
          statusMatch &&
          (item.courseCode === activeAssignmentCourse.courseCode ||
            item.courseName === activeAssignmentCourse.courseName)
        );
      });

    return [...source].sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      if (sortOrder === "asc") return aTitle.localeCompare(bTitle);
      return bTitle.localeCompare(aTitle);
    });
  }, [activeAssignmentCourse, selectedStatus, sortOrder]);

  const activeCourseName =
    activeAssignmentCourse?.courseName || "Course Assignments";

  const detailData = useMemo(() => {
    if (!activeCourseDetail) return null;
    const raw = activeCourseDetail.raw || {};
    const resourceItems = Array.isArray(raw.resources) ? raw.resources : [];
    const taskItems = Array.isArray(raw.tasks) ? raw.tasks : [];
    const progressValue =
      typeof raw.progress === "number"
        ? Math.min(100, Math.max(0, raw.progress))
        : null;

    return {
      badge: `${activeCourseDetail.courseCode} - ${activeCourseDetail.courseType || "COURSE"}`,
      title: activeCourseDetail.courseName,
      meta: `${activeCourseDetail.credits} - ${activeCourseDetail.semester}`,
      overview: raw.overview || "Course overview is not available from API.",
      resources: resourceItems,
      instructor: activeCourseDetail.faculty || "N/A",
      instructorRole: raw.instructorRole || "Faculty",
      room: activeCourseDetail.room,
      schedule: activeCourseDetail.schedule,
      progress: progressValue,
      progressNote: raw.progressNote || "Progress insight not available from API.",
      tasks: taskItems,
    };
  }, [activeCourseDetail]);

  if (activeQuizDetail) {
    return <DetailsQuiz onClose={() => setActiveQuizDetail(false)} />;
  }

  if (activeAssignmentDetail) {
    return (
      <DetailsAssignment
        assignment={activeAssignmentDetail}
        onClose={() => setActiveAssignmentDetail(null)}
      />
    );
  }

  if (activeCourseDetail && detailData) {
    return (
      <section className="student-course-detail-page">
        <header className="course-detail-hero">
          <button
            type="button"
            className="course-detail-back"
            onClick={() => setActiveCourseDetail(null)}
          >
            <FiArrowLeft />
          </button>

          <div className="course-detail-hero-copy">
            <span>{detailData.badge}</span>
            <h3>{detailData.title}</h3>
            <p>{detailData.meta}</p>
          </div>
        </header>

        <section className="course-detail-card course-detail-card-resources">
          <h4><FiFolder /> Course Resources</h4>
          <div className="course-resource-list">
            {detailData.resources.length === 0 ? (
              <p className="no-courses">No resources available from API.</p>
            ) : (
              detailData.resources.map((resource, index) => (
                <article
                  key={resource.id || resource._id || `resource-${index + 1}`}
                  className="course-resource-item"
                >
                  <div>
                    <strong>{resource.name || resource.title || "Resource"}</strong>
                    <small>{formatDateTime(resource.date || resource.createdAt)}</small>
                  </div>
                  <div className="course-resource-actions">
                    <button type="button"><FiEye /></button>
                    <button type="button"><FiDownload /></button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="course-detail-card course-detail-card-overview">
          <h4><FiFileText /> Course Overview</h4>
          <p className="course-overview-text">{detailData.overview}</p>
          <div className="course-overview-actions">
            <button type="button" className="course-detail-primary-btn">
              <FiBookOpen /> Syllabus PDF
            </button>
            <button type="button" className="course-detail-icon-btn">
              <FiShare2 />
            </button>
          </div>
        </section>

        <section className="course-detail-card course-detail-card-info">
          <h4>Course Information</h4>
          <div className="course-teacher-box">
            <div className="course-teacher-avatar">
              {(detailData.instructor || "T")[0]}
            </div>
            <div>
              <strong>{detailData.instructor}</strong>
              <small>{detailData.instructorRole}</small>
            </div>
          </div>
          <button
            type="button"
            className="course-message-btn"
            onClick={() => setShowMessageModal(true)}
          >
            <FiMessageSquare /> Message Teacher
          </button>
          <div className="course-info-grid">
            <div>
              <label>Room Number</label>
              <p><FiMapPin /> {detailData.room}</p>
            </div>
            <div>
              <label>Schedule</label>
              <p><FiClock /> {detailData.schedule}</p>
            </div>
          </div>
          {showMessageModal && (
            <div className="message-modal-overlay">
              <div className="message-modal">
                <header>
                  <strong>Message {detailData.instructor}</strong>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setShowMessageModal(false)}
                  >
                    ×
                  </button>
                </header>
                <label>Subject</label>
                <input type="text" placeholder="Assignment question" />
                <label>Message</label>
                <textarea rows="4" placeholder="Write your message here" />
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-secondary"
                    onClick={() => setShowMessageModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-primary"
                    onClick={() => setShowMessageModal(false)}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="course-detail-card course-detail-card-progress">
          <div className="course-progress-head">
            <div>
              <h4>My Course Progress</h4>
              <p>{detailData.progressNote}</p>
            </div>
            <strong>{detailData.progress === null ? "N/A" : `${detailData.progress}%`}</strong>
          </div>
          <div className="course-progress-track">
            <span style={{ width: `${detailData.progress === null ? 0 : detailData.progress}%` }} />
          </div>
          <label className="course-task-label">Upcoming Tasks</label>
          <div className="course-task-list">
            {detailData.tasks.length === 0 ? (
              <p className="no-courses">No upcoming tasks from API.</p>
            ) : (
              detailData.tasks.map((task, index) => (
                <article
                  key={task.id || task._id || `task-${index + 1}`}
                  className="course-task-item"
                >
                  <div>
                    <strong>{task.title || task.name || "Task"}</strong>
                    <small>{task.subtitle || task.description || "No details available."}</small>
                  </div>
                  <span>{task.points || task.score || "-"}</span>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    );
  }

  if (activeAssignmentCourse) {
    return (
      <section className="student-assignments-page">
        <div className="assignment-header-card">
          <button
            type="button"
            className="assignment-back-btn"
            onClick={() => setActiveAssignmentCourse(null)}
          >
            <FiArrowLeft />
          </button>

          <div className="assignment-header-copy">
            <h3>{activeCourseName}</h3>
            <p>Assignments - Quizzes</p>
          </div>

          <div className="assignment-filter-wrap">
            <button
              type="button"
              className="assignment-filter-btn"
              onClick={() => setShowSortMenu((prev) => !prev)}
            >
              <FiFilter />
              <span>Filter</span>
            </button>

            {showSortMenu && (
              <div className="assignment-filter-menu">
                <button
                  type="button"
                  className={sortOrder === "asc" ? "active" : ""}
                  onClick={() => {
                    setSortOrder("asc");
                    setShowSortMenu(false);
                  }}
                >
                  A - Z
                </button>
                <button
                  type="button"
                  className={sortOrder === "desc" ? "active" : ""}
                  onClick={() => {
                    setSortOrder("desc");
                    setShowSortMenu(false);
                  }}
                >
                  Z - A
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="assignment-status-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={selectedStatus === tab.id ? "active" : ""}
              onClick={() => setSelectedStatus(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`assignment-cards-grid ${selectedStatus}`}>
          {assignmentsToShow.length === 0 ? (
            <p className="no-courses">No {selectedStatus} assignment found.</p>
          ) : (
            assignmentsToShow.map((item) => (
              <article key={item.id} className="assignment-card">
                <div className="assignment-card-top">
                  <span className="assignment-course-chip">{item.courseCode}</span>
                  <span className="assignment-due-chip">
                    {item.status === "pending" ? item.due : item.status.toUpperCase()}
                  </span>
                </div>

                <p className="assignment-course-name">{item.courseName}</p>
                <h4>{item.title}</h4>

                <span className={`assignment-type-chip ${item.status}`}>
                  {item.status === "submitted" ? <FiCheck /> : <FiSliders />}
                  {item.status === "pending"
                    ? item.category
                    : item.status === "submitted"
                    ? "Submitted"
                    : "Graded"}
                </span>

                <div className="assignment-info">
                  <div>
                    <label>Posted</label>
                    <p>{item.posted}</p>
                  </div>
                  <div>
                    <label>Due</label>
                    <p>{item.due}</p>
                  </div>
                  {item.duration && (
                    <div>
                      <label>Duration</label>
                      <p>{item.duration}</p>
                    </div>
                  )}
                  {item.grade && (
                    <div>
                      <label>Grade</label>
                      <p className="assignment-grade">{item.grade}</p>
                    </div>
                  )}
                </div>

                <p className="assignment-message">{item.message}</p>

                {item.status === "pending" && item.cta && (
                  <button
                    type="button"
                    className="assignment-open-btn"
                    onClick={() => handleAssignmentClick(item)}
                  >
                    {item.cta || "View Assignment"}
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="courses-details-container">
      <div className="student-courses-top">
        <div className="courses-header">
          <h3>My Courses</h3>
          <p>{academicInfoLabel}</p>
        </div>
        <div className="student-courses-controls">
          <label className="student-courses-search">
            <FiSearch className="student-courses-search-icon" />
            <input
              type="text"
              placeholder="Search Courses..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
          <span className="student-courses-count">
            {filteredCourses.length} Courses
          </span>
        </div>
      </div>

      <div className="courses-grid">
        {filteredCourses.length === 0 ? (
          <p className="no-courses">No matching course found.</p>
        ) : (
          filteredCourses.map((course) => (
            <article key={course.id} className="course-card">
              <div className="course-head-row">
                <div>
                  <h4>{course.courseName}</h4>
                  <p className="course-code">{course.courseCode}</p>
                </div>
                <span className="course-status-chip">{course.status}</span>
              </div>

              <div className="course-badges">
                <span>{course.courseCode}</span>
                <span>{course.semester}</span>
                <span>{course.credits}</span>
                <span>{course.courseType}</span>
              </div>

              <p className="course-faculty">Faculty: {course.faculty}</p>

              <div className="course-meta">
                <div>
                  <label>Schedule</label>
                  <p>{course.schedule}</p>
                </div>
                <div>
                  <label>Room</label>
                  <p>{course.room}</p>
                </div>
              </div>

              <div className="course-actions">
                <button
                  type="button"
                  className="course-btn course-btn-primary"
                  onClick={() => {
                    setActiveCourseDetail(course);
                    setActiveAssignmentCourse(null);
                  }}
                >
                  View Details
                </button>
                <button
                  type="button"
                  className="course-btn course-btn-muted"
                  onClick={() => {
                    setActiveAssignmentCourse(course);
                    setSelectedStatus("pending");
                    setSortOrder("asc");
                    setShowSortMenu(false);
                  }}
                >
                  Assignments ({course.assignments})
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default CoursesDetails;
