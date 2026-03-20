import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiLoader,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import ModernDatePicker from "../components/common/ModernDatePicker";
import {
  setStudents,
  setStudentsError,
  setStudentsLoading,
} from "../redux/studentSlice";
import emptyStateImg from "../assets/empty-state.svg";
import "./Student.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import ClipLoader from "./components/ClipLoader";
import { hasPermission, resolvePermissions } from "../utils/permissions";

const normalizeProgram = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
};

const isForbiddenError = (error) =>
  Number(error?.response?.status) === 403;

const getProgramDurationYears = ({ batch, selectedProgramNorm = "", feePrograms = [] }) => {
  if (!selectedProgramNorm) return NaN;
  const batchPrograms = Array.isArray(batch?.programIds) ? batch.programIds : [];
  const fromBatch = batchPrograms.find(
    (program) => normalizeProgram(program?.programName) === selectedProgramNorm
  );
  const durationFromBatch = Number(fromBatch?.durationYears);
  if (Number.isFinite(durationFromBatch) && durationFromBatch > 0) {
    return durationFromBatch;
  }

  const fromPrograms = (feePrograms || []).find(
    (program) => normalizeProgram(program?.programName) === selectedProgramNorm
  );
  const durationFromPrograms = Number(fromPrograms?.durationYears);
  if (Number.isFinite(durationFromPrograms) && durationFromPrograms > 0) {
    return durationFromPrograms;
  }

  return NaN;
};

const getBatchLabel = (batch, selectedProgramNorm = "", feePrograms = []) => {
  const startYear = Number(batch?.batchYear);
  if (!Number.isFinite(startYear) || startYear <= 0) return String(batch?.batchYear || "");

  const programs = Array.isArray(batch?.programIds) ? batch.programIds : [];
  let durationYears = getProgramDurationYears({ batch, selectedProgramNorm, feePrograms });

  if (!Number.isFinite(durationYears) || durationYears <= 0) {
    durationYears = programs.reduce(
      (max, program) => Math.max(max, Number(program?.durationYears || 0)),
      0
    );
  }

  if (!Number.isFinite(durationYears) || durationYears <= 0) durationYears = 1;
  return `${startYear}-${startYear + durationYears}`;
};

