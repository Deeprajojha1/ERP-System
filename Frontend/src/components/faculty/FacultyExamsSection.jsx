import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import {
  fetchFacultyExamBlueprints,
  fetchFacultyExamBlueprintById,
  upsertFacultyExamSyllabus,
  generateFacultyExamPaper,
  fetchFacultyExamPaper,
  reviewFacultyExamPaper,
  fetchFacultyExamStudentScores,
  resetExamWorkflowState,
  selectExamBlueprints,
  selectBlueprintsLoadState,
  selectActiveBlueprint,
  selectActiveBlueprintLoadState,
  selectSyllabusSaveState,
  selectActivePaper,
  selectPaperLoadState,
  selectGeneratePaperState,
  selectReviewPaperState,
  selectActiveScores,
  selectScoresLoadState,
} from "../../redux/facultyDashboardSlice";

const STATUS_CONFIG = {
  DRAFT: { icon: FileText, color: "#64748b", bg: "#f1f5f9", label: "Draft" },
  PUBLISHED: { icon: CheckCircle, color: "#2563eb", bg: "#dbeafe", label: "Published" },
  CLOSED: { icon: Clock, color: "#b45309", bg: "#fde68a", label: "Closed" },
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatExamType = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildSyllabusText = (syllabus = []) =>
  syllabus
    .map((item) => {
      const topics = Array.isArray(item?.topics) && item.topics.length
        ? `: ${item.topics.join(", ")}`
        : "";
      return `${item?.unit || ""}${topics}`.trim();
    })
    .filter(Boolean)
    .join("\n");

const parseSyllabusText = (text) => {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [unitPart, topicsPart] = line.split(":");
      const unit = String(unitPart || "").trim();
      const topics = String(topicsPart || "")
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean);
      return { unit, topics };
    })
    .filter((item) => item.unit);
};

