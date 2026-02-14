import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiUsers } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Groups.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import toast from "react-hot-toast";
import { selectTimetableRevision } from "../redux/timetableSlice";

const Groups = () => {
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState("All Departments");
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.SUCCESS);
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [editTarget, setEditTarget] = useState(null);
  const apiBase = useSelector((state) => state.config.apiBase);
  const timetableRevision = useSelector(selectTimetableRevision);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    coordinator: "",
    roomNo: "",
  });
  const cardGradients = [
    "linear-gradient(145deg, #dbeafe 0%, #f8fbff 45%, #ffffff 100%)",
    "linear-gradient(145deg, #dcfce7 0%, #f2fff7 45%, #ffffff 100%)",
    "linear-gradient(145deg, #fef3c7 0%, #fffbeb 45%, #ffffff 100%)",
    "linear-gradient(145deg, #fee2e2 0%, #fff5f5 45%, #ffffff 100%)",
    "linear-gradient(145deg, #ede9fe 0%, #f7f5ff 45%, #ffffff 100%)",
    "linear-gradient(145deg, #cffafe 0%, #f0fdff 45%, #ffffff 100%)",
    "linear-gradient(145deg, #fce7f3 0%, #fff1f8 45%, #ffffff 100%)",
    "linear-gradient(145deg, #e0f2fe 0%, #f2faff 45%, #ffffff 100%)",
    "linear-gradient(145deg, #e2e8f0 0%, #f8fafc 45%, #ffffff 100%)",
  ];
  const iconGradients = [
    "linear-gradient(135deg, #2563eb, #1d4ed8)",
    "linear-gradient(135deg, #059669, #047857)",
    "linear-gradient(135deg, #d97706, #b45309)",
    "linear-gradient(135deg, #ef4444, #b91c1c)",
    "linear-gradient(135deg, #7c3aed, #5b21b6)",
    "linear-gradient(135deg, #0891b2, #155e75)",
    "linear-gradient(135deg, #db2777, #9d174d)",
    "linear-gradient(135deg, #0284c7, #0c4a6e)",
    "linear-gradient(135deg, #475569, #1e293b)",
  ];

  const fetchAll = async () => {
    try {
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      const [groupRes, deptRes, facRes] = await Promise.all([
        axios.get(`${apiBase}/admin/group`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/department`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/faculty`, { withCredentials: true }),
      ]);
      setGroups(groupRes.data?.groups || []);
      setDepartments(deptRes.data?.departments || []);
      setFaculty(facRes.data?.faculty || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      console.error(
        "Fetch groups failed:",
        error.response?.data || error.message
      );
      toast.error(`? ${error.response?.data?.message || "Failed to load groups"}`);
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
    }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchAll();
  }, [apiBase, timetableRevision]);

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
      await axios.patch(`${apiBase}/admin/group/${group._id}/delete`, {}, {
        withCredentials: true,
      });
      toast.success("? Group deleted successfully");
      fetchAll();
    } catch (error) {
      console.error(
        "Delete group failed:",
        error.response?.data || error.message
      );
      toast.error(`? ${error.response?.data?.message || "Failed to delete group"}`);
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
        toast.success("? Group updated successfully");
      } else {
        await axios.post(`${apiBase}/admin/group`, formData, {
          withCredentials: true,
        });
        toast.success("? Group added successfully");
      }
      setIsOpen(false);
      setEditTarget(null);
      fetchAll();
    } catch (error) {
      console.error(
        "Save group failed:",
        error.response?.data || error.message
      );
      toast.error(`? ${error.response?.data?.message || "Failed to save group"}`);
    }
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="groups-state pending app-loader-state">
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
    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
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
              {filtered.length} groups in the organization
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
            filtered.map((g, index) => (
              <div
                className="groups-card"
                key={g._id}
                style={{
                  "--groups-card-gradient":
                    cardGradients[index % cardGradients.length],
                  "--groups-icon-gradient":
                    iconGradients[index % iconGradients.length],
                }}
              >
                <div className="groups-card-head">
                  <div className="groups-icon">
                    <FiUsers />
                  </div>
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



