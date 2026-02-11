import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Groups.css";

const Groups = () => {
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState("All Departments");
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState("success");
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [editTarget, setEditTarget] = useState(null);
  const apiBase = useSelector((state) => state.config.apiBase);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    coordinator: "",
    roomNo: "",
  });

  const fetchAll = async () => {
    try {
      setLoadState("pending");
      const [groupRes, deptRes, facRes] = await Promise.all([
        axios.get(`${apiBase}/admin/group`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/department`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/faculty`, { withCredentials: true }),
      ]);
      setGroups(groupRes.data?.groups || []);
      setDepartments(deptRes.data?.departments || []);
      setFaculty(facRes.data?.faculty || []);
      setLoadState("success");
    } catch (error) {
      console.error(
        "Fetch groups failed:",
        error.response?.data || error.message
      );
      setLoadState("failure");
    }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchAll();
  }, [apiBase]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return groups.filter((g) => {
      const matchSearch =
        (g.name || "").toLowerCase().includes(term) ||
        (g.department?.name || "").toLowerCase().includes(term) ||
        (g.roomNo || "").toLowerCase().includes(term);
      const matchBranch =
        activeDept === "All Departments" ||
        g.department?._id === activeDept;
      return matchSearch && matchBranch;
    });
  }, [search, activeDept, groups]);

  const handleOpenAdd = () => {
    setEditTarget(null);
    setFormData({
      name: "",
      department: "",
      coordinator: "",
      roomNo: "",
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (group) => {
    setEditTarget(group);
    setFormData({
      name: group.name || "",
      department: group.department?._id || "",
      coordinator: group.coordinator?._id || "",
      roomNo: group.roomNo || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (group) => {
    if (!group?._id) return;
    const ok = window.confirm(`Delete group "${group.name}"?`);
    if (!ok) return;
    try {
      await axios.delete(`${apiBase}/admin/group/${group._id}`, {
        withCredentials: true,
      });
      fetchAll();
    } catch (error) {
      console.error(
        "Delete group failed:",
        error.response?.data || error.message
      );
      alert(error.response?.data?.message || "Failed to delete group");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editTarget?._id) {
        await axios.put(
          `${apiBase}/admin/group/${editTarget._id}`,
          formData,
          { withCredentials: true }
        );
      } else {
        await axios.post(`${apiBase}/admin/group`, formData, {
          withCredentials: true,
        });
      }
      setIsOpen(false);
      setEditTarget(null);
      fetchAll();
    } catch (error) {
      console.error(
        "Save group failed:",
        error.response?.data || error.message
      );
      alert(error.response?.data?.message || "Failed to save group");
    }
  };

  const renderState = () => {
    if (loadState === "pending") {
      return (
        <div className="groups-state pending">
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
          <p>Loading groups...</p>
        </div>
      );
    }
    if (loadState === "failure") {
      return (
        <div className="groups-state error">
          <img src={emptyStateImg} alt="Failed" className="groups-state-img" />
          <h3>Failed to load groups</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="groups-header">
          <div>
            <h1 className="groups-title">Group Management</h1>
            <p className="groups-subtitle">
              Add, edit, and manage academic groups
            </p>
          </div>
          <button
            className="groups-add-btn"
            type="button"
            onClick={handleOpenAdd}
          >
            <FiPlus />
            Add Group
          </button>
        </div>

        <div className="groups-toolbar">
          <div className="groups-search">
            <span className="groups-search-icon">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="groups-select"
            value={activeDept}
            onChange={(e) => setActiveDept(e.target.value)}
          >
            <option value="All Departments">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="groups-grid">
          {filtered.length === 0 ? (
            <div className="groups-empty">No groups found</div>
          ) : (
            filtered.map((g) => (
              <div className="groups-card" key={g._id}>
                <div className="groups-card-head">
                  <div className="groups-icon">📘</div>
                  <div className="groups-actions">
                    <button
                      type="button"
                      className="groups-icon-btn"
                      onClick={() => handleOpenEdit(g)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="groups-icon-btn danger"
                      onClick={() => handleDelete(g)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="groups-body">
                  <h3>{g.name}</h3>
                  <p className="groups-code">
                    {g.department?.name || "Department"}
                  </p>
                </div>

                <div className="groups-meta">
                  <div>
                    <span>Coordinator</span>
                    <strong>{g.coordinator?.user?.name || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Room</span>
                    <strong>{g.roomNo || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Students</span>
                    <strong>{g.studentIds?.length || 0}</strong>
                  </div>
                  <div>
                    <span>Courses</span>
                    <strong>{g.courseIds?.length || 0}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <div className="groups-page">
      {renderState()}

      {isOpen && (
        <div className="groups-modal">
          <div
            className="groups-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="groups-modal-card">
            <div className="groups-modal-head">
              <h2>{editTarget ? "Edit Group" : "Add Group"}</h2>
              <p>Create a new academic group</p>
            </div>
            <form className="groups-form" onSubmit={handleSubmit}>
              <label>
                Group Name
                <input
                  placeholder="e.g., CSE-3A"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </label>
              <label>
                Department
                <select
                  value={formData.department}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Coordinator
                <select
                  value={formData.coordinator}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      coordinator: e.target.value,
                    }))
                  }
                >
                  <option value="">Select Faculty</option>
                  {faculty.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.user?.name || f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Room No
                <input
                  placeholder="e.g., C-204"
                  value={formData.roomNo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, roomNo: e.target.value }))
                  }
                />
              </label>
              <div className="groups-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editTarget ? "Update" : "Save Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
