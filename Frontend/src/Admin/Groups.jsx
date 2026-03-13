import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import {
  FiEdit2,
  FiLoader,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { ThreeDots } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Groups.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import toast from "react-hot-toast";
import { selectTimetableRevision } from "../redux/timetableSlice";
import {
  createAdminGroup,
  deleteAdminGroup,
  fetchAdminGroups,
  fetchGroupModalDependencies,
  selectAdminGroupDeleteLoadState,
  selectAdminGroupDeletingId,
  selectAdminGroupDepartments,
  selectAdminGroupError,
  selectAdminGroupFaculty,
  selectAdminGroupListLoadState,
  selectAdminGroupModalLoadState,
  selectAdminGroups,
  selectAdminGroupSubmitLoadState,
  updateAdminGroup,
} from "../redux/groupSlice";

const normalizeLoose = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const extractBranchName = (branch) => {
  if (!branch) return "";
  if (typeof branch === "string") return branch.trim();
  return String(branch?.branchName || branch?.name || "").trim();
};

const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  const message = error?.response?.data?.message || error?.message;
  return String(message || fallback);
};

const Groups = () => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState("All Departments");
  const [isOpen, setIsOpen] = useState(false);
  const [isOpeningAdd, setIsOpeningAdd] = useState(false);
  const [openingEditId, setOpeningEditId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const apiBase = useSelector((state) => state.config.apiBase);
  const timetableRevision = useSelector(selectTimetableRevision);
  const groups = useSelector(selectAdminGroups);
  const departments = useSelector(selectAdminGroupDepartments);
  const faculty = useSelector(selectAdminGroupFaculty);
  const listLoadState = useSelector(selectAdminGroupListLoadState);
  const modalLoadState = useSelector(selectAdminGroupModalLoadState);
  const submitLoadState = useSelector(selectAdminGroupSubmitLoadState);
  const deleteLoadState = useSelector(selectAdminGroupDeleteLoadState);
  const deletingGroupId = useSelector(selectAdminGroupDeletingId);
  const groupError = useSelector(selectAdminGroupError);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    selectedProgramId: "",
    branch: "",
    coordinator: "",
    roomNo: "",
  });
  const [feePrograms, setFeePrograms] = useState([]);
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

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      department: "",
      selectedProgramId: "",
      branch: "",
      coordinator: "",
      roomNo: "",
    });
  }, []);

  const loadFeePrograms = useCallback(async () => {
    if (!apiBase) return;
    const res = await axios.get(`${apiBase}/admin/fee/program`, {
      withCredentials: true,
      skipNetworkRedirect: true,
      params: { noCache: "true" },
    });
    const list = Array.isArray(res.data?.data) ? res.data.data : [];
    setFeePrograms(list);
    return list;
  }, [apiBase]);

  const loadGroups = useCallback(
    async ({ silent = false, noCache = false } = {}) => {
      if (!apiBase) return;
      try {
        await dispatch(fetchAdminGroups({ apiBase, noCache })).unwrap();
      } catch (error) {
        if (!silent) {
          toast.error(getErrorMessage(error, "Failed to load groups"));
        }
      }
    },
    [apiBase, dispatch]
  );

  useEffect(() => {
    if (!apiBase) return;
    loadGroups();
  }, [apiBase, timetableRevision, loadGroups]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return groups.filter((g) => {
      const departmentId = g.department?._id || g.department;
      const matchSearch =
        (g.name || "").toLowerCase().includes(term) ||
        (g.department?.name || "").toLowerCase().includes(term) ||
        (g.roomNo || "").toLowerCase().includes(term);
      const matchBranch =
        activeDept === "All Departments" ||
        String(departmentId || "") === String(activeDept);
      return matchSearch && matchBranch;
    });
  }, [search, activeDept, groups]);

  const filterDepartments = useMemo(() => {
    const map = new Map();
    groups.forEach((g) => {
      const deptId = g.department?._id || g.department;
      const deptName = g.department?.name || g.department;
      if (!deptId || !deptName || map.has(String(deptId))) return;
      map.set(String(deptId), { _id: String(deptId), name: deptName });
    });
    return Array.from(map.values());
  }, [groups]);

  const handleOpenAdd = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!apiBase || modalLoadState === ADMIN_LOAD_STATES.PENDING) return;
    setIsOpeningAdd(true);
    try {
      await dispatch(fetchGroupModalDependencies({ apiBase })).unwrap();
      await loadFeePrograms();
      setEditTarget(null);
      resetForm();
      setIsOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load form data"));
    } finally {
      setIsOpeningAdd(false);
    }
  };

  const handleOpenEdit = async (event, group) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!apiBase || modalLoadState === ADMIN_LOAD_STATES.PENDING || !group?._id) return;
    setOpeningEditId(group._id);
    try {
      const deps = await dispatch(fetchGroupModalDependencies({ apiBase })).unwrap();
      const loadedPrograms = (await loadFeePrograms()) || [];
      const existingBranch = String(group.branch || "").trim();
      const dependencyDepartments = Array.isArray(deps?.departments) ? deps.departments : departments;
      const departmentObj = dependencyDepartments.find(
        (d) => String(d._id) === String(group.department?._id || group.department || "")
      );
      const departmentProgramList = Array.isArray(departmentObj?.program)
        ? departmentObj.program
        : Array.isArray(departmentObj?.programs)
        ? departmentObj.programs
        : [];
      const departmentProgramSet = new Set(
        departmentProgramList.map((item) => normalizeLoose(item)).filter(Boolean)
      );
      const matchedProgram = loadedPrograms.find((program) => {
        const programNorm = normalizeLoose(program?.programName);
        if (!programNorm || !departmentProgramSet.has(programNorm)) return false;
        return (program?.branchIds || []).some(
          (branch) => normalizeLoose(extractBranchName(branch)) === normalizeLoose(existingBranch)
        );
      });
      setEditTarget(group);
      setFormData({
        name: group.name || "",
        department: group.department?._id || group.department || "",
        selectedProgramId: matchedProgram?._id || "",
        branch: group.branch || "",
        coordinator: group.coordinator?._id || group.coordinator || "",
        roomNo: group.roomNo || "",
      });
      setIsOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load form data"));
    } finally {
      setOpeningEditId(null);
    }
  };

  const handleDelete = async (event, group) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!group?._id) return;
    const ok = window.confirm(`Delete group "${group.name}"?`);
    if (!ok) return;
    try {
      await dispatch(deleteAdminGroup({ apiBase, id: group._id })).unwrap();
      toast.success("Group deleted successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete group"));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLoadState === ADMIN_LOAD_STATES.PENDING) return;

    const payload = {
      name: String(formData.name || "").trim(),
      department: formData.department,
      branch: String(formData.branch || "").trim(),
      coordinator: formData.coordinator,
      roomNo: String(formData.roomNo || "").trim(),
    };

    try {
      if (editTarget?._id) {
        await dispatch(
          updateAdminGroup({
            apiBase,
            id: editTarget._id,
            payload,
          })
        ).unwrap();
        toast.success("Group updated successfully");
      } else {
        await dispatch(createAdminGroup({ apiBase, payload })).unwrap();
        toast.success("Group added successfully");
      }
      setIsOpen(false);
      setEditTarget(null);
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save group"));
    }
  };

  const renderState = () => {
    if (
      listLoadState === ADMIN_LOAD_STATES.PENDING ||
      listLoadState === ADMIN_LOAD_STATES.INITIAL
    ) {
      return (
        <div className="groups-state pending app-loader-state">
          <ThreeDots
            height={64}
            width={64}
            color="#2563eb"
            ariaLabel="Loading"
            visible={true}
          />
          <p>Loading groups...</p>
        </div>
      );
    }
    if (listLoadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="groups-state error">
          <img src={emptyStateImg} alt="Failed" className="groups-state-img" />
          <h3>Failed to load groups</h3>
          <p>{groupError || "Please try again in a moment."}</p>
          <button
            type="button"
            className="groups-add-btn"
            onClick={() => loadGroups()}
          >
            Retry
          </button>
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
            disabled={
              modalLoadState === ADMIN_LOAD_STATES.PENDING || isOpeningAdd
            }
          >
            {isOpeningAdd ? <FiLoader className="groups-spin" /> : <FiPlus />}
            {isOpeningAdd ? "Loading..." : "Add Group"}
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
            {filterDepartments.map((d) => (
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
                      onClick={(event) => handleOpenEdit(event, g)}
                      disabled={
                        modalLoadState === ADMIN_LOAD_STATES.PENDING &&
                        openingEditId === g._id
                      }
                    >
                      {modalLoadState === ADMIN_LOAD_STATES.PENDING &&
                      openingEditId === g._id ? (
                        <FiLoader className="groups-spin" />
                      ) : (
                        <FiEdit2 />
                      )}
                    </button>
                    <button
                      type="button"
                      className="groups-icon-btn danger"
                      onClick={(event) => handleDelete(event, g)}
                      disabled={
                        deleteLoadState === ADMIN_LOAD_STATES.PENDING &&
                        deletingGroupId === g._id
                      }
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
                  {g.branch ? <p className="groups-code">Branch: {g.branch}</p> : null}
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
                      selectedProgramId: "",
                      branch: "",
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
                Program
                <select
                  value={formData.selectedProgramId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      selectedProgramId: e.target.value,
                      branch: "",
                    }))
                  }
                  disabled={!formData.department}
                  required
                >
                  <option value="">
                    {formData.department ? "Select Program" : "Select Department first"}
                  </option>
                  {(() => {
                    const selectedDepartment = departments.find(
                      (d) => String(d._id) === String(formData.department)
                    );
                    const departmentProgramList = Array.isArray(selectedDepartment?.program)
                      ? selectedDepartment.program
                      : Array.isArray(selectedDepartment?.programs)
                      ? selectedDepartment.programs
                      : [];
                    const departmentProgramSet = new Set(
                      departmentProgramList.map((item) => normalizeLoose(item)).filter(Boolean)
                    );
                    return feePrograms
                      .filter((program) =>
                        departmentProgramSet.has(normalizeLoose(program?.programName))
                      )
                      .map((program) => (
                        <option key={program._id} value={program._id}>
                          {program.programName}
                        </option>
                      ));
                  })()}
                </select>
              </label>
              <label>
                Branch
                <select
                  value={formData.branch}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, branch: e.target.value }))
                  }
                  disabled={!formData.department}
                  required
                >
                  <option value="">
                    {formData.department ? "Select Branch" : "Select Department first"}
                  </option>
                  {(() => {
                    const selectedDepartment = departments.find(
                      (d) => String(d._id) === String(formData.department)
                    );
                    const departmentProgramList = Array.isArray(selectedDepartment?.program)
                      ? selectedDepartment.program
                      : Array.isArray(selectedDepartment?.programs)
                      ? selectedDepartment.programs
                      : [];
                    const departmentProgramSet = new Set(
                      departmentProgramList.map((item) => normalizeLoose(item)).filter(Boolean)
                    );
                    const allowedPrograms = feePrograms.filter((program) =>
                      departmentProgramSet.has(normalizeLoose(program?.programName))
                    );
                    const scopedPrograms = formData.selectedProgramId
                      ? allowedPrograms.filter(
                          (program) => String(program._id) === String(formData.selectedProgramId)
                        )
                      : allowedPrograms;
                    const branchSet = new Set();
                    scopedPrograms.forEach((program) => {
                      (program?.branchIds || []).forEach((branch) => {
                        const name = extractBranchName(branch);
                        if (name) branchSet.add(name);
                      });
                    });
                    if (formData.branch && !branchSet.has(formData.branch)) {
                      branchSet.add(formData.branch);
                    }
                    return Array.from(branchSet)
                      .sort((a, b) => a.localeCompare(b))
                      .map((branchName) => (
                        <option key={branchName} value={branchName}>
                          {branchName}
                        </option>
                      ));
                  })()}
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
                  disabled={submitLoadState === ADMIN_LOAD_STATES.PENDING}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitLoadState === ADMIN_LOAD_STATES.PENDING}
                >
                  {submitLoadState === ADMIN_LOAD_STATES.PENDING
                    ? editTarget
                      ? "Updating..."
                      : "Saving..."
                    : editTarget
                      ? "Update"
                      : "Save Group"}
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



