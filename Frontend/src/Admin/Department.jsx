import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { FiEdit2, FiSearch, FiTrash2 } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Department.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import toast from "react-hot-toast";
import {
  setDepartments,
  setDepartmentsError,
  setDepartmentsLoading,
} from "../redux/departmentSlice";

const PROGRAM_CANONICAL_MAP = {
  btech: "btech",
  mtech: "mtech",
  bca: "bca",
  mca: "mca",
  bba: "bba",
  mba: "mba",
};

const canonicalizeProgram = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return PROGRAM_CANONICAL_MAP[normalized] || "";
};

const Department = () => {
  const [faculty, setFaculty] = useState([]);
  const dispatch = useDispatch();
  const { departments } = useSelector((state) => state.department);
  const apiBase = useSelector((state) => state.config.apiBase);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.SUCCESS);
  const [isOpen, setIsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    hod: "",
    program: [],
  });
  const [programInput, setProgramInput] = useState("");
  const [nameMode, setNameMode] = useState("new");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
      setLoading(true);
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      setError("");
      dispatch(setDepartmentsLoading(true));
      const [deptRes, facRes] = await Promise.all([
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
        }),
      ]);
      dispatch(setDepartments(deptRes.data?.departments || []));
      setFaculty(facRes.data?.faculty || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (err) {
      console.error(
        "Fetch departments failed:",
        err.response?.data || err.message
      );
      toast.error(`${err.response?.data?.message || "Failed to load departments"}`);
      setError(
        err.response?.data?.message ||
          "Failed to load departments"
      );
      dispatch(
        setDepartmentsError(
          err.response?.data?.message || "Failed to load departments"
        )
      );
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
    } finally {
      dispatch(setDepartmentsLoading(false));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const refreshDepartments = async () => {
    const deptRes = await axios.get(`${apiBase}/admin/department`, {
      withCredentials: true,
    });
    dispatch(setDepartments(deptRes.data?.departments || []));
  };

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter((dept) => {
      const name = dept.name || "";
      const hodName =
        dept.hod?.user?.name || dept.hod?.name || "";
      return (
        name.toLowerCase().includes(term) ||
        hodName.toLowerCase().includes(term)
      );
    });
  }, [departments, search]);

  const deptCountLabel = useMemo(() => {
    const count = filteredDepartments.length;
    return `${count} Department${count === 1 ? "" : "s"}`;
  }, [filteredDepartments.length]);

  const getInitials = (name) => {
    if (!name) return "D";
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString();
  };

  const openAddModal = () => {
    setEditTarget(null);
    setFormData({ name: "", hod: "", program: [] });
    setProgramInput("");
    setNameMode("new");
    setSelectedDeptId("");
    setIsOpen(true);
  };

  const openEditModal = (dept) => {
    setEditTarget(dept);
    setFormData({
      name: dept.name || "",
      hod: dept.hod?._id || "",
      program: Array.isArray(dept.program) ? dept.program : [],
    });
    setProgramInput("");
    setNameMode("edit");
    setSelectedDeptId(dept._id || "");
    setIsOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNameSelect = (e) => {
    const { value } = e.target;
    if (value === "new") {
      setNameMode("new");
      setSelectedDeptId("");
      setFormData((prev) => ({ ...prev, name: "" }));
      return;
    }

    const matched = departments.find((d) => d._id === value);
    setNameMode("existing");
    setSelectedDeptId(value);
    setFormData((prev) => ({
      ...prev,
      name: matched?.name || "",
    }));
  };

  const addProgramToken = () => {
    const value = canonicalizeProgram(programInput);
    if (!value) {
      if (programInput.trim()) {
        toast.error("Invalid program. Use btech, mtech, bca, mca, bba, or mba.");
      }
      return;
    }
    setFormData((prev) => {
      if (prev.program.includes(value)) return prev;
      return { ...prev, program: [...prev.program, value] };
    });
    setProgramInput("");
  };

  const removeProgramToken = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      program: prev.program.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleProgramKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addProgramToken();
      return;
    }

    if (e.key === "Backspace" && !programInput.trim()) {
      if (!formData.program.length) return;
      e.preventDefault();
      removeProgramToken(formData.program.length - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        hod: formData.hod || null,
        program: formData.program,
      };

      if (editTarget?._id) {
        await axios.put(
          `${apiBase}/admin/department/${editTarget._id}`,
          payload,
          { withCredentials: true }
        );
        toast.success("Department updated successfully");
      } else {
        await axios.post(
          `${apiBase}/admin/department`,
          payload,
          { withCredentials: true }
        );
        toast.success("Department added successfully");
      }

      setIsOpen(false);
      setEditTarget(null);
      setFormData({ name: "", hod: "", program: [] });
      setProgramInput("");
      setNameMode("new");
      setSelectedDeptId("");
      await refreshDepartments();
    } catch (err) {
      console.error(
        "Save department failed:",
        err.response?.data || err.message
      );
      toast.error(
        `${err.response?.data?.message || "Failed to save department"}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!dept?._id) return;
    const confirmDelete = window.confirm(
      `Delete department "${dept.name}"?`
    );
    if (!confirmDelete) return;
    try {
      await axios.patch(
        `${apiBase}/admin/department/${dept._id}/delete`,
        {},
        { withCredentials: true }
      );
      toast.success("Department deleted successfully");
      await refreshDepartments();
    } catch (err) {
      console.error(
        "Delete department failed:",
        err.response?.data || err.message
      );
      toast.error(
        `${err.response?.data?.message || "Failed to delete department"}`
      );
    }
  };

  const isExistingSelection =
    !editTarget && nameMode === "existing";

  const renderState = () => {
    switch (loadState) {
      case ADMIN_LOAD_STATES.PENDING:
        return (
          <div className="dept-state pending app-loader-state">
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
            <p>Loading departments...</p>
          </div>
        );
      case ADMIN_LOAD_STATES.FAILURE:
        return (
          <div className="dept-state error">
            <img
              src={emptyStateImg}
              alt="Failed"
              className="dept-state-img"
            />
            <h3>Failed to load departments</h3>
            <p>Please try again in a moment.</p>
          </div>
        );
      default:
        return (
          <>
            <div className="dept-header">
              <div>
                <h1 className="dept-title">Departments</h1>
                <p className="dept-subtitle">
                  {deptCountLabel} in the organization
                </p>
              </div>
              <button
                className="dept-add-btn"
                type="button"
                onClick={openAddModal}
              >
                + Add Department
              </button>
            </div>

            <div className="dept-toolbar">
              <div className="dept-search">
                <span className="dept-search-icon" aria-hidden="true">
                  <FiSearch />
                </span>
                <input
                  type="text"
                  placeholder="Search department or HOD"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredDepartments.length === 0 && (
              <div className="dept-state empty">
                No departments match your search.
              </div>
            )}

            {filteredDepartments.length > 0 && (
              <div className="dept-grid">
                {filteredDepartments.map((dept, index) => {
                  const hodName =
                    dept.hod?.user?.name ||
                    dept.hod?.name ||
                    dept.hod?.employeeId ||
                    "Not Assigned";
                  return (
                    <div
                      className="dept-card"
                      key={dept._id}
                      style={{
                        "--dept-card-gradient":
                          cardGradients[index % cardGradients.length],
                        "--dept-icon-gradient":
                          iconGradients[index % iconGradients.length],
                      }}
                    >
                      <div className="dept-card-top">
                        <div className="dept-icon">
                          {getInitials(dept.name)}
                        </div>
                        <span className="dept-status">Active</span>
                      </div>

                      <div className="dept-info">
                        <h2 className="dept-name">{dept.name}</h2>
                        <span className="dept-code">
                          HOD: {hodName}
                        </span>
                      </div>

                      <div className="dept-divider" />

                      <div className="dept-metrics">
                        <div className="dept-metric">
                          <span className="dept-metric-label">
                            Created
                          </span>
                          <span className="dept-metric-value">
                            {formatDate(dept.createdAt)}
                          </span>
                        </div>
                        <div className="dept-metric">
                          <span className="dept-metric-label">
                            Updated
                          </span>
                          <span className="dept-metric-value">
                            {formatDate(dept.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="dept-actions">
                        <button
                          type="button"
                          className="dept-action-btn ghost"
                          onClick={() => openEditModal(dept)}
                        >
                          <FiEdit2 />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="dept-action-btn danger"
                          onClick={() => handleDelete(dept)}
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="dept-page">
      {renderState()}

      {isOpen && (
        <div className="dept-modal">
          <div
            className="dept-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="dept-modal-card">
            <div className="dept-modal-head">
              <h2>
                {editTarget ? "Edit Department" : "Add Department"}
              </h2>
              <p>Department details and HOD assignment</p>
            </div>
            <form className="dept-form" onSubmit={handleSubmit}>
              <div className="dept-form-row">
                <label>
                  Department Name
                  <input
                    type="text"
                    name="name"
                    placeholder="Computer Science"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>
              <div className="dept-form-row">
                <label>
                  Programs
                  <div className="dept-program-input-wrap">
                    {formData.program.map((item, index) => (
                      <span key={`${item}-${index}`} className="dept-program-chip">
                        {item}
                        <button
                          type="button"
                          className="dept-program-chip-remove"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeProgramToken(index);
                          }}
                          aria-label={`Remove ${item}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Type program and press Enter"
                      value={programInput}
                      onChange={(e) => setProgramInput(e.target.value)}
                      onKeyDown={handleProgramKeyDown}
                    />
                  </div>
                </label>
              </div>
              <div className="dept-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    submitting ||
                    isExistingSelection ||
                    !formData.name.trim() ||
                    formData.program.length === 0
                  }
                >
                  {submitting
                    ? "Saving..."
                    : editTarget
                    ? "Update Department"
                    : "Add Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Department;


