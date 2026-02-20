import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { FiEdit2, FiSearch, FiTrash2 } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import {
  setStudents,
  setStudentsError,
  setStudentsLoading,
} from "../redux/studentSlice";
import emptyStateImg from "../assets/empty-state.svg";
import "./Student.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import ClipLoader from "./components/ClipLoader";

const PROGRAM_CANONICAL_MAP = {
  btech: "btech",
  mtech: "mtech",
  bca: "bca",
  mca: "mca",
  bba: "bba",
  mba: "mba",
  bsc: "bsc",
  msc: "msc",
  bpharma: "bpharma",
  mpharma: "mpharma",
  phd: "phd",
  bpharm: "bpharma",
  mpharm: "mpharma",
};

const canonicalizeProgram = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return PROGRAM_CANONICAL_MAP[normalized] || "";
};

const Student = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [isOpen, setIsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const dispatch = useDispatch();
  const { students } = useSelector(
    (state) => state.student
  );
  const apiBase = useSelector((state) => state.config.apiBase);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    aadharNumber: "",
    phoneNumber: "",
    DOB: "",
    enrollmentNumber: "",
    department: "",
    program: "",
    semester: "",
    academicYear: "",
    fatherName: "",
    fatherPhoneNumber: "",
    collegeEmail: "",
    group: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);

  const extractStudentsFromResponse = (payload) => {
    if (Array.isArray(payload?.students)) return payload.students;
    if (Array.isArray(payload?.data?.students)) return payload.data.students;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const normalizeStudentRow = (student) => ({
    ...student,
    _id: student?._id || student?.id || student?.studentId || "",
    studentName:
      student?.studentName ||
      student?.user?.name ||
      student?.name ||
      student?.fullName ||
      "",
    rollNo: student?.rollNo || student?.enrollmentNumber || student?.roll || "",
    department:
      student?.department?.name ||
      student?.department?.departmentName ||
      student?.department ||
      "",
    status: student?.status || student?.user?.status || "active",
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoadState(ADMIN_LOAD_STATES.PENDING);
        dispatch(setStudentsLoading(true));
        const [studentRes, deptRes] = await Promise.all([
          axios.get(`${apiBase}/admin/student`, {
            withCredentials: true,
          }),
          axios.get(`${apiBase}/admin/department`, {
            withCredentials: true,
          }),
        ]);
        const rows = extractStudentsFromResponse(studentRes.data).map(normalizeStudentRow);
        dispatch(setStudents(rows));
        setDepartments(deptRes.data?.departments || []);
        setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      } catch (error) {
        console.error(
          "Fetch data failed:",
          error.response?.data || error.message
        );
        toast.error(`${error.response?.data?.message || "Failed to load students"}`);
        dispatch(
          setStudentsError(
            error.response?.data?.message ||
              "Failed to load students"
          )
        );
        setLoadState(ADMIN_LOAD_STATES.FAILURE);
      } finally {
        dispatch(setStudentsLoading(false));
      }
    };

    fetchAll();
  }, []);

  const ensureModalDependencies = async () => {
    const [deptRes, groupRes] = await Promise.all([
      axios.get(`${apiBase}/admin/department`, {
        withCredentials: true,
        params: { noCache: "true" },
      }),
      axios.get(`${apiBase}/admin/group`, {
        withCredentials: true,
        params: { noCache: "true" },
      }),
    ]);
    setDepartments(deptRes.data?.departments || []);
    setGroups(groupRes.data?.groups || []);
  };

  const syncStudentsSilently = async () => {
    const res = await axios.get(`${apiBase}/admin/student`, {
      withCredentials: true,
    });
    dispatch(setStudents(extractStudentsFromResponse(res.data).map(normalizeStudentRow)));
  };

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const term = search.toLowerCase();
      const matchSearch =
        (s.studentName || s.user?.name || s.name || "")
          .toLowerCase()
          .includes(term) ||
        (s.rollNo || s.enrollmentNumber || s.roll || "")
          .toLowerCase()
          .includes(term) ||
        (s.department?.name || s.department || "")
          .toLowerCase()
          .includes(term);
      const matchDept =
        department === "All Departments" ||
        s.department?.name === department ||
        s.department === department;
      return matchSearch && matchDept;
    });
  }, [students, search, department]);

  const filteredGroups = useMemo(() => {
    if (!formData.department) return groups;
    return groups.filter(
      (g) =>
        g.department?._id === formData.department ||
        g.department === formData.department
    );
  }, [groups, formData.department]);

  const selectedDepartmentPrograms = useMemo(() => {
    const selectedDept = departments.find((d) => d._id === formData.department);
    const deptPrograms = selectedDept?.programs || selectedDept?.program || [];
    if (!Array.isArray(deptPrograms)) return [];
    return [...new Set(deptPrograms.map((prog) => canonicalizeProgram(prog)).filter(Boolean))];
  }, [departments, formData.department]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "department") {
      setFormData((prev) => ({
        ...prev,
        department: value,
        program: "",
      }));
      return;
    }
    if (name === "program") {
      setFormData((prev) => ({
        ...prev,
        program: canonicalizeProgram(value),
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddModal = async () => {
    try {
      await ensureModalDependencies();
      setEditTarget(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        aadharNumber: "",
        phoneNumber: "",
        DOB: "",
        enrollmentNumber: "",
        department: "",
        program: "",
        semester: "",
        academicYear: "",
        fatherName: "",
        fatherPhoneNumber: "",
        collegeEmail: "",
        group: "",
      });
      setIsOpen(true);
    } catch (error) {
      console.error("Fetch modal dependencies failed:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to load form data");
    }
  };

  const openEditModal = async (student) => {
    if (!student?._id) return;
    try {
      await ensureModalDependencies();
      const res = await axios.get(
        `${apiBase}/admin/student/${student._id}?full=true`,
        { withCredentials: true }
      );
      const fullStudent = res.data?.student || student;
      setEditTarget(fullStudent);
      setFormData({
        name: fullStudent.user?.name || fullStudent.studentName || fullStudent.name || "",
        email: fullStudent.user?.email || fullStudent.email || "",
        password: "",
        aadharNumber:
          fullStudent.user?.aadharNumber || fullStudent.aadharNumber || "",
        phoneNumber:
          fullStudent.user?.phoneNumber || fullStudent.phoneNumber || "",
        DOB: fullStudent.user?.DOB ? fullStudent.user.DOB.slice(0, 10) : "",
        enrollmentNumber: fullStudent.enrollmentNumber || fullStudent.rollNo || "",
        department: fullStudent.department?._id || fullStudent.department || "",
        program: canonicalizeProgram(fullStudent.program || ""),
        semester: fullStudent.semester || "",
        academicYear: fullStudent.academicYear || "",
        fatherName: fullStudent.fatherName || "",
        fatherPhoneNumber: fullStudent.fatherPhoneNumber || "",
        collegeEmail: fullStudent.collegeEmail || "",
        group: fullStudent.group?._id || fullStudent.group || "",
      });
      setIsOpen(true);
    } catch (error) {
      console.error("Fetch student details failed:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to load student details");
    }
  };

  const handleDelete = async (student) => {
    if (!student?._id) return;
    const ok = window.confirm(
      `Delete student "${student.studentName || student.user?.name || student.name}"?`
    );
    if (!ok) return;
    try {
      await axios.patch(
        `${apiBase}/admin/student/${student._id}/delete`,
        {},
        { withCredentials: true }
      );
      dispatch(
        setStudents(students.filter((item) => item._id !== student._id))
      );
      toast.success("Student deleted successfully", { icon: "\u2705" });
    } catch (error) {
      console.error(
        "Delete student failed:",
        error.response?.data || error.message
      );
      toast.error(
        `${error.response?.data?.message || "Failed to delete student"}`
      );
    }
  };

  const buildPayload = () => {
    const base = {
      enrollmentNumber: formData.enrollmentNumber,
      department: formData.department,
      program: canonicalizeProgram(formData.program),
      semester: formData.semester
        ? Number(formData.semester)
        : "",
      academicYear: formData.academicYear,
      fatherName: formData.fatherName,
      fatherPhoneNumber: formData.fatherPhoneNumber,
      collegeEmail: formData.collegeEmail,
      group: formData.group || null,
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
        const res = await axios.put(
          `${apiBase}/admin/student/${editTarget._id}`,
          payload,
          { withCredentials: true }
        );
        const updatedStudent =
          res.data?.student ||
          res.data?.updatedStudent ||
          res.data?.data ||
          null;
        if (updatedStudent?._id) {
          dispatch(
            setStudents(
              students.map((item) =>
                item._id === updatedStudent._id ? updatedStudent : item
              )
            )
          );
        } else {
          await syncStudentsSilently();
        }
        toast.success("Student updated successfully", { icon: "\u2705" });
      } else {
        const res = await axios.post(
          `${apiBase}/admin/student`,
          payload,
          { withCredentials: true }
        );
        const createdStudent =
          res.data?.student ||
          res.data?.newStudent ||
          res.data?.data ||
          null;
        if (createdStudent?._id) {
          dispatch(setStudents([createdStudent, ...students]));
        } else {
          await syncStudentsSilently();
        }
        toast.success("Student added successfully", { icon: "\u2705" });
      }

      setIsOpen(false);
      setEditTarget(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        aadharNumber: "",
        phoneNumber: "",
        DOB: "",
        enrollmentNumber: "",
        department: "",
        program: "",
        semester: "",
        academicYear: "",
        fatherName: "",
        fatherPhoneNumber: "",
        collegeEmail: "",
        group: "",
      });
    } catch (error) {
      console.error(
        "Add student failed:",
        error.response?.data || error.message
      );
      toast.error(error.response?.data?.message || "Failed to add student", {
        icon: "\u274C",
      });
    } finally {
      setSubmitting(false);
    }
  };


  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="student-state pending app-loader-state">
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
          <p>Loading students...</p>
        </div>
      );
    }
    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="student-state error">
          <img
            src={emptyStateImg}
            alt="Failed"
            className="student-state-img"
          />
          <h3>Failed to load students</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="student-header">
          <div>
            <h1 className="student-title">Students</h1>
            <p className="student-subtitle">
              {filtered.length} Students in the organization
            </p>
          </div>
          <button className="student-add-btn" type="button" onClick={openAddModal}>
            + Add Student
          </button>
        </div>

        <div className="student-panel">
          <div className="student-filters">
            <div className="student-search">
              <span className="student-search-icon" aria-hidden="true">
                <FiSearch />
              </span>
              <input
                type="text"
                placeholder="Search by name, roll or dept"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="student-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="All Departments">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="student-table-wrap">
            {filtered.length === 0 ? (
              <div className="student-empty-state">
                <img src={emptyStateImg} alt="No data" />
                <h3>Oops! Data not found</h3>
                <p>No students match your filters.</p>
              </div>
            ) : (
              <table className="student-table">
                <thead>
                  <tr>
                    <th className="student-cell-serial">S. No</th>
                    <th>STUDENT NAME</th>
                    <th>ROLL NO</th>
                    <th>DEPARTMENT</th>
                    <th>SEMESTER</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, index) => {
                    const numericId =
                      s.rollNo || s.enrollmentNumber || s.roll || `${index + 1}`;
                    return (
                      <tr
                        key={s._id || s.user?._id || `${numericId}-${index}`}
                      >
                        <td className="student-serial-cell">{index + 1}</td>
                        <td className="student-roll">
                          {s.studentName || s.user?.name || s.name || "N/A"}
                        </td>
                        <td>{s.rollNo || s.enrollmentNumber || s.roll || "N/A"}</td>
                      <td>{s.department?.name || s.department}</td>
                      <td>{s.semester}</td>
                      <td>
                        <span className="student-status">
                          {(s.user?.status || s.status || "active").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="student-actions">
                          <button className="student-action-btn ghost" type="button" onClick={() => openEditModal(s)}>
                            <FiEdit2 />
                            Edit
                          </button>
                          <button className="student-action-btn danger" type="button" onClick={() => handleDelete(s)}>
                            <FiTrash2 />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="student-page">
      {renderState()}
{isOpen && (
        <div className="student-modal">
          <div
            className="student-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="student-modal-card">
            <div className="student-modal-head">
              <h2>
                {editTarget ? "Edit Student" : "Add New Student"}
              </h2>
              <p>
                Student academic & personal information
              </p>
            </div>
            <form className="student-form" onSubmit={handleSubmit}>
              <div className="student-form-row">
                <label>
                  Name
                  <input
                    type="text"
                    placeholder="Subesh"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    placeholder="subesh@domain.com"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
              </div>
              {!editTarget && (
                <div className="student-form-row">
                  <label>
                    Password
                    <input
                      type="password"
                      placeholder="pass123"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Aadhar Number
                    <input
                      type="text"
                      placeholder="123756589012"
                      name="aadharNumber"
                      value={formData.aadharNumber}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              )}
              <div className="student-form-row">
                <label>
                  Phone Number
                  <input
                    type="tel"
                    placeholder="9276543210"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
                <label>
                  DOB
                  <input
                    type="date"
                    name="DOB"
                    value={formData.DOB}
                    onChange={handleChange}
                    disabled={!!editTarget}
                  />
                </label>
              </div>
              <div className="student-form-row">
                <label>
                  Enrollment Number
                  <input
                    type="text"
                    placeholder="2024CT90134"
                    name="enrollmentNumber"
                    value={formData.enrollmentNumber}
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
              <div className="student-form-row">
                <label>
                  Program
                  <select
                    name="program"
                    value={formData.program}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select Program
                    </option>
                    {selectedDepartmentPrograms.map((prog) => (
                      <option key={prog} value={prog}>
                        {String(prog).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Semester
                  <div className="student-split">
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleChange}
                    >
                      <option value="" disabled>
                        Sem
                      </option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                    </select>
                    <select
                      name="group"
                      value={formData.group}
                      onChange={handleChange}
                    >
                      <option value="">
                        No Group
                      </option>
                      {filteredGroups.map((g) => (
                        <option key={g._id} value={g._id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>
              <div className="student-form-row">
                <label>
                  Academic Year
                  <input
                    type="text"
                    placeholder="2024-2025"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  Father Name
                  <input
                    type="text"
                    placeholder="James Doe"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                  />
                </label>
              </div>
              <div className="student-form-row">
                <label>
                  Father Phone Number
                  <input
                    type="tel"
                    placeholder="9876543211"
                    name="fatherPhoneNumber"
                    value={formData.fatherPhoneNumber}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  College Email
                  <input
                    type="email"
                    placeholder="john@college.edu"
                    name="collegeEmail"
                    value={formData.collegeEmail}
                    onChange={handleChange}
                  />
                </label>
              </div>
              <div className="student-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary admin-btn-with-loader"
                  disabled={submitting}
                >
                  {submitting
                    ? (
                      <>
                        <ClipLoader size={15} />
                        <span>Saving...</span>
                      </>
                    )
                    : editTarget
                    ? "Update Student"
                    : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Student;


