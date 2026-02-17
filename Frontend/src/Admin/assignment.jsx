import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";

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

  /* ================= FETCH DEPARTMENTS ================= */
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

  /* ================= FETCH GROUPS ================= */
  const fetchGroups = async (deptId) => {
    try {
      const res = await axios.get(`${apiBase}/admin/group`, {
        withCredentials: true,
      });

      const groupData = res.data?.groups || [];

      const filtered = groupData.filter(
        (g) =>
          g.department === deptId ||
          g.department?._id === deptId
      );

      setGroups(filtered);
    } catch (error) {
      console.error("Failed to load groups", error);
    }
  };

  /* ================= FETCH FACULTY ================= */
  const fetchFaculty = async (deptId) => {
    try {
      const res = await axios.get(`${apiBase}/admin/faculty`, {
        withCredentials: true,
      });

      const facultyData = res.data?.faculty || [];

      const filtered = facultyData.filter(
        (f) =>
          f.department === deptId ||
          f.department?._id === deptId
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
        `${apiBase}/admin/assignments?${query.toString()}`,
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
    try {
      await axios.delete(`${apiBase}/admin/assignment/${id}`, {
        withCredentials: true,
      });

      fetchAssignments();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  /* ================= VIEW SUBMISSIONS ================= */
  const handleViewSubmissions = async (id) => {
    try {
      const res = await axios.get(
        `${apiBase}/admin/assignment/${id}/submissions`,
        { withCredentials: true }
      );

      console.log("Submissions:", res.data);
      alert("Check console for submissions list");
    } catch (error) {
      console.error("Failed to fetch submissions", error);
    }
  };

  /* ================= USE EFFECTS ================= */

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

  // 🔥 MAIN FIXED FETCH LOGIC
  useEffect(() => {
    if (selectedDept) {
      fetchAssignments();
    }
  }, [selectedDept, selectedGroup, selectedFaculty]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Assignment Management</h2>

      {/* Department */}
      <select
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

      {/* Group */}
      {selectedDept && (
        <select
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
      )}

      {/* Faculty */}
      {selectedDept && (
        <select
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
      )}

      {/* Table */}
      {loading ? (
        <p>Loading assignments...</p>
      ) : assignments.length > 0 ? (
        <table border="1" cellPadding="10" style={{ marginTop: "20px" }}>
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
                <td>{a.title}</td>
                <td>{a.uploadedBy?.user?.name}</td>
                <td>{a.group?.name}</td>
                <td>{a.department?.name}</td>
                <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                <td>{a.status}</td>
                <td>{a.totalSubmissions}</td>
                <td>
                  <button onClick={() => handleViewSubmissions(a._id)}>
                    View
                  </button>
                  <button onClick={() => handleDelete(a._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : selectedDept ? (
        <p style={{ marginTop: "20px" }}>No assignments found</p>
      ) : null}
    </div>
  );
};

export default Assignment;