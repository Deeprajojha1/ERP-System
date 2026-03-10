import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import {
  FiSearch,
  FiRefreshCw,
  FiFilter,
  FiX,
  FiPlus,
  FiTrash2,
  FiSave,
  FiEdit2,
  FiFileText,
  FiUploadCloud,
  FiBarChart2,
  FiArchive,
} from "react-icons/fi";
import { ThreeDots } from "react-loader-spinner";
import ClipLoader from "./components/ClipLoader";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";
import {
  closeAdminExamBlueprint,
  fetchAdminExamScores,
  resetAdminExamScores,
  selectAdminExamClosingIds,
  selectAdminExamDeletingIds,
  selectAdminExamScores,
  selectAdminExamScoresBlueprintId,
  selectAdminExamScoresError,
  selectAdminExamScoresLoadState,
  softDeleteAdminExamBlueprint,
} from "../redux/adminExamBlueprintSlice";
import "./ExamBlueprints.css";

const EXAM_TYPES = ["MID_TERM", "END_TERM", "UNIT_TEST"];
const STATUS_OPTIONS = ["ALL", "DRAFT", "PUBLISHED", "CLOSED"];
const SECTION_TYPES = ["MCQ", "SHORT", "LONG"];

const createEmptySection = () => ({
  type: "MCQ",
  questionCount: 1,
  marksPerQuestion: 1,
});

const createDefaultForm = () => ({
  title: "",
  subject: "",
  teacherId: "",
  examType: EXAM_TYPES[0],
  durationMinutes: 60,
  scheduleStart: "",
  scheduleEnd: "",
  sections: [createEmptySection()],
});

const DEFAULT_FILTERS = {
  search: "",
  status: "ALL",
  examType: "ALL",
  teacherId: "ALL",
};

