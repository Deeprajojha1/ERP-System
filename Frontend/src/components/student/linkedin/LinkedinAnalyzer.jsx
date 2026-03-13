import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiChevronRight,
  FiCpu,
  FiFilter,
  FiTrash2,
  FiUpload,
  FiZap,
} from "react-icons/fi";
import axios from "../../../utils/axiosInstance";
import "./LinkedinAnalyzer.css";

const ANALYSIS_MESSAGES = [
  "Evaluating your experience against current industry standards...",
  "Checking profile clarity, impact, and recruiter readability...",
  "Scoring your profile for role-fit and keyword optimization...",
];

const SECTION_META = {
  about: {
    title: "About",
    why: "Provides a concise and compelling introduction to your professional profile.",
    reminder:
      "The About section should quickly explain your value, skills, and role alignment.",
    editTips: [
      "Edit the 'About' section with quantified achievements.",
      "Add 2-3 concrete examples of your impact.",
    ],
    keys: ["about", "summary", "intro"],
  },
  education: {
    title: "Education",
    why: "Builds credibility and highlights relevant academic foundation.",
    reminder: "Keep education relevant to target role with key coursework or achievements.",
    editTips: [
      "Add relevant specialization/coursework in education.",
      "Mention standout academic projects or achievements.",
    ],
    keys: ["education", "degree", "academic"],
  },
  experience: {
    title: "Experience",
    why: "Shows real-world capability and measurable outcomes from your work.",
    reminder: "Recruiters prefer impact-focused bullets instead of task-only descriptions.",
    editTips: [
      "Use action + impact format (e.g., built X that improved Y).",
      "Prioritize role-relevant experiences at top.",
    ],
    keys: ["experience", "project", "impact"],
  },
  headline: {
    title: "Headline",
    why: "A clear headline improves profile discoverability and first impression.",
    reminder: "Your headline should combine role + niche skill + value proposition.",
    editTips: [
      "Add role keyword and domain focus in headline.",
      "Avoid generic phrases; be specific and searchable.",
    ],
    keys: ["headline", "title", "keyword"],
  },
  skills: {
    title: "Skills",
    why: "Skill tags drive search ranking and profile-role matching.",
    reminder: "Skills should reflect both breadth and depth for your target role.",
    editTips: [
      "Add missing role-critical skills and reorder top strengths.",
      "Align skill list with experience/project evidence.",
    ],
    keys: ["skill", "stack", "tools"],
  },
  volunteering: {
    title: "Volunteering",
    why: "Volunteering can signal initiative, leadership, and community engagement.",
    reminder: "Optional section, but useful if it reinforces your professional brand.",
    editTips: [
      "Add relevant volunteering with outcomes where possible.",
      "Highlight leadership, ownership, or collaboration impact.",
    ],
    keys: ["volunteer", "community", "leadership"],
  },
};

const SECTION_ORDER = [
  "about",
  "education",
  "experience",
  "headline",
  "skills",
  "volunteering",
];

