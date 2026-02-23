import {
  FaArrowLeftLong,
} from "react-icons/fa6";
import {
  FiDownload,
} from "react-icons/fi";
import {
  MdVerified,
} from "react-icons/md";
import {
  BsFileEarmarkPdfFill,
} from "react-icons/bs";

import "./DetailsAssignment.css";

const DetailsAssignment = () => {
  /* ---------- Static Dummy Data ---------- */
  const data = {
    status: "Completed",
    title: "AI-Driven Marketing Strategy Report",
    subtitle:
      "Build a full funnel AI marketing architecture for a SaaS product.",

    startedOn: "12 Feb 2026",
    submittedOn: "16 Feb 2026",

    outOf: "92 / 100",
    grade: "A+",

    submission: {
      fileName: "AI_Marketing_Strategy.pdf",
      fileSize: "4.8 MB",
      submittedAt: "16 Feb 2026 • 10:42 PM",
    },

    instructions:
      "Create an AI-powered campaign architecture including customer segmentation, predictive analytics, automated content generation, and ROI optimization dashboard.",
  };

  /* ---------- UI ---------- */
  return (
    <div className="assignment-page">
      <div className="container">
        {/* Top Nav */}
        <div className="top-nav">
          <div className="nav-left">
            <button className="icon-btn">
              <FaArrowLeftLong />
            </button>

            <h1>Assignment</h1>
          </div>

          <button className="icon-btn">🔔</button>
        </div>

        {/* Overview */}
        <div className="overview-card">
          <span className="status-pill">
            {data.status}
          </span>

          <h2>{data.title}</h2>
          <p className="subtitle">{data.subtitle}</p>

          {/* Timeline */}
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-icon success">
                <MdVerified />
              </div>
              <p>
                Started on: <b>{data.startedOn}</b>
              </p>
            </div>

            <div className="timeline-item">
              <div className="timeline-icon">
                <BsFileEarmarkPdfFill />
              </div>
              <p>
                Submitted on: <b>{data.submittedOn}</b>
              </p>
            </div>
          </div>

          {/* Score */}
          <div className="score-card">
            <div>
              <small>Total Score</small>
              <strong>{data.outOf}</strong>
            </div>

            <div className="divider" />

            <div>
              <small>Grade</small>
              <strong>{data.grade}</strong>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <section className="section">
          <h3>Your Tasks</h3>

          <div className="file-card">
            <div className="file-meta">
              <div className="file-icon">
                <BsFileEarmarkPdfFill />
              </div>

              <div>
                <h4>
                  {data.submission.fileName}
                </h4>
                <p>
                  {data.submission.fileSize} •{" "}
                  {data.submission.submittedAt}
                </p>
              </div>
            </div>

            <div className="actions">
              <button>View File</button>

              <button className="primary">
                <FiDownload />
                Download
              </button>
            </div>
          </div>
        </section>

        {/* Submission */}
        <section className="section">
          <h3>Your Submission</h3>

          <div className="file-card">
            <div className="file-meta">
              <div className="file-icon">
                <BsFileEarmarkPdfFill />
              </div>

              <div>
                <h4>
                  {data.submission.fileName}
                </h4>
                <p>
                  {data.submission.fileSize} •{" "}
                  {data.submission.submittedAt}
                </p>
              </div>
            </div>

            <div className="actions">
              <button className="primary">
                Submitted
              </button>
            </div>
          </div>
        </section>

        {/* Instructions */}
        <section className="section">
          <h3>Instructions</h3>

          <div className="instructions">
            {data.instructions}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DetailsAssignment;