const parseBlueprints = (payload) => {
  if (Array.isArray(payload?.blueprints)) return payload.blueprints;
  if (Array.isArray(payload?.data?.blueprints)) return payload.data.blueprints;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const parseSingleBlueprint = (payload) => {
  if (payload?.blueprint) return payload.blueprint;
  if (payload?.data?.blueprint) return payload.data.blueprint;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload && !Array.isArray(payload) ? payload : null;
};

const parseFaculty = (payload) => {
  if (Array.isArray(payload?.faculty)) return payload.faculty;
  if (Array.isArray(payload?.faculties)) return payload.faculties;
  if (Array.isArray(payload?.data?.faculty)) return payload.data.faculty;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const toIsoLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const formatExamType = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const buildFiltersToParams = (filters) => {
  const params = {};
  const search = String(filters.search || "").trim();
  if (search) params.search = search;
  if (filters.status !== "ALL") params.status = filters.status;
  if (filters.examType !== "ALL") params.examType = filters.examType;
  if (filters.teacherId !== "ALL") params.teacherId = filters.teacherId;
  return params;
};

const mapBlueprintToForm = (blueprint) => ({
  title: blueprint?.title || "",
  subject: blueprint?.subject || "",
  teacherId: blueprint?.teacherId?._id || blueprint?.teacherId || "",
  examType: blueprint?.examType || EXAM_TYPES[0],
  durationMinutes: Number(blueprint?.durationMinutes || 60),
  scheduleStart: toIsoLocal(blueprint?.scheduleStart),
  scheduleEnd: toIsoLocal(blueprint?.scheduleEnd),
  sections:
    blueprint?.sections?.map((section) => ({
      type: section?.type || "MCQ",
      questionCount: Number(section?.questionCount || 1),
      marksPerQuestion: Number(section?.marksPerQuestion || 1),
    })) || [createEmptySection()],
});

const ExamBlueprints = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const scores = useSelector(selectAdminExamScores);
  const scoresLoadState = useSelector(selectAdminExamScoresLoadState);
  const scoresError = useSelector(selectAdminExamScoresError);
  const activeScoresBlueprintId = useSelector(selectAdminExamScoresBlueprintId);
  const closingIds = useSelector(selectAdminExamClosingIds);
  const deletingIds = useSelector(selectAdminExamDeletingIds);

  const [form, setForm] = useState(createDefaultForm);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [publishingId, setPublishingId] = useState("");
  const [generatingId, setGeneratingId] = useState("");
  const [scoresModalBlueprint, setScoresModalBlueprint] = useState(null);
  const [paperModalBlueprint, setPaperModalBlueprint] = useState(null);
  const [paperLoadState, setPaperLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [paperError, setPaperError] = useState("");
  const [paperId, setPaperId] = useState("");
  const [editableQuestions, setEditableQuestions] = useState([]);
  const [savingPaper, setSavingPaper] = useState(false);
  const formCardRef = useRef(null);

  const totalMarks = useMemo(
    () =>
      form.sections.reduce(
        (sum, section) =>
          sum +
          Number(section.questionCount || 0) * Number(section.marksPerQuestion || 0),
        0
      ),
    [form.sections]
  );

  const stats = useMemo(() => {
    const counts = blueprints.reduce(
      (acc, item) => {
        const status = String(item.status || "").toUpperCase();
        if (status === "PUBLISHED") acc.published += 1;
        else if (status === "CLOSED") acc.closed += 1;
        else acc.draft += 1;
        return acc;
      },
      { draft: 0, published: 0, closed: 0 }
    );

    return {
      total: blueprints.length,
      ...counts,
    };
  }, [blueprints]);

  const loadState = useMemo(() => {
    if (!hasFetchedOnce && !loading) return ADMIN_LOAD_STATES.INITIAL;
    if (loading) return ADMIN_LOAD_STATES.PENDING;
    if (loadError) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.SUCCESS;
  }, [hasFetchedOnce, loading, loadError]);

  const loadStateText = useMemo(
    () =>
      ADMIN_LOAD_STATE_OPTIONS.find((option) => option.id === loadState)?.text ||
      "Unknown",
    [loadState]
  );

  const modalScores = useMemo(() => {
    if (!scoresModalBlueprint?._id) return [];
    if (activeScoresBlueprintId !== scoresModalBlueprint._id) return [];
    return scores;
  }, [activeScoresBlueprintId, scores, scoresModalBlueprint]);

  const isScoresLoading = scoresLoadState === ADMIN_LOAD_STATES.PENDING;

  const isClosingBlueprint = useCallback(
    (id) => closingIds.includes(id),
    [closingIds]
  );

  const isDeletingBlueprint = useCallback(
    (id) => deletingIds.includes(id),
    [deletingIds]
  );

  const resetForm = useCallback(() => {
    setForm(createDefaultForm());
    setEditingId("");
  }, []);

  const scrollToFormCard = useCallback(() => {
    const formNode = formCardRef.current;
    if (!formNode) return;

    const scrollTopTarget = Math.max(0, formNode.offsetTop - 12);
    const adminContentContainer = formNode.closest(".admin-content");

    if (adminContentContainer && typeof adminContentContainer.scrollTo === "function") {
      adminContentContainer.scrollTo({
        top: scrollTopTarget,
        behavior: "smooth",
      });
      return;
    }

    formNode.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const loadFaculty = useCallback(async () => {
    if (!apiBase) return;
    try {
      const response = await axios.get(`${apiBase}/admin/faculty`, {
        withCredentials: true,
      });
      const rows = parseFaculty(response.data);
      const normalized = rows
        .map((item) => {
          const userId = item?.user?._id || item?.user?.id || item?._id || "";
          const name = item?.user?.name || item?.name || "";
          const email = item?.user?.email || item?.email || "";
          const departmentName =
            item?.department?.name || item?.departmentName || "";
          return {
            id: String(userId),
            label: name || email || "Faculty",
            email,
            departmentName,
          };
        })
        .filter((item) => item.id);

      const unique = Array.from(
        normalized.reduce((map, item) => map.set(item.id, item), new Map()).values()
      );
      setFacultyOptions(unique);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load faculty list");
    }
  }, [apiBase]);

  const loadBlueprints = useCallback(
    async (activeFilters = filters) => {
      if (!apiBase) return;
      try {
        setLoadError("");
        setLoading(true);
        const response = await axios.get(`${apiBase}/admin/exam-blueprint`, {
          withCredentials: true,
          params: buildFiltersToParams(activeFilters),
        });
        setBlueprints(parseBlueprints(response.data));
      } catch (error) {
        const message = error.response?.data?.message || "Failed to load exam blueprints";
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setHasFetchedOnce(true);
      }
    },
    [apiBase, filters]
  );

  useEffect(() => {
    loadFaculty();
  }, [loadFaculty]);

  useEffect(() => {
    loadBlueprints(filters);
  }, [filters, loadBlueprints]);

  useEffect(() => {
    if (!scoresModalBlueprint) {
      dispatch(resetAdminExamScores());
    }
  }, [dispatch, scoresModalBlueprint]);

  useEffect(() => {
    if (!paperModalBlueprint) {
      setPaperLoadState(ADMIN_LOAD_STATES.INITIAL);
      setPaperError("");
      setPaperId("");
      setEditableQuestions([]);
    }
  }, [paperModalBlueprint]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const onChangeSection = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, createEmptySection()],
    }));
  };

  const removeSection = (index) => {
    setForm((prev) => {
      if (prev.sections.length <= 1) return prev;
      return {
        ...prev,
        sections: prev.sections.filter((_, idx) => idx !== index),
      };
    });
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Title is required";
    if (!form.subject.trim()) return "Subject is required";
    if (!form.teacherId) return "Teacher is required";
    if (!form.scheduleStart || !form.scheduleEnd)
      return "Schedule start and end are required";
    if (new Date(form.scheduleEnd) <= new Date(form.scheduleStart))
      return "Schedule end must be after schedule start";
    if (Number(form.durationMinutes || 0) < 1)
      return "Duration must be at least 1 minute";

    const hasInvalidSection = form.sections.some(
      (section) =>
        !SECTION_TYPES.includes(section.type) ||
        Number(section.questionCount || 0) < 1 ||
        Number(section.marksPerQuestion || 0) < 1
    );
    if (hasInvalidSection)
      return "Every section must have valid type, question count, and marks";

    return "";
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const normalizedSections = form.sections.map((section) => {
      const questionCount = Number(section.questionCount || 0);
      const marksPerQuestion = Number(section.marksPerQuestion || 0);
      return {
        type: section.type,
        questionCount,
        marksPerQuestion,
        totalMarks: questionCount * marksPerQuestion,
      };
    });

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      teacherId: form.teacherId,
      examType: form.examType,
      durationMinutes: Number(form.durationMinutes || 0),
      totalMarks: normalizedSections.reduce(
        (sum, section) => sum + section.totalMarks,
        0
      ),
      scheduleStart: new Date(form.scheduleStart).toISOString(),
      scheduleEnd: new Date(form.scheduleEnd).toISOString(),
      sections: normalizedSections,
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await axios.put(`${apiBase}/admin/exam-blueprint/${editingId}`, payload, {
          withCredentials: true,
        });
        toast.success("Exam blueprint updated successfully");
      } else {
        await axios.post(`${apiBase}/admin/exam-blueprint`, payload, {
          withCredentials: true,
        });
        toast.success("Exam blueprint created successfully");
      }
      resetForm();
      await loadBlueprints(filters);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save exam blueprint");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = async (blueprint) => {
    const id = blueprint?._id;
    if (!id) return;

    // Edit should be instant even if details endpoint is slow/unavailable.
    setEditingId(id);
    setForm(mapBlueprintToForm(blueprint));

    scrollToFormCard();

    // Background refresh only; should never block edit UI.
    try {
      const response = await axios.get(`${apiBase}/admin/exam-blueprint/${id}`, {
        withCredentials: true,
      });
      const latest = parseSingleBlueprint(response.data);
      if (latest) {
        setForm(mapBlueprintToForm(latest));
      }
    } catch {
      // Ignore background fetch failures to keep edit UX stable.
    }
  };

  const publishBlueprint = async (id) => {
    try {
      setPublishingId(id);
      await axios.patch(
        `${apiBase}/admin/exam-blueprint/${id}/publish`,
        {},
        { withCredentials: true }
      );
      toast.success("Blueprint published successfully");
      await loadBlueprints(filters);
    } catch (error) {
      const message = error.response?.data?.message || "Failed to publish blueprint";
      if (String(message).toLowerCase().includes("generate question paper")) {
        toast.error("Generate and review paper first, then publish.");
      } else {
        toast.error(message);
      }
    } finally {
      setPublishingId("");
    }
  };

  const generatePaper = async (id) => {
    try {
      setGeneratingId(id);
      // Use admin endpoint to generate and auto-review paper
      await axios.post(
        `${apiBase}/admin/exam-blueprint/${id}/generate-paper`,
        {},
        { withCredentials: true }
      );
      
      // Get the generated paper to auto-review it
      const paperRes = await axios.get(
        `${apiBase}/admin/exam-blueprint/${id}/paper`,
        { withCredentials: true }
      );
      const paperId = paperRes.data?.paper?._id || paperRes.data?._id;
      const paperQuestions = paperRes.data?.paper?.questions;
      
      if (paperId) {
        // Auto-review the paper so it can be published
        await axios.put(
          `${apiBase}/admin/exam-paper/${paperId}/review`,
          Array.isArray(paperQuestions) ? { questions: paperQuestions } : {},
          { withCredentials: true }
        );
      }
      
      toast.success("Question paper generated and reviewed successfully");
      await loadBlueprints(filters);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to generate/review question paper"
      );
    } finally {
      setGeneratingId("");
    }
  };

  const openPaperModal = async (blueprint) => {
    const id = blueprint?._id;
    if (!apiBase || !id) return;

    setPaperModalBlueprint(blueprint);
    setPaperLoadState(ADMIN_LOAD_STATES.PENDING);
    setPaperError("");

    try {
      const response = await axios.get(`${apiBase}/admin/exam-blueprint/${id}/paper`, {
        withCredentials: true,
      });
      const paper = response.data?.paper || response.data;
      const questions = Array.isArray(paper?.questions) ? paper.questions : [];
      setPaperId(String(paper?._id || ""));
      setEditableQuestions(questions);
      setPaperLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      const message = error.response?.data?.message || "No paper available yet";
      setPaperError(message);
      setPaperLoadState(ADMIN_LOAD_STATES.FAILURE);
    }
  };

  const closePaperModal = () => {
    setPaperModalBlueprint(null);
  };

  const handleQuestionChange = (index, key, value) => {
    setEditableQuestions((prev) =>
      prev.map((question, qIndex) => {
        if (qIndex !== index) return question;
        if (key === "marks") {
          return { ...question, marks: Number(value) || 1 };
        }
        if (key === "options") {
          const options = String(value || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          return { ...question, options };
        }
        return { ...question, [key]: value };
      })
    );
  };

  const savePaperReview = async () => {
    if (!apiBase || !paperId || !editableQuestions.length) return;
    if (String(paperModalBlueprint?.status || "").toUpperCase() === "PUBLISHED") return;
    try {
      setSavingPaper(true);
      await axios.put(
        `${apiBase}/admin/exam-paper/${paperId}/review`,
        { questions: editableQuestions },
        { withCredentials: true }
      );
      toast.success("Question paper updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update question paper");
    } finally {
      setSavingPaper(false);
    }
  };

  const openScoresModal = async (blueprint) => {
    const blueprintId = blueprint?._id;
    if (!apiBase || !blueprintId) return;

    setScoresModalBlueprint(blueprint);
    try {
      await dispatch(
        fetchAdminExamScores({
          apiBase,
          blueprintId,
        })
      ).unwrap();
    } catch (error) {
      toast.error(error || "Failed to load exam scores");
    }
  };

  const closeScoresModal = () => {
    setScoresModalBlueprint(null);
  };

  const closeBlueprint = async (id) => {
    if (!id || !apiBase || isClosingBlueprint(id)) return;
    if (!window.confirm("Close this blueprint? Students will no longer attempt it.")) {
      return;
    }

    try {
      await dispatch(
        closeAdminExamBlueprint({
          apiBase,
          blueprintId: id,
        })
      ).unwrap();
      toast.success("Blueprint closed successfully");
      await loadBlueprints(filters);
    } catch (error) {
      toast.error(error || "Failed to close blueprint");
    }
  };

  const deleteBlueprint = async (id) => {
    if (!id || !apiBase || isDeletingBlueprint(id)) return;
    if (!window.confirm("Delete this blueprint? This action hides it from records.")) {
      return;
    }

    try {
      await dispatch(
        softDeleteAdminExamBlueprint({
          apiBase,
          blueprintId: id,
        })
      ).unwrap();
      if (scoresModalBlueprint?._id === id) {
        closeScoresModal();
      }
      toast.success("Blueprint deleted successfully");
      await loadBlueprints(filters);
    } catch (error) {
      toast.error(error || "Failed to delete blueprint");
    }
  };

  return (
    <div className="exam-blueprint-page">
      <div className="exam-blueprint-head">
        <div>
          <h2>Exam Blueprint Management</h2>
          <p>Create, update, and publish AI exam blueprints with section-level mark design.</p>
        </div>
        <button
          type="button"
          className="exam-blueprint-btn exam-blueprint-btn-primary"
          onClick={() => loadBlueprints(filters)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "icon-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="exam-blueprint-stats">
        <article className="exam-blueprint-stat">
          <span>Total Blueprints</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="exam-blueprint-stat">
          <span>Draft</span>
          <strong>{stats.draft}</strong>
        </article>
        <article className="exam-blueprint-stat">
          <span>Published</span>
          <strong>{stats.published}</strong>
        </article>
        <article className="exam-blueprint-stat">
          <span>Closed</span>
          <strong>{stats.closed}</strong>
        </article>
      </div>

      <section className="exam-blueprint-filter-card">
        <div className="exam-blueprint-filter-header">
          <FiFilter className="exam-blueprint-filter-icon" />
          <span>Filters</span>
        </div>
        <div className="exam-blueprint-filter-grid">
          <label>
            Search
            <div className="exam-blueprint-search-wrap">
              <FiSearch className="exam-blueprint-search-icon" />
              <input
                type="text"
                placeholder="Search by title or subject"
                value={filters.search}
                onChange={(event) => handleFilterChange("search", event.target.value)}
                className="exam-blueprint-search-input"
              />
            </div>
          </label>

          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All Statuses" : formatExamType(status)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Exam Type
            <select
              value={filters.examType}
              onChange={(event) => handleFilterChange("examType", event.target.value)}
            >
              <option value="ALL">All Exam Types</option>
              {EXAM_TYPES.map((examType) => (
                <option key={examType} value={examType}>
                  {formatExamType(examType)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Teacher
            <select
              value={filters.teacherId}
              onChange={(event) => handleFilterChange("teacherId", event.target.value)}
            >
              <option value="ALL">All Teachers</option>
              {facultyOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="exam-blueprint-btn exam-blueprint-btn-ghost"
            onClick={clearFilters}
          >
            <FiX className="exam-blueprint-btn-icon" />
            Clear Filters
          </button>
        </div>
      </section>

      <div className="exam-blueprint-grid">
        <section ref={formCardRef} className="exam-blueprint-card">
          <header className="exam-blueprint-card-head">
            <h3>{editingId ? "Update Blueprint" : "Create Blueprint"}</h3>
            {editingId && (
              <button
                type="button"
                className="exam-blueprint-btn exam-blueprint-btn-ghost"
                onClick={resetForm}
                disabled={submitting}
              >
                <FiX className="exam-blueprint-btn-icon" />
                Cancel Edit
              </button>
            )}
          </header>

          <form onSubmit={submitForm} className="exam-blueprint-form">
            <div className="exam-blueprint-form-grid">
              <label>
                Title
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="e.g. Mid Term Physics - Semester 3"
                  required
                />
              </label>

              <label>
                Subject
                <input
                  type="text"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  placeholder="e.g. Applied Physics"
                  required
                />
              </label>

              <label>
                Teacher
                <select
                  value={form.teacherId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, teacherId: event.target.value }))
                  }
                  required
                >
                  <option value="">Select teacher</option>
                  {facultyOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.label}
                      {teacher.departmentName ? ` - ${teacher.departmentName}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Exam Type
                <select
                  value={form.examType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, examType: event.target.value }))
                  }
                >
                  {EXAM_TYPES.map((examType) => (
                    <option key={examType} value={examType}>
                      {formatExamType(examType)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Duration (Minutes)
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      durationMinutes: Number(event.target.value || 0),
                    }))
                  }
                  required
                />
              </label>

              <label>
                Schedule Start
                <input
                  type="datetime-local"
                  value={form.scheduleStart}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, scheduleStart: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Schedule End
                <input
                  type="datetime-local"
                  value={form.scheduleEnd}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, scheduleEnd: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="exam-blueprint-marks-chip">
                Total Marks
                <strong>{totalMarks}</strong>
              </label>
            </div>

            <div className="exam-blueprint-sections">
              <div className="exam-blueprint-sections-head">
                <h4>Section Design</h4>
                <button
                  type="button"
                  className="exam-blueprint-btn exam-blueprint-btn-ghost"
                  onClick={addSection}
                >
                  <FiPlus className="exam-blueprint-btn-icon" />
                  Add Section
                </button>
              </div>

              <div className="exam-blueprint-sections-wrap">
                <table className="exam-blueprint-sections-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Question Count</th>
                      <th>Marks / Question</th>
                      <th>Section Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.sections.map((section, index) => {
                      const sectionTotal =
                        Number(section.questionCount || 0) *
                        Number(section.marksPerQuestion || 0);
                      return (
                        <tr key={`section-${index}`}>
                          <td>
                            <select
                              value={section.type}
                              onChange={(event) =>
                                onChangeSection(index, "type", event.target.value)
                              }
                            >
                              {SECTION_TYPES.map((sectionType) => (
                                <option key={sectionType} value={sectionType}>
                                  {sectionType}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={section.questionCount}
                              onChange={(event) =>
                                onChangeSection(
                                  index,
                                  "questionCount",
                                  Number(event.target.value || 0)
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={section.marksPerQuestion}
                              onChange={(event) =>
                                onChangeSection(
                                  index,
                                  "marksPerQuestion",
                                  Number(event.target.value || 0)
                                )
                              }
                            />
                          </td>
                          <td>{sectionTotal}</td>
                          <td>
                            <button
                              type="button"
                              className="exam-blueprint-btn exam-blueprint-btn-danger"
                              onClick={() => removeSection(index)}
                              disabled={form.sections.length <= 1}
                            >
                              <FiTrash2 className="exam-blueprint-btn-icon" />
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="exam-blueprint-form-actions">
              <button
                type="submit"
                className="exam-blueprint-btn exam-blueprint-btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <ClipLoader size={16} color="#ffffff" />
                    Saving...
                  </>
                ) : editingId ? (
                  <>
                    <FiSave className="exam-blueprint-btn-icon" />
                    Update Blueprint
                  </>
                ) : (
                  <>
                    <FiPlus className="exam-blueprint-btn-icon" />
                    Create Blueprint
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="exam-blueprint-card">
          <header className="exam-blueprint-card-head">
            <h3>Blueprint Records</h3>
            <div className="exam-blueprint-records-meta">
              <span className={`exam-blueprint-load-chip ${loadState}`}>
                {loadStateText}
              </span>
              <span>{blueprints.length} item(s)</span>
            </div>
          </header>

          {loadState === ADMIN_LOAD_STATES.INITIAL ? (
            <div className="exam-blueprint-state">Apply filters or refresh to load blueprints.</div>
          ) : loadState === ADMIN_LOAD_STATES.PENDING ? (
            <div className="exam-blueprint-state exam-blueprint-state-loading">
              <ThreeDots
                visible
                height={36}
                width={60}
                color="#2563eb"
                radius={8}
                ariaLabel="blueprints-loading"
              />
              <p>Loading blueprints...</p>
            </div>
          ) : loadState === ADMIN_LOAD_STATES.FAILURE ? (
            <div className="exam-blueprint-state">
              {loadError || "Failed to load blueprints."}
              <div className="exam-blueprint-state-actions">
                <button
                  type="button"
                  className="exam-blueprint-btn exam-blueprint-btn-ghost"
                  onClick={() => loadBlueprints(filters)}
                >
                  <FiRefreshCw className={loading ? "icon-spin" : ""} />
                  Retry
                </button>
              </div>
            </div>
          ) : blueprints.length === 0 ? (
            <div className="exam-blueprint-state">No exam blueprints found for selected filters.</div>
          ) : (
            <div className="exam-blueprint-table-wrap">
              <table className="exam-blueprint-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Teacher</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Total</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blueprints.map((blueprint) => (
                    <tr key={blueprint._id}>
                      <td>
                        <strong>{blueprint.title || "Untitled"}</strong>
                        <p>{blueprint.subject || "No subject"}</p>
                      </td>
                      <td>
                        {blueprint.teacherId?.name ||
                          blueprint.teacherId?.email ||
                          "N/A"}
                      </td>
                      <td>{formatExamType(blueprint.examType)}</td>
                      <td>{blueprint.durationMinutes || 0} min</td>
                      <td>{blueprint.totalMarks || 0}</td>
                      <td>
                        {formatDateTime(blueprint.scheduleStart)}
                        <br />
                        {formatDateTime(blueprint.scheduleEnd)}
                      </td>
                      <td>
                        <span
                          className={`exam-blueprint-status ${String(
                            blueprint.status || "DRAFT"
                          ).toLowerCase()}`}
                        >
                          {String(blueprint.status || "DRAFT").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="exam-blueprint-row-actions">
                          <button
                            type="button"
                            className="exam-blueprint-btn exam-blueprint-btn-ghost"
                            onClick={() => startEdit(blueprint)}
                            disabled={
                              publishingId === blueprint._id ||
                              generatingId === blueprint._id ||
                              isClosingBlueprint(blueprint._id) ||
                              isDeletingBlueprint(blueprint._id)
                            }
                          >
                            <FiEdit2 className="exam-blueprint-btn-icon" />
                            Edit
                          </button>
                          {String(blueprint.status || "").toUpperCase() === "DRAFT" && (
                            <button
                              type="button"
                              className="exam-blueprint-btn exam-blueprint-btn-secondary"
                              onClick={() => generatePaper(blueprint._id)}
                              disabled={
                                generatingId === blueprint._id ||
                                isClosingBlueprint(blueprint._id) ||
                                isDeletingBlueprint(blueprint._id)
                              }
                            >
                              {generatingId === blueprint._id ? (
                                <>
                                  <ClipLoader size={14} color="#ffffff" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <FiFileText className="exam-blueprint-btn-icon" />
                                  Generate Paper
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            className="exam-blueprint-btn exam-blueprint-btn-ghost"
                            onClick={() => openPaperModal(blueprint)}
                            disabled={
                              generatingId === blueprint._id ||
                              publishingId === blueprint._id ||
                              isClosingBlueprint(blueprint._id) ||
                              isDeletingBlueprint(blueprint._id)
                            }
                          >
                            <FiFileText className="exam-blueprint-btn-icon" />
                            {String(blueprint.status || "").toUpperCase() === "PUBLISHED"
                              ? "View Paper"
                              : "Edit Paper"}
                          </button>
                          {String(blueprint.status || "").toUpperCase() !== "PUBLISHED" && (
                            <button
                              type="button"
                              className="exam-blueprint-btn exam-blueprint-btn-primary"
                              onClick={() => publishBlueprint(blueprint._id)}
                              disabled={
                                publishingId === blueprint._id ||
                                generatingId === blueprint._id ||
                                isClosingBlueprint(blueprint._id) ||
                                isDeletingBlueprint(blueprint._id)
                              }
                            >
                              {publishingId === blueprint._id ? (
                                <>
                                  <ClipLoader size={14} color="#ffffff" />
                                  Publishing...
                                </>
                              ) : (
                                <>
                                  <FiUploadCloud className="exam-blueprint-btn-icon" />
                                  Publish
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            className="exam-blueprint-btn exam-blueprint-btn-info"
                            onClick={() => openScoresModal(blueprint)}
                            disabled={
                              generatingId === blueprint._id ||
                              publishingId === blueprint._id ||
                              isClosingBlueprint(blueprint._id) ||
                              isDeletingBlueprint(blueprint._id)
                            }
                          >
                            <FiBarChart2 className="exam-blueprint-btn-icon" />
                            Scores
                          </button>
                          {String(blueprint.status || "").toUpperCase() !== "CLOSED" && (
                            <button
                              type="button"
                              className="exam-blueprint-btn exam-blueprint-btn-warning"
                              onClick={() => closeBlueprint(blueprint._id)}
                              disabled={
                                generatingId === blueprint._id ||
                                publishingId === blueprint._id ||
                                isClosingBlueprint(blueprint._id) ||
                                isDeletingBlueprint(blueprint._id)
                              }
                            >
                              {isClosingBlueprint(blueprint._id) ? (
                                <>
                                  <ClipLoader size={14} color="#ffffff" />
                                  Closing...
                                </>
                              ) : (
                                <>
                                  <FiArchive className="exam-blueprint-btn-icon" />
                                  Close
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            className="exam-blueprint-btn exam-blueprint-btn-danger"
                            onClick={() => deleteBlueprint(blueprint._id)}
                            disabled={
                              generatingId === blueprint._id ||
                              publishingId === blueprint._id ||
                              isClosingBlueprint(blueprint._id) ||
                              isDeletingBlueprint(blueprint._id)
                            }
                          >
                            {isDeletingBlueprint(blueprint._id) ? (
                              <>
                                <ClipLoader size={14} color="#b91c1c" trackColor="rgba(185, 28, 28, 0.2)" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <FiTrash2 className="exam-blueprint-btn-icon" />
                                Delete
                              </>
                            )}
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {scoresModalBlueprint && (
        <div className="exam-blueprint-scores-overlay" onClick={closeScoresModal}>
          <div
            className="exam-blueprint-scores-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="exam-blueprint-scores-head">
              <div>
                <h3>Student Scores</h3>
                <p>
                  {scoresModalBlueprint.title || "Exam Blueprint"} |{" "}
                  {formatExamType(scoresModalBlueprint.examType)}
                </p>
              </div>
              <button
                type="button"
                className="exam-blueprint-btn exam-blueprint-btn-ghost"
                onClick={closeScoresModal}
              >
                <FiX className="exam-blueprint-btn-icon" />
                Close
              </button>
            </header>

            <div className="exam-blueprint-scores-body">
              {isScoresLoading ? (
                <div className="exam-blueprint-scores-state">
                  <ClipLoader size={22} color="#2563eb" />
                  <p>Loading student scores...</p>
                </div>
              ) : scoresLoadState === ADMIN_LOAD_STATES.FAILURE ? (
                <div className="exam-blueprint-scores-state">
                  <p>{scoresError || "Unable to load scores."}</p>
                </div>
              ) : modalScores.length === 0 ? (
                <div className="exam-blueprint-scores-state">
                  <p>No attempts found for this blueprint.</p>
                </div>
              ) : (
                <>
                  <div className="exam-blueprint-scores-summary">
                    <span>Total Attempts: {modalScores.length}</span>
                    <span>
                      Evaluated:{" "}
                      {modalScores.filter((item) => item.totalAwarded != null).length}
                    </span>
                  </div>

                  <div className="exam-blueprint-scores-table-wrap">
                    <table className="exam-blueprint-scores-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Enrollment</th>
                          <th>Attempt</th>
                          <th>Status</th>
                          <th>Score</th>
                          <th>Submitted At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalScores.map((item) => (
                          <tr key={item.attemptId}>
                            <td>{item?.student?.user?.name || "N/A"}</td>
                            <td>{item?.student?.enrollmentNumber || "N/A"}</td>
                            <td>{item?.attemptNumber || 1}</td>
                            <td>{item?.status || "N/A"}</td>
                            <td>
                              {item?.totalAwarded != null && item?.totalMax != null
                                ? `${item.totalAwarded}/${item.totalMax}`
                                : "Pending"}
                            </td>
                            <td>{formatDateTime(item?.submittedAt || item?.startedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {paperModalBlueprint && (
        <div className="exam-blueprint-scores-overlay" onClick={closePaperModal}>
          <div
            className="exam-blueprint-scores-modal exam-blueprint-paper-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="exam-blueprint-scores-head">
              <div>
                <h3>Question Paper</h3>
                <p>
                  {paperModalBlueprint.title || "Exam Blueprint"} |{" "}
                  {formatExamType(paperModalBlueprint.examType)}
                </p>
              </div>
              <span
                className={`exam-blueprint-paper-status ${String(
                  paperModalBlueprint.status || "DRAFT"
                ).toLowerCase()}`}
              >
                {String(paperModalBlueprint.status || "DRAFT").toUpperCase()}
              </span>
              <button
                type="button"
                className="exam-blueprint-btn exam-blueprint-btn-ghost"
                onClick={closePaperModal}
              >
                <FiX className="exam-blueprint-btn-icon" />
                Close
              </button>
            </header>

            <div className="exam-blueprint-scores-body exam-blueprint-paper-body">
              {paperLoadState === ADMIN_LOAD_STATES.PENDING ? (
                <div className="exam-blueprint-scores-state">
                  <ClipLoader size={22} color="#2563eb" />
                  <p>Loading question paper...</p>
                </div>
              ) : paperLoadState === ADMIN_LOAD_STATES.FAILURE ? (
                <div className="exam-blueprint-scores-state">
                  <p>{paperError || "Unable to load question paper."}</p>
                </div>
              ) : editableQuestions.length === 0 ? (
                <div className="exam-blueprint-scores-state">
                  <p>No questions found for this blueprint.</p>
                </div>
              ) : (
                <>
                  <div className="exam-blueprint-paper-meta">
                    <span>{editableQuestions.length} question(s)</span>
                    {String(paperModalBlueprint.status || "").toUpperCase() === "PUBLISHED" && (
                      <span>View only</span>
                    )}
                  </div>
                  <div className="exam-blueprint-paper-list">
                    {editableQuestions.map((question, index) => {
                      const isMcq = String(question.sectionType || "").toUpperCase() === "MCQ";
                      const readOnly =
                        String(paperModalBlueprint.status || "").toUpperCase() === "PUBLISHED";
                      return (
                        <div
                          className="exam-blueprint-paper-card"
                          key={`${question.sectionType}-${index}`}
                        >
                          <div className="exam-blueprint-paper-card-head">
                            <span>Q{index + 1}</span>
                            <span>{question.sectionType || "QUESTION"}</span>
                          </div>
                          <textarea
                            className="exam-blueprint-paper-textarea"
                            rows={3}
                            value={question.questionText || ""}
                            onChange={(event) =>
                              handleQuestionChange(index, "questionText", event.target.value)
                            }
                            readOnly={readOnly}
                          />
                          <div className="exam-blueprint-paper-row">
                            <label>
                              Marks
                              <input
                                type="number"
                                min="1"
                                value={question.marks || 1}
                                onChange={(event) =>
                                  handleQuestionChange(index, "marks", event.target.value)
                                }
                                readOnly={readOnly}
                                disabled={readOnly}
                              />
                            </label>
                            <label>
                              Correct Answer
                              <input
                                type="text"
                                value={question.correctAnswer || ""}
                                onChange={(event) =>
                                  handleQuestionChange(index, "correctAnswer", event.target.value)
                                }
                                readOnly={readOnly}
                                disabled={readOnly}
                              />
                            </label>
                          </div>
                          {isMcq && (
                            <label className="exam-blueprint-paper-options">
                              Options (comma separated)
                              <textarea
                                rows={2}
                                value={(question.options || []).join(", ")}
                                onChange={(event) =>
                                  handleQuestionChange(index, "options", event.target.value)
                                }
                                readOnly={readOnly}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {String(paperModalBlueprint.status || "").toUpperCase() !== "PUBLISHED" && (
                    <div className="exam-blueprint-paper-actions">
                      <button
                        type="button"
                        className="exam-blueprint-btn exam-blueprint-btn-primary"
                        onClick={savePaperReview}
                        disabled={savingPaper}
                      >
                        {savingPaper ? (
                          <>
                            <ClipLoader size={14} color="#ffffff" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <FiSave className="exam-blueprint-btn-icon" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamBlueprints;
