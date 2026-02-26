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
    <section className="w-full max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">My Leaves</h1>
          <p className="mt-1 text-sm text-slate-600">Track your leave requests and approval status.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => navigate("/faculty/faculty-dashboard")}
        >
          <FiArrowLeft />
          Back to Dashboard
        </button>
      </div>

      {loadState === FACULTY_LOAD_STATES.PENDING && (
        <div className="app-loader-state">
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
          <p className="m-0 mt-2 text-sm text-slate-600">Loading leaves...</p>
        </div>
      )}
      {loadState === FACULTY_LOAD_STATES.FAILURE && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>
      )}

      {loadState === FACULTY_LOAD_STATES.SUCCESS && !error && !hasLeaves && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">No leave requests found.</p>
      )}

      {loadState === FACULTY_LOAD_STATES.SUCCESS && !error && hasLeaves && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leaves.map((leave) => {
            const normalizedStatus = normalizeLeaveStatus(leave?.status);
            return (
              <article className="rounded-xl border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)]" key={leave._id}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="m-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{leave.type || "leave"}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      normalizedStatus.key === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : normalizedStatus.key === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {normalizedStatus.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-slate-700">
                  <p className="m-0">
                    <span className="font-semibold text-slate-900">Applied:</span> {toDisplayDate(leave.createdAt)}
                  </p>
                  <p className="m-0">
                    <span className="font-semibold text-slate-900">From:</span> {toDisplayDate(leave.dateFrom)}
                  </p>
                  <p className="m-0">
                    <span className="font-semibold text-slate-900">To:</span> {toDisplayDate(leave.dateTo)}
                  </p>
                </div>

                <p className="mt-3 text-sm text-slate-600">{leave.reason || "No reason provided."}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default FacultyLeaves;

