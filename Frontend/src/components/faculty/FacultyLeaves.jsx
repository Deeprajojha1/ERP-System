import { useEffect, useMemo, useState } from "react";
import axios from "../../utils/axiosInstance";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import { FACULTY_LOAD_STATES } from "./constants/loadStates";
import "./FacultyLeaves.css";

const statusLabelMap = {
  pending: "Pending",
  appeared: "Approved",
  reject: "Rejected",
};

const toDisplayDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString();
  }
  return value;
};

function FacultyLeaves() {
  const navigate = useNavigate();
  const apiBase = useSelector((state) => state.config.apiBase);
  const [leaves, setLeaves] = useState([]);
  const [loadState, setLoadState] = useState(FACULTY_LOAD_STATES.INITIAL);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoadState(FACULTY_LOAD_STATES.PENDING);
        setError("");
        const res = await axios.get(`${apiBase}/faculty/leave`, {
          withCredentials: true,
        });
        setLeaves(res.data?.leaves || []);
        setLoadState(FACULTY_LOAD_STATES.SUCCESS);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load leave requests."
        );
        setLoadState(FACULTY_LOAD_STATES.FAILURE);
      }
    };

    if (apiBase) {
      fetchLeaves();
    }
  }, [apiBase]);

  const hasLeaves = useMemo(() => leaves.length > 0, [leaves]);

  return (
    <section className="faculty-leaves-page">
      <div className="faculty-leaves-head">
        <div>
          <h1>My Leaves</h1>
          <p>Track your leave requests and approval status.</p>
        </div>
        <button
          type="button"
          className="back-dashboard-btn"
          onClick={() => navigate("/faculty/faculty-dashboard")}
        >
          <FiArrowLeft />
          Back to Dashboard
        </button>
      </div>

      {loadState === FACULTY_LOAD_STATES.PENDING && (
        <div className="leaves-state pending">
          <Oval
            height={64}
            width={64}
            color="#2563eb"
            secondaryColor="#bfdbfe"
            strokeWidth={4}
            strokeWidthSecondary={4}
            ariaLabel="Loading"
            visible
          />
          <p>Loading leaves...</p>
        </div>
      )}
      {loadState === FACULTY_LOAD_STATES.FAILURE && (
        <p className="leaves-state error">{error}</p>
      )}

      {loadState === FACULTY_LOAD_STATES.SUCCESS && !error && !hasLeaves && (
        <p className="leaves-state">No leave requests found.</p>
      )}

      {loadState === FACULTY_LOAD_STATES.SUCCESS && !error && hasLeaves && (
        <div className="leaves-grid">
          {leaves.map((leave) => (
            <article className="leave-card" key={leave._id}>
              <div className="leave-card-head">
                <p className="leave-type">{leave.type || "leave"}</p>
                <span
                  className={`leave-status status-${leave.status || "pending"}`}
                >
                  {statusLabelMap[leave.status] || "Pending"}
                </span>
              </div>

              <div className="leave-details">
                <p>
                  <span>Applied:</span> {toDisplayDate(leave.createdAt)}
                </p>
                <p>
                  <span>From:</span> {toDisplayDate(leave.dateFrom)}
                </p>
                <p>
                  <span>To:</span> {toDisplayDate(leave.dateTo)}
                </p>
              </div>

              <p className="leave-reason">{leave.reason || "No reason provided."}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default FacultyLeaves;
