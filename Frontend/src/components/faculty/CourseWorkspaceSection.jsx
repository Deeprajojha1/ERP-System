import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  ClipboardList,
  HelpCircle,
  FolderOpen,
  MessageSquare,
  Plus,
  Loader2,
  ExternalLink,
  Send,
  Upload,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../../utils/axiosInstance";
import { facultyUi } from "./uiTokens";

const TABS = [
  { id: "materials", label: "Materials", icon: FileText },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle },
  { id: "syllabus", label: "Syllabus", icon: BookOpen },
  { id: "questionbanks", label: "Question Bank", icon: FolderOpen },
  { id: "queries", label: "Student Queries", icon: MessageSquare },
];

const EMPTY_TEXT = {
  materials: {
    title: "No materials available",
    subtitle: "Upload lecture notes, PPTs, PDFs, and references for students.",
    action: "Upload Material",
  },
  assignments: {
    title: "No assignments created",
    subtitle: "Create assignments with due dates and instructions.",
    action: "Create Assignment",
  },
  quizzes: {
    title: "No quizzes created",
    subtitle: "Create quick assessments for revision and evaluation.",
    action: "Create Quiz",
  },
  syllabus: {
    title: "No syllabus uploaded",
    subtitle: "Upload the latest syllabus for students and course tracking.",
    action: "Upload Syllabus",
  },
  questionbanks: {
    title: "No question bank uploaded",
    subtitle: "Upload question bank files for practice and exam preparation.",
    action: "Upload Question Bank",
  },
  queries: {
    title: "No student queries yet",
    subtitle: "Student doubts and questions will appear here.",
    action: "Refresh Queries",
  },
};

const INITIAL_FORM_STATE = {
  title: "",
  description: "",
  dueDate: "",
  questions: "",
  file: null,
};

const ACCEPT_BY_TAB = {
  materials: ".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp",
  assignments: ".pdf,.doc,.docx,.txt",
  quizzes: ".pdf,.doc,.docx,.csv,.xlsx",
  syllabus: ".pdf,.doc,.docx,.txt",
  questionbanks: ".pdf,.doc,.docx,.txt",
};

const createEmptyItems = () => ({
  materials: [],
  assignments: [],
  quizzes: [],
  syllabus: [],
  questionbanks: [],
  queries: [],
});

const createLoadFlags = () => ({
  materials: false,
  assignments: false,
  quizzes: false,
  syllabus: false,
  questionbanks: false,
  queries: false,
});

const buildMessageFromError = (error, fallback) =>
  error?.response?.data?.message || fallback;

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const deriveUnitKey = (item) => {
  const title = String(item?.title || "");
  const description = String(item?.description || "");
  const haystack = `${title} ${description}`;
  const match = haystack.match(/\bunit\s*[-: ]*\s*(\d+)\b/i);
  if (match?.[1]) return `Unit ${match[1]}`;
  return "Unassigned";
};

const toSubmissionId = (item = {}) => String(item?._id || item?.id || "");
const toAssignmentId = (item = {}) => String(item?._id || item?.id || "");
const toStudentId = (item = {}) =>
  String(item?.student?._id || item?.student?.id || item?.studentId || "").trim();

