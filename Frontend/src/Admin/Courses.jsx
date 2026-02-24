import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import "./Courses.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { Oval } from "react-loader-spinner";
import { FiEdit2, FiLoader, FiSearch } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import toast from "react-hot-toast";
import { selectTimetableRevision } from "../redux/timetableSlice";
import ClipLoader from "./components/ClipLoader";

const resolveFacultyMembers = (course = {}) => {
  if (Array.isArray(course.facultyMembers)) return course.facultyMembers;
  if (Array.isArray(course.facultyIds)) {
    return course.facultyIds
      .map((faculty) => ({
        _id: faculty?._id || faculty?.id || null,
        name: faculty?.user?.name || faculty?.name || "Faculty",
      }))
      .filter((faculty) => faculty._id);
  }
  return [];
};

const normalizeCourseRow = (course = {}, { existingCourse, referenceCourses = [] } = {}) => {
  const id = course?.id || course?._id || existingCourse?.id || "";
  const departmentName =
    typeof course?.department === "string"
      ? course.department
      : course?.department?.name || existingCourse?.department || "";
  const departmentId =
    course?.departmentId ||
    course?.department?._id ||
    (typeof course?.department === "string" ? existingCourse?.departmentId : course?.department) ||
    existingCourse?.departmentId ||
    "";
  const facultyMembers = resolveFacultyMembers(course);
  const coordinatorId =
    course?.coordinatorId ||
    facultyMembers[0]?._id ||
    existingCourse?.coordinatorId ||
    "";
  const coordinatorName =
    course?.coordinatorName ||
    facultyMembers[0]?.name ||
    existingCourse?.coordinatorName ||
    null;
  const inferredStudentCount =
    existingCourse?.studentsInDepartment ??
    referenceCourses.find((item) => String(item?.departmentId || "") === String(departmentId || ""))?.studentsInDepartment ??
    0;

  return {
    id,
    code: course?.code || existingCourse?.code || "",
    courseName: course?.courseName || existingCourse?.courseName || "",
    department: departmentName,
    departmentId,
    semester: course?.semester ?? existingCourse?.semester ?? null,
    credit: course?.credit ?? existingCourse?.credit ?? null,
    branch: course?.branch || existingCourse?.branch || null,
    studentsInDepartment:
      course?.studentsInDepartment ?? existingCourse?.studentsInDepartment ?? inferredStudentCount,
    coordinatorId,
    coordinatorName,
    facultyMembers,
  };
};

