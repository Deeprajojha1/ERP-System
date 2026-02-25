import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
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
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState("");
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const fetchStudents = async () => {
    if (!apiBase) return;
    try {
      setLoading(true);
      const response = await axios.get(`${apiBase}/admin/student`, {
        params: { full: "true" },
        withCredentials: true,
      });
      const list = Array.isArray(response.data?.students)
        ? response.data.students.map(normalizeStudent)
        : [];
      setStudents(list);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [apiBase]);

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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((student) => selectedIds.includes(student._id));

  const toggleSelect = (studentId) => {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((s) => s._id === id)));
      return;
    }
    const merged = new Set([...selectedIds, ...filtered.map((student) => student._id)]);
    setSelectedIds(Array.from(merged));
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
    } catch (error) {
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
    } catch (error) {
      toast.error("Failed to bulk download ID cards");
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div className="student-idcard-page">
      <header className="sid-header">
        <div>
          <h1>Student ID Card Module</h1>
          <p>Single and bulk ID card download in a separate module.</p>
        </div>
        <button type="button" onClick={handleBulkDownload} disabled={bulkDownloading}>
          {bulkDownloading ? "Preparing bulk PDF..." : `Bulk Download (${selectedIds.length})`}
        </button>
      </header>

      <section className="sid-toolbar">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, enrollment, department"
        />
        <button type="button" onClick={fetchStudents} disabled={loading}>
          Refresh
        </button>
      </section>

      <section className="sid-table-wrap">
        {loading ? (
          <div className="sid-state">Loading student records...</div>
        ) : filtered.length === 0 ? (
          <div className="sid-state">No students found for current filters.</div>
        ) : (
          <table className="sid-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
                </th>
                <th>Name</th>
                <th>Enrollment</th>
                <th>Department</th>
                <th>Sem</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
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
                      {downloadingId === student._id ? "Downloading..." : "Download"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default StudentIdCardCenter;
