import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import ClipLoader from "../../Admin/components/ClipLoader";
import DetailsQuiz from "./DetailsQuiz";
import DetailsAssignment from "./DetailsAssignment";
import emptyStateIllustration from "../../assets/empty-state.svg";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiFolder,
  FiMapPin,
  FiMessageSquare,
  FiSearch,
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

const resolveApiOrigin = (apiBase) => {
  const base = String(apiBase || "").trim();
  if (!base) return "";
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return base.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  }
  return "";
};

const resolveResourceUrl = (resource, apiBase = "") => {
  const candidate =
    resource?.fileUrl ||
    resource?.quizUrl ||
    resource?.url ||
    resource?.link ||
    resource?.href ||
    resource?.attachments?.[0]?.url ||
    "";

  const normalized = String(candidate || "").trim();
  if (!normalized) return "";

  const invalidValues = new Set(["n/a", "na", "none", "null", "undefined", "-"]);
  if (invalidValues.has(normalized.toLowerCase())) return "";

  if (
    /^https?:\/\//i.test(normalized) ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    const origin = resolveApiOrigin(apiBase);
    return origin ? `${origin}${normalized}` : normalized;
  }

  if (normalized.startsWith("uploads/")) {
    const origin = resolveApiOrigin(apiBase);
    return origin ? `${origin}/${normalized}` : `/${normalized}`;
  }

  return normalized;
};

const isQuizItem = (item = {}) => {
  const typeText = `${item?.type || ""} ${item?.category || ""} ${item?.cta || ""} ${item?.title || ""} ${item?.name || ""}`
    .trim()
    .toLowerCase();
  return typeText.includes("quiz");
};

const resolveSyllabusResource = (raw = {}) => {
  const syllabusItems = Array.isArray(raw?.syllabus) ? raw.syllabus : [];
  if (syllabusItems.length > 0) return syllabusItems[0];

  const resources = Array.isArray(raw?.resources) ? raw.resources : [];
  return (
    resources.find((item) => {
      const type = String(item?.type || "").trim().toLowerCase();
      const text = `${item?.title || ""} ${item?.name || ""}`.toLowerCase();
      return type === "syllabus" || text.includes("syllabus");
    }) || null
  );
};

const resolveQuestionBankResources = (raw = {}) => {
  const questionBankItems = Array.isArray(raw?.questionBanks) ? raw.questionBanks : [];
  if (questionBankItems.length > 0) return questionBankItems;

  const resources = Array.isArray(raw?.resources) ? raw.resources : [];
  return resources.filter((item) => {
    const type = String(item?.type || "").trim().toLowerCase();
    const text = `${item?.title || ""} ${item?.name || ""}`.toLowerCase();
    return (
      type === "questionbanks" ||
      text.includes("question bank") ||
      text.includes("questionbank")
    );
  });
};

