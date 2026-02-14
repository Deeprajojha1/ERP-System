import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import { FACULTY_LOAD_STATES } from "./constants/loadStates";
import {
  fetchFacultyLeaves,
  selectFacultyLeaves,
  selectFacultyLeavesError,
  selectFacultyLeavesLoading,
} from "../../redux/leavesSlice";
import "./FacultyLeaves.css";

const normalizeLeaveStatus = (value = "") => {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "approved" || normalized === "appeared") {
    return { key: "approved", label: "Approved" };
  }
  if (normalized === "rejected" || normalized === "reject") {
    return { key: "rejected", label: "Rejected" };
  }
  return { key: "pending", label: "Pending" };
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
  const dispatch = useDispatch();
  const leaves = useSelector(selectFacultyLeaves);
  const loading = useSelector(selectFacultyLeavesLoading);
  const error = useSelector(selectFacultyLeavesError);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    dispatch(fetchFacultyLeaves()).finally(() => {
      setHasFetchedOnce(true);
    });
  }, [dispatch]);

  useEffect(() => {
    if (!hasFetchedOnce) return;

    const intervalId = setInterval(() => {
      dispatch(fetchFacultyLeaves());
    }, 15000);

    const handleFocus = () => {
      dispatch(fetchFacultyLeaves());
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [dispatch, hasFetchedOnce]);

  const loadState = useMemo(() => {
    if (loading && !hasFetchedOnce) return FACULTY_LOAD_STATES.PENDING;
    if (error) return FACULTY_LOAD_STATES.FAILURE;
    if (hasFetchedOnce) return FACULTY_LOAD_STATES.SUCCESS;
    return FACULTY_LOAD_STATES.INITIAL;
  }, [loading, error, hasFetchedOnce]);

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
          {leaves.map((leave) => {
            const normalizedStatus = normalizeLeaveStatus(leave?.status);
            return (
              <article className="leave-card" key={leave._id}>
                <div className="leave-card-head">
                  <p className="leave-type">{leave.type || "leave"}</p>
                  <span
                    className={`leave-status status-${normalizedStatus.key}`}
                  >
                    {normalizedStatus.label}
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
            );
          })}
        </div>
      )}
    </section>
  );
}

export default FacultyLeaves;
