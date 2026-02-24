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
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../../utils/axiosInstance";

const TABS = [
  { id: "materials", label: "Materials", icon: FileText },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle },
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
};

const createEmptyItems = () => ({
  materials: [],
  assignments: [],
  quizzes: [],
});

const createLoadFlags = () => ({
  materials: false,
  assignments: false,
  quizzes: false,
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

    if (formState.questions) {
      formData.append("questions", String(formState.questions));
    }

    if (formState.file) {
      formData.append("file", formState.file);
    }

    setIsCreating(true);
    try {
      const response = await axios.post(
        `${apiBase}/faculty/course-content`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

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

  // Render Form View (Full Page)
  if (currentView === "form") {
    return (
      <section className="faculty-section courses-section">
        <div className="faculty-section-header">
          <div>
            <h2 className="faculty-section-title">{tabContent.action}</h2>
            <p className="faculty-section-subtitle">
              {course?.courseName || "Course"} • {course?.code || "N/A"}
            </p>
          </div>
        </div>

        <div className="faculty-card faculty-content-form-page">
          <button
            type="button"
            className="faculty-course-back-btn"
            onClick={handleBackToList}
            disabled={isCreating}
          >
            <ArrowLeft size={16} />
            <span>Back to {activeTabLabel}</span>
          </button>

          <form onSubmit={handleFormSubmit} className="faculty-content-form">
            <div className="faculty-form-group">
              <label htmlFor="content-title">Title <span className="faculty-required">*</span></label>
              <input
                id="content-title"
                type="text"
                className="faculty-form-input"
                value={formState.title}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter title"
                required
                disabled={isCreating}
              />
            </div>

            <div className="faculty-form-group">
              <label htmlFor="content-description">Description</label>
              <textarea
                id="content-description"
                className="faculty-form-textarea"
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

            {(activeTab === "materials" || activeTab === "assignments" || activeTab === "quizzes") && (
              <div className="faculty-form-group">
                <label htmlFor="content-file">
                  {activeTab === "materials" ? (
                    <>Upload File <span className="faculty-required">*</span></>
                  ) : (
                    "Attach File (Optional)"
                  )}
                </label>
                <div className="faculty-file-input-wrapper">
                  <input
                    id="content-file"
                    type="file"
                    className="faculty-file-input-hidden"
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
                  <div className="faculty-file-input-styled">
                    <span className="faculty-file-input-text">
                      {formState.file ? formState.file.name : "No file selected"}
                    </span>
                    <label
                      htmlFor="content-file"
                      className={`faculty-file-input-btn ${isCreating ? 'disabled' : ''}`}
                    >
                      <Upload size={16} />
                      <span>Choose File</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "assignments" && (
              <div className="faculty-form-group">
                <label htmlFor="content-duedate">Due Date <span className="faculty-required">*</span></label>
                <input
                  id="content-duedate"
                  type="datetime-local"
                  className="faculty-form-input"
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
              <div className="faculty-form-group">
                <label htmlFor="content-questions">Number of Questions</label>
                <input
                  id="content-questions"
                  type="number"
                  min={1}
                  className="faculty-form-input"
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

            <div className="faculty-form-actions">
              <button
                type="button"
                className="faculty-secondary-btn"
                onClick={handleBackToList}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="faculty-primary-btn" 
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 size={16} className="faculty-spin" />
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

  // Render List View (Default)
  return (
    <section className="faculty-section courses-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">Course Workspace</h2>
          <p className="faculty-section-subtitle">
            Manage course content, assignments, and quizzes
          </p>
        </div>
      </div>

      <div className="faculty-course-workspace-hero faculty-card">
        <div className="faculty-course-workspace-main">
          <button
            type="button"
            className="faculty-course-back-btn"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            <span>Back to Courses</span>
          </button>

          <div className="faculty-course-workspace-head">
            <div className="faculty-course-workspace-icon">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="faculty-course-workspace-title">
                {course?.courseName || "Course"}
              </h3>
              <p className="faculty-course-workspace-meta">
                {(course?.code || "N/A")} - Semester {course?.semester || "-"} -
                {" "}
                {course?.credit || 0} Credits
              </p>
              <p className="faculty-course-workspace-dept">
                {course?.department?.name || "Department"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="faculty-primary-btn faculty-course-workspace-action"
          onClick={handlePrimaryAction}
        >
          <Plus size={16} />
          <span>{tabContent.action}</span>
        </button>
      </div>

      <div className="faculty-course-workspace-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`faculty-course-workspace-tab ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="faculty-card faculty-course-workspace-body">
        {isActiveTabLoading ? (
          <div className="faculty-empty-state faculty-course-workspace-empty">
            <div className="faculty-loading-spinner" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Loading {activeTabLabel}...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="faculty-empty-state faculty-course-workspace-empty">
            <p>{tabContent.title}</p>
            <p className="faculty-empty-subtitle">{tabContent.subtitle}</p>
          </div>
        ) : (
          <div className="faculty-course-item-list">
            {currentItems.map((item) => (
              <div key={item._id || item.id} className="faculty-course-item-card">
                <div className="faculty-course-item-head">
                  <h4>{item.title}</h4>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
                {item.description && (
                  <p className="faculty-course-item-desc">{item.description}</p>
                )}
                <div className="faculty-course-item-meta">
                  {item.originalFileName && (
                    <span className="faculty-course-item-file">
                      <strong>File:</strong> {item.originalFileName}
                    </span>
                  )}
                  {item.dueDate && (
                    <span>
                      <strong>Due:</strong> {formatDateTime(item.dueDate)}
                    </span>
                  )}
                  {item.questionCount && (
                    <span>
                      <strong>Questions:</strong> {item.questionCount}
                    </span>
                  )}
                </div>
                {item.fileUrl && (
                  <div className="faculty-course-item-actions">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="faculty-course-item-link"
                    >
                      <ExternalLink size={14} />
                      Open file
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
