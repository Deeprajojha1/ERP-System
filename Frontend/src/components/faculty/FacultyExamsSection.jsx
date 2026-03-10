import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "../../utils/axiosInstance";
import {
  FileText,
  CheckCircle,
  Clock,
  Eye,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  BarChart3,
  ClipboardCheck,
  CalendarDays,
  BookOpen,
  Download,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import { facultyUi } from "./uiTokens";
import { EmptyState, LoadingState } from "./SectionState";
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
  const [downloadingScores, setDownloadingScores] = useState(null);
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
      <section className={facultyUi.page}>
        <div className="mx-auto w-full max-w-6xl">
          <button
            type="button"
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={handleCloseStudio}
          >
            <ArrowLeft size={16} />
            <span>Back to Blueprints</span>
          </button>

          <div className={facultyUi.panel}>
            <div className="border-b border-slate-200 bg-white/80 px-4 py-4">
              <h3 className="m-0 text-xl font-bold text-slate-900">{selectedBlueprint.title || "Blueprint Studio"}</h3>
              <p className="mt-1 text-sm text-slate-600">Manage syllabus, AI paper generation, review, and student scores.</p>
            </div>

            <div className="space-y-4 p-4">
              {isDetailsLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70">
                  <ClipLoader size={20} color="#0284c7" />
                  <span className="text-sm font-medium text-slate-600">Loading details...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-900">{activeBlueprint?.subject || "N/A"}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exam Type</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-900">{formatExamType(activeBlueprint?.examType)}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-900">
                        {activeBlueprint?.durationMinutes ? `${activeBlueprint.durationMinutes} min` : "N/A"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule Window</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-900">
                        {formatDateTime(activeBlueprint?.scheduleStart)} to{" "}
                        {formatDateTime(activeBlueprint?.scheduleEnd)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Number of Units</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 md:max-w-48"
                        value={syllabusUnits}
                        onChange={(e) => setSyllabusUnits(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Syllabus (one unit per line, optionally `Unit: topic1, topic2`)</label>
                      <textarea
                        rows={5}
                        className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        value={syllabusText}
                        onChange={(e) => setSyllabusText(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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

                  <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                    <h4 className="m-0 mb-2 text-sm font-semibold text-slate-800">Sections</h4>
                    {(activeBlueprint?.sections || []).map((section, index) => (
                      <div key={`${section.type}-${index}`} className="mb-1 flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-2 text-sm last:mb-0">
                        <span className="font-medium text-slate-700">
                          {section.type} x {section.questionCount}
                        </span>
                        <span className="text-slate-600">{section.totalMarks} marks</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                    <h4 className="m-0 mb-2 text-sm font-semibold text-slate-800">Generated Questions</h4>
                    {!editableQuestions.length ? (
                      <p className="m-0 text-sm text-slate-500">No paper generated yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {editableQuestions.map((question, index) => (
                          <div
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                            key={`${question.sectionType}-${index}`}
                          >
                            <div className="mb-2 inline-flex gap-2 text-xs font-semibold uppercase text-blue-700">
                              <span>Q{index + 1}</span>
                              <span>{question.sectionType}</span>
                            </div>
                            <textarea
                              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                              rows={3}
                              value={question.questionText || ""}
                              onChange={(e) =>
                                handleQuestionChange(index, "questionText", e.target.value)
                              }
                            />
                            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
                              <input
                                type="number"
                                min={1}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                                value={question.marks || 1}
                                onChange={(e) =>
                                  handleQuestionChange(index, "marks", e.target.value)
                                }
                              />
                              <input
                                type="text"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
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
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

                  <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <BarChart3 size={16} /> Student Scores
                      </h4>
                      {activeScores.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                            disabled={!!downloadingScores}
                            onClick={async () => {
                              setDownloadingScores("xlsx");
                              try {
                                const res = await axios.get(
                                  `${apiBase}/faculty/exam-blueprint/${selectedBlueprintId}/scores/download`,
                                  { withCredentials: true, responseType: "blob", params: { format: "xlsx" } }
                                );
                                const disposition = res.headers?.["content-disposition"] || "";
                                const match = disposition.match(/filename="?([^"]+)"?/i);
                                const fileName = match?.[1] || "exam-scores.xlsx";
                                const url = URL.createObjectURL(res.data);
                                const a = document.createElement("a");
                                a.href = url; a.download = fileName;
                                document.body.appendChild(a); a.click();
                                document.body.removeChild(a); URL.revokeObjectURL(url);
                                toast.success("Excel downloaded");
                              } catch { toast.error("Failed to download Excel"); }
                              finally { setDownloadingScores(null); }
                            }}
                          >
                            {downloadingScores === "xlsx" ? <ClipLoader size={12} color="#15803d" /> : <Download size={13} />}
                            Excel
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                            disabled={!!downloadingScores}
                            onClick={async () => {
                              setDownloadingScores("pdf");
                              try {
                                const res = await axios.get(
                                  `${apiBase}/faculty/exam-blueprint/${selectedBlueprintId}/scores/download`,
                                  { withCredentials: true, responseType: "blob", params: { format: "pdf" } }
                                );
                                const disposition = res.headers?.["content-disposition"] || "";
                                const match = disposition.match(/filename="?([^"]+)"?/i);
                                const fileName = match?.[1] || "exam-scores.pdf";
                                const url = URL.createObjectURL(res.data);
                                const a = document.createElement("a");
                                a.href = url; a.download = fileName;
                                document.body.appendChild(a); a.click();
                                document.body.removeChild(a); URL.revokeObjectURL(url);
                                toast.success("PDF downloaded");
                              } catch { toast.error("Failed to download PDF"); }
                              finally { setDownloadingScores(null); }
                            }}
                          >
                            {downloadingScores === "pdf" ? <ClipLoader size={12} color="#b91c1c" /> : <Download size={13} />}
                            PDF
                          </button>
                        </div>
                      )}
                    </div>
                    {isScoresLoading ? (
                      <div className="flex min-h-32 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/70">
                        <ClipLoader size={18} color="#0284c7" />
                        <span className="text-sm font-medium text-slate-600">Loading scores...</span>
                      </div>
                    ) : activeScores.length === 0 ? (
                      <p className="m-0 text-sm text-slate-500">No attempts found.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[500px] border-collapse sm:min-w-[560px]">
                          <thead>
                            <tr>
                              <th className="bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
                              <th className="bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Attempt</th>
                              <th className="bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                              <th className="bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeScores.map((row) => (
                              <tr key={row.attemptId}>
                                <td className="border-t border-slate-100 px-3 py-2 text-sm text-slate-700">
                                  {row.student?.user?.name ||
                                    row.student?.enrollmentNumber ||
                                    "N/A"}
                                </td>
                                <td className="border-t border-slate-100 px-3 py-2 text-sm text-slate-700">{row.attemptNumber || 1}</td>
                                <td className="border-t border-slate-100 px-3 py-2 text-sm text-slate-700">{row.status || "N/A"}</td>
                                <td className="border-t border-slate-100 px-3 py-2 text-sm text-slate-700">
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
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <div>
          <h2 className={facultyUi.title}>Exam Blueprint Studio</h2>
          <p className={facultyUi.subtitle}>
            Manage syllabus, AI paper generation, review, and student scores
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
        >
          {refreshing ? <ClipLoader size={16} color="#0284c7" /> : <RefreshCw size={18} />}
          <span>Refresh</span>
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Blueprints</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-100">
              <FileText size={20} color="#2563eb" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">{stats.total}</p>
        </div>
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 to-slate-400" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Draft</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-100">
              <FileText size={20} color="#64748b" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">{stats.draft}</p>
        </div>
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Published</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-100">
              <CheckCircle size={20} color="#2563eb" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">{stats.published}</p>
        </div>
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Closed</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-amber-100">
              <Clock size={20} color="#b45309" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">{stats.closed}</p>
        </div>
      </div>

      <div className={facultyUi.panel}>
        <h3 className="m-0 mb-4 text-lg font-bold tracking-[0.2px] text-slate-900">Assigned Blueprints</h3>

        {isLoading ? (
          <LoadingState message="Loading exam blueprints..." minHeight="min-h-56" />
        ) : blueprints.length === 0 ? (
          <EmptyState message="No exam blueprints found" minHeight="min-h-56" />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {blueprints.map((blueprint) => {
              const statusConfig = STATUS_CONFIG[blueprint.status] || STATUS_CONFIG.DRAFT;
              const StatusIcon = statusConfig.icon;

              return (
                <div key={blueprint._id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_6px_14px_rgba(15,23,42,0.06)]">
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-blue-600" />
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="m-0 text-[1.08rem] font-semibold text-slate-900">{blueprint.title || "Exam Blueprint"}</h4>
                    <div
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: statusConfig.bg, color: statusConfig.color }}
                    >
                      <StatusIcon size={14} />
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
                      <p className="m-0 mt-0.5 inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <BookOpen size={13} />
                        {blueprint.subject || "N/A"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                      <p className="m-0 mt-0.5 font-medium text-slate-800">{formatExamType(blueprint.examType)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Window</p>
                      <p className="m-0 mt-0.5 inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <CalendarDays size={13} />
                        {formatDateTime(blueprint.scheduleStart)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Marks</p>
                      <p className="m-0 mt-0.5 font-medium text-slate-800">{blueprint.totalMarks || "N/A"}</p>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
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
