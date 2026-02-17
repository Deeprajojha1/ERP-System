import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import { Oval } from "react-loader-spinner";
import "./Assignment.css";

const Assignment = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  const [loading, setLoading] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  /* ================= FETCH DEPARTMENTS ================= */
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/admin/department`, {
        withCredentials: true,
      });
      setDepartments(res.data?.departments || []);
    } catch (error) {
      console.error("Failed to load departments", error);
    }
  };

  /* ================= FETCH GROUPS ================= */
  const fetchGroups = async (deptId) => {
    try {
      const res = await axios.get(`${apiBase}/api/admin/group`, {
        withCredentials: true,
      });

      const groupData = res.data?.groups || [];

      const filtered = groupData.filter(
        (g) => g.department === deptId || g.department?._id === deptId
      );

      setGroups(filtered);
    } catch (error) {
      console.error("Failed to load groups", error);
    }
  };

  /* ================= FETCH FACULTY ================= */
  const fetchFaculty = async (deptId) => {
    try {
      const res = await axios.get(`${apiBase}/api/admin/faculty`, {
        withCredentials: true,
      });

      const facultyData = res.data?.faculty || [];

      const filtered = facultyData.filter(
        (f) => f.department === deptId || f.department?._id === deptId
      );

      setFaculty(filtered);
    } catch (error) {
      console.error("Failed to load faculty", error);
    }
  };

  /* ================= FETCH ASSIGNMENTS ================= */
  const fetchAssignments = async () => {
    try {
      setLoading(true);

      const query = new URLSearchParams();

      if (selectedDept) query.append("departmentId", selectedDept);
      if (selectedGroup) query.append("groupId", selectedGroup);
      if (selectedFaculty) query.append("facultyId", selectedFaculty);

      const res = await axios.get(
        `${apiBase}/api/admin/assignments?${query.toString()}`,
        { withCredentials: true }
      );

      setAssignments(res.data || []);
    } catch (error) {
      console.error("Failed to load assignments", error);
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      await axios.delete(`${apiBase}/api/admin/assignment/${id}`, {
        withCredentials: true,
      });

      fetchAssignments();
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete assignment");
    }
  };

  /* ================= VIEW SUBMISSIONS ================= */
  const handleViewSubmissions = async (assignment) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${apiBase}/api/admin/assignment/${assignment._id}/submissions`,
        { withCredentials: true }
      );

      setSubmissions(res.data || []);
      setSelectedAssignment(assignment);
      setShowSubmissions(true);
    } catch (error) {
      console.error("Failed to fetch submissions", error);
      alert("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  /* ================= USE EFFECTS ================= */

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchGroups(selectedDept);
      fetchFaculty(selectedDept);
      setSelectedGroup("");
      setSelectedFaculty("");
    }
  }, [selectedDept]);

  useEffect(() => {
    if (selectedDept) {
      fetchAssignments();
    }
  }, [selectedDept, selectedGroup, selectedFaculty]);

  return (
    <div className="assignment-container">
      <div className="assignment-header">
        <h1 className="assignment-title">Assignment Management</h1>
        <p className="assignment-subtitle">View and manage course assignments</p>
      </div>

      <div className="assignment-filters">
        <div className="assignment-filter-group">
          <label className="assignment-filter-label">Department</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="assignment-filter-select"
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
              <label className="assignment-filter-label">Group</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="assignment-filter-select"
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
              <label className="assignment-filter-label">Faculty</label>
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="assignment-filter-select"
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
          <Oval height={64} width={64} color="#2563eb" secondaryColor="#bfdbfe" />
          <p>Loading assignments...</p>
        </div>
      ) : showSubmissions ? (
        <div className="assignment-submissions-view">
          <div className="assignment-submissions-header">
            <h2>Submissions for: {selectedAssignment?.title}</h2>
            <button
              onClick={() => setShowSubmissions(false)}
              className="assignment-back-btn"
            >
              Back to Assignments
            </button>
          </div>

          {submissions.length > 0 ? (
            <div className="assignment-table-wrapper">
              <table className="assignment-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Submitted On</th>
                    <th>File</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub._id}>
                      <td>{sub.student?.name || "N/A"}</td>
                      <td>{sub.student?.email || "N/A"}</td>
                      <td>{new Date(sub.createdAt).toLocaleString()}</td>
                      <td>
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="assignment-file-link"
                        >
                          View File
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="assignment-empty">
              <p>No submissions yet</p>
            </div>
          )}
        </div>
      ) : assignments.length > 0 ? (
        <div className="assignment-table-wrapper">
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Faculty</th>
                <th>Group</th>
                <th>Department</th>
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
                  <td>{a.uploadedBy?.user?.name || "N/A"}</td>
                  <td>{a.group?.name || "N/A"}</td>
                  <td>{a.department?.name || "N/A"}</td>
                  <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`assignment-status ${a.status}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="assignment-submissions-count">
                    {a.totalSubmissions}
                  </td>
                  <td className="assignment-actions">
                    <button
                      onClick={() => handleViewSubmissions(a)}
                      className="assignment-btn assignment-btn-view"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="assignment-btn assignment-btn-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedDept ? (
        <div className="assignment-empty">
          <p>No assignments found for the selected filters</p>
        </div>
      ) : (
        <div className="assignment-empty">
          <p>Please select a department to view assignments</p>
        </div>
      )}
    </div>
  );
};

export default Assignment;
