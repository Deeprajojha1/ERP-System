import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import "./Courses.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { Oval } from "react-loader-spinner";
import { FiSearch } from "react-icons/fi";
import { FiEdit2 } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import toast from "react-hot-toast";
import { selectTimetableRevision } from "../redux/timetableSlice";

const Courses = () => {
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState("All Branches");
  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingCourseId, setEditingCourseId] = useState("");
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
  const timetableRevision = useSelector(selectTimetableRevision);

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
      const courseRes = await axios.get(`${apiBase}/admin/course`, {
        withCredentials: true,
      });
      setCourses(courseRes.data?.courses || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      console.error("Failed to load courses", error.response?.data || error.message);
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(`? ${error.response?.data?.message || "Failed to load courses"}`);
    }
  };

  useEffect(() => {
    if (apiBase) {
      fetchAll();
    }
  }, [apiBase, timetableRevision]);

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

  const closeModal = () => {
    setIsOpen(false);
    setModalMode("add");
    setEditingCourseId("");
    resetForm();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const ensureModalDependencies = async () => {
    const [deptRes, facultyRes] = await Promise.all([
      axios.get(`${apiBase}/admin/department`, {
        withCredentials: true,
        params: { noCache: "true" },
      }),
      axios.get(`${apiBase}/admin/faculty`, {
        withCredentials: true,
        params: { noCache: "true" },
      }),
    ]);
    setDepartments(deptRes.data?.departments || []);
    setFacultyList(facultyRes.data?.faculty || []);
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
      if (modalMode === "edit" && editingCourseId) {
        await axios.put(`${apiBase}/admin/course/${editingCourseId}`, payload, {
          withCredentials: true,
        });
        toast.success("Course updated successfully");
      } else {
        await axios.post(`${apiBase}/admin/course`, payload, { withCredentials: true });
        toast.success("Course added successfully");
      }
      closeModal();
      await fetchAll();
    } catch (error) {
      console.error("Course submit failed", error.response?.data || error.message);
      toast.error(
        error.response?.data?.message ||
          (modalMode === "edit" ? "Failed to update course" : "Failed to add course")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = async (course) => {
    try {
      await ensureModalDependencies();
      setModalMode("edit");
      setEditingCourseId(course.id || "");
      setFormData({
        code: course.code || "",
        courseName: course.courseName || "",
        department: course.departmentId || "",
        semester: String(course.semester ?? ""),
        credit: String(course.credit ?? ""),
        facultyId: course.coordinatorId || "",
      });
      setIsOpen(true);
    } catch (error) {
      console.error("Failed to load modal data", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to load form data");
    }
  };

  const openAddModal = async () => {
    try {
      await ensureModalDependencies();
      setModalMode("add");
      setEditingCourseId("");
      resetForm();
      setIsOpen(true);
    } catch (error) {
      console.error("Failed to load modal data", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to load form data");
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
        <div className="courses-state pending app-loader-state">
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
            onClick={openAddModal}
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
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id || c.code}>
                  <td className="courses-code">{c.code}</td>
                  <td>{c.courseName}</td>
                  <td>{c.department}</td>
                  <td>{c.studentsInDepartment}</td>
                  <td>{c.coordinatorName || "-"}</td>
                  <td className="courses-row-actions">
                    <button
                      type="button"
                      className="courses-edit-btn"
                      onClick={() => openEditModal(c)}
                      aria-label={`Edit ${c.code}`}
                      title="Edit course"
                    >
                      <FiEdit2 />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="courses-empty">
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
            onClick={closeModal}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="courses-modal-card">
            <div className="courses-modal-head">
              <h2>{modalMode === "edit" ? "Edit Course" : "Add New Course"}</h2>
              <p>
                {modalMode === "edit"
                  ? "Update selected course details"
                  : "Create a new course entry"}
              </p>
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
                    max="12"
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
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Submit"}
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


