import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";
import { ThreeDots } from "react-loader-spinner";
import axios from "../utils/axiosInstance";
import ModernDatePicker from "../components/common/ModernDatePicker";
import ClipLoader from "./components/ClipLoader";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";
import "./StudentDisciplineCenter.css";

const normalizeStudent = (student) => ({
  ...student,
  _id: student?._id || "",
  studentName: student?.user?.name || student?.studentName || "N/A",
  enrollmentNumber: student?.enrollmentNumber || student?.rollNo || "N/A",
  departmentName: student?.department?.name || student?.department || "N/A",
  semester: student?.semester ?? "N/A",
  disciplineStatus: student?.disciplineStatus || { currentStatus: "clear", reason: "" },
});

const toDateInputValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const StudentDisciplineCenter = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [forms, setForms] = useState({});
  const [page, setPage] = useState(1);

  const fetchStudents = useCallback(async () => {
    if (!apiBase) return;
    try {
      setLoading(true);
      setLoadError("");
      const response = await axios.get(`${apiBase}/admin/student`, {
        params: { full: "true" },
        withCredentials: true,
      });
      const list = Array.isArray(response.data?.students)
        ? response.data.students.map(normalizeStudent)
        : [];
      setStudents(list);
      setForms(
        Object.fromEntries(
          list.map((student) => [
            student._id,
            {
              currentStatus: student?.disciplineStatus?.currentStatus || "clear",
              reason: student?.disciplineStatus?.reason || "",
              startDate: toDateInputValue(student?.disciplineStatus?.startDate),
              endDate: toDateInputValue(student?.disciplineStatus?.endDate),
            },
          ])
        )
      );
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load student records";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !needle ||
        String(student.studentName || "").toLowerCase().includes(needle) ||
        String(student.enrollmentNumber || "").toLowerCase().includes(needle) ||
        String(student.departmentName || "").toLowerCase().includes(needle);
      const status = String(student?.disciplineStatus?.currentStatus || "clear").toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStartIndex = (page - 1) * pageSize;
  const paginatedStudents = filtered.slice(pageStartIndex, pageStartIndex + pageSize);
  const rangeStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const loadState = useMemo(() => {
    if (!hasFetchedOnce && !loading) return ADMIN_LOAD_STATES.INITIAL;
    if (loading) return ADMIN_LOAD_STATES.PENDING;
    if (loadError) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.SUCCESS;
  }, [hasFetchedOnce, loading, loadError]);

  const loadStateText =
    ADMIN_LOAD_STATE_OPTIONS.find((option) => option.id === loadState)?.text || "Unknown";

  const updateForm = (studentId, key, value) => {
    setForms((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          currentStatus: "clear",
          reason: "",
          startDate: "",
          endDate: "",
        }),
        ...(key === "currentStatus" && String(value).toLowerCase() === "clear"
          ? { currentStatus: value, reason: "", startDate: "", endDate: "" }
          : { [key]: value }),
      },
    }));
  };

  const handleSaveDiscipline = async (studentId) => {
    if (!apiBase || !studentId) return;
    const payload = forms[studentId] || { currentStatus: "clear", reason: "" };
    const normalizedStatus = String(payload.currentStatus || "clear").toLowerCase();
    const trimmedReason = String(payload.reason || "").trim();

    if (normalizedStatus !== "clear" && !trimmedReason) {
      toast.error("Reason is required for suspension or detention.");
      return;
    }

    if (normalizedStatus === "clear") {
      payload.reason = "";
      payload.startDate = "";
      payload.endDate = "";
    }

    try {
      setSavingId(studentId);
      const response = await axios.patch(
        `${apiBase}/admin/student/${studentId}/discipline-status`,
        payload,
        { withCredentials: true }
      );
      const updated = normalizeStudent(response.data?.student || {});
      setStudents((prev) =>
        prev.map((student) => (student._id === studentId ? updated : student))
      );
      toast.success("Discipline status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update discipline status");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="student-discipline-page">
      <div className="sdc-sticky-top">
      <header className="sdc-header">
        <div>
          <h1>Student Suspension / Detention</h1>
          <p>Manage disciplinary status as a dedicated module.</p>
        </div>
        <div className="sdc-header-meta">
          <span className={`sdc-load-chip ${loadState}`}>{loadStateText}</span>
          <span>{filtered.length} record(s)</span>
        </div>
      </header>

      <section className="sdc-toolbar">
        <label className="sdc-search">
          <FiSearch />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, enrollment, department"
          />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Status</option>
          <option value="clear">Clear</option>
          <option value="suspended">Suspended</option>
          <option value="detained">Detained</option>
        </select>
        <button type="button" onClick={fetchStudents} disabled={loading}>
          {loading ? <ClipLoader size={14} /> : "Refresh"}
        </button>
      </section>
      </div>

      <section className="sdc-table-wrap">
        {loadState === ADMIN_LOAD_STATES.PENDING ? (
          <div className="sdc-state sdc-state-loading">
            <ThreeDots
              visible
              height={36}
              width={60}
              color="#2563eb"
              radius={8}
              ariaLabel="student-discipline-loading"
            />
          </div>
        ) : loadState === ADMIN_LOAD_STATES.FAILURE ? (
          <div className="sdc-state">{loadError || "Failed to load student records."}</div>
        ) : filtered.length === 0 ? (
          <div className="sdc-state">No students found for current filters.</div>
        ) : (
          <table className="sdc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Enrollment</th>
                <th>Department</th>
                <th>Sem</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Start</th>
                <th>End</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => {
                const form = forms[student._id] || {
                  currentStatus: "clear",
                  reason: "",
                  startDate: "",
                  endDate: "",
                };
                const status = String(form.currentStatus || "clear").toLowerCase();
                return (
                  <tr key={student._id}>
                    <td>{student.studentName}</td>
                    <td>{student.enrollmentNumber}</td>
                    <td>{student.departmentName}</td>
                    <td>{student.semester}</td>
                    <td>
                      <select
                        value={form.currentStatus}
                        onChange={(event) =>
                          updateForm(student._id, "currentStatus", event.target.value)
                        }
                      >
                        <option value="clear">Clear</option>
                        <option value="suspended">Suspended</option>
                        <option value="detained">Detained</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={form.reason}
                        onChange={(event) => updateForm(student._id, "reason", event.target.value)}
                        placeholder="Reason (required for suspension or detention)"
                        disabled={status === "clear"}
                      />
                    </td>
                    <td>
                      <ModernDatePicker
                        value={form.startDate}
                        onChange={(event) => updateForm(student._id, "startDate", event.target.value)}
                        disabled={status === "clear"}
                      />
                    </td>
                    <td>
                      <ModernDatePicker
                        value={form.endDate}
                        onChange={(event) => updateForm(student._id, "endDate", event.target.value)}
                        disabled={status === "clear"}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sdc-save-btn"
                        onClick={() => handleSaveDiscipline(student._id)}
                        disabled={savingId === student._id}
                      >
                        {savingId === student._id ? <ClipLoader size={14} /> : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      {loadState === ADMIN_LOAD_STATES.SUCCESS && filtered.length > 0 && (
        <div className="sdc-pagination">
          <button
            type="button"
            className="sdc-page-btn"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            <FiChevronLeft aria-hidden="true" />
            <span>Prev</span>
          </button>
          <div className="sdc-page-info">
            {rangeStart} to {rangeEnd} of {filtered.length}
          </div>
          <button
            type="button"
            className="sdc-page-btn"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            <span>Next</span>
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentDisciplineCenter;
