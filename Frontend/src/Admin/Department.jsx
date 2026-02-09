import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import "./Department.css";

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const apiBase = useSelector((state) => state.config.apiBase);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    hod: "",
  });
  const [nameMode, setNameMode] = useState("new");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [deptRes, facRes] = await Promise.all([
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
        }),
      ]);
      setDepartments(deptRes.data?.departments || []);
      setFaculty(facRes.data?.faculty || []);
    } catch (err) {
      console.error(
        "Fetch departments failed:",
        err.response?.data || err.message
      );
      setError(
        err.response?.data?.message ||
          "Failed to load departments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
    setFormData({ name: "", hod: "" });
    setNameMode("new");
    setSelectedDeptId("");
    setIsOpen(true);
  };

  const openEditModal = (dept) => {
    setEditTarget(dept);
    setFormData({
      name: dept.name || "",
      hod: dept.hod?._id || "",
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        hod: formData.hod || null,
      };

      if (editTarget?._id) {
        await axios.put(
          `${apiBase}/admin/department/${editTarget._id}`,
          payload,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${apiBase}/admin/department`,
          payload,
          { withCredentials: true }
        );
      }

      setIsOpen(false);
      setEditTarget(null);
      setFormData({ name: "", hod: "" });
      setNameMode("new");
      setSelectedDeptId("");
      await fetchAll();
    } catch (err) {
      console.error(
        "Save department failed:",
        err.response?.data || err.message
      );
      alert(
        err.response?.data?.message ||
          "Failed to save department"
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
      await axios.delete(
        `${apiBase}/admin/department/${dept._id}`,
        { withCredentials: true }
      );
      await fetchAll();
    } catch (err) {
      console.error(
        "Delete department failed:",
        err.response?.data || err.message
      );
      alert(
        err.response?.data?.message ||
          "Failed to delete department"
      );
    }
  };

  const isExistingSelection =
    !editTarget && nameMode === "existing";

  return (
    <div className="dept-page">
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
        <input
          className="dept-search"
          type="text"
          placeholder="Search department or HOD"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="dept-state">Loading departments...</div>
      )}

      {error && !loading && (
        <div className="dept-state error">{error}</div>
      )}

      {!loading && !error && filteredDepartments.length === 0 && (
        <div className="dept-state empty">
          No departments match your search.
        </div>
      )}

      {!loading && !error && filteredDepartments.length > 0 && (
        <div className="dept-grid">
          {filteredDepartments.map((dept) => {
            const hodName =
              dept.hod?.user?.name ||
              dept.hod?.name ||
              dept.hod?.employeeId ||
              "Not Assigned";
            return (
              <div className="dept-card" key={dept._id}>
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
                    Edit
                  </button>
                  <button
                    type="button"
                    className="dept-action-btn danger"
                    onClick={() => handleDelete(dept)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                  {editTarget ? (
                    <input
                      type="text"
                      name="name"
                      placeholder="Computer Science"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <>
                      <select
                        name="departmentSelect"
                        value={nameMode === "new" ? "new" : selectedDeptId}
                        onChange={handleNameSelect}
                      >
                        <option value="new">
                          Add New Department
                        </option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      {nameMode === "new" && (
                        <input
                          type="text"
                          name="name"
                          placeholder="Computer Science"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      )}
                      {nameMode === "existing" && (
                        <span className="dept-help">
                          This department already exists. Choose
                          "Add New Department" to create a new one.
                        </span>
                      )}
                    </>
                  )}
                </label>
              </div>
              <div className="dept-form-row">
                <label>
                  Head of Department (HOD)
                  <select
                    name="hod"
                    value={formData.hod}
                    onChange={handleChange}
                  >
                    <option value="">Not Assigned</option>
                    {faculty.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.user?.name || f.name || f.employeeId}
                      </option>
                    ))}
                  </select>
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
                    !formData.name.trim()
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
