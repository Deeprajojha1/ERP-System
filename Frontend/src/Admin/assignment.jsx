import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import "./assignment.css";

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

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${apiBase}/admin/department`, {
        withCredentials: true,
      });
      setDepartments(res.data?.departments || []);
    } catch (error) {
      console.error("Failed to load departments", error);
    }
  };

  const fetchGroups = async (deptId) => {
    try {
      const res = await axios.get(`${apiBase}/admin/group`, {
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

  const fetchFaculty = async (deptId) => {
    try {
      const res = await axios.get(`${apiBase}/admin/faculty`, {
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

  const fetchAssignments = async () => {
    try {
      setLoading(true);

      const query = new URLSearchParams();
      if (selectedDept) query.append("departmentId", selectedDept);
      if (selectedGroup) query.append("groupId", selectedGroup);
      if (selectedFaculty) query.append("facultyId", selectedFaculty);

      const res = await axios.get(`${apiBase}/admin/assignments?${query.toString()}`, {
        withCredentials: true,
      });

      setAssignments(res.data || []);
    } catch (error) {
      console.error("Failed to load assignments", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiBase}/admin/assignment/${id}`, {
        withCredentials: true,
      });

      fetchAssignments();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleViewSubmissions = async (id) => {
    try {
      const res = await axios.get(`${apiBase}/admin/assignment/${id}/submissions`, {
        withCredentials: true,
      });

      console.log("Submissions:", res.data);
      alert("Check console for submissions list");
    } catch (error) {
      console.error("Failed to fetch submissions", error);
    }
  };

  useEffect(() => {
    if (apiBase) fetchDepartments();
  }, [apiBase]);

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
    <div className="assignment-page">
      <div className="assignment-header">
        <h2>Assignment Management</h2>
        <p>Filter by department, group and faculty to view assignments quickly.</p>
      </div>

      <div className="assignment-filters">
        <div className="assignment-filter-item">
          <label htmlFor="assignment-department">Department</label>
          <select
            id="assignment-department"
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
          <div className="assignment-filter-item">
            <label htmlFor="assignment-group">Group</label>
            <select
              id="assignment-group"
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
        )}

        {selectedDept && (
          <div className="assignment-filter-item">
            <label htmlFor="assignment-faculty">Faculty</label>
            <select
              id="assignment-faculty"
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
        )}
      </div>

      <div className="assignment-table-wrap">
        {loading ? (
          <p className="assignment-state">Loading assignments...</p>
        ) : assignments.length > 0 ? (
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Faculty</th>
                <th>Group</th>
                <th>Department</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Total Submissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a._id}>
                  <td className="assignment-title">{a.title}</td>
                  <td>{a.uploadedBy?.user?.name || "-"}</td>
                  <td>{a.group?.name || "-"}</td>
                  <td>{a.department?.name || "-"}</td>
                  <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`assignment-status ${
                        a.status === "closed" ? "closed" : "active"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>{a.totalSubmissions}</td>
                  <td>
                    <div className="assignment-actions">
                      <button
                        className="assignment-btn view"
                        onClick={() => handleViewSubmissions(a._id)}
                      >
                        View
                      </button>
                      <button
                        className="assignment-btn delete"
                        onClick={() => handleDelete(a._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : selectedDept ? (
          <p className="assignment-state">No assignments found</p>
        ) : (
          <p className="assignment-state">Select a department to view assignments</p>
        )}
      </div>
    </div>
  );
};

export default Assignment;
