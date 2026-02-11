import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  setFaculty,
  setFacultyError,
  setFacultyLoading,
} from "../redux/facultySlice";
import emptyStateImg from "../assets/empty-state.svg";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import "./Faculty.css";

const Faculty = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [status, setStatus] = useState("All Status");
  const [isOpen, setIsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [departments, setDepartments] = useState([]);
  const dispatch = useDispatch();
  const { faculty, loading, error } = useSelector(
    (state) => state.faculty
  );
  const apiBase = useSelector((state) => state.config.apiBase);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    aadharNumber: "",
    phoneNumber: "",
    DOB: "",
    employeeId: "",
    department: "",
    designation: "",
    qualification: "",
    joiningDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      dispatch(setFacultyLoading(true));
      const [facRes, deptRes] = await Promise.all([
        axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
        }),
      ]);
      dispatch(setFaculty(facRes.data?.faculty || []));
      setDepartments(deptRes.data?.departments || []);
    } catch (error) {
      console.error(
        "Fetch faculty failed:",
        error.response?.data || error.message
      );
      dispatch(
        setFacultyError(
          error.response?.data?.message ||
            "Failed to load faculty"
        )
      );
    } finally {
      dispatch(setFacultyLoading(false));
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const statuses = ["All Status", "Active", "Inactive", "On Leave"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openEditModal = (facultyMember) => {
    setEditTarget(facultyMember);
    setFormData({
      name: facultyMember.user?.name || facultyMember.name || "",
      email: facultyMember.user?.email || facultyMember.email || "",
      password: "",
      aadharNumber:
        facultyMember.user?.aadharNumber ||
        facultyMember.aadharNumber ||
        "",
      phoneNumber:
        facultyMember.user?.phoneNumber ||
        facultyMember.phoneNumber ||
        "",
      DOB: facultyMember.user?.DOB
        ? facultyMember.user.DOB.slice(0, 10)
        : "",
      employeeId: facultyMember.employeeId || "",
      department:
        facultyMember.department?._id ||
        facultyMember.department ||
        "",
      designation: facultyMember.designation || "",
      qualification: facultyMember.qualification || "",
      joiningDate: facultyMember.joiningDate
        ? facultyMember.joiningDate.slice(0, 10)
        : "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (facultyMember) => {
    if (!facultyMember?._id) return;
    const ok = window.confirm(
      `Delete faculty "${facultyMember.user?.name || facultyMember.name}"?`
    );
    if (!ok) return;
    try {
      await axios.delete(
        `${apiBase}/admin/faculty/${facultyMember._id}`,
        { withCredentials: true }
      );
      await fetchAll();
    } catch (error) {
      console.error(
        "Delete faculty failed:",
        error.response?.data || error.message
      );
      alert(
        error.response?.data?.message ||
          "Failed to delete faculty"
      );
    }
  };

  const buildPayload = () => {
    const base = {
      employeeId: formData.employeeId,
      department: formData.department,
      designation: formData.designation,
      qualification: formData.qualification,
      joiningDate: formData.joiningDate,
    };

    if (editTarget) return base;

    return {
      ...base,
      name: formData.name,
      email: formData.email,
      password: formData.password,
      aadharNumber: formData.aadharNumber,
      phoneNumber: formData.phoneNumber,
      DOB: formData.DOB,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = buildPayload();

      if (editTarget?._id) {
        await axios.put(
          `${apiBase}/admin/faculty/${editTarget._id}`,
          payload,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${apiBase}/admin/faculty`,
          payload,
          { withCredentials: true }
        );
      }

      await fetchAll();

      setIsOpen(false);
      setEditTarget(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        aadharNumber: "",
        phoneNumber: "",
        DOB: "",
        employeeId: "",
        department: "",
        designation: "",
        qualification: "",
        joiningDate: "",
      });
    } catch (error) {
      console.error(
        "Add faculty failed:",
        error.response?.data || error.message
      );
      alert(
        error.response?.data?.message ||
          "Failed to add faculty"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return faculty.filter((f) => {
      const name = f.user?.name || f.name || "";
      const matchSearch = name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchDept =
        department === "All Departments" ||
        f.department?._id === department ||
        f.department?.name === department ||
        f.department === department;
      const matchStatus =
        status === "All Status" ||
        (f.user?.status || f.status) === status;
      return matchSearch && matchDept && matchStatus;
    });
  }, [faculty, search, department, status]);


  const renderState = () => {
    if (loading) {
      return (
        <div className="faculty-state pending">
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
          <p>Loading faculty...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="faculty-state error">
          <img
            src={emptyStateImg}
            alt="Failed"
            className="faculty-state-img"
          />
          <h3>Failed to load faculty</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="faculty-header">
          <div>
            <h1 className="faculty-title">Faculty Directory</h1>
            <p className="faculty-subtitle">Manage all faculty members</p>
          </div>
        </div>

        <div className="faculty-panel">
          <div className="faculty-filters">
            <div className="faculty-search">
              <span className="faculty-search-icon">??</span>
              <input
                type="text"
                placeholder="Search faculty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="faculty-selects">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="All Departments">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="faculty-empty">
              <img src={emptyStateImg} alt="No data" />
              <h3>Oops! Data not found</h3>
              <p>No faculty records match your filters.</p>
            </div>
          ) : (
            <div className="faculty-grid">
              {filtered.map((f) => (
                <div className="faculty-card" key={f._id || f.user?._id}>
                  <div className="faculty-card-top">
                    <div className="faculty-avatar">
                      {(f.user?.name || f.name || "NA")
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span
                      className={`faculty-status ${
                        (f.user?.status || f.status) === "Active"
                          ? "status-active"
                          : (f.user?.status || f.status) === "On Leave"
                          ? "status-leave"
                          : "status-inactive"
                      }`}
                    >
                      {(f.user?.status || f.status || "active").toUpperCase()}
                    </span>
                  </div>

                  <div className="faculty-info">
                    <h2 className="faculty-name">{f.user?.name || f.name}</h2>
                    <span className="faculty-role">
                      {(f.designation || "Faculty").toUpperCase()}
                    </span>
                    <span className="faculty-dept">
                      {f.department?.name || f.department}
                    </span>
                  </div>

                  <div className="faculty-divider" />

                  <div className="faculty-meta">
                    <span>{f.qualification || "Qualification N/A"}</span>
                    <span className="faculty-courses">
                      {(f.courseIds?.length || 0)} Courses
                    </span>
                  </div>

                  <div className="faculty-actions">
                    <button
                      className="faculty-action-btn ghost"
                      type="button"
                      onClick={() => openEditModal(f)}
                    >
                      <FiEdit2 />
                      Edit
                    </button>
                    <button
                      className="faculty-action-btn danger"
                      type="button"
                      onClick={() => handleDelete(f)}
                    >
                      <FiTrash2 />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="faculty-page">
      {renderState()}
{isOpen && (
        <div className="faculty-modal">
          <div
            className="faculty-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="faculty-modal-card">
            <div className="faculty-modal-head">
              <h2>
                {editTarget ? "Edit Faculty" : "Add New Faculty"}
              </h2>
              <p>Faculty academic & personal information</p>
            </div>
            <form className="faculty-form" onSubmit={handleSubmit}>
              <div className="faculty-form-row">
                <label>
                  Name
                  <input
                    placeholder="Dr. Neha Verma"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
                <label>
                  Email
                  <input
                    placeholder="neha.verma@college.edu"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
              </div>
              {!editTarget && (
                <div className="faculty-form-row">
                  <label>
                    Password
                    <input
                      placeholder="1988-11-02"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    DOB
                    <input
                      placeholder="1988-11-02"
                      type="date"
                      name="DOB"
                      value={formData.DOB}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              )}
              <div className="faculty-form-row">
                <label>
                  Aadhar Number
                  <input
                    placeholder="987654321098"
                    type="text"
                    name="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
                <label>
                  Phone Number
                  <input
                    placeholder="9123456780"
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
              </div>
              <div className="faculty-form-row">
                <label>
                  Employee ID
                  <input
                    placeholder="EMP-1024"
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  Department
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select Department
                    </option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="faculty-form-row">
                <label>
                  Designation
                  <input
                    placeholder="Professor"
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  Qualification
                  <input
                    placeholder="PhD, M.Tech"
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                  />
                </label>
              </div>
              <div className="faculty-form-row">
                <label>
                  Joining Date
                  <input
                    placeholder="2020-07-15"
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                  />
                </label>
              </div>
              <div className="faculty-modal-actions">
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
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editTarget
                    ? "Update Faculty"
                    : "Add Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Faculty;