const TONE_COLOR_MAP = {
  good: "#22c55e",
  mid: "#eab308",
  low: "#94a3b8",
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const scoreTo15 = (value) => clamp(Math.round((Number(value || 0) / 100) * 15), 0, 15);

const formatDate = (value) => {
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pickScoreTone = (score) => {
  if (score >= 12) return "good";
  if (score >= 6) return "mid";
  return "low";
};

const buildSectionScores = (report) => {
  const dims = report?.dimensionScores || {};
  const about = Number(dims.about || 0);
  const headline = Number(dims.headline || 0);
  const skills = Number(dims.skills || 0);
  const keyword = Number(dims.keywordAlignment || 0);
  const strengthsFactor = clamp((report?.strengths?.length || 0) * 18, 0, 100);

  return {
    about,
    education: Math.round(about * 0.72 + keyword * 0.28),
    experience: Math.round(about * 0.55 + skills * 0.45),
    headline,
    certifications: Math.round(skills * 0.62 + keyword * 0.38),
    location: Math.round(keyword * 0.35),
    skills,
    volunteering: strengthsFactor,
  };
};

const findSectionSuggestions = (sectionId, report) => {
  const allSuggestions = Array.isArray(report?.suggestions) ? report.suggestions : [];
  const allMissingSkills = Array.isArray(report?.missingSkills) ? report.missingSkills : [];
  const meta = SECTION_META[sectionId];
  if (!meta) return [];

  const filtered = allSuggestions.filter((item) =>
    meta.keys.some((key) => String(item || "").toLowerCase().includes(key))
  );

  if (filtered.length >= 2) return filtered.slice(0, 2);
  if (sectionId === "skills" && allMissingSkills.length) {
    return [
      `Prioritize missing skills: ${allMissingSkills.slice(0, 4).join(", ")}.`,
      "Add projects proving these skills in real scenarios.",
    ];
  }
  return (filtered.length ? filtered : allSuggestions).slice(0, 2);
};

const buildSectionData = (report) => {
  const scores = buildSectionScores(report);
  const role = report?.profile?.targetRole || "your target role";

  return SECTION_ORDER.map((sectionId) => {
    const meta = SECTION_META[sectionId];
    const score15 = scoreTo15(scores[sectionId]);
    const suggestions = findSectionSuggestions(sectionId, report);
    const summaryText = String(report?.summary || "").trim();
    const strengths = Array.isArray(report?.strengths) ? report.strengths : [];

    return {
      id: sectionId,
      title: meta.title,
      score15,
      tone: pickScoreTone(score15),
      why: meta.why,
      suggestions:
        suggestions.length > 0
          ? suggestions
          : [
              `Improve ${meta.title.toLowerCase()} to better align with ${role}.`,
              "Add specific, measurable details for stronger credibility.",
            ],
      sample:
        strengths.length > 0
          ? strengths[0]
          : summaryText ||
            `Actively building a profile aligned to ${role} with practical outcomes.`,
      reminder: meta.reminder,
      editTips: meta.editTips,
    };
  });
};

const getOverallLabel = (score = 0) => {
  if (score >= 85) return "Excellent Progress";
  if (score >= 70) return "Good Progress";
  if (score >= 50) return "Improving Well";
  return "Needs Improvement";
};

const LinkedinAnalyzer = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [pdfFile, setPdfFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("form");
  const [activeSectionId, setActiveSectionId] = useState("about");
  const [analysisMessageIndex, setAnalysisMessageIndex] = useState(0);
  const [deletingReportId, setDeletingReportId] = useState("");
  const fileInputRef = useRef(null);

  const canSubmit = useMemo(() => Boolean(pdfFile), [pdfFile]);

  const sortedHistory = useMemo(() => {
    const list = [...history];
    if (sortBy === "score") {
      list.sort((a, b) => Number(b?.profileScore || 0) - Number(a?.profileScore || 0));
      return list;
    }
    list.sort((a, b) => new Date(b?.analyzedAt || 0) - new Date(a?.analyzedAt || 0));
    return list;
  }, [history, sortBy]);

  const sectionData = useMemo(() => buildSectionData(report), [report]);

  const activeSection = useMemo(() => {
    const found = sectionData.find((item) => item.id === activeSectionId);
    return found || sectionData[0] || null;
  }, [sectionData, activeSectionId]);

  const fetchHistory = useCallback(
    async (silent = false) => {
      if (!apiBase) return;
      if (!silent) setIsHistoryLoading(true);
      try {
        const response = await axios.get(
          `${apiBase}/student/linkedin-analyzer/reports?limit=8`,
          {
            withCredentials: true,
          }
        );
        const reports = Array.isArray(response?.data?.reports) ? response.data.reports : [];
        setHistory(reports);
        setReport((prev) => prev || reports[0] || null);
        if (!silent) setHistoryError("");
      } catch (historyError) {
        if (!silent) {
          setHistoryError(
            historyError?.response?.data?.message ||
              "Could not load LinkedIn analysis history. You can still analyze a new PDF."
          );
        }
      } finally {
        if (!silent) setIsHistoryLoading(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!isSubmitting) return undefined;
    const interval = window.setInterval(() => {
      setAnalysisMessageIndex((prev) => (prev + 1) % ANALYSIS_MESSAGES.length);
    }, 1400);
    return () => window.clearInterval(interval);
  }, [isSubmitting]);

  const handlePdfSelect = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      setPdfFile(null);
      return;
    }

    setError("");
    setPdfFile(file);
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("LinkedIn PDF is required.");
      return;
    }

    setIsSubmitting(true);
    setAnalysisMessageIndex(0);
    setError("");

    try {
      let response;
      const startTs = Date.now();

      const payload = new FormData();
      payload.append("profilePdf", pdfFile);

      response = await axios.post(
        `${apiBase}/student/linkedin-analyzer/analyze-profile`,
        payload,
        { withCredentials: true }
      );

      const elapsed = Date.now() - startTs;
      if (elapsed < 2200) {
        await wait(2200 - elapsed);
      }

      const nextReport = response?.data || null;
      setReport(nextReport);
      setActiveSectionId("about");
      setViewMode("report");
      setPdfFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await fetchHistory(true);
    } catch (analyzeError) {
      setError(
        analyzeError?.response?.data?.message ||
          "LinkedIn analyzer request failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReportFromHistory = (item) => {
    setReport(item);
    setActiveSectionId("about");
    setViewMode("report");
  };

  const handleDeleteReport = async (reportId) => {
    if (!apiBase || !reportId) return;
    const shouldDelete = window.confirm("Delete this LinkedIn report?");
    if (!shouldDelete) return;

    setDeletingReportId(reportId);
    setError("");

    try {
      await axios.delete(`${apiBase}/student/linkedin-analyzer/reports/${reportId}`, {
        withCredentials: true,
      });

      setHistory((prev) => prev.filter((item) => String(item.reportId) !== String(reportId)));
      setReport((prev) =>
        String(prev?.reportId || "") === String(reportId) ? null : prev
      );
    } catch (deleteError) {
      setError(
        deleteError?.response?.data?.message || "Could not delete LinkedIn report."
      );
    } finally {
      setDeletingReportId("");
    }
  };

  if (viewMode === "report" && report && activeSection) {
    return (
      <section className="linkedin-report-view">
        <div className="linkedin-report-header">
          <h2>LinkedIn Profile Report</h2>
          <button
            type="button"
            className="linkedin-back-btn"
            onClick={() => setViewMode("form")}
          >
            <FiArrowLeft />
            <span>Back</span>
          </button>
        </div>

        <section className="linkedin-overall-card">
          <h3>
            Overall Score: <span>{Number(report?.profileScore || 0)}/100</span>
          </h3>
          <div className="linkedin-overall-bar">
            <span style={{ width: `${clamp(Number(report?.profileScore || 0), 0, 100)}%` }} />
          </div>
          <div className="linkedin-overall-foot">
            <p>{getOverallLabel(Number(report?.profileScore || 0))}</p>
            <p>Aim for 90+ Overall Score</p>
          </div>
        </section>

        <section className="linkedin-report-layout">
          <aside className="linkedin-report-nav">
            {sectionData.map((section) => {
              const toneColor = TONE_COLOR_MAP[section.tone] || TONE_COLOR_MAP.low;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`linkedin-report-nav-item ${
                    activeSectionId === section.id ? "active" : ""
                  }`}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  <div className="linkedin-report-nav-top">
                    <span>{section.title}</span>
                    <FiChevronRight />
                  </div>
                  <div className="linkedin-report-nav-bar">
                    <span
                      style={{
                        width: `${(section.score15 / 15) * 100}%`,
                        background: toneColor,
                      }}
                    />
                  </div>
                  <small style={{ color: toneColor }}>{section.score15}/15</small>
                </button>
              );
            })}
          </aside>

          <article className="linkedin-report-content">
            <h3>
              {activeSection.title}: <span>{activeSection.score15}/15</span>
            </h3>

            <div className="linkedin-report-highlight">
              <strong>
                {activeSection.score15 >= 12
                  ? "Excellent!"
                  : activeSection.score15 >= 7
                  ? "Good Start!"
                  : "Needs Improvement"}
              </strong>
              <p>
                {activeSection.score15 >= 12
                  ? `This section is well-aligned with your target role and reads strong.`
                  : activeSection.score15 >= 7
                  ? `This section is decent but can be improved with stronger clarity and impact examples.`
                  : `This section needs clearer positioning and more role-relevant details.`}
              </p>
            </div>

            <div className="linkedin-detail-block">
              <h4>Why It Matters:</h4>
              <p>{activeSection.why}</p>
            </div>

            <div className="linkedin-detail-block">
              <h4>Suggestions:</h4>
              {activeSection.suggestions.map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
            </div>

            <div className="linkedin-detail-block">
              <h4>Sample Reference:</h4>
              <p>{activeSection.sample}</p>
            </div>

            <div className="linkedin-detail-block">
              <h4>Reminder:</h4>
              <p>{activeSection.reminder}</p>
            </div>

            <div className="linkedin-detail-block">
              <h4>Where to Edit on LinkedIn:</h4>
              {activeSection.editTips.map((tip, index) => (
                <p key={`${tip}-${index}`}>{tip}</p>
              ))}
            </div>
          </article>
        </section>
      </section>
    );
  }

  return (
    <section className="linkedin-analyzer-page">
      {isSubmitting ? (
        <div className="linkedin-ai-overlay">
          <div className="linkedin-ai-modal">
            <div className="linkedin-ai-icon-wrap">
              <FiCpu />
            </div>
            <div className="linkedin-ai-copy">
              <h4>{ANALYSIS_MESSAGES[analysisMessageIndex]}</h4>
              <p>AI is analyzing your profile. Please wait...</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="linkedin-analyzer-header">
        <h2>AI LinkedIn Analyzer</h2>
        <p>Upload your LinkedIn PDF and get a complete AI profile analysis instantly.</p>
      </div>

      <form className="linkedin-form-card linkedin-form-card-v2" onSubmit={handleAnalyze}>
        <div className="linkedin-upload-grid">
          <div className="linkedin-upload-col linkedin-upload-col-file linkedin-upload-col-full">
            <label htmlFor="profilePdf" className="linkedin-field-title">
              Upload LinkedIn Profile PDF <span>*</span>
            </label>
            <p className="linkedin-field-help">
              On your LinkedIn profile, go to Resources - Save to PDF to download your
              profile as a PDF.
            </p>
            <input
              id="profilePdf"
              type="file"
              accept="application/pdf"
              onChange={handlePdfSelect}
              className="linkedin-file-input"
              ref={fileInputRef}
            />
            <label htmlFor="profilePdf" className="linkedin-upload-dropzone">
              <FiUpload />
              <span>{pdfFile ? "Replace PDF" : "Click to upload LinkedIn PDF"}</span>
            </label>
            <p className="linkedin-file-name">
              {pdfFile ? pdfFile.name : "No file selected. Only PDF is supported."}
            </p>
          </div>
        </div>

        {error ? <p className="linkedin-error">{error}</p> : null}

        <div className="linkedin-form-actions">
          <button type="submit" disabled={!canSubmit || isSubmitting}>
            <FiZap />
            <span>{isSubmitting ? "Analyzing..." : "Analyze LinkedIn Profile"}</span>
          </button>
        </div>
      </form>

      <section className="linkedin-history-wrap">
        <div className="linkedin-history-head">
          <div>
            <h3>LinkedIn Analysis History</h3>
            <p>Track your past analyses, scores, and improvements over time.</p>
          </div>
          <div className="linkedin-sort-wrap">
            <FiFilter />
            <label htmlFor="linkedin-sort">Sort by</label>
            <select
              id="linkedin-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="latest">Latest</option>
              <option value="score">Highest Score</option>
            </select>
          </div>
        </div>

        <article className="linkedin-history-card">
          <h3>Report History</h3>
          {isHistoryLoading ? <p className="linkedin-muted">Loading history...</p> : null}
          {!isHistoryLoading && historyError ? (
            <p className="linkedin-error">{historyError}</p>
          ) : null}
          {!isHistoryLoading && !history.length ? (
            <p className="linkedin-muted">No reports yet.</p>
          ) : null}
          <div className="linkedin-history-list">
            {sortedHistory.map((item) => (
              <div
                key={item.reportId}
                className={`linkedin-history-item ${
                  String(report?.reportId || "") === String(item.reportId) ? "active" : ""
                }`}
              >
                <button
                  type="button"
                  className="linkedin-history-open"
                  onClick={() => openReportFromHistory(item)}
                >
                  <strong>Score {Number(item.profileScore || 0)}</strong>
                  <span>{item?.profile?.targetRole || "General Role"}</span>
                  <small>{formatDate(item.analyzedAt)}</small>
                </button>
                <button
                  type="button"
                  className="linkedin-history-delete"
                  aria-label="Delete report"
                  title="Delete report"
                  disabled={deletingReportId === item.reportId}
                  onClick={() => handleDeleteReport(item.reportId)}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
};

export default LinkedinAnalyzer;
