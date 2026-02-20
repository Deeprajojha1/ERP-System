import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "../utils/axiosInstance";
import { ThreeDots, TailSpin } from "react-loader-spinner";
import {
  fetchAssignments,
  fetchSingleAssignment,
  deleteAssignment,
  clearViewAssignment,
  selectAssignments,
  selectViewAssignment,
  selectAssignmentLoading,
  selectViewLoading,
  selectDeleteLoading,
} from "../redux/assignmentSlice";
import toast from "react-hot-toast";
import "./Assignment.css";

const Assignment = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);

  // Redux state
  const assignments = useSelector(selectAssignments);
  const viewAssignment = useSelector(selectViewAssignment);
  const loading = useSelector(selectAssignmentLoading);
  const viewLoading = useSelector(selectViewLoading);
  const deleteLoading = useSelector(selectDeleteLoading);

  // Local state for filters and dropdowns
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  /* ================= RESOLVE FILE URL ================= */
  const resolveFileUrl = useCallback((fileUrl) => {
    if (!fileUrl) return null;
    // If already absolute URL (http/https) or data URL, return as-is
    if (fileUrl.startsWith('http') || fileUrl.startsWith('data:')) return fileUrl;
    // Otherwise prepend the backend base URL
    const baseUrl = apiBase?.replace('/api', '') || '';
    return `${baseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  }, [apiBase]);

  /* ================= OPEN FILE IN NEW TAB ================= */
  const handleOpenFile = (e, fileUrl) => {
    e.preventDefault();
    const resolvedUrl = resolveFileUrl(fileUrl);
    if (resolvedUrl) {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  /* ================= FETCH DEPARTMENTS ================= */
  const fetchDepartments = async () => {
    const res = await axios.get(`${apiBase}/admin/department`, {
      withCredentials: true,
    });
    setDepartments(res.data?.departments || []);
  };

  /* ================= FETCH GROUPS ================= */
  const fetchGroups = async (deptId) => {
    const res = await axios.get(`${apiBase}/admin/group`, {
      withCredentials: true,
    });

    const filtered = (res.data?.groups || []).filter(
      (g) => g.department === deptId || g.department?._id === deptId
    );

    setGroups(filtered);
  };

  /* ================= FETCH FACULTY ================= */
  const fetchFaculty = async (deptId) => {
    const res = await axios.get(`${apiBase}/admin/faculty`, {
      withCredentials: true,
    });

    const filtered = (res.data?.faculty || []).filter(
      (f) => f.department === deptId || f.department?._id === deptId
    );

    setFaculty(filtered);
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this assignment?")) return;

    setDeletingId(id);
    try {
      await dispatch(deleteAssignment({ apiBase, id })).unwrap();
      toast.success("Assignment deleted successfully");
    } catch (error) {
      toast.error(error || "Failed to delete assignment");
    } finally {
      setDeletingId(null);
    }
  };

  /* ================= VIEW ================= */
  const handleView = (id) => {
    dispatch(fetchSingleAssignment({ apiBase, id }));
  };

  /* ================= CLOSE MODAL ================= */
  const handleCloseModal = () => {
    dispatch(clearViewAssignment());
  };

  /* ================= EFFECTS ================= */
  useEffect(() => {
    if (apiBase) fetchDepartments();
  }, [apiBase]);

  useEffect(() => {
    if (selectedDept) {
      fetchGroups(selectedDept);
      fetchFaculty(selectedDept);
      dispatch(fetchAssignments({
        apiBase,
        departmentId: selectedDept,
        groupId: selectedGroup,
        facultyId: selectedFaculty,
      }));
    }
  }, [selectedDept, selectedGroup, selectedFaculty, apiBase, dispatch]);

  return (
    <div className="assignment-container">
      <div className="assignment-header">
        <h2 className="assignment-title">Assignment Management</h2>
        <p className="assignment-subtitle">Track and manage assignment submissions</p>
      </div>

      <div className="assignment-filters">
        <div className="assignment-filter-group">
          <label className="assignment-filter-label" htmlFor="assignment-department">
            Department
          </label>
          <select
            id="assignment-department"
            className="assignment-filter-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
          </select>
        </div>

        {selectedDept && (
          <>
            <div className="assignment-filter-group">
              <label className="assignment-filter-label" htmlFor="assignment-group">
                Group
              </label>
              <select
                id="assignment-group"
                className="assignment-filter-select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="">All Groups</option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="assignment-filter-group">
              <label className="assignment-filter-label" htmlFor="assignment-faculty">
                Faculty
              </label>
              <select
                id="assignment-faculty"
                className="assignment-filter-select"
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
              >
                <option value="">All Faculty</option>
                {faculty.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.user?.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="assignment-loading">
          <ThreeDots
            height="50"
            width="50"
            radius="9"
            color="#3b82f6"
            ariaLabel="loading"
            visible={true}
          />
          <p>Loading assignments...</p>
        </div>
      ) : assignments.length > 0 ? (
        <div className="assignment-table-wrapper">
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Faculty</th>
                <th>Group</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Submissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a._id}>
                  <td className="assignment-title-cell">{a.title}</td>
                  <td>{a.uploadedBy?.user?.name || a.uploadedBy?.name}</td>
                  <td>{a.group?.name}</td>
                  <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`assignment-status ${a.status || ""}`}>{a.status}</span>
                  </td>
                  <td className="assignment-submissions-count">{a.totalSubmissions}</td>
                  <td>
                    <div className="assignment-actions">
                      <button 
                        className="assignment-btn assignment-btn-view" 
                        onClick={() => handleView(a._id)}
                        disabled={viewLoading}
                      >
                        View
                      </button>
                      <button 
                        className="assignment-btn assignment-btn-delete" 
                        onClick={() => handleDelete(a._id)}
                        disabled={deletingId === a._id}
                      >
                        {deletingId === a._id ? (
                          <TailSpin height="16" width="16" color="#991b1b" ariaLabel="deleting" />
                        ) : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedDept ? (
        <div className="assignment-empty">
          <p>No assignments found</p>
        </div>
      ) : null}

      {/* VIEW MODAL */}
      {(viewAssignment || viewLoading) && (
        <div className="modal-overlay">
          <div className="modal-card">
            {viewLoading ? (
              <div className="modal-loading">
                <ThreeDots
                  height="40"
                  width="40"
                  radius="9"
                  color="#3b82f6"
                  ariaLabel="loading"
                  visible={true}
                />
                <p>Loading assignment...</p>
              </div>
            ) : (
              <>
                <h3>{viewAssignment?.title}</h3>
                <p>{viewAssignment?.description}</p>

                <button
                  className="assignment-btn assignment-btn-view"
                  onClick={(e) => handleOpenFile(e, viewAssignment?.fileUrl)}
                >
                  View File
                </button>

                <button
                  className="assignment-btn assignment-btn-delete"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignment;
