import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import "./Assignment.css";

const Assignment = () => {
  const apiBase = useSelector((state) => state.config.apiBase);

  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  const [loading, setLoading] = useState(false);
  const [viewAssignment, setViewAssignment] = useState(null);

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

  /* ================= FETCH ASSIGNMENTS ================= */
  const fetchAssignments = async () => {
    setLoading(true);

    const query = new URLSearchParams();
    if (selectedDept) query.append("departmentId", selectedDept);
    if (selectedGroup) query.append("groupId", selectedGroup);
    if (selectedFaculty) query.append("facultyId", selectedFaculty);

    const res = await axios.get(
      `${apiBase}/admin/assignments?${query.toString()}`,
      { withCredentials: true }
    );

    setAssignments(res.data || []);
    setLoading(false);
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this assignment?")) return;

    await axios.delete(`${apiBase}/admin/assignment/${id}`, {
      withCredentials: true,
    });

    fetchAssignments();
  };

  /* ================= VIEW ================= */
  const handleView = async (id) => {
    const res = await axios.get(`${apiBase}/admin/assignment/${id}`, {
      withCredentials: true,
    });

    setViewAssignment(res.data);
  };

  /* ================= EFFECTS ================= */
  useEffect(() => {
    if (apiBase) fetchDepartments();
  }, [apiBase]);

  useEffect(() => {
    if (selectedDept) {
      fetchGroups(selectedDept);
      fetchFaculty(selectedDept);
      fetchAssignments();
    }
  }, [selectedDept, selectedGroup, selectedFaculty]);

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
          <p>Loading...</p>
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
                  <td>{a.uploadedBy?.name}</td>
                  <td>{a.group?.name}</td>
                  <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`assignment-status ${a.status || ""}`}>{a.status}</span>
                  </td>
                  <td className="assignment-submissions-count">{a.totalSubmissions}</td>
                  <td>
                    <div className="assignment-actions">
                      <button className="assignment-btn assignment-btn-view" onClick={() => handleView(a._id)}>
                      View
                      </button>
                      <button className="assignment-btn assignment-btn-delete" onClick={() => handleDelete(a._id)}>
                      Delete
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
      {viewAssignment && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{viewAssignment.title}</h3>
            <p>{viewAssignment.description}</p>

            <a
              href={viewAssignment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="assignment-btn assignment-btn-view"
            >
              View File
            </a>

            <button
              className="assignment-btn assignment-btn-delete"
              onClick={() => setViewAssignment(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignment;