export default function FacultyExamsSection() {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const blueprints = useSelector(selectExamBlueprints);
  const loadState = useSelector(selectBlueprintsLoadState);
  const activeBlueprint = useSelector(selectActiveBlueprint);
  const activeBlueprintLoadState = useSelector(selectActiveBlueprintLoadState);
  const syllabusSaveState = useSelector(selectSyllabusSaveState);
  const activePaper = useSelector(selectActivePaper);
  const paperLoadState = useSelector(selectPaperLoadState);
  const generatePaperState = useSelector(selectGeneratePaperState);
  const reviewPaperState = useSelector(selectReviewPaperState);
  const activeScores = useSelector(selectActiveScores);
  const scoresLoadState = useSelector(selectScoresLoadState);

  const [selectedBlueprintId, setSelectedBlueprintId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syllabusUnits, setSyllabusUnits] = useState(1);
  const [syllabusText, setSyllabusText] = useState("");
  const [editableQuestions, setEditableQuestions] = useState([]);

  const isLoading = loadState === ADMIN_LOAD_STATES.PENDING;
  const isDetailsLoading = activeBlueprintLoadState === ADMIN_LOAD_STATES.PENDING;
  const isSavingSyllabus = syllabusSaveState === ADMIN_LOAD_STATES.PENDING;
  const isPaperLoading = paperLoadState === ADMIN_LOAD_STATES.PENDING;
  const isGeneratingPaper = generatePaperState === ADMIN_LOAD_STATES.PENDING;
  const isReviewingPaper = reviewPaperState === ADMIN_LOAD_STATES.PENDING;
  const isScoresLoading = scoresLoadState === ADMIN_LOAD_STATES.PENDING;

  useEffect(() => {
    if (apiBase && loadState === ADMIN_LOAD_STATES.INITIAL) {
      dispatch(fetchFacultyExamBlueprints({ apiBase }));
    }
  }, [apiBase, loadState, dispatch]);

  useEffect(() => {
    if (!activeBlueprint?._id || activeBlueprint._id !== selectedBlueprintId) return;
    setSyllabusUnits(Number(activeBlueprint.numberOfUnits || 1));
    setSyllabusText(buildSyllabusText(activeBlueprint.syllabus || []));
  }, [activeBlueprint, selectedBlueprintId]);

  useEffect(() => {
    setEditableQuestions(Array.isArray(activePaper?.questions) ? activePaper.questions : []);
  }, [activePaper]);

  const selectedBlueprint = useMemo(
    () => blueprints.find((item) => item._id === selectedBlueprintId) || null,
    [blueprints, selectedBlueprintId]
  );

  const stats = {
    total: blueprints.length,
    draft: blueprints.filter((b) => b.status === "DRAFT").length,
    published: blueprints.filter((b) => b.status === "PUBLISHED").length,
    closed: blueprints.filter((b) => b.status === "CLOSED").length,
  };

  const handleRefresh = async () => {
    if (!apiBase || refreshing) return;
    setRefreshing(true);
    try {
      await dispatch(fetchFacultyExamBlueprints({ apiBase })).unwrap();
      toast.success("Exam blueprints refreshed");
    } catch {
      toast.error("Failed to refresh blueprints");
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenBlueprint = async (blueprintId) => {
    if (!apiBase || !blueprintId) return;
    setSelectedBlueprintId(blueprintId);
    dispatch(resetExamWorkflowState());

    try {
      await dispatch(fetchFacultyExamBlueprintById({ apiBase, blueprintId })).unwrap();
    } catch {
      toast.error("Failed to load blueprint details");
      return;
    }

    dispatch(fetchFacultyExamPaper({ apiBase, blueprintId }));
    dispatch(fetchFacultyExamStudentScores({ apiBase, blueprintId }));
  };

  const handleSaveSyllabus = async () => {
    if (!apiBase || !selectedBlueprintId) return;

    const syllabus = parseSyllabusText(syllabusText);
    const units = Number(syllabusUnits);

    if (!Number.isInteger(units) || units < 1) {
      toast.error("Number of units must be at least 1");
      return;
    }

    if (!syllabus.length) {
      toast.error("Please add at least one syllabus unit");
      return;
    }

    try {
      await dispatch(
        upsertFacultyExamSyllabus({
          apiBase,
          blueprintId: selectedBlueprintId,
          payload: { numberOfUnits: units, syllabus },
        })
      ).unwrap();
      toast.success("Syllabus saved");
    } catch (error) {
      toast.error(error || "Failed to save syllabus");
    }
  };

  const handleGeneratePaper = async () => {
    if (!apiBase || !selectedBlueprintId) return;

    try {
      await dispatch(generateFacultyExamPaper({ apiBase, blueprintId: selectedBlueprintId })).unwrap();
      toast.success("Question paper generated");
      dispatch(fetchFacultyExamPaper({ apiBase, blueprintId: selectedBlueprintId }));
    } catch (error) {
      toast.error(error || "Failed to generate paper");
    }
  };

  const handleLoadPaper = async () => {
    if (!apiBase || !selectedBlueprintId) return;
    try {
      await dispatch(fetchFacultyExamPaper({ apiBase, blueprintId: selectedBlueprintId })).unwrap();
    } catch (error) {
      toast.error(error || "No paper available yet");
    }
  };

  const handleQuestionChange = (index, key, value) => {
    setEditableQuestions((prev) =>
      prev.map((question, qIndex) => {
        if (qIndex !== index) return question;
        if (key === "marks") {
          return { ...question, marks: Number(value) || 1 };
        }
        return { ...question, [key]: value };
      })
    );
  };

  const handleCloseStudio = () => {
    setSelectedBlueprintId(null);
    dispatch(resetExamWorkflowState());
  };

  const handleReviewPaper = async () => {
    if (!apiBase || !activePaper?._id || !editableQuestions.length) return;

    try {
      await dispatch(
        reviewFacultyExamPaper({
          apiBase,
          paperId: activePaper._id,
          payload: { questions: editableQuestions },
        })
      ).unwrap();
      toast.success("Paper reviewed and saved");
    } catch (error) {
      toast.error(error || "Failed to review paper");
    }
  };

  if (selectedBlueprint) {
    return (
      <section className="faculty-section faculty-exams-section">
        <div className="faculty-content-form-page faculty-exam-studio-page">
          <button
            type="button"
            className="faculty-course-back-btn"
            onClick={handleCloseStudio}
          >
            <ArrowLeft size={16} />
            <span>Back to Blueprints</span>
          </button>

          <div className="faculty-card faculty-exam-studio-card">
            <div className="faculty-exam-studio-head">
              <h3>{selectedBlueprint.title || "Blueprint Studio"}</h3>
              <p>Manage syllabus, AI paper generation, review, and student scores.</p>
            </div>

            <div className="faculty-exam-studio-body">
              {isDetailsLoading ? (
                <div className="faculty-loading-inline">
                  <ClipLoader size={20} color="#0284c7" />
                  <span>Loading details...</span>
                </div>
              ) : (
                <>
                  <div className="faculty-detail-grid">
                    <div className="faculty-detail-item">
                      <span className="faculty-detail-label">Subject</span>
                      <span className="faculty-detail-value">{activeBlueprint?.subject || "N/A"}</span>
                    </div>
                    <div className="faculty-detail-item">
                      <span className="faculty-detail-label">Exam Type</span>
                      <span className="faculty-detail-value">{formatExamType(activeBlueprint?.examType)}</span>
                    </div>
                    <div className="faculty-detail-item">
                      <span className="faculty-detail-label">Duration</span>
                      <span className="faculty-detail-value">
                        {activeBlueprint?.durationMinutes ? `${activeBlueprint.durationMinutes} min` : "N/A"}
                      </span>
                    </div>
                    <div className="faculty-detail-item">
                      <span className="faculty-detail-label">Schedule Window</span>
                      <span className="faculty-detail-value">
                        {formatDateTime(activeBlueprint?.scheduleStart)} to{" "}
                        {formatDateTime(activeBlueprint?.scheduleEnd)}
                      </span>
                    </div>
                  </div>

                  <div className="faculty-exam-toolbar">
                    <div className="faculty-form-group">
                      <label>Number of Units</label>
                      <input
                        type="number"
                        min={1}
                        className="faculty-form-input"
                        value={syllabusUnits}
                        onChange={(e) => setSyllabusUnits(e.target.value)}
                      />
                    </div>
                    <div className="faculty-form-group faculty-form-grow">
                      <label>Syllabus (one unit per line, optionally `Unit: topic1, topic2`)</label>
                      <textarea
                        rows={5}
                        className="faculty-form-textarea"
                        value={syllabusText}
                        onChange={(e) => setSyllabusText(e.target.value)}
                      />
                    </div>
                    <div className="faculty-exam-actions">
                      <button
                        type="button"
                        className="faculty-secondary-btn"
                        disabled={isSavingSyllabus}
                        onClick={handleSaveSyllabus}
                      >
                        {isSavingSyllabus ? (
                          <ClipLoader size={14} color="#0284c7" />
                        ) : (
                          <ClipboardCheck size={16} />
                        )}
                        <span>Save Syllabus</span>
                      </button>
                      <button
                        type="button"
                        className="faculty-primary-btn"
                        disabled={isGeneratingPaper}
                        onClick={handleGeneratePaper}
                      >
                        {isGeneratingPaper ? (
                          <ClipLoader size={14} color="#fff" />
                        ) : (
                          <Sparkles size={16} />
                        )}
                        <span>Generate Paper</span>
                      </button>
                      <button
                        type="button"
                        className="faculty-secondary-btn"
                        disabled={isPaperLoading}
                        onClick={handleLoadPaper}
                      >
                        {isPaperLoading ? (
                          <ClipLoader size={14} color="#0284c7" />
                        ) : (
                          <FileText size={16} />
                        )}
                        <span>Load Latest Paper</span>
                      </button>
                    </div>
                  </div>

                  <div className="faculty-blueprint-sections">
                    <h4>Sections</h4>
                    {(activeBlueprint?.sections || []).map((section, index) => (
                      <div key={`${section.type}-${index}`} className="faculty-section-item">
                        <span className="faculty-section-name">
                          {section.type} x {section.questionCount}
                        </span>
                        <span className="faculty-section-marks">{section.totalMarks} marks</span>
                      </div>
                    ))}
                  </div>

                  <div className="faculty-paper-panel">
                    <h4>Generated Questions</h4>
                    {!editableQuestions.length ? (
                      <p className="faculty-empty-subtitle">No paper generated yet.</p>
                    ) : (
                      <div className="faculty-paper-list">
                        {editableQuestions.map((question, index) => (
                          <div
                            className="faculty-paper-item"
                            key={`${question.sectionType}-${index}`}
                          >
                            <div className="faculty-question-meta">
                              <span>Q{index + 1}</span>
                              <span>{question.sectionType}</span>
                            </div>
                            <textarea
                              className="faculty-form-textarea"
                              rows={3}
                              value={question.questionText || ""}
                              onChange={(e) =>
                                handleQuestionChange(index, "questionText", e.target.value)
                              }
                            />
                            <div className="faculty-paper-fields">
                              <input
                                type="number"
                                min={1}
                                className="faculty-form-input"
                                value={question.marks || 1}
                                onChange={(e) =>
                                  handleQuestionChange(index, "marks", e.target.value)
                                }
                              />
                              <input
                                type="text"
                                className="faculty-form-input"
                                placeholder="Correct answer"
                                value={question.correctAnswer || ""}
                                onChange={(e) =>
                                  handleQuestionChange(
                                    index,
                                    "correctAnswer",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!!editableQuestions.length && (
                      <button
                        type="button"
                        className="faculty-primary-btn"
                        onClick={handleReviewPaper}
                        disabled={isReviewingPaper}
                      >
                        {isReviewingPaper ? (
                          <ClipLoader size={14} color="#fff" />
                        ) : (
                          <ClipboardCheck size={16} />
                        )}
                        <span>Save Review</span>
                      </button>
                    )}
                  </div>

                  <div className="faculty-score-panel">
                    <h4>
                      <BarChart3 size={16} /> Student Scores
                    </h4>
                    {isScoresLoading ? (
                      <div className="faculty-loading-inline">
                        <ClipLoader size={18} color="#0284c7" />
                        <span>Loading scores...</span>
                      </div>
                    ) : activeScores.length === 0 ? (
                      <p className="faculty-empty-subtitle">No attempts found.</p>
                    ) : (
                      <div className="faculty-score-table-wrap">
                        <table className="faculty-score-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Attempt</th>
                              <th>Status</th>
                              <th>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeScores.map((row) => (
                              <tr key={row.attemptId}>
                                <td>
                                  {row.student?.user?.name ||
                                    row.student?.enrollmentNumber ||
                                    "N/A"}
                                </td>
                                <td>{row.attemptNumber || 1}</td>
                                <td>{row.status || "N/A"}</td>
                                <td>
                                  {row.totalAwarded != null && row.totalMax != null
                                    ? `${row.totalAwarded}/${row.totalMax}`
                                    : "Pending"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="faculty-section faculty-exams-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">Exam Blueprint Studio</h2>
          <p className="faculty-section-subtitle">
            Manage syllabus, AI paper generation, review, and student scores
          </p>
        </div>
        <button
          type="button"
          className="faculty-secondary-btn"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
        >
          {refreshing ? <ClipLoader size={16} color="#0284c7" /> : <RefreshCw size={18} />}
          <span>Refresh</span>
        </button>
      </div>

      <div className="faculty-stats-grid">
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Total Blueprints</span>
            <div className="faculty-stat-icon" style={{ background: "#dbeafe" }}>
              <FileText size={20} color="#2563eb" />
            </div>
          </div>
          <p className="faculty-stat-value">{stats.total}</p>
        </div>
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Draft</span>
            <div className="faculty-stat-icon" style={{ background: "#f1f5f9" }}>
              <FileText size={20} color="#64748b" />
            </div>
          </div>
          <p className="faculty-stat-value">{stats.draft}</p>
        </div>
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Published</span>
            <div className="faculty-stat-icon" style={{ background: "#dbeafe" }}>
              <CheckCircle size={20} color="#2563eb" />
            </div>
          </div>
          <p className="faculty-stat-value">{stats.published}</p>
        </div>
        <div className="faculty-stat-card">
          <div className="faculty-stat-header">
            <span className="faculty-stat-title">Closed</span>
            <div className="faculty-stat-icon" style={{ background: "#fde68a" }}>
              <Clock size={20} color="#b45309" />
            </div>
          </div>
          <p className="faculty-stat-value">{stats.closed}</p>
        </div>
      </div>

      <div className="faculty-card">
        <h3 className="faculty-card-title">Assigned Blueprints</h3>

        {isLoading ? (
          <div className="faculty-loading-inline">
            <ClipLoader size={24} color="#0284c7" />
            <span>Loading blueprints...</span>
          </div>
        ) : blueprints.length === 0 ? (
          <div className="faculty-empty-state">
            <AlertCircle size={48} color="#94a3b8" />
            <p>No exam blueprints found</p>
          </div>
        ) : (
          <div className="faculty-blueprints-grid">
            {blueprints.map((blueprint) => {
              const statusConfig = STATUS_CONFIG[blueprint.status] || STATUS_CONFIG.DRAFT;
              const StatusIcon = statusConfig.icon;

              return (
                <div key={blueprint._id} className="faculty-blueprint-card">
                  <div className="faculty-blueprint-header">
                    <h4 className="faculty-blueprint-title">{blueprint.title || "Exam Blueprint"}</h4>
                    <div
                      className="faculty-blueprint-status"
                      style={{ background: statusConfig.bg, color: statusConfig.color }}
                    >
                      <StatusIcon size={14} />
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>

                  <div className="faculty-blueprint-meta">
                    <div className="faculty-blueprint-info">
                      <span className="faculty-blueprint-label">Subject:</span>
                      <span>{blueprint.subject || "N/A"}</span>
                    </div>
                    <div className="faculty-blueprint-info">
                      <span className="faculty-blueprint-label">Type:</span>
                      <span>{formatExamType(blueprint.examType)}</span>
                    </div>
                    <div className="faculty-blueprint-info">
                      <span className="faculty-blueprint-label">Window:</span>
                      <span>{formatDateTime(blueprint.scheduleStart)}</span>
                    </div>
                    <div className="faculty-blueprint-info">
                      <span className="faculty-blueprint-label">Marks:</span>
                      <span>{blueprint.totalMarks || "N/A"}</span>
                    </div>
                  </div>

                  <div className="faculty-blueprint-actions">
                    <button
                      type="button"
                      className="faculty-action-btn"
                      onClick={() => handleOpenBlueprint(blueprint._id)}
                    >
                      <Eye size={16} />
                      <span>Open Studio</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
