import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";
import { ThreeDots } from "react-loader-spinner";
import axios from "../utils/axiosInstance";
import ClipLoader from "./components/ClipLoader";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";
import "./StudentIdCardCenter.css";

const normalizeStudent = (student) => ({
  ...student,
  _id: student?._id || "",
  studentName: student?.user?.name || student?.studentName || "N/A",
  enrollmentNumber: student?.enrollmentNumber || student?.rollNo || "N/A",
  departmentName: student?.department?.name || student?.department || "N/A",
  semester: student?.semester ?? "N/A",
});

const triggerPdfDownload = (blobData, fileName) => {
  const blob = new Blob([blobData], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

const StudentIdCardCenter = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState("");
  const [bulkDownloading, setBulkDownloading] = useState(false);
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
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load students";
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
      if (!needle) return true;
      return (
        String(student.studentName || "").toLowerCase().includes(needle) ||
        String(student.enrollmentNumber || "").toLowerCase().includes(needle) ||
        String(student.departmentName || "").toLowerCase().includes(needle)
      );
    });
  }, [students, search]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStartIndex = (page - 1) * pageSize;
  const paginatedStudents = filtered.slice(pageStartIndex, pageStartIndex + pageSize);
  const rangeStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search]);

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

  const toggleSelect = (studentId) => {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleDownloadSingle = async (student) => {
    if (!apiBase || !student?._id) return;
    try {
      setDownloadingId(student._id);
      const response = await axios.get(`${apiBase}/admin/student/${student._id}/id-card`, {
        withCredentials: true,
        responseType: "blob",
      });
      triggerPdfDownload(response.data, `${student.enrollmentNumber || student._id}_id_card.pdf`);
    } catch {
      toast.error("Failed to download ID card");
    } finally {
      setDownloadingId("");
    }
  };

  const handleBulkDownload = async () => {
    if (!apiBase) return;
    if (selectedIds.length === 0) {
      toast.error("Select at least one student");
      return;
    }
    try {
      setBulkDownloading(true);
      const response = await axios.post(
        `${apiBase}/admin/student/id-card/bulk`,
        { studentIds: selectedIds },
        { withCredentials: true, responseType: "blob" }
      );
      triggerPdfDownload(response.data, "student_id_cards_bulk.pdf");
      toast.success("Bulk ID card download ready");
    } catch {
      toast.error("Failed to bulk download ID cards");
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div className="student-idcard-page">
      <div className="sid-sticky-top">
        <header className="sid-header">
          <div>
            <h1>Student ID Card Module</h1>
            <p>Single and bulk ID card download in a separate module.</p>
          </div>
          <div className="sid-header-meta">
            <span className={`sid-load-chip ${loadState}`}>{loadStateText}</span>
            <span>{filtered.length} record(s)</span>
            <button type="button" onClick={handleBulkDownload} disabled={bulkDownloading}>
              {bulkDownloading ? <ClipLoader size={14} /> : `Bulk Download (${selectedIds.length})`}
            </button>
          </div>
        </header>

        <section className="sid-toolbar">
          <label className="sid-search">
            <FiSearch />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, enrollment, department"
            />
          </label>
          <button type="button" onClick={fetchStudents} disabled={loading}>
            {loading ? <ClipLoader size={14} /> : "Refresh"}
          </button>
        </section>
      </div>

      <section className="sid-table-wrap">
        {loadState === ADMIN_LOAD_STATES.PENDING ? (
          <div className="sid-state sid-state-loading">
            <ThreeDots
              visible
              height={36}
              width={60}
              color="#2563eb"
              radius={8}
              ariaLabel="student-id-cards-loading"
            />
          </div>
        ) : loadState === ADMIN_LOAD_STATES.FAILURE ? (
          <div className="sid-state">{loadError || "Failed to load student records."}</div>
        ) : filtered.length === 0 ? (
          <div className="sid-state">No students found for current filters.</div>
        ) : (
          <table className="sid-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Enrollment</th>
                <th>Department</th>
                <th>Sem</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => (
                <tr key={student._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student._id)}
                      onChange={() => toggleSelect(student._id)}
                    />
                  </td>
                  <td>{student.studentName}</td>
                  <td>{student.enrollmentNumber}</td>
                  <td>{student.departmentName}</td>
                  <td>{student.semester}</td>
                  <td>
                    <button
                      type="button"
                      className="sid-download-btn"
                      onClick={() => handleDownloadSingle(student)}
                      disabled={downloadingId === student._id}
                    >
                      {downloadingId === student._id ? <ClipLoader size={14} /> : "Download"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {loadState === ADMIN_LOAD_STATES.SUCCESS && filtered.length > 0 && (
        <div className="sid-pagination">
          <button
            type="button"
            className="sid-page-btn"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            <FiChevronLeft aria-hidden="true" />
            <span>Prev</span>
          </button>
          <div className="sid-page-info">
            {rangeStart} to {rangeEnd} of {filtered.length}
          </div>
          <button
            type="button"
            className="sid-page-btn"
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

export default StudentIdCardCenter;