const Courses = () => {
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState("All Branches");
  const [isOpen, setIsOpen] = useState(false);
  const [isOpeningAdd, setIsOpeningAdd] = useState(false);
  const [openingEditId, setOpeningEditId] = useState("");
  const [modalMode, setModalMode] = useState("add");
  const [editingCourseId, setEditingCourseId] = useState("");
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [modalDependenciesLoading, setModalDependenciesLoading] = useState(false);
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

  const fetchAll = useCallback(async () => {
    if (!apiBase) return;
    try {
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      const courseRes = await axios.get(`${apiBase}/admin/course`, {
        withCredentials: true,
        skipNetworkRedirect: true,
      });
      setCourses(courseRes.data?.courses || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      console.error("Failed to load courses", error.response?.data || error.message);
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(`${error.response?.data?.message || "Failed to load courses"}`);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, timetableRevision]);

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

  const ensureModalDependencies = useCallback(async () => {
    if (!apiBase || modalDependenciesLoading) return;
    setModalDependenciesLoading(true);
    try {
      const [deptRes, facultyRes] = await Promise.all([
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true" },
        }),
      ]);
      setDepartments(deptRes.data?.departments || []);
      setFacultyList(facultyRes.data?.faculty || []);
    } finally {
      setModalDependenciesLoading(false);
    }
  }, [apiBase, modalDependenciesLoading]);

  const handleSubmitCourse = async (e) => {
    e.preventDefault();

    if (!formData.code || !formData.courseName || !formData.department || !formData.semester || !formData.credit) {
      toast.error("Please fill all required fields");
      return;
    }

    const selectedDepartment = departments.find((d) => d._id === formData.department);
    const selectedFaculty = facultyList.find((f) => f._id === formData.facultyId);
    const existingCourse = courses.find((course) => String(course.id) === String(editingCourseId));
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
      let response;
      if (modalMode === "edit" && editingCourseId) {
        response = await axios.put(`${apiBase}/admin/course/${editingCourseId}`, payload, {
          withCredentials: true,
          skipNetworkRedirect: true,
        });
        toast.success("Course updated successfully");
      } else {
        response = await axios.post(`${apiBase}/admin/course`, payload, {
          withCredentials: true,
          skipNetworkRedirect: true,
        });
        toast.success("Course added successfully");
      }

      const fallbackCourse = {
        id: modalMode === "edit" ? editingCourseId : "",
        code: payload.code,
        courseName: payload.courseName,
        department: selectedDepartment?.name || "",
        departmentId: payload.department,
        semester: payload.semester,
        credit: payload.credit,
        branch: payload.branch,
        coordinatorId: formData.facultyId || "",
        coordinatorName: selectedFaculty?.user?.name || selectedFaculty?.name || null,
        facultyMembers: formData.facultyId
          ? [
              {
                _id: formData.facultyId,
                name: selectedFaculty?.user?.name || selectedFaculty?.name || "Faculty",
              },
            ]
          : [],
      };

      const responseCourse = response?.data?.course || response?.data?.data?.course || fallbackCourse;

      setCourses((prev) => {
        const normalized = normalizeCourseRow(responseCourse, {
          existingCourse,
          referenceCourses: prev,
        });
        if (modalMode === "edit" && editingCourseId) {
          return prev.map((course) =>
            String(course.id) === String(editingCourseId)
              ? { ...course, ...normalized }
              : course
          );
        }
        return [normalized, ...prev.filter((course) => String(course.id) !== String(normalized.id))];
      });

      closeModal();
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

  const openEditModal = async (event, course) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!course?.id || modalDependenciesLoading) return;
    setOpeningEditId(course.id);
    try {
      await ensureModalDependencies();
      setModalMode("edit");
      setEditingCourseId(course.id || course._id || "");
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
    } finally {
      setOpeningEditId("");
    }
  };

  const openAddModal = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (modalDependenciesLoading) return;
    setIsOpeningAdd(true);
    try {
      await ensureModalDependencies();
      setModalMode("add");
      setEditingCourseId("");
      resetForm();
      setIsOpen(true);
    } catch (error) {
      console.error("Failed to load modal data", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to load form data");
    } finally {
      setIsOpeningAdd(false);
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
            disabled={isOpeningAdd || modalDependenciesLoading}
          >
            {isOpeningAdd ? <FiLoader className="courses-spin" /> : "+"}
            {isOpeningAdd ? " Loading..." : " Add Course"}
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
                <th className="courses-cell-serial">S. No</th>
                <th>COURSE CODE</th>
                <th>COURSE NAME</th>
                <th>DEPARTMENT</th>
                <th>STUDENTS</th>
                <th>INSTRUCTOR</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, index) => {
                const numericId = (c.code || "").replace(/\D/g, "") || `${index + 1}`;
                return (
                  <tr key={c.id || c.code || numericId}>
                    <td className="courses-serial-cell">{index + 1}</td>
                    <td className="courses-code">{c.code}</td>
                    <td>{c.courseName}</td>
                    <td>{c.department}</td>
                    <td>{c.studentsInDepartment}</td>
                    <td>{c.coordinatorName || "-"}</td>
                    <td className="courses-row-actions">
                      <button
                        type="button"
                        className="courses-edit-btn"
                        onClick={(event) => openEditModal(event, c)}
                        disabled={modalDependenciesLoading && openingEditId === c.id}
                        aria-label={`Edit ${c.code}`}
                        title="Edit course"
                      >
                        {modalDependenciesLoading && openingEditId === c.id ? (
                          <FiLoader className="courses-spin" />
                        ) : (
                          <FiEdit2 />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="courses-empty">
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
                <button
                  type="submit"
                  className="btn-primary admin-btn-with-loader"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <ClipLoader size={15} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Submit"
                  )}
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


