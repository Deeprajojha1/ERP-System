import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import "./Courses.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { Oval } from "react-loader-spinner";
import { FiSearch } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import toast from "react-hot-toast";

const Courses = () => {
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState("All Branches");
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    courseName: "",
    department: "",
    semester: "",
    credit: "",
    facultyId: "",
  });

  const apiBase = useSelector((state) => state.config.apiBase);

  const branches = [
    "All Branches",
    "CSE",
    "MECH",
    "ECE",
    "CIVIL",
    "AGR",
    "HUM",
  ];

  const getBranchCode = (departmentName = "") => {
    const map = {
      "Computer Science & Engineering": "CSE",
      "Electronics & Communication": "ECE",
      "Mechanical Engineering": "MECH",
      "Civil Engineering": "CIVIL",
      "Agriculture": "AGR",
      Humanities: "HUM",
    };
    return map[departmentName] || departmentName;
  };

  const fetchAll = async () => {
    try {
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      const [courseRes, deptRes, facultyRes] = await Promise.all([
        axios.get(`${apiBase}/admin/course`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/department`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/faculty`, { withCredentials: true }),
      ]);
      setCourses(courseRes.data?.courses || []);
      setDepartments(deptRes.data?.departments || []);
      setFacultyList(facultyRes.data?.faculty || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      console.error("Failed to load courses", error.response?.data || error.message);
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(`❌ ${error.response?.data?.message || "Failed to load courses"}`);
    }
  };

  useEffect(() => {
    if (apiBase) {
      fetchAll();
    }
  }, [apiBase]);

  const resetForm = () => {
    setFormData({
      code: "",
      courseName: "",
      department: "",
      semester: "",
      credit: "",
      facultyId: "",
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();

    if (!formData.code || !formData.courseName || !formData.department || !formData.semester || !formData.credit) {
      toast.error("Please fill all required fields");
      return;
    }

    const selectedDepartment = departments.find((d) => d._id === formData.department);
    const payload = {
      code: formData.code.trim(),
      courseName: formData.courseName.trim(),
      department: formData.department,
      semester: Number(formData.semester),
      credit: Number(formData.credit),
      branch: getBranchCode(selectedDepartment?.name || ""),
      facultyIds: formData.facultyId ? [formData.facultyId] : [],
    };

    try {
      setSubmitting(true);
      await axios.post(`${apiBase}/admin/course`, payload, { withCredentials: true });
      toast.success("Course added successfully");
      setIsOpen(false);
      resetForm();
      await fetchAll();
    } catch (error) {
      console.error("Add course failed", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to add course");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return courses.filter((c) => {
      const deptName = c.department || "";
      const branchCode = getBranchCode(deptName).toLowerCase();

      const matchSearch =
        (c.courseName || "").toLowerCase().includes(term) ||
        (c.code || "").toLowerCase().includes(term) ||
        deptName.toLowerCase().includes(term);

      const matchBranch =
        activeBranch === "All Branches" ||
        branchCode === activeBranch.toLowerCase();
      return matchSearch && matchBranch;
    });
  }, [search, activeBranch, courses]);


  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="courses-state pending">
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
          <p>Loading courses...</p>
        </div>
      );
    }
    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="courses-state error">
          <img src={emptyStateImg} alt="Failed" className="courses-state-img" />
          <h3>Failed to load courses</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="courses-header">
          <h1 className="courses-title">Courses</h1>
          <button
            className="courses-add-btn"
            type="button"
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
          >
            + Add Course
          </button>
        </div>

        <div className="courses-toolbar">
          <div className="courses-search">
            <span className="courses-search-icon">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search courses by name, department, or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="courses-select"
            value={activeBranch}
            onChange={(e) => setActiveBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="courses-table-wrap">
          <table className="courses-table">
            <thead>
              <tr>
                <th>COURSE CODE</th>
                <th>COURSE NAME</th>
                <th>DEPARTMENT</th>
                <th>STUDENTS</th>
                <th>INSTRUCTOR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.code}>
                  <td className="courses-code">{c.code}</td>
                  <td>{c.courseName}</td>
                  <td>{c.department}</td>
                  <td>{c.studentsInDepartment}</td>
                  <td>{c.coordinatorName || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="courses-empty">
                    No courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="courses-page">
      {renderState()}
{isOpen && (
        <div className="courses-modal">
          <div
            className="courses-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="courses-modal-card">
            <div className="courses-modal-head">
              <h2>Add New Course</h2>
              <p>Create a new course entry</p>
            </div>
            <form className="courses-form" onSubmit={handleSubmitCourse}>
              <label>
                Course Code
                <input
                  placeholder="e.g., CS101"
                  name="code"
                  value={formData.code}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                Course Name
                <input
                  placeholder="e.g., Data Structures"
                  name="courseName"
                  value={formData.courseName}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <div className="courses-form-row">
                <label>
                  Department
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    required
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
                <label>
                  Semester
                  <input
                    placeholder="e.g., 3"
                    type="number"
                    min="1"
                    max="12"
                    name="semester"
                    value={formData.semester}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>
              <div className="courses-form-row">
                <label>
                  Credits
                  <input
                    placeholder="e.g., 4"
                    type="number"
                    min="0"
                    max="10"
                    name="credit"
                    value={formData.credit}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label>
                  Branch
                  <input
                    value={getBranchCode(
                      departments.find((d) => d._id === formData.department)?.name || ""
                    )}
                    placeholder="Auto-filled from department"
                    disabled
                  />
                </label>
              </div>
              <label>
                Instructor
                <select
                  name="facultyId"
                  value={formData.facultyId}
                  onChange={handleFormChange}
                >
                  <option value="">Select an instructor</option>
                  {facultyList.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.user?.name || f.name || "Faculty"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="courses-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;

