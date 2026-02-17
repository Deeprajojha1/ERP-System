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

const STATIC_COURSES = [
  {
    id: "static-cs301",
    courseCode: "CS301",
    courseName: "Data Structures & Algorithms",
    semester: "Sem 3",
    credits: "4 Credits",
    courseType: "Theory",
    faculty: "Dr. Rahul Sharma",
    schedule: "Mon, Wed 10:00 AM",
    room: "Lab-204",
    assignments: 4,
    status: "Active",
  },
  {
    id: "static-cs302",
    courseCode: "CS302",
    courseName: "Database Management Systems",
    semester: "Sem 3",
    credits: "3 Credits",
    courseType: "Theory",
    faculty: "Prof. Neha Verma",
    schedule: "Tue, Thu 11:00 AM",
    room: "B-105",
    assignments: 3,
    status: "Active",
  },
  {
    id: "static-cs303",
    courseCode: "CS303",
    courseName: "Operating Systems",
    semester: "Sem 3",
    credits: "4 Credits",
    courseType: "Theory",
    faculty: "Dr. Ajay Singh",
    schedule: "Fri 09:00 AM",
    room: "A-201",
    assignments: 2,
    status: "Active",
  },
];

const ASSIGNMENTS_STATIC = [
  {
    id: "as-01",
    courseCode: "CS301",
    courseName: "Data Structures & Algorithms",
    title: "Quiz 1: Linked Lists & Pointers",
    category: "Quiz",
    status: "pending",
    posted: "Oct 12, 2023",
    due: "Tomorrow - 10:00 AM",
    duration: "45 Minutes",
    message: "Complete this quiz before due time.",
    cta: "View Quiz",
  },
  {
    id: "as-02",
    courseCode: "CS301",
    courseName: "Data Structures & Algorithms",
    title: "Homework 1: Big O Notation & Time Complexity",
    category: "Homework",
    status: "pending",
    posted: "Oct 10, 2023",
    due: "Oct 15, 2023 - 11:59 PM",
    duration: "Take Home",
    message: "Submit your solution in PDF format.",
    cta: "View Assignment",
  },
  {
    id: "as-03",
    courseCode: "CS302",
    courseName: "Database Management Systems",
    title: "Programming Project: AVL Tree Implementation",
    category: "Project",
    status: "submitted",
    posted: "Oct 14, 2023",
    due: "Oct 22, 2023 - 11:59 PM",
    message: "Your assignment has been submitted.",
  },
  {
    id: "as-04",
    courseCode: "CS303",
    courseName: "Operating Systems",
    title: "Homework 2: Stack & Queue Implementation",
    category: "Homework",
    status: "graded",
    posted: "Oct 05, 2023",
    due: "Oct 09, 2023 - 11:59 PM",
    grade: "8/10",
    message: "Your assignment has been graded.",
  },
  {
    id: "as-05",
    courseCode: "CS303",
    courseName: "Operating Systems",
    title: "Lab 3: Process Scheduling",
    category: "Lab",
    status: "pending",
    posted: "Oct 16, 2023",
    due: "Oct 20, 2023 - 05:00 PM",
    duration: "In Lab",
    message: "Bring practical record with your output.",
    cta: "View Assignment",
  },
];

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "submitted", label: "Submitted" },
  { id: "graded", label: "Graded" },
];

const COURSE_DETAILS_STATIC = {
  CS301: {
    badge: "CS301 - CORE",
    title: "Data Structures & Algorithms",
    meta: "4 Credits - Semester 3",
    overview:
      "This course covers arrays, linked lists, stacks, queues, trees and graph basics. Students solve practical coding problems and complexity-focused assignments.",
    resources: [
      { id: "r1", name: "Lecture 1: Intro to Algorithm", date: "24 Feb 2026, 10:00 AM" },
      { id: "r2", name: "Assignment Guidelines.docx", date: "22 Feb 2026, 02:30 PM" },
    ],
    instructor: "Dr. Rahul Sharma",
    instructorRole: "Lead Faculty - AI Research",
    room: "Room 402, Block C",
    schedule: "Mon, Wed - 10:00",
    progress: 75,
    progressNote: "Alex, you are ahead of schedule.",
    tasks: [
      { id: "t1", title: "Neural Networks Lab", subtitle: "Due: Oct 25 - 1:15 PM", points: "50 pts" },
      { id: "t2", title: "Mid-Term Assessment", subtitle: "Completed: Oct 20", points: "A+" },
    ],
  },
  CS302: {
    badge: "CS302 - CORE",
    title: "Database Management Systems",
    meta: "3 Credits - Semester 3",
    overview:
      "The course introduces relational models, SQL, normalization, transactions and indexing with real-world schema design exercises.",
    resources: [
      { id: "r3", name: "ER Modeling Notes.pdf", date: "18 Feb 2026, 11:00 AM" },
      { id: "r4", name: "Mini Project Dataset.csv", date: "16 Feb 2026, 09:45 AM" },
    ],
    instructor: "Prof. Neha Verma",
    instructorRole: "Course Coordinator",
    room: "Room B-105",
    schedule: "Tue, Thu - 11:00",
    progress: 68,
    progressNote: "You are on track. Keep consistency in lab submissions.",
    tasks: [
      { id: "t3", title: "SQL Joins Worksheet", subtitle: "Due: Oct 27 - 08:00 PM", points: "30 pts" },
      { id: "t4", title: "Normalization Quiz", subtitle: "Opens: Oct 29", points: "20 pts" },
    ],
  },
  CS303: {
    badge: "CS303 - CORE",
    title: "Operating Systems",
    meta: "4 Credits - Semester 3",
    overview:
      "Topics include process scheduling, memory management, synchronization, deadlocks and file systems with systems programming assignments.",
    resources: [
      { id: "r5", name: "Process Scheduling Handout.pdf", date: "20 Feb 2026, 01:20 PM" },
      { id: "r6", name: "Lab Manual - OS.pdf", date: "19 Feb 2026, 04:00 PM" },
    ],
    instructor: "Dr. Ajay Singh",
    instructorRole: "Systems Lab Mentor",
    room: "Room A-201",
    schedule: "Fri - 09:00",
    progress: 81,
    progressNote: "Great momentum. Continue practical revisions.",
    tasks: [
      { id: "t5", title: "Deadlock Simulation", subtitle: "Due: Nov 01 - 11:59 PM", points: "40 pts" },
      { id: "t6", title: "Memory Allocation Quiz", subtitle: "Completed: Oct 18", points: "9/10" },
    ],
  },
};

