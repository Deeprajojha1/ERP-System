import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  ClipboardList,
  HelpCircle,
  Plus,
  Loader2,
  ExternalLink,
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
  { id: "questionBank", label: "Question Bank", icon: BookOpen },
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
  questionBank: {
    title: "No question bank entries",
    subtitle: "Upload and maintain reusable question sets for this course.",
    action: "Add Question Bank",
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
  questionBank: ".pdf,.doc,.docx,.txt,.csv,.xlsx",
};

const createEmptyItems = () => ({
  materials: [],
  assignments: [],
  quizzes: [],
  questionBank: [],
});

const createLoadFlags = () => ({
  materials: false,
  assignments: false,
  quizzes: false,
  questionBank: false,
});

const buildMessageFromError = (error, fallback) =>
  error?.response?.data?.message || fallback;

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

export default function CourseWorkspaceSection({ course, onBack }) {
  const apiBase = useSelector((state) => state.config.apiBase);

  const [activeTab, setActiveTab] = useState("materials");
  const [currentView, setCurrentView] = useState("list");
  const [isCreating, setIsCreating] = useState(false);
  const [itemsByTab, setItemsByTab] = useState(createEmptyItems);
  const [tabLoading, setTabLoading] = useState(createLoadFlags);
  const [tabsLoaded, setTabsLoaded] = useState(createLoadFlags);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);

  const courseId = useMemo(() => String(course?._id || ""), [course?._id]);
  const isActiveTabLoading = Boolean(tabLoading[activeTab]);

  const handlePrimaryAction = () => {
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
        const response = await axios.get(`${apiBase}/faculty/course-content`, {
          withCredentials: true,
          params: {
            courseId,
            type: tabId,
          },
        });

        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        setItemsByTab((prev) => ({ ...prev, [tabId]: items }));
        setTabsLoaded((prev) => ({ ...prev, [tabId]: true }));
      } catch (error) {
        toast.error(buildMessageFromError(error, "Failed to load course content"));
      } finally {
        setTabLoading((prev) => ({ ...prev, [tabId]: false }));
      }
    },
    [apiBase, courseId]
  );

  useEffect(() => {
    setItemsByTab(createEmptyItems());
    setTabsLoaded(createLoadFlags());
    setTabLoading(createLoadFlags());
    setActiveTab("materials");
    setCurrentView("list");
  }, [courseId]);

  useEffect(() => {
    if (!tabsLoaded[activeTab]) {
      loadCourseContent(activeTab);
    }
  }, [activeTab, loadCourseContent, tabsLoaded]);

  const tabContent = EMPTY_TEXT[activeTab] || EMPTY_TEXT.materials;
  const currentItems = itemsByTab[activeTab] || [];
  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label || activeTab;

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

    if (activeTab === "materials" && !formState.file) {
      toast.error("Please select a file");
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
              activeTab === "questionBank") && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="content-file" className="text-sm font-semibold text-slate-700">
                  {activeTab === "materials" ? (
                    <>
                      Upload File <span className="text-rose-500">*</span>
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
                  required={activeTab === "materials"}
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
                    {formState.file ? formState.file.name : "No file selected"}
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
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,145,178,0.28)] transition hover:from-cyan-700 hover:to-blue-700 sm:w-auto lg:self-start"
            onClick={handlePrimaryAction}
          >
            <Plus size={16} />
            <span>{tabContent.action}</span>
          </button>
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

      <div className={facultyUi.panel}>
        {isActiveTabLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-slate-600">Loading {activeTabLabel}...</p>
          </div>
        ) : currentItems.length === 0 ? (
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
        ) : (
          <div className="flex flex-col gap-3">
            {currentItems.map((item) => {
              const isMaterialTab = activeTab === "materials";

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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