const triggerBrowserDownload = (fileUrl, fileName = "resource") => {
  if (!fileUrl) return;
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const downloadFileDirect = async (fileUrl, fileName = "resource") => {
  if (!fileUrl) return false;
  try {
    const response = await fetch(fileUrl, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    triggerBrowserDownload(objectUrl, fileName);
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch (error) {
    console.error("Direct resource download failed:", error?.message || error);
    return false;
  }
};

const canAccessResource = async (fileUrl) => {
  if (!fileUrl) return false;
  try {
    const headResponse = await fetch(fileUrl, {
      method: "HEAD",
      credentials: "include",
    });
    if (headResponse.ok) return true;

    if (headResponse.status === 405) {
      const getResponse = await fetch(fileUrl, {
        method: "GET",
        credentials: "include",
      });
      return getResponse.ok;
    }
    return false;
  } catch {
    return false;
  }
};

const openFileInNewTab = (fileUrl) => {
  if (!fileUrl) return;
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const normalizeCourseId = (course) =>
  String(course?.raw?._id || course?.id || "").trim();

const hydrateCourseWithContent = (course, contentBucket) => {
  if (!contentBucket) return course;

  const assignmentItems = Array.isArray(contentBucket?.combinedAssignments)
    ? contentBucket.combinedAssignments
    : Array.isArray(course?.assignmentItems)
    ? course.assignmentItems
    : [];
  const resources = Array.isArray(contentBucket?.materials)
    ? contentBucket.materials
    : Array.isArray(course?.raw?.resources)
    ? course.raw.resources
    : [];
  const syllabusItems = Array.isArray(contentBucket?.syllabus)
    ? contentBucket.syllabus
    : Array.isArray(course?.raw?.syllabus)
    ? course.raw.syllabus
    : [];
  const questionBankItems = Array.isArray(contentBucket?.questionBanks)
    ? contentBucket.questionBanks
    : Array.isArray(course?.raw?.questionBanks)
    ? course.raw.questionBanks
    : [];

  return {
    ...course,
    faculty: contentBucket?.facultyName || course?.faculty || "N/A",
    assignments: assignmentItems.length,
    assignmentItems,
    raw: {
      ...(course?.raw || {}),
      resources,
      materials: resources,
      syllabus: syllabusItems,
      questionBanks: questionBankItems,
      assignments: assignmentItems,
    },
  };
};

const CoursesDetails = ({ coursesData, roleDetails }) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [searchValue, setSearchValue] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeAssignmentCourse, setActiveAssignmentCourse] = useState(null);
  const [activeCourseDetail, setActiveCourseDetail] = useState(null);
  const [activeAssignmentDetail, setActiveAssignmentDetail] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [activeQuizDetail, setActiveQuizDetail] = useState(false);
  const [courseContentCache, setCourseContentCache] = useState({});
  const [activeLoading, setActiveLoading] = useState({
    courseId: "",
    action: "",
  });
  const [resourceLoading, setResourceLoading] = useState({
    resourceId: "",
    action: "",
  });
  const [syllabusActionLoading, setSyllabusActionLoading] = useState("");
  const [questionForm, setQuestionForm] = useState({
    subject: "",
    message: "",
  });
  const [courseQuestions, setCourseQuestions] = useState([]);
  const [questionDateTimeFilter, setQuestionDateTimeFilter] = useState("");
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [isQuestionSending, setIsQuestionSending] = useState(false);

  const handleQuizClick = () => setActiveQuizDetail(true);

  const handleOpenResource = async (resource, resourceId) => {
    const fileUrl = resolveResourceUrl(resource, apiBase);
    if (!fileUrl) {
      toast.error("No file is attached for this quiz.");
      return;
    }

    const exists = await canAccessResource(fileUrl);
    if (!exists) {
      toast.error("File not found on server. Please ask faculty to re-upload.");
      return;
    }

    setResourceLoading({ resourceId, action: "view" });
    openFileInNewTab(fileUrl);
    setResourceLoading({ resourceId: "", action: "" });
  };

  const handleDownloadResource = async (resource, resourceId) => {
    const fileUrl = resolveResourceUrl(resource, apiBase);
    if (!fileUrl) {
      toast.error("No file is available to download.");
      return;
    }

    setResourceLoading({ resourceId, action: "download" });
    const exists = await canAccessResource(fileUrl);
    if (!exists) {
      setResourceLoading({ resourceId: "", action: "" });
      toast.error("File not found on server. Please ask faculty to re-upload.");
      return;
    }
    const fileName =
      resource?.originalFileName ||
      resource?.fileName ||
      resource?.name ||
      resource?.title ||
      "resource";
    const downloaded = await downloadFileDirect(fileUrl, fileName);
    if (!downloaded) {
      toast.error("Failed to download file. Please try again.");
    }
    setResourceLoading({ resourceId: "", action: "" });
  };

  const handleDownloadSyllabus = async (syllabusResource) => {
    const fileUrl = resolveResourceUrl(syllabusResource, apiBase);
    if (!fileUrl) return;

    setSyllabusActionLoading("download");
    const fileName =
      syllabusResource?.originalFileName ||
      syllabusResource?.fileName ||
      syllabusResource?.name ||
      syllabusResource?.title ||
      "syllabus";

    const downloaded = await downloadFileDirect(fileUrl, fileName);
    if (!downloaded) {
      triggerBrowserDownload(fileUrl, fileName);
    }
    setSyllabusActionLoading("");
  };

  const handleViewSyllabus = (syllabusResource) => {
    const fileUrl = resolveResourceUrl(syllabusResource, apiBase);
    if (!fileUrl) return;

    setSyllabusActionLoading("view");
    openFileInNewTab(fileUrl);
    setSyllabusActionLoading("");
  };

  const toAssignmentDetail = (item, courseContext = activeAssignmentCourse) => ({
    ...item,
    totalScore:
      item?.totalScore ??
      (item?.marks !== undefined && item?.marks !== null ? item.marks : null),
    marks: item?.marks ?? null,
    grade: item?.grade ?? null,
    feedback: item?.feedback ?? "",
    fileUrl: item?.fileUrl || "",
    fileName: item?.fileName || "",
    originalFileName: item?.originalFileName || "",
    fileSize: item?.fileSize || 0,
    postedAt: item?.postedAt || item?.createdAt || null,
    dueDate: item?.dueDate || item?.dueAt || null,
    facultyName: item?.facultyName || courseContext?.faculty || "Faculty",
    attachments: Array.isArray(item?.attachments) ? item.attachments : [],
    submission: item?.submission || null,
    instructions: item?.instructions || "No instructions available from API.",
  });

  const handleAssignmentClick = (item) => {
    setActiveAssignmentDetail(toAssignmentDetail(item));
  };

  const fetchCourseContentByCourseId = async (courseId) => {
    if (!apiBase || !courseId) return null;

    const response = await axios.get(`${apiBase}/student/course-content`, {
      withCredentials: true,
      params: { courseId },
    });

    const contentByCourse = response?.data?.contentByCourse || {};
    return contentByCourse?.[courseId] || null;
  };

  const ensureCourseHydrated = async (course) => {
    const courseId = normalizeCourseId(course);
    if (!courseId) return course;

    try {
      const bucket = await fetchCourseContentByCourseId(courseId);
      if (bucket) {
        setCourseContentCache((prev) => ({ ...prev, [courseId]: bucket }));
        return hydrateCourseWithContent(course, bucket);
      }
    } catch (error) {
      console.error(
        "Failed to load course content for courseId:",
        courseId,
        error?.response?.data || error?.message || error
      );
    }

    const cached = courseContentCache?.[courseId];
    if (cached) return hydrateCourseWithContent(course, cached);

    return course;
  };

  const openCourseDetails = async (course) => {
    const courseId = normalizeCourseId(course);
    setActiveLoading({ courseId, action: "details" });
    const hydratedCourse = await ensureCourseHydrated(course);
    setActiveCourseDetail(hydratedCourse);
    setActiveAssignmentCourse(null);
    setActiveLoading({ courseId: "", action: "" });
  };

  const openCourseAssignments = async (course) => {
    const courseId = normalizeCourseId(course);
    setActiveLoading({ courseId, action: "assignments" });
    const hydratedCourse = await ensureCourseHydrated(course);
    setActiveAssignmentCourse(hydratedCourse);
    setSelectedStatus("pending");
    setSortOrder("asc");
    setShowSortMenu(false);
    setActiveLoading({ courseId: "", action: "" });
  };

  const handleAssignmentSubmitted = async (assignmentId) => {
    if (!activeAssignmentCourse) return;
    const courseId = normalizeCourseId(activeAssignmentCourse);
    if (!courseId) return;

    try {
      const bucket = await fetchCourseContentByCourseId(courseId);
      if (!bucket) return;

      setCourseContentCache((prev) => ({ ...prev, [courseId]: bucket }));
      const refreshedAssignmentCourse = hydrateCourseWithContent(
        activeAssignmentCourse,
        bucket
      );
      setActiveAssignmentCourse(refreshedAssignmentCourse);
      setActiveCourseDetail((prev) => {
        if (!prev) return prev;
        return normalizeCourseId(prev) === courseId
          ? hydrateCourseWithContent(prev, bucket)
          : prev;
      });

      const refreshedItem = (refreshedAssignmentCourse?.assignmentItems || []).find(
        (item) =>
          String(item?._id || item?.id || "") === String(assignmentId || "")
      );
      if (refreshedItem) {
        setActiveAssignmentDetail(
          toAssignmentDetail(refreshedItem, refreshedAssignmentCourse)
        );
        const status = String(refreshedItem?.status || "pending").toLowerCase();
        if (STATUS_TABS.some((tab) => tab.id === status)) {
          setSelectedStatus(status);
        }
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to refresh assignment status"
      );
    }
  };

  const fetchCourseQuestions = async (courseId) => {
    const normalizedCourseId = String(courseId || "").trim();
    if (!apiBase || !normalizedCourseId) return;

    setIsQuestionLoading(true);
    try {
      const response = await axios.get(`${apiBase}/student/course-questions`, {
        withCredentials: true,
        params: { courseId: normalizedCourseId },
      });
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      setCourseQuestions(items);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load messages");
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const submitQuestionToFaculty = async (courseId) => {
    const normalizedCourseId = String(courseId || "").trim();
    if (!apiBase || !normalizedCourseId) return;

    const subject = String(questionForm.subject || "").trim();
    const message = String(questionForm.message || "").trim();
    if (!message) {
      toast.error("Please enter your question");
      return;
    }

    setIsQuestionSending(true);
    try {
      const response = await axios.post(
        `${apiBase}/student/course-questions`,
        {
          courseId: normalizedCourseId,
          subject: subject || "Course Query",
          message,
        },
        { withCredentials: true }
      );

      const createdItem = response?.data?.item || null;
      if (createdItem) {
        setCourseQuestions((prev) => [createdItem, ...prev]);
      } else {
        await fetchCourseQuestions(normalizedCourseId);
      }

      setQuestionForm((prev) => ({ ...prev, message: "" }));
      toast.success(response?.data?.message || "Question sent to faculty");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send question");
    } finally {
      setIsQuestionSending(false);
    }
  };

  const filteredCourseQuestions = useMemo(() => {
    if (!questionDateTimeFilter) return courseQuestions;
    const selectedTs = new Date(questionDateTimeFilter).getTime();
    if (Number.isNaN(selectedTs)) return courseQuestions;

    return courseQuestions.filter((entry) => {
      const messageTs = new Date(
        entry?.lastMessageAt || entry?.updatedAt || entry?.createdAt || ""
      ).getTime();
      if (Number.isNaN(messageTs)) return false;
      return messageTs <= selectedTs;
    });
  }, [courseQuestions, questionDateTimeFilter]);

  const resolvedCourses = useMemo(() => {
    if (Array.isArray(coursesData) && coursesData.length > 0) {
      return coursesData.map((course) => {
        const mappedCourse = {
          id: course.id,
          courseCode: course.courseCode || "N/A",
          courseName: course.courseName || "Course",
          semester: course.semester ? `Sem ${course.semester}` : "N/A",
          credits: course.credits !== undefined ? `${course.credits} Credits` : "N/A",
          // courseType: course.courseType || "N/A",
          faculty: course.instructor || "N/A",
          schedule: course.schedule || "Schedule Not Available",
          room: course.room || "Room N/A",
          assignments:
            Number(course.assignmentsCount) ||
            (Array.isArray(course.assignments) ? course.assignments.length : 0),
          status: course.status || "N/A",
          assignmentItems: Array.isArray(course.assignments) ? course.assignments : [],
          raw: course,
        };

        const courseId = normalizeCourseId(mappedCourse);
        const cached = courseContentCache?.[courseId];
        return cached ? hydrateCourseWithContent(mappedCourse, cached) : mappedCourse;
      });
    }
    return [];
  }, [coursesData, courseContentCache]);

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
          _id: item?._id || item?.id || `assignment-${index + 1}`,
          courseCode: activeAssignmentCourse?.courseCode || "N/A",
          courseName: activeAssignmentCourse?.courseName || "Course",
          title: item?.title || item?.name || "Untitled assignment",
          category: item?.category || item?.type || "Assignment",
          status: safeStatus,
          posted: formatDateTime(item?.postedAt || item?.createdAt),
          due: formatDateTime(item?.dueDate || item?.dueAt),
          postedAt: item?.postedAt || item?.createdAt || null,
          dueDate: item?.dueDate || item?.dueAt || null,
          duration: item?.duration || null,
          message: item?.message || "",
          cta: item?.cta || "View Assignment",
          grade: item?.grade || null,
          description: item?.description || "",
          instructions: item?.instructions || item?.description || "",
          fileUrl: item?.fileUrl || "",
          fileName: item?.fileName || "",
          originalFileName: item?.originalFileName || "",
          fileSize: item?.fileSize || 0,
          attachments: Array.isArray(item?.attachments) ? item.attachments : [],
          submission: item?.submission || null,
          questionCount: item?.questionCount || null,
          facultyName: item?.facultyName || activeAssignmentCourse?.faculty || "Faculty",
        };
      })
      .filter((item) => {
        if (isQuizItem(item)) return false;
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

  const assignmentStatusCounts = useMemo(() => {
    const counters = { pending: 0, submitted: 0, graded: 0 };
    (activeAssignmentCourse?.assignmentItems || []).forEach((item) => {
      if (isQuizItem(item)) return;
      const status = String(item?.status || "pending").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counters, status)) {
        counters[status] += 1;
      } else {
        counters.pending += 1;
      }
    });
    return counters;
  }, [activeAssignmentCourse]);

  const activeCourseName =
    activeAssignmentCourse?.courseName || "Course Assignments";

  const detailData = useMemo(() => {
    if (!activeCourseDetail) return null;
    const raw = activeCourseDetail.raw || {};
    const resourceItems = Array.isArray(raw.resources) ? raw.resources : [];
    const syllabusResource = resolveSyllabusResource(raw);
    const questionBankItems = resolveQuestionBankResources(raw);
    const assignmentItems = Array.isArray(raw.assignments)
      ? raw.assignments
      : Array.isArray(activeCourseDetail.assignmentItems)
      ? activeCourseDetail.assignmentItems
      : [];
    const quizItems = assignmentItems
      .filter((item) => isQuizItem(item))
      .map((item, index) => ({
        id: item?._id || item?.id || `quiz-${index + 1}`,
        title: item?.title || item?.name || "Quiz",
        postedAt: item?.postedAt || item?.createdAt || null,
        dueAt: item?.dueDate || item?.dueAt || null,
        status: String(item?.status || "pending").toLowerCase(),
        fileUrl: item?.fileUrl || "",
        quizUrl: item?.quizUrl || "",
        url: item?.url || "",
        link: item?.link || "",
        href: item?.href || "",
        originalFileName: item?.originalFileName || item?.fileName || item?.title || "quiz",
      }));

    const isAssignmentCompleted = (item = {}) => {
      const status = String(item?.status || "").trim().toLowerCase();
      return Boolean(
        item?.isSubmitted ||
        item?.submittedAt ||
        item?.submission?.submittedAt ||
        status === "submitted" ||
        status === "graded" ||
        status === "completed" ||
        status === "done"
      );
    };

    const completedCount = assignmentItems.filter((item) => isAssignmentCompleted(item)).length;
    const progressValue =
      typeof raw.progress === "number"
        ? Math.min(100, Math.max(0, raw.progress))
        : assignmentItems.length > 0
        ? Math.round((completedCount / assignmentItems.length) * 100)
        : 0;

    const inferredTasks = assignmentItems
      .map((item) => {
        const dueValue = item?.dueDate || item?.dueAt || null;
        const dueDate = dueValue ? new Date(dueValue) : null;
        const dueTs =
          dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.getTime() : null;

        return {
          title: item?.title || item?.name || "Task",
          subtitle:
            dueTs === null
              ? "No deadline provided."
              : `Due ${formatDateTime(dueValue)}`,
          points:
            item?.questionCount
              ? `${item.questionCount} Q`
              : item?.category || item?.type || "-",
          isCompleted: isAssignmentCompleted(item),
          dueTs,
        };
      })
      .filter((task) => !task.isCompleted)
      .sort((a, b) => {
        if (a.dueTs === null && b.dueTs === null) return 0;
        if (a.dueTs === null) return 1;
        if (b.dueTs === null) return -1;
        return a.dueTs - b.dueTs;
      })
      .slice(0, 4)
      .map((task) => ({
        title: task.title,
        subtitle: task.subtitle,
        points: task.points,
      }));

    const taskItems =
      Array.isArray(raw.tasks) && raw.tasks.length > 0 ? raw.tasks : inferredTasks;
    const progressNote =
      String(raw.progressNote || "").trim() ||
      (assignmentItems.length > 0
        ? `${completedCount} of ${assignmentItems.length} tasks completed.`
        : "Progress tracking is enabled for this course.");

    return {
      badge: `${activeCourseDetail.courseCode} - ${activeCourseDetail.courseType || "COURSE"}`,
      title: activeCourseDetail.courseName,
      meta: `${activeCourseDetail.credits} - ${activeCourseDetail.semester}`,
      overview: raw.overview || "Course overview is not available from API.",
      resources: resourceItems,
      syllabusResource,
      questionBanks: questionBankItems,
      instructor: activeCourseDetail.faculty || "N/A",
      instructorRole: raw.instructorRole || "Faculty",
      room: activeCourseDetail.room,
      schedule: activeCourseDetail.schedule,
      progress: progressValue,
      progressNote,
      tasks: taskItems,
      quizzes: quizItems,
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
        onAssignmentSubmitted={handleAssignmentSubmitted}
      />
    );
  }

  if (activeCourseDetail && detailData) {
    const syllabusFileUrl = resolveResourceUrl(detailData.syllabusResource, apiBase);
    const isSyllabusAvailable = Boolean(syllabusFileUrl);
    const isDownloadingSyllabus = syllabusActionLoading === "download";
    const isViewingSyllabus = syllabusActionLoading === "view";
    const isSyllabusBusy = isDownloadingSyllabus || isViewingSyllabus;
    const activeCourseId = normalizeCourseId(activeCourseDetail);

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

        <div className="course-detail-columns">
          <div className="course-detail-column">
            <section className="course-detail-card course-detail-card-overview">
              <h4><FiFileText /> Course Overview</h4>
              <p className="course-overview-text">{detailData.overview}</p>
              <div className="course-overview-actions">
                <button
                  type="button"
                  className="course-detail-primary-btn"
                  onClick={() => {
                    void handleDownloadSyllabus(detailData.syllabusResource);
                  }}
                  disabled={!isSyllabusAvailable || isSyllabusBusy}
                  title={isSyllabusAvailable ? "Download syllabus PDF" : "Syllabus not available"}
                >
                  {isDownloadingSyllabus ? (
                    <ClipLoader size={12} color="#ffffff" trackColor="rgba(255, 255, 255, 0.25)" />
                  ) : (
                    <>
                      <FiDownload /> Download Syllabus
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="course-detail-icon-btn"
                  onClick={() => {
                    handleViewSyllabus(detailData.syllabusResource);
                  }}
                  disabled={!isSyllabusAvailable || isSyllabusBusy}
                  title={isSyllabusAvailable ? "View syllabus file" : "Syllabus not available"}
                >
                  {isViewingSyllabus ? (
                    <ClipLoader size={12} color="#1f7bd8" trackColor="rgba(31, 123, 216, 0.25)" />
                  ) : (
                    <FiEye />
                  )}
                </button>
              </div>
            </section>

            <section className="course-detail-card course-detail-card-question-banks">
              <h4><FiFolder /> Question Banks</h4>
              <div className="course-resource-list">
                {detailData.questionBanks.length === 0 ? (
                  <p className="no-courses">No question bank files available from API.</p>
                ) : (
                  detailData.questionBanks.map((questionBank, index) => {
                    const isFileAvailable = Boolean(resolveResourceUrl(questionBank, apiBase));
                    const itemId = `question-bank-${String(questionBank?._id || questionBank?.id || index)}`;
                    const isViewing =
                      resourceLoading.resourceId === itemId &&
                      resourceLoading.action === "view";
                    const isDownloading =
                      resourceLoading.resourceId === itemId &&
                      resourceLoading.action === "download";
                    const isBusy = isViewing || isDownloading;

                    return (
                      <article
                        key={questionBank.id || questionBank._id || `question-bank-${index + 1}`}
                        className="course-resource-item"
                      >
                        <div>
                          <strong>{questionBank.name || questionBank.title || "Question bank"}</strong>
                          <small>{formatDateTime(questionBank.date || questionBank.createdAt)}</small>
                        </div>
                        <div className="course-resource-actions">
                          <button
                            type="button"
                            onClick={() => handleOpenResource(questionBank, itemId)}
                            disabled={!isFileAvailable || isBusy}
                            title={isFileAvailable ? "View file" : "File not available"}
                          >
                            {isViewing ? (
                              <ClipLoader
                                size={12}
                                color="#0f4e98"
                                trackColor="rgba(15, 78, 152, 0.2)"
                              />
                            ) : (
                              <FiEye />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDownloadResource(questionBank, itemId);
                            }}
                            disabled={!isFileAvailable || isBusy}
                            title={isFileAvailable ? "Download file" : "File not available"}
                          >
                            {isDownloading ? (
                              <ClipLoader
                                size={12}
                                color="#0f4e98"
                                trackColor="rgba(15, 78, 152, 0.2)"
                              />
                            ) : (
                              <FiDownload />
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
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
          </div>

          <div className="course-detail-column">
            <section className="course-detail-card course-detail-card-resources">
              <h4><FiFolder /> Course Resources</h4>
              <div className="course-resource-list">
                {detailData.resources.length === 0 ? (
                  <p className="no-courses">No resources available from API.</p>
                ) : (
                  detailData.resources.map((resource, index) => {
                    const isFileAvailable = Boolean(resolveResourceUrl(resource, apiBase));
                    const resourceId = String(resource?._id || resource?.id || index);
                    const isViewingResource =
                      resourceLoading.resourceId === resourceId &&
                      resourceLoading.action === "view";
                    const isDownloadingResource =
                      resourceLoading.resourceId === resourceId &&
                      resourceLoading.action === "download";
                    const isResourceBusy = isViewingResource || isDownloadingResource;
                    return (
                      <article
                        key={resource.id || resource._id || `resource-${index + 1}`}
                        className="course-resource-item"
                      >
                        <div>
                          <strong>{resource.name || resource.title || "Resource"}</strong>
                          <small>{formatDateTime(resource.date || resource.createdAt)}</small>
                        </div>
                        <div className="course-resource-actions">
                          <button
                            type="button"
                            onClick={() => handleOpenResource(resource, resourceId)}
                            disabled={!isFileAvailable || isResourceBusy}
                            title={isFileAvailable ? "View file" : "File not available"}
                          >
                            {isViewingResource ? (
                              <ClipLoader
                                size={12}
                                color="#0f4e98"
                                trackColor="rgba(15, 78, 152, 0.2)"
                              />
                            ) : (
                              <FiEye />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDownloadResource(resource, resourceId);
                            }}
                            disabled={!isFileAvailable || isResourceBusy}
                            title={isFileAvailable ? "Download file" : "File not available"}
                          >
                            {isDownloadingResource ? (
                              <ClipLoader
                                size={12}
                                color="#0f4e98"
                                trackColor="rgba(15, 78, 152, 0.2)"
                              />
                            ) : (
                              <FiDownload />
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="course-detail-card course-detail-card-quizzes">
              <h4><FiSliders /> Quizzes</h4>
              <div className="course-resource-list">
                {detailData.quizzes.length === 0 ? (
                  <p className="no-courses">No quizzes available.</p>
                ) : (
                  detailData.quizzes.map((quiz, index) => {
                    const quizFileUrl = resolveResourceUrl(quiz, apiBase);
                    const quizId = String(quiz?.id || index);
                    const isViewingQuiz =
                      resourceLoading.resourceId === `quiz-${quizId}` &&
                      resourceLoading.action === "view";
                    const isDownloadingQuiz =
                      resourceLoading.resourceId === `quiz-${quizId}` &&
                      resourceLoading.action === "download";
                    const isQuizBusy = isViewingQuiz || isDownloadingQuiz;

                    return (
                      <article key={quiz.id || `quiz-${index + 1}`} className="course-resource-item">
                        <div>
                          <strong>{quiz.title}</strong>
                          <small>
                            Posted: {formatDateTime(quiz.postedAt)} | Due: {formatDateTime(quiz.dueAt)}
                          </small>
                        </div>
                        <div className="course-resource-actions">
                          <button
                            type="button"
                            onClick={() => {
                              if (quizFileUrl) {
                                handleOpenResource(quiz, `quiz-${quizId}`);
                              } else {
                                handleQuizClick();
                              }
                            }}
                            disabled={isQuizBusy}
                            title={quizFileUrl ? "Open quiz" : "Open quiz details"}
                          >
                            {isViewingQuiz ? (
                              <ClipLoader size={12} color="#0f4e98" trackColor="rgba(15, 78, 152, 0.2)" />
                            ) : (
                              <FiEye />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDownloadResource(quiz, `quiz-${quizId}`);
                            }}
                            disabled={!quizFileUrl || isQuizBusy}
                            title={quizFileUrl ? "Download quiz file" : "File not available"}
                          >
                            {isDownloadingQuiz ? (
                              <ClipLoader size={12} color="#0f4e98" trackColor="rgba(15, 78, 152, 0.2)" />
                            ) : (
                              <FiDownload />
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
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
                onClick={() => {
                  setShowMessageModal(true);
                  setQuestionForm((prev) => ({
                    ...prev,
                    subject:
                      prev.subject || `${detailData.title || "Course"} - Doubt`,
                  }));
                  setQuestionDateTimeFilter("");
                  void fetchCourseQuestions(activeCourseId);
                }}
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
                        &times;
                      </button>
                    </header>
                    <label>Subject</label>
                    <input
                      type="text"
                      placeholder="Assignment question"
                      value={questionForm.subject}
                      onChange={(e) =>
                        setQuestionForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                    />
                    <label>Message</label>
                    <textarea
                      rows="4"
                      placeholder="Write your message here"
                      value={questionForm.message}
                      onChange={(e) =>
                        setQuestionForm((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                    />
                    <label>Date & Time Filter</label>
                    <input
                      type="datetime-local"
                      value={questionDateTimeFilter}
                      onChange={(e) => setQuestionDateTimeFilter(e.target.value)}
                    />
                    <div className="message-thread">
                      <p className="message-thread-title">Previous Messages</p>
                      {questionDateTimeFilter ? (
                        <p className="message-thread-filter-note">
                          Showing messages up to {formatDateTime(questionDateTimeFilter)}
                        </p>
                      ) : null}
                      {isQuestionLoading ? (
                        <p className="message-thread-empty">Loading...</p>
                      ) : filteredCourseQuestions.length === 0 ? (
                        <p className="message-thread-empty">No messages yet.</p>
                      ) : (
                        filteredCourseQuestions.map((entry) => (
                          <article
                            key={entry?._id || entry?.id}
                            className="message-thread-item"
                          >
                            <strong>{entry?.subject || "Course Query"}</strong>
                            <p>{entry?.question || "No question text."}</p>
                            <small>{formatDateTime(entry?.createdAt)}</small>
                            {entry?.latestFacultyReply ? (
                              <div className="message-thread-reply">
                                <span>Faculty Reply</span>
                                <p>{entry.latestFacultyReply}</p>
                              </div>
                            ) : null}
                          </article>
                        ))
                      )}
                    </div>
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
                        onClick={() => {
                          void submitQuestionToFaculty(activeCourseId);
                        }}
                        disabled={isQuestionSending}
                      >
                        {isQuestionSending ? "Sending..." : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    );
  }
  if (activeAssignmentCourse) {
    return (
      <section className="student-assignments-page">
        <header className="assignment-header-card">
          <button
            type="button"
            className="assignment-back-btn"
            onClick={() => setActiveAssignmentCourse(null)}
            aria-label="Back to courses"
          >
            <FiArrowLeft />
          </button>

          <div className="assignment-header-copy">
            <h3>{activeCourseName}</h3>
            <p>Assignments</p>
          </div>

          <div className="assignment-filter-wrap">
            <button
              type="button"
              className={`assignment-filter-btn ${showSortMenu ? "active" : ""}`}
              onClick={() => setShowSortMenu((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={showSortMenu}
            >
              <FiFilter />
              <span>Sort</span>
              <FiChevronDown className={`assignment-filter-caret ${showSortMenu ? "open" : ""}`} />
            </button>

            {showSortMenu && (
              <div className="assignment-filter-menu" role="menu">
                <button
                  type="button"
                  className={sortOrder === "asc" ? "active" : ""}
                  onClick={() => {
                    setSortOrder("asc");
                    setShowSortMenu(false);
                  }}
                  role="menuitem"
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
                  role="menuitem"
                >
                  Z - A
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="assignment-status-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={selectedStatus === tab.id ? "active" : ""}
              onClick={() => setSelectedStatus(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{assignmentStatusCounts[tab.id] || 0}</small>
            </button>
          ))}
        </div>

        <div
          className={`assignment-cards-grid ${selectedStatus} ${
            assignmentsToShow.length === 0 ? "is-empty" : ""
          }`}
        >
          {assignmentsToShow.length === 0 ? (
            <article className="assignment-empty-state">
              <img
                src={emptyStateIllustration}
                alt="No assignments"
                loading="lazy"
              />
              <h4>Oppss....</h4>
              <p>No {selectedStatus} assignment found.</p>
              <small>Please check other tabs or wait for faculty updates.</small>
            </article>
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

                {item.cta && (
                  <button
                    type="button"
                    className="assignment-open-btn"
                    onClick={() => handleAssignmentClick(item)}
                  >
                    <span>{item.cta || "View Assignment"}</span>
                    <FiArrowRight />
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
      <header className="student-courses-header">
        <div className="student-courses-header-copy">
          <h3>My Courses</h3>
          <p>{academicInfoLabel}</p>
        </div>
        <div className="student-courses-header-actions">
          <label className="student-courses-search" aria-label="Search courses">
            <FiSearch className="student-courses-search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by code, name, faculty..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
          <span className="student-courses-count" aria-label="Course count">
            {filteredCourses.length} Courses
          </span>
        </div>
      </header>

      <div className="courses-grid">
        {filteredCourses.length === 0 ? (
          <div className="student-courses-empty" role="status" aria-live="polite">
            <div className="student-courses-empty-icon" aria-hidden="true">
              <FiBookOpen />
            </div>
            <p className="student-courses-empty-title">No matching courses</p>
            <p className="student-courses-empty-subtitle">
              Try a different keyword (course code, name, or faculty).
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const courseId = normalizeCourseId(course);
            const detailsLoading =
              activeLoading.action === "details" && activeLoading.courseId === courseId;
            const assignmentsLoading =
              activeLoading.action === "assignments" && activeLoading.courseId === courseId;
            const isAnyLoading = detailsLoading || assignmentsLoading;

            return (
              <article key={course.id} className="course-card">
                <div className="course-card-head">
                  <div className="course-card-title">
                    <h4 title={course.courseName}>{course.courseName}</h4>
                    <p className="course-code">{course.courseCode}</p>
                  </div>
                  <span className="course-status-chip">{course.status}</span>
                </div>

	                <div className="course-chip-row" aria-label="Course metadata">
	                  {[course.semester, course.credits, course.courseType]
	                    .map((badge) => String(badge || "").trim())
	                    .filter(
	                      (badge) =>
	                        badge &&
	                        !["n/a", "na", "none", "-", "null", "undefined"].includes(
	                          badge.toLowerCase()
	                        )
	                    )
	                    .map((badge, index) => (
	                      <span key={`${course.id}-chip-${index}`} className="course-chip">
	                        {badge}
	                      </span>
	                    ))}
	                </div>

                <div className="course-card-kv">
                  <div className="course-kv">
                    <span className="course-kv-label">Faculty</span>
                    <span className="course-kv-value">{course.faculty}</span>
                  </div>
                  <div className="course-kv">
                    <span className="course-kv-label">Room</span>
                    <span className="course-kv-value">{course.room}</span>
                  </div>
                  <div className="course-kv">
                    <span className="course-kv-label">Schedule</span>
                    <span className="course-kv-value">{course.schedule}</span>
                  </div>
                </div>

                <div className="course-actions">
                  <button
                    type="button"
                    className="course-btn course-btn-primary"
                    onClick={() => openCourseDetails(course)}
                    disabled={isAnyLoading}
                  >
                    {detailsLoading ? (
                      <>
                        <ClipLoader size={14} color="#ffffff" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <FiEye />
                        <span>Details</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="course-btn course-btn-muted"
                    onClick={() => openCourseAssignments(course)}
                    disabled={isAnyLoading}
                  >
                    {assignmentsLoading ? (
                      <>
                        <ClipLoader
                          size={14}
                          color="#0f172a"
                          trackColor="rgba(15, 23, 42, 0.2)"
                        />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <FiFileText />
                        <span>Assignments</span>
                        <span className="course-btn-count">
                          {Array.isArray(course.assignmentItems)
                            ? course.assignmentItems.filter((item) => !isQuizItem(item)).length
                            : course.assignments}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CoursesDetails;