const CoursesDetails = ({ coursesData }) => {
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
      totalScore: 100,
      grade: "A",
      attachments: [
        {
          id: "a1",
          name: "hw1_big_o_final.pdf",
          size: "1.2 MB",
          timestamp: "Oct 14, 2023, 8:42 PM",
        },
      ],
      submission: {
        name: "hw1_big_o_final.pdf",
        size: "1.2 MB",
        timestamp: "Oct 14, 2023, 8:42 PM",
      },
      instructions:
        "Solve questions focused on time complexity. Upload PDF or images with explanations.",
    });
  };

  const resolvedCourses = useMemo(() => {
    if (Array.isArray(coursesData) && coursesData.length > 0) {
      return coursesData.map((course) => ({
        id: course.id,
        courseCode: course.courseCode || "N/A",
        courseName: course.courseName || "Course",
        semester: "Sem 3",
        credits: `${course.credits ?? "N/A"} Credits`,
        courseType: "Theory",
        faculty: course.instructor || "Faculty Not Assigned",
        schedule: course.schedule || "Schedule Not Available",
        room: course.room || "Room N/A",
        assignments: 2,
        status: "Active",
        raw: course,
      }));
    }
    return STATIC_COURSES;
  }, [coursesData]);

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
    const source = ASSIGNMENTS_STATIC.filter((item) => {
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
    activeAssignmentCourse?.courseName || "Data Structure & Algorithms";

  const detailData = activeCourseDetail
    ? COURSE_DETAILS_STATIC[activeCourseDetail.courseCode] || {
        badge: `${activeCourseDetail.courseCode} - CORE`,
        title: activeCourseDetail.courseName,
        meta: `${activeCourseDetail.credits} - ${activeCourseDetail.semester}`,
        overview: "Course overview not available right now.",
        resources: [],
        instructor: activeCourseDetail.faculty,
        instructorRole: "Faculty",
        room: activeCourseDetail.room,
        schedule: activeCourseDetail.schedule,
        progress: 70,
        progressNote: "Keep working on weekly modules.",
        tasks: [],
      }
    : null;

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

        <section className="course-detail-card">
          <h4><FiFolder /> Course Resources</h4>
          <div className="course-resource-list">
            {detailData.resources.map((resource) => (
              <article key={resource.id} className="course-resource-item">
                <div>
                  <strong>{resource.name}</strong>
                  <small>{resource.date}</small>
                </div>
                <div className="course-resource-actions">
                  <button type="button"><FiEye /></button>
                  <button type="button"><FiDownload /></button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="course-detail-card">
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

        <section className="course-detail-card">
          <h4>Course Information</h4>
          <div className="course-teacher-box">
            <div className="course-teacher-avatar">
              {detailData.instructor[0] || "T"}
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

        <section className="course-detail-card">
          <div className="course-progress-head">
            <div>
              <h4>My Course Progress</h4>
              <p>{detailData.progressNote}</p>
            </div>
            <strong>{detailData.progress}%</strong>
          </div>
          <div className="course-progress-track">
            <span style={{ width: `${detailData.progress}%` }} />
          </div>
          <label className="course-task-label">Upcoming Tasks</label>
          <div className="course-task-list">
            {detailData.tasks.map((task) => (
              <article key={task.id} className="course-task-item">
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.subtitle}</small>
                </div>
                <span>{task.points}</span>
              </article>
            ))}
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
                    {item.status === "pending"
                      ? "DUE IN 2 DAYS"
                      : item.status.toUpperCase()}
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

                {item.status === "pending" && (
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
          <p>Academic Year: 2025-26 - Semester 3</p>
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