const Student = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [isOpen, setIsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [feeBatches, setFeeBatches] = useState([]);
  const [feePrograms, setFeePrograms] = useState([]);
  const [isOpeningAdd, setIsOpeningAdd] = useState(false);
  const [openingEditId, setOpeningEditId] = useState("");
  const [modalDependenciesLoading, setModalDependenciesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const dispatch = useDispatch();
  const { students } = useSelector(
    (state) => state.student
  );
  const userData = useSelector((state) => state.user.userData);
  const apiBase = useSelector((state) => state.config.apiBase);
  const permissions = resolvePermissions(userData);
  const canStudentWrite = hasPermission(permissions, "module.students_write");
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
    batchId: "",
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
      if (!apiBase) return;
      try {
        setLoadState(ADMIN_LOAD_STATES.PENDING);
        dispatch(setStudentsLoading(true));
        const studentRes = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
        });
        const rows = extractStudentsFromResponse(studentRes.data).map(normalizeStudentRow);
        dispatch(setStudents(rows));

        try {
          const deptRes = await axios.get(`${apiBase}/admin/department`, {
            withCredentials: true,
          });
          setDepartments(deptRes.data?.departments || []);
        } catch (deptError) {
          if (!isForbiddenError(deptError)) {
            throw deptError;
          }
          setDepartments([]);
        }

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
  }, [apiBase, dispatch]);

  const ensureModalDependencies = async () => {
    if (!apiBase || modalDependenciesLoading) return;
    setModalDependenciesLoading(true);
    try {
      const [deptRes, groupRes, batchRes, programRes] = await Promise.allSettled([
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/group`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/fee/batch`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true", limit: 500 },
        }),
        axios.get(`${apiBase}/admin/fee/program`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true" },
        }),
      ]);

      if (deptRes.status === "fulfilled") {
        setDepartments(deptRes.value.data?.departments || []);
      } else if (isForbiddenError(deptRes.reason)) {
        setDepartments([]);
      } else {
        throw deptRes.reason;
      }

      if (groupRes.status === "fulfilled") {
        setGroups(groupRes.value.data?.groups || []);
      } else if (isForbiddenError(groupRes.reason)) {
        setGroups([]);
      } else {
        throw groupRes.reason;
      }

      if (batchRes.status === "fulfilled") {
        setFeeBatches(batchRes.value.data?.data || []);
      } else if (isForbiddenError(batchRes.reason)) {
        setFeeBatches([]);
      } else {
        setFeeBatches([]);
      }

      if (programRes.status === "fulfilled") {
        setFeePrograms(programRes.value.data?.data || []);
      } else if (isForbiddenError(programRes.reason)) {
        setFeePrograms([]);
      } else {
        setFeePrograms([]);
      }
    } finally {
      setModalDependenciesLoading(false);
    }
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

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStartIndex = (page - 1) * pageSize;
  const paginatedStudents = filtered.slice(
    pageStartIndex,
    pageStartIndex + pageSize
  );
  const rangeStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, department]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filteredGroups = useMemo(() => {
    if (!formData.department) return groups;
    const selectedProgram = normalizeProgram(formData.program);
    const departmentGroups = groups.filter((g) => {
      const matchesDepartment =
        g.department?._id === formData.department ||
        g.department === formData.department;
      return matchesDepartment;
    });

    if (!selectedProgram) return departmentGroups;

    const programMatchedGroups = departmentGroups.filter((g) => {
      if (String(g._id) === String(formData.group)) return true;
      const groupBranch = normalizeProgram(g.branch || "");
      return groupBranch === selectedProgram;
    });

    // Backward-compatible fallback: if groups are not tagged with branch yet,
    // show department groups instead of an empty list.
    if (programMatchedGroups.length === 0) return departmentGroups;
    return programMatchedGroups;
  }, [groups, formData.department, formData.program]);

  const selectedDepartmentPrograms = useMemo(() => {
    const selectedDept = departments.find((d) => d._id === formData.department);
    const deptPrograms = selectedDept?.programs || selectedDept?.program || [];
    if (!Array.isArray(deptPrograms)) return [];
    return [...new Set(deptPrograms.map((prog) => normalizeProgram(prog)).filter(Boolean))];
  }, [departments, formData.department]);

  const filteredBatches = useMemo(() => {
    if (!formData.department) return [];
    const selectedProgram = normalizeProgram(formData.program);
    return feeBatches.filter((batch) => {
      if (String(batch?._id || "") === String(formData.batchId || "")) return true;
      const batchDepartmentId = batch?.departmentId?._id || batch?.departmentId;
      if (String(batchDepartmentId || "") !== String(formData.department)) return false;
      if (!selectedProgram) return true;
      const batchPrograms = Array.isArray(batch?.programIds) ? batch.programIds : [];
      return batchPrograms.some((program) => {
        const programName = program?.programName || "";
        return normalizeProgram(programName) === selectedProgram;
      });
    });
  }, [feeBatches, formData.department, formData.program, formData.batchId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "department") {
      setFormData((prev) => ({
        ...prev,
        department: value,
        program: "",
        group: "",
        batchId: "",
        academicYear: "",
      }));
      return;
    }
    if (name === "program") {
      setFormData((prev) => ({
        ...prev,
        program: normalizeProgram(value),
        group: "",
        batchId: "",
        academicYear: "",
      }));
      return;
    }
    if (name === "batchId") {
      const selectedBatch = feeBatches.find((batch) => String(batch?._id) === String(value));
      const year = Number(selectedBatch?.batchYear);
      setFormData((prev) => ({
        ...prev,
        batchId: value,
        academicYear:
          Number.isFinite(year) && year > 0
            ? `${year}-${year + 1}`
            : "",
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddModal = async (event) => {
    if (!canStudentWrite) {
      toast.error("Read-only access: student creation is not allowed.");
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (modalDependenciesLoading || submitting) return;
    setIsOpeningAdd(true);
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
        batchId: "",
      });
      setIsOpen(true);
    } catch (error) {
      console.error("Fetch modal dependencies failed:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to load form data");
    } finally {
      setIsOpeningAdd(false);
    }
  };

  const openEditModal = async (event, student) => {
    if (!canStudentWrite) {
      toast.error("Read-only access: student update is not allowed.");
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!student?._id) return;
    if (modalDependenciesLoading || openingEditId) return;
    setOpeningEditId(student._id);
    try {
      await ensureModalDependencies();
      const res = await axios.get(
        `${apiBase}/admin/student/${student._id}?full=true`,
        { withCredentials: true, skipNetworkRedirect: true }
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
        program: normalizeProgram(fullStudent.program || ""),
        semester: fullStudent.semester || "",
        academicYear: fullStudent.academicYear || "",
        fatherName: fullStudent.fatherName || "",
        fatherPhoneNumber: fullStudent.fatherPhoneNumber || "",
        collegeEmail: fullStudent.collegeEmail || "",
        group: fullStudent.group?._id || fullStudent.group || "",
        batchId: fullStudent.batchId?._id || fullStudent.batchId || "",
      });
      setIsOpen(true);
    } catch (error) {
      console.error("Fetch student details failed:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to load student details");
    } finally {
      setOpeningEditId("");
    }
  };

  const handleDelete = async (student) => {
    if (!canStudentWrite) {
      toast.error("Read-only access: student delete is not allowed.");
      return;
    }
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
      program: normalizeProgram(formData.program),
      semester: formData.semester
        ? Number(formData.semester)
        : "",
      academicYear: formData.academicYear,
      fatherName: formData.fatherName,
      fatherPhoneNumber: formData.fatherPhoneNumber,
      collegeEmail: formData.collegeEmail,
      group: formData.group || null,
      batchId: formData.batchId || null,
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
    if (!canStudentWrite) {
      toast.error("Read-only access: student changes are not allowed.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = buildPayload();

      const missing = [];
      const requireValue = (label, value) => {
        const v = value == null ? "" : String(value).trim();
        if (!v) missing.push(label);
      };

      // Common required fields (backend enforces these for create).
      requireValue("Enrollment Number", payload.enrollmentNumber);
      requireValue("Department", payload.department);
      requireValue("Program", payload.program);
      requireValue("Batch", payload.batchId);
      if (!Number.isFinite(Number(payload.semester)) || Number(payload.semester) <= 0) {
        missing.push("Semester");
      }
      requireValue("Academic Year", payload.academicYear);

      if (!editTarget) {
        requireValue("Name", payload.name);
        requireValue("Email", payload.email);
        requireValue("Password", payload.password);
      }

      if (missing.length) {
        toast.error(`${missing[0]} is required`);
        return;
      }

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
        batchId: "",
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
          {canStudentWrite ? (
            <button
              className="student-add-btn"
              type="button"
              onClick={openAddModal}
              disabled={isOpeningAdd || modalDependenciesLoading}
            >
              {isOpeningAdd ? (
                <>
                  <FiLoader className="student-spin" />
                  Loading...
                </>
              ) : (
                "+ Add Student"
              )}
            </button>
          ) : null}
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
                    {canStudentWrite ? <th>ACTIONS</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((s, index) => {
                    const numericId =
                      s.rollNo || s.enrollmentNumber || s.roll || `${pageStartIndex + index + 1}`;
                    return (
                      <tr
                        key={s._id || s.user?._id || `${numericId}-${index}`}
                      >
                        <td className="student-serial-cell">{pageStartIndex + index + 1}</td>
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
                      {canStudentWrite ? (
                        <td>
                          <div className="student-actions">
                            <button
                              className="student-action-btn ghost"
                              type="button"
                              onClick={(event) => openEditModal(event, s)}
                              disabled={openingEditId === s._id || modalDependenciesLoading}
                            >
                              {openingEditId === s._id ? (
                                <>
                                  <FiLoader className="student-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <FiEdit2 />
                                  Edit
                                </>
                              )}
                            </button>
                            <button className="student-action-btn danger" type="button" onClick={() => handleDelete(s)}>
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
                </tbody>
              </table>
            )}
          </div>
          {filtered.length > 0 && (
            <div className="student-pagination">
              <button
                type="button"
                className="student-page-btn"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                <FiChevronLeft aria-hidden="true" />
                <span>Prev</span>
              </button>
              <div className="student-page-info">
                {rangeStart} to {rangeEnd} of {filtered.length}
              </div>
              <button
                type="button"
                className="student-page-btn"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                <span>Next</span>
                <FiChevronRight aria-hidden="true" />
              </button>
            </div>
          )}
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
                      required
                      minLength={6}
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
                  <ModernDatePicker
                    name="DOB"
                    value={formData.DOB}
                    onChange={handleChange}
                    max={new Date().toISOString().slice(0, 10)}
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
                      required
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
                          {g.branch ? `${g.name} (${g.branch})` : g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>
              <div className="student-form-row">
                <label>
                  Batch
                  <select
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleChange}
                    disabled={!formData.department || !formData.program}
                    required
                  >
                    <option value="">
                      {formData.department && formData.program
                        ? "Select Batch"
                        : "Select Department and Program first"}
                    </option>
                    {filteredBatches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {getBatchLabel(batch, normalizeProgram(formData.program), feePrograms)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Academic Year
                  <input
                    type="text"
                    placeholder="2024-2025"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>
              <div className="student-form-row">
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