export default function CourseWorkspaceSection({ course, onBack }) {
  const apiBase = useSelector((state) => state.config.apiBase);

  const [activeTab, setActiveTab] = useState("materials");
  const [currentView, setCurrentView] = useState("list");
  const [isCreating, setIsCreating] = useState(false);
  const [itemsByTab, setItemsByTab] = useState(createEmptyItems);
  const [tabLoading, setTabLoading] = useState(createLoadFlags);
  const [tabsLoaded, setTabsLoaded] = useState(createLoadFlags);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [queryReplyDrafts, setQueryReplyDrafts] = useState({});
  const [replyingQueryId, setReplyingQueryId] = useState("");
  const [assignmentSubmissionsByAssignment, setAssignmentSubmissionsByAssignment] = useState({});
  const [assignmentSubmissionsLoading, setAssignmentSubmissionsLoading] = useState(false);
  const [selectedAssignmentStudentId, setSelectedAssignmentStudentId] = useState("all");
  const [selectedAssignmentUnit, setSelectedAssignmentUnit] = useState("all"); // all | <unitKey>
  const [assignmentSubmissionFilter, setAssignmentSubmissionFilter] = useState("all"); // all | graded | missing
  const [courseStudents, setCourseStudents] = useState([]);
  const [courseStudentsLoading, setCourseStudentsLoading] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [gradingSubmissionId, setGradingSubmissionId] = useState("");

  const courseId = useMemo(() => String(course?._id || ""), [course?._id]);
  const isActiveTabLoading = Boolean(tabLoading[activeTab]);

  const loadAssignmentSubmissions = useCallback(async () => {
    if (!apiBase || !courseId) return;

    setAssignmentSubmissionsLoading(true);
    try {
      const response = await axios.get(`${apiBase}/faculty/assignment-submissions`, {
        withCredentials: true,
        params: { courseId },
      });
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];

      const grouped = {};
      items.forEach((submission) => {
        const assignmentId = String(submission?.assignmentId || "").trim();
        if (!assignmentId) return;
        if (!grouped[assignmentId]) grouped[assignmentId] = [];
        grouped[assignmentId].push(submission);
      });

      setAssignmentSubmissionsByAssignment(grouped);
      setGradeDrafts((prev) => {
        const next = { ...prev };
        items.forEach((submission) => {
          const submissionId = toSubmissionId(submission);
          if (!submissionId) return;
          next[submissionId] = {
            marks:
              submission?.marks !== null && submission?.marks !== undefined
                ? String(submission.marks)
                : "",
            grade: submission?.grade || "",
            feedback: submission?.feedback || "",
          };
        });
        return next;
      });
    } catch (error) {
      toast.error(buildMessageFromError(error, "Failed to load assignment submissions"));
    } finally {
      setAssignmentSubmissionsLoading(false);
    }
  }, [apiBase, courseId]);

  const loadCourseStudents = useCallback(async () => {
    if (!apiBase || !courseId) return;
    setCourseStudentsLoading(true);
    try {
      const response = await axios.get(`${apiBase}/faculty/courses/${courseId}/students`, {
        withCredentials: true,
      });
      const students = Array.isArray(response?.data?.students) ? response.data.students : [];
      setCourseStudents(students);
    } catch (error) {
      setCourseStudents([]);
      toast.error(buildMessageFromError(error, "Failed to load course students"));
    } finally {
      setCourseStudentsLoading(false);
    }
  }, [apiBase, courseId]);

  const handlePrimaryAction = () => {
    if (activeTab === "queries") {
      void loadCourseContent("queries");
      return;
    }
    setFormState(INITIAL_FORM_STATE);
    setCurrentView("form");
  };

  const handleBackToList = () => {
    if (isCreating) return;
    setCurrentView("list");
    setFormState(INITIAL_FORM_STATE);
  };

  const loadCourseContent = useCallback(
    async (tabId) => {
      if (!apiBase || !courseId || !tabId) return;

      setTabLoading((prev) => ({ ...prev, [tabId]: true }));
      try {
        const response =
          tabId === "queries"
            ? await axios.get(`${apiBase}/faculty/course-questions`, {
                withCredentials: true,
                params: { courseId },
              })
            : await axios.get(`${apiBase}/faculty/course-content`, {
                withCredentials: true,
                params: {
                  courseId,
                  type: tabId,
                },
              });

        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        setItemsByTab((prev) => ({ ...prev, [tabId]: items }));
        setTabsLoaded((prev) => ({ ...prev, [tabId]: true }));
        if (tabId === "assignments") {
          await loadAssignmentSubmissions();
        }
      } catch (error) {
        toast.error(
          buildMessageFromError(
            error,
            tabId === "queries" ? "Failed to load student queries" : "Failed to load course content"
          )
        );
      } finally {
        setTabLoading((prev) => ({ ...prev, [tabId]: false }));
      }
    },
    [apiBase, courseId, loadAssignmentSubmissions]
  );

  useEffect(() => {
    setItemsByTab(createEmptyItems());
    setTabsLoaded(createLoadFlags());
    setTabLoading(createLoadFlags());
    setActiveTab("materials");
    setCurrentView("list");
    setQueryReplyDrafts({});
    setReplyingQueryId("");
    setAssignmentSubmissionsByAssignment({});
    setAssignmentSubmissionsLoading(false);
    setSelectedAssignmentStudentId("all");
    setSelectedAssignmentUnit("all");
    setAssignmentSubmissionFilter("all");
    setCourseStudents([]);
    setCourseStudentsLoading(false);
    setGradeDrafts({});
    setGradingSubmissionId("");
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    void loadCourseStudents();
  }, [courseId, loadCourseStudents]);

  useEffect(() => {
    if (!tabsLoaded[activeTab]) {
      loadCourseContent(activeTab);
    }
  }, [activeTab, loadCourseContent, tabsLoaded]);

  const tabContent = EMPTY_TEXT[activeTab] || EMPTY_TEXT.materials;
  const currentItems = useMemo(() => itemsByTab[activeTab] || [], [activeTab, itemsByTab]);
  const assignmentUnits = useMemo(() => {
    if (activeTab !== "assignments") return [];
    const units = new Set();
    currentItems.forEach((item) => {
      units.add(deriveUnitKey(item));
    });
    return Array.from(units.values()).sort((a, b) => a.localeCompare(b));
  }, [activeTab, currentItems]);
  const assignmentStudents = useMemo(() => {
    if (Array.isArray(courseStudents) && courseStudents.length > 0) {
      return [...courseStudents].sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""))
      );
    }
    const map = new Map();
    Object.values(assignmentSubmissionsByAssignment).forEach((rows) => {
      if (!Array.isArray(rows)) return;
      rows.forEach((submission) => {
        const studentId = toStudentId(submission);
        if (!studentId || map.has(studentId)) return;
        map.set(studentId, {
          id: studentId,
          name: submission?.student?.name || "Student",
          email: submission?.student?.email || "",
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignmentSubmissionsByAssignment, courseStudents]);
  const assignmentStudentStatusByUnit = useMemo(() => {
    if (activeTab !== "assignments" || selectedAssignmentUnit === "all") return new Map();

    const unitAssignments = currentItems.filter(
      (item) => deriveUnitKey(item) === selectedAssignmentUnit
    );
    const assignmentIds = unitAssignments.map((item) => toAssignmentId(item)).filter(Boolean);
    const dueDates = new Map(
      unitAssignments
        .map((item) => [toAssignmentId(item), item?.dueDate])
        .filter(([id]) => Boolean(id))
    );

    const now = Date.now();

    const statusMap = new Map();
    assignmentStudents.forEach((student) => {
      const studentId = String(student?.id || "").trim();
      if (!studentId) return;

      let hasSubmitted = false;
      let hasGraded = false;
      let hasMissing = false;

      assignmentIds.forEach((assignmentId) => {
        const rows = assignmentSubmissionsByAssignment[assignmentId] || [];
        const row = rows.find((s) => toStudentId(s) === studentId);
        if (row) {
          hasSubmitted = true;
          if (String(row?.status || "").toLowerCase() === "graded") {
            hasGraded = true;
          }
          return;
        }

        const dueRaw = dueDates.get(assignmentId);
        const due = dueRaw ? new Date(dueRaw) : null;
        if (due && !Number.isNaN(due.getTime()) && now > due.getTime()) {
          hasMissing = true;
        }
      });

      const status = hasGraded
        ? "Graded"
        : hasSubmitted
          ? "Submitted"
          : hasMissing
            ? "Missing"
            : "Pending";
      statusMap.set(studentId, status);
    });

    return statusMap;
  }, [
    activeTab,
    assignmentStudents,
    assignmentSubmissionsByAssignment,
    currentItems,
    selectedAssignmentUnit,
  ]);
  const matchesAssignmentSubmissionFilters = useCallback(
    (submission) => {
      if (
        selectedAssignmentStudentId !== "all" &&
        toStudentId(submission) !== selectedAssignmentStudentId
      ) {
        return false;
      }

      if (assignmentSubmissionFilter === "graded") {
        return String(submission?.status || "").toLowerCase() === "graded";
      }
      if (assignmentSubmissionFilter === "missing") {
        return false;
      }
      return true;
    },
    [assignmentSubmissionFilter, selectedAssignmentStudentId]
  );
  const getMissingStudentsForAssignment = useCallback(
    (assignmentItem) => {
      const dueDateRaw = assignmentItem?.dueDate;
      const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
      if (!dueDate || Number.isNaN(dueDate.getTime())) return [];
      if (Date.now() <= dueDate.getTime()) return [];

      const assignmentId = toAssignmentId(assignmentItem);
      const rows = assignmentSubmissionsByAssignment[assignmentId] || [];
      const submittedUserIds = new Set(rows.map((row) => toStudentId(row)).filter(Boolean));

      const baseMissing = assignmentStudents.filter((student) => !submittedUserIds.has(student.id));
      if (selectedAssignmentStudentId !== "all") {
        return baseMissing.filter((student) => student.id === selectedAssignmentStudentId);
      }
      return baseMissing;
    },
    [assignmentStudents, assignmentSubmissionsByAssignment, selectedAssignmentStudentId]
  );
  const visibleItems = useMemo(() => {
    if (activeTab !== "assignments") {
      return currentItems;
    }

    const byUnit =
      selectedAssignmentUnit === "all"
        ? currentItems
        : currentItems.filter((item) => deriveUnitKey(item) === selectedAssignmentUnit);

    if (selectedAssignmentStudentId === "all" && assignmentSubmissionFilter === "all") {
      return byUnit;
    }

    return byUnit.filter((item) => {
      const assignmentId = toAssignmentId(item);
      const rows = assignmentSubmissionsByAssignment[assignmentId] || [];
      if (assignmentSubmissionFilter === "missing") {
        return getMissingStudentsForAssignment(item).length > 0;
      }
      return rows.some(matchesAssignmentSubmissionFilters);
    });
  }, [
    activeTab,
    assignmentSubmissionFilter,
    assignmentSubmissionsByAssignment,
    currentItems,
    getMissingStudentsForAssignment,
    matchesAssignmentSubmissionFilters,
    selectedAssignmentUnit,
    selectedAssignmentStudentId,
  ]);
  const isAssignmentFilteredEmpty =
    activeTab === "assignments" &&
    (selectedAssignmentStudentId !== "all" ||
      assignmentSubmissionFilter !== "all" ||
      selectedAssignmentUnit !== "all") &&
    currentItems.length > 0 &&
    visibleItems.length === 0;
  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label || activeTab;

  useEffect(() => {
    if (selectedAssignmentStudentId === "all") return;
    const hasSelectedStudent = assignmentStudents.some(
      (student) => student.id === selectedAssignmentStudentId
    );
    if (!hasSelectedStudent) {
      setSelectedAssignmentStudentId("all");
    }
  }, [assignmentStudents, selectedAssignmentStudentId]);

  const handleReplyToQuery = async (queryId) => {
    const trimmedId = String(queryId || "").trim();
    if (!trimmedId || !apiBase) return;

    const message = String(queryReplyDrafts[trimmedId] || "").trim();
    if (!message) {
      toast.error("Please enter a reply message");
      return;
    }

    setReplyingQueryId(trimmedId);
    try {
      const response = await axios.post(
        `${apiBase}/faculty/course-questions/${trimmedId}/reply`,
        { message },
        { withCredentials: true }
      );

      const updatedItem = response?.data?.item || null;
      if (updatedItem) {
        setItemsByTab((prev) => ({
          ...prev,
          queries: (prev.queries || []).map((entry) =>
            String(entry?._id || entry?.id || "") === trimmedId ? updatedItem : entry
          ),
        }));
      } else {
        await loadCourseContent("queries");
      }

      setQueryReplyDrafts((prev) => ({ ...prev, [trimmedId]: "" }));
      toast.success(response?.data?.message || "Reply sent");
    } catch (error) {
      toast.error(buildMessageFromError(error, "Failed to send reply"));
    } finally {
      setReplyingQueryId("");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!apiBase) {
      toast.error("API base URL is not configured");
      return;
    }

    if (!courseId) {
      toast.error("Course not found");
      return;
    }

    if (!formState.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (
      (activeTab === "materials" ||
        activeTab === "syllabus" ||
        activeTab === "questionbanks") &&
      !formState.file
    ) {
      toast.error(
        activeTab === "syllabus"
          ? "Please select a syllabus file"
          : activeTab === "questionbanks"
          ? "Please select a question bank file"
          : "Please select a file"
      );
      return;
    }

    if (activeTab === "assignments" && !formState.dueDate) {
      toast.error("Due date is required for assignments");
      return;
    }

    if (activeTab === "quizzes" && formState.questions && Number(formState.questions) < 1) {
      toast.error("Questions must be at least 1");
      return;
    }

    const formData = new FormData();
    formData.append("courseId", courseId);
    formData.append("type", activeTab);
    formData.append("title", formState.title.trim());
    formData.append("description", formState.description.trim());

    if (formState.dueDate) {
      formData.append("dueDate", formState.dueDate);
    }

    if (activeTab === "quizzes" && formState.questions) {
      formData.append("questions", String(formState.questions));
    }

    if (formState.file) {
      formData.append("file", formState.file);
    }

    setIsCreating(true);
    try {
      const response = await axios.post(`${apiBase}/faculty/course-content`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const createdItem = response?.data?.item || null;
      if (createdItem) {
        setItemsByTab((prev) => ({
          ...prev,
          [activeTab]: [createdItem, ...(prev[activeTab] || [])],
        }));
        setTabsLoaded((prev) => ({ ...prev, [activeTab]: true }));
      } else {
        await loadCourseContent(activeTab);
      }

      toast.success(response?.data?.message || "Saved successfully");
      setCurrentView("list");
      setFormState(INITIAL_FORM_STATE);
    } catch (error) {
      toast.error(buildMessageFromError(error, "Failed to save content"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleGradeDraftChange = (submissionId, field, value) => {
    if (!submissionId || !field) return;
    setGradeDrafts((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || { marks: "", grade: "", feedback: "" }),
        [field]: value,
      },
    }));
  };

  const handleSaveSubmissionGrade = async (submission) => {
    const submissionId = toSubmissionId(submission);
    if (!submissionId || !apiBase) return;
    if (String(submission?.status || "").toLowerCase() === "graded") {
      toast.error("Already graded. Changes are locked.");
      return;
    }

    const draft = gradeDrafts[submissionId] || {
      marks: "",
      grade: "",
      feedback: "",
    };
    const marksRaw = String(draft.marks ?? "").trim();
    const hasMarks = marksRaw !== "";
    const marksValue = hasMarks ? Number(marksRaw) : null;
    if (!hasMarks) {
      toast.error("Please enter marks before saving grade");
      return;
    }
    if (hasMarks && (!Number.isFinite(marksValue) || marksValue < 0)) {
      toast.error("Marks must be a valid non-negative number");
      return;
    }

    const grade = String(draft.grade || "").trim();
    const feedback = String(draft.feedback || "").trim();
    if (!hasMarks && !grade && !feedback) {
      toast.error("Add marks, grade, or feedback before saving");
      return;
    }

    setGradingSubmissionId(submissionId);
    try {
      const response = await axios.post(
        `${apiBase}/faculty/assignment-submissions/${submissionId}/grade`,
        {
          marks: hasMarks ? marksValue : null,
          grade,
          feedback,
        },
        { withCredentials: true }
      );

      const updated = response?.data?.item || null;
      if (updated) {
        const assignmentId = String(updated.assignmentId || "").trim();
        setAssignmentSubmissionsByAssignment((prev) => {
          const next = { ...prev };
          const rows = Array.isArray(next[assignmentId]) ? next[assignmentId] : [];
          let found = false;
          next[assignmentId] = rows.map((row) => {
            const rowId = toSubmissionId(row);
            if (rowId === submissionId) {
              found = true;
              return updated;
            }
            return row;
          });
          if (!found) {
            next[assignmentId] = [updated, ...rows];
          }
          return next;
        });
        setGradeDrafts((prev) => ({
          ...prev,
          [submissionId]: {
            marks:
              updated?.marks !== null && updated?.marks !== undefined
                ? String(updated.marks)
                : "",
            grade: updated?.grade || "",
            feedback: updated?.feedback || "",
          },
        }));
      }

      toast.success(response?.data?.message || "Grade saved successfully");
    } catch (error) {
      toast.error(buildMessageFromError(error, "Failed to save grade"));
    } finally {
      setGradingSubmissionId("");
    }
  };

  const handleMoveMissingToNotGraded = async (assignmentItem, student) => {
    if (!apiBase) return;
    const assignmentId = toAssignmentId(assignmentItem);
    const studentId = String(student?.id || "").trim();
    if (!assignmentId || !studentId) return;

    setGradingSubmissionId(`${assignmentId}:${studentId}`);
    try {
      const response = await axios.post(
        `${apiBase}/faculty/assignment-submissions/missing`,
        {
          assignmentId,
          studentId,
          feedback: "Missing submission",
        },
        { withCredentials: true }
      );

      const created = response?.data?.item || null;
      if (created) {
        const createdAssignmentId = String(created.assignmentId || assignmentId).trim();
        const createdId = toSubmissionId(created);
        setAssignmentSubmissionsByAssignment((prev) => {
          const next = { ...prev };
          const rows = Array.isArray(next[createdAssignmentId]) ? next[createdAssignmentId] : [];
          if (!createdId) {
            next[createdAssignmentId] = [created, ...rows];
            return next;
          }
          if (rows.some((row) => toSubmissionId(row) === createdId)) {
            return next;
          }
          next[createdAssignmentId] = [created, ...rows];
          return next;
        });
        setGradeDrafts((prev) => ({
          ...prev,
          [createdId]: {
            marks: "0",
            grade: "",
            feedback: "Missing submission",
          },
        }));
      } else {
        await loadAssignmentSubmissions();
      }

      toast.success(response?.data?.message || "Moved to not graded");
    } catch (error) {
      toast.error(buildMessageFromError(error, "Failed to mark missing submission"));
    } finally {
      setGradingSubmissionId("");
    }
  };

  if (currentView === "form") {
    return (
      <section className={facultyUi.page}>
        <div className={facultyUi.pageHeader}>
          <h2 className={facultyUi.title}>
            {tabContent.action}
          </h2>
          <p className={facultyUi.subtitle}>
            {course?.courseName || "Course"} | {course?.code || "N/A"}
          </p>
        </div>

        <div className={`${facultyUi.panel} mx-auto w-full max-w-2xl`}>
          <button
            type="button"
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleBackToList}
            disabled={isCreating}
          >
            <ArrowLeft size={16} />
            <span>Back to {activeTabLabel}</span>
          </button>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="content-title" className="text-sm font-semibold text-slate-700">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="content-title"
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                value={formState.title}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter title"
                required
                disabled={isCreating}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="content-description" className="text-sm font-semibold text-slate-700">
                Description
              </label>
              <textarea
                id="content-description"
                className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                value={formState.description}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Write details (optional)"
                disabled={isCreating}
              />
            </div>

            {(activeTab === "materials" ||
              activeTab === "assignments" ||
              activeTab === "quizzes" ||
              activeTab === "syllabus" ||
              activeTab === "questionbanks") && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="content-file" className="text-sm font-semibold text-slate-700">
                  {activeTab === "materials" ||
                  activeTab === "syllabus" ||
                  activeTab === "questionbanks" ? (
                    <>
                      {activeTab === "syllabus"
                        ? "Upload Syllabus File"
                        : activeTab === "questionbanks"
                        ? "Upload Question Bank File"
                        : "Upload File"}{" "}
                      <span className="text-rose-500">*</span>
                    </>
                  ) : (
                    "Attach File (Optional)"
                  )}
                </label>
                <input
                  id="content-file"
                  type="file"
                  className="sr-only"
                  accept={ACCEPT_BY_TAB[activeTab] || "*"}
                  required={
                    activeTab === "materials" ||
                    activeTab === "syllabus" ||
                    activeTab === "questionbanks"
                  }
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      file: e.target.files?.[0] || null,
                    }))
                  }
                  disabled={isCreating}
                />
                <div className="flex w-full items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <span className="flex-1 truncate px-3 py-2 text-sm text-slate-600">
                    {formState.file
                      ? formState.file.name
                      : activeTab === "syllabus"
                      ? "No syllabus file selected"
                      : activeTab === "questionbanks"
                      ? "No question bank file selected"
                      : "No file selected"}
                  </span>
                  <label
                    htmlFor="content-file"
                    className={`inline-flex items-center gap-2 border-l border-slate-300 px-3 py-2 text-sm font-semibold text-white ${
                      isCreating
                        ? "cursor-not-allowed bg-slate-400"
                        : "cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                    }`}
                  >
                    <Upload size={16} />
                    <span>Choose File</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "assignments" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="content-duedate" className="text-sm font-semibold text-slate-700">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="content-duedate"
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  value={formState.dueDate}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  required
                  disabled={isCreating}
                />
              </div>
            )}

            {activeTab === "quizzes" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="content-questions" className="text-sm font-semibold text-slate-700">
                  Number of Questions
                </label>
                <input
                  id="content-questions"
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  value={formState.questions}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      questions: e.target.value,
                    }))
                  }
                  placeholder="e.g. 10"
                  disabled={isCreating}
                />
              </div>
            )}

            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleBackToList}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <h2 className={facultyUi.title}>
          Course Workspace
        </h2>
        <p className={facultyUi.subtitle}>
          Manage course content, assignments, quizzes, and question banks
        </p>
      </div>

      <div className={`${facultyUi.panel} mb-5 overflow-hidden border border-slate-200 !p-0`}>
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
        <div className="relative flex flex-col justify-between gap-5 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-5 lg:flex-row lg:items-center">
          <div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />
          <div className="min-w-0">
          <button
            type="button"
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            <span>Back to Courses</span>
          </button>

          <div className="flex items-start gap-3">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="m-0 text-2xl font-semibold text-slate-900">
                {course?.courseName || "Course"}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {(course?.code || "N/A")} | Semester {course?.semester || "-"} |{" "}
                {course?.credit || 0} Credits
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {course?.department?.name || "Department"}
              </p>
            </div>
          </div>
          </div>
          <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-2 lg:self-start">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,145,178,0.28)] transition hover:from-cyan-700 hover:to-blue-700"
              onClick={handlePrimaryAction}
            >
              <Plus size={16} />
              <span>{tabContent.action}</span>
            </button>
            {activeTab !== "syllabus" ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                onClick={() => {
                  setActiveTab("syllabus");
                  setFormState(INITIAL_FORM_STATE);
                  setCurrentView("form");
                }}
              >
                <BookOpen size={16} />
                <span>Upload Syllabus</span>
              </button>
            ) : null}
            {activeTab !== "questionbanks" ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => {
                  setActiveTab("questionbanks");
                  setFormState(INITIAL_FORM_STATE);
                  setCurrentView("form");
                }}
              >
                <FolderOpen size={16} />
                <span>Upload Question Bank</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "border-cyan-600 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_10px_22px_rgba(8,145,178,0.22)]"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "assignments" ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <label
            htmlFor="assignment-unit-filter"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Unit
          </label>
          <select
            id="assignment-unit-filter"
            className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            value={selectedAssignmentUnit}
            onChange={(e) => setSelectedAssignmentUnit(e.target.value)}
          >
            <option value="all">All units</option>
            {assignmentUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>

          <label
            htmlFor="assignment-student-filter"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Student
          </label>
          <select
            id="assignment-student-filter"
            className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            value={selectedAssignmentStudentId}
            onChange={(e) => setSelectedAssignmentStudentId(e.target.value)}
          >
            <option value="all">All students</option>
            {assignmentStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {(() => {
                  const base = student.email
                    ? `${student.name} (${student.email})`
                    : student.name;
                  if (selectedAssignmentUnit === "all") return base;
                  const status =
                    assignmentStudentStatusByUnit.get(String(student.id)) || "Pending";
                  return `${base} — ${status}`;
                })()}
              </option>
            ))}
          </select>

          <label
            htmlFor="assignment-status-filter"
            className="ml-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Status
          </label>
          <select
            id="assignment-status-filter"
            className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            value={assignmentSubmissionFilter}
            onChange={(e) => setAssignmentSubmissionFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="graded">Graded</option>
            <option value="missing">Missing</option>
          </select>
          <span className="text-xs text-slate-500">
            {courseStudentsLoading ? "Loading students..." : `${assignmentStudents.length} students`}
          </span>
        </div>
      ) : null}

      <div className={facultyUi.panel}>
        {isActiveTabLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-slate-600">Loading {activeTabLabel}...</p>
          </div>
        ) : visibleItems.length === 0 ? (
          isAssignmentFilteredEmpty ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm">
                <ClipboardList size={30} strokeWidth={2.1} />
              </div>
              <p className="m-0 mt-4 text-base font-semibold text-slate-700">
                No submissions for selected filters
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Change Student/Status filters to review and grade submissions.
              </p>
            </div>
          ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm">
              <AlertTriangle size={30} strokeWidth={2.1} />
            </div>
            <p className="m-0 mt-4 text-base font-semibold text-slate-700">{tabContent.title}</p>
            <p className="mt-1 text-sm text-slate-500">{tabContent.subtitle}</p>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
            >
              <Plus size={15} />
              {tabContent.action}
            </button>
          </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {visibleItems.map((item) => {
              const isMaterialTab = activeTab === "materials";
              const isQueryTab = activeTab === "queries";
              const isAssignmentTab = activeTab === "assignments";
              const queryId = String(item?._id || item?.id || "");
              const latestReply = item?.latestFacultyReply || "";
              const replyDraft = queryReplyDrafts[queryId] || "";
              const isReplying = replyingQueryId === queryId;
              const assignmentId = toAssignmentId(item);
              const assignmentSubmissionsRaw = isAssignmentTab
                ? assignmentSubmissionsByAssignment[assignmentId] || []
                : [];
              const missingStudents =
                isAssignmentTab && assignmentSubmissionFilter === "missing"
                  ? getMissingStudentsForAssignment(item)
                  : [];
              const assignmentSubmissions =
                isAssignmentTab ? assignmentSubmissionsRaw.filter(matchesAssignmentSubmissionFilters) : [];

              if (isQueryTab) {
                return (
                  <div key={queryId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] md:p-5">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="m-0 text-lg font-semibold text-slate-900">
                          {item?.subject || "Course Query"}
                        </h4>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Student: {item?.student?.name || "Student"}
                        </p>
                      </div>
                      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item?.status === "answered"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {item?.status === "answered" ? "Answered" : "Open"}
                      </span>
                    </div>

                    <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item?.question || "No question text provided."}
                    </p>

                    <div className="mb-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Reply</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {latestReply || "No reply sent yet."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        placeholder="Type your reply for student..."
                        value={replyDraft}
                        onChange={(e) =>
                          setQueryReplyDrafts((prev) => ({
                            ...prev,
                            [queryId]: e.target.value,
                          }))
                        }
                        disabled={isReplying}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">
                          Asked: {formatDateTime(item?.createdAt)}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            void handleReplyToQuery(queryId);
                          }}
                          disabled={isReplying || !replyDraft.trim()}
                        >
                          {isReplying ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send size={15} />
                              <span>Send Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item._id || item.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:border-cyan-200 hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] md:p-5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-600 opacity-0 transition group-hover:opacity-100" />

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="m-0 text-lg font-semibold text-slate-900">{item.title}</h4>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">{formatDateTime(item.createdAt)}</span>
                  </div>

                  {item.description ? (
                    <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item.description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm text-slate-600">
                    {item.originalFileName ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        <strong>File:</strong> {item.originalFileName}
                      </span>
                    ) : null}
                    {item.dueDate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        <strong>Due:</strong> {formatDateTime(item.dueDate)}
                      </span>
                    ) : null}
                    {item.questionCount ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        <strong>Questions:</strong> {item.questionCount}
                      </span>
                    ) : null}
                  </div>

                  {item.fileUrl ? (
                    <div className="mt-4">
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                          isMaterialTab
                            ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                            : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                        }`}
                      >
                        <ExternalLink size={15} />
                        Open file
                      </a>
                    </div>
                  ) : null}

                  {isAssignmentTab ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="m-0 text-sm font-semibold text-slate-800">
                          Student Submissions
                        </p>
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {assignmentSubmissionFilter === "missing"
                            ? missingStudents.length
                            : assignmentSubmissions.length}
                        </span>
                      </div>

                      {assignmentSubmissionFilter === "missing" ? (
                        missingStudents.length === 0 ? (
                          <p className="m-0 text-xs text-slate-500">No missing submissions.</p>
                        ) : (
                          <div className="space-y-3">
                            {missingStudents.map((student) => {
                              const missingKey = `${assignmentId}:${student.id}`;
                              const isSaving = gradingSubmissionId === missingKey;
                              return (
                                <div
                                  key={missingKey}
                                  className="rounded-lg border border-slate-200 bg-white p-3"
                                >
                                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="m-0 text-sm font-semibold text-slate-900">
                                        {student.name || "Student"}
                                      </p>
                                      <p className="m-0 text-xs text-slate-500">
                                        {student.email || "No email"}
                                      </p>
                                      <p className="m-0 mt-1 text-xs text-slate-500">
                                        Not submitted (past deadline)
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                      Missing
                                    </span>
                                  </div>

                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={() => {
                                        void handleMoveMissingToNotGraded(item, student);
                                      }}
                                      disabled={isSaving}
                                    >
                                      {isSaving ? (
                                        <>
                                          <Loader2 size={13} className="animate-spin" />
                                          <span>Saving...</span>
                                        </>
                                      ) : (
                                        <span>Give 0 (Not graded)</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : assignmentSubmissionsLoading && assignmentSubmissions.length === 0 ? (
                        <p className="m-0 text-xs text-slate-500">Loading submissions...</p>
                      ) : assignmentSubmissions.length === 0 ? (
                        <p className="m-0 text-xs text-slate-500">No student submissions yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {assignmentSubmissions.map((submission) => {
                            const submissionId = toSubmissionId(submission);
                            const isLocked =
                              String(submission?.status || "").toLowerCase() === "graded";
                            const draft = gradeDrafts[submissionId] || {
                              marks:
                                submission?.marks !== null && submission?.marks !== undefined
                                  ? String(submission.marks)
                                  : "",
                              grade: submission?.grade || "",
                              feedback: submission?.feedback || "",
                            };
                            const isSaving = gradingSubmissionId === submissionId;
                            return (
                              <div
                                key={submissionId}
                                className="rounded-lg border border-slate-200 bg-white p-3"
                              >
                                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="m-0 text-sm font-semibold text-slate-900">
                                      {submission?.student?.name || "Student"}
                                    </p>
                                    <p className="m-0 text-xs text-slate-500">
                                      {submission?.student?.email || "No email"}
                                    </p>
                                    <p className="m-0 mt-1 text-xs text-slate-500">
                                      Submitted: {formatDateTime(submission?.submittedAt)}
                                    </p>
                                  </div>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      submission?.status === "graded"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {submission?.status === "graded" ? "Graded" : "Submitted"}
                                  </span>
                                </div>

                                {submission?.fileUrl ? (
                                  <a
                                    href={submission.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mb-2 inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                                  >
                                    <ExternalLink size={13} />
                                    Open submitted file
                                  </a>
                                ) : null}

                                <div className="grid gap-2 md:grid-cols-2">
                                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                                    Marks
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.1"
                                      className="rounded-md border border-slate-300 px-2.5 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                                      value={draft.marks}
                                      onChange={(e) =>
                                        handleGradeDraftChange(submissionId, "marks", e.target.value)
                                      }
                                      disabled={isSaving || isLocked}
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                                    Grade
                                    <input
                                      type="text"
                                      className="rounded-md border border-slate-300 px-2.5 py-2 text-sm font-medium uppercase text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                                      value={draft.grade}
                                      onChange={(e) =>
                                        handleGradeDraftChange(
                                          submissionId,
                                          "grade",
                                          e.target.value
                                        )
                                      }
                                      placeholder="A+ / B / C"
                                      disabled={isSaving || isLocked}
                                    />
                                  </label>
                                </div>

                                <label className="mt-2 flex flex-col gap-1 text-xs font-semibold text-slate-600">
                                  Feedback
                                  <textarea
                                    rows={2}
                                    className="rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                                    value={draft.feedback}
                                    onChange={(e) =>
                                      handleGradeDraftChange(
                                        submissionId,
                                        "feedback",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Write feedback for student"
                                    disabled={isSaving || isLocked}
                                  />
                                </label>
                                {isLocked ? (
                                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                                    Grading locked. You cannot edit this again.
                                  </p>
                                ) : null}

                                <div className="mt-2 flex justify-end">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={() => {
                                      void handleSaveSubmissionGrade(submission);
                                    }}
                                    disabled={isSaving || isLocked}
                                  >
                                    {isSaving ? (
                                      <>
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Saving...</span>
                                      </>
                                    ) : isLocked ? (
                                      <span>Locked</span>
                                    ) : (
                                      <span>Save Grade</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

