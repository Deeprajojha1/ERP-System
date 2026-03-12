import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import {
  FiBookOpen,
  FiCalendar,
  FiDollarSign,
  FiGitBranch,
  FiGrid,
  FiHome,
  FiLayers,
  FiList,
  FiSave,
  FiTruck,
} from "react-icons/fi";
import {
  createFeeBatch,
  createFeeBranch,
  fetchFeeBranches,
  fetchFeePrograms,
  fetchHostelYearlyFees,
  fetchTransportYearlyFees,
  selectFeeBranches,
  selectHostelYearlyFees,
  selectFeePrograms,
  selectTransportYearlyFees,
  upsertHostelYearlyFee,
  upsertTransportYearlyFee,
} from "../redux/feeSlice";
import "./Fees.css";

const normalizeLoose = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const matchesDepartmentProgram = (programName = "", allowedProgramSet = new Set()) => {
  const normalizedProgramName = normalizeLoose(programName);
  if (!normalizedProgramName || !allowedProgramSet.size) return false;
  if (allowedProgramSet.has(normalizedProgramName)) return true;
  return Array.from(allowedProgramSet).some(
    (allowed) =>
      normalizedProgramName.includes(allowed) || allowed.includes(normalizedProgramName)
  );
};

const FeesAcademic = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const programs = useSelector(selectFeePrograms);
  const feeBranches = useSelector(selectFeeBranches);
  const hostelYearlyFees = useSelector(selectHostelYearlyFees);
  const transportYearlyFees = useSelector(selectTransportYearlyFees);
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [hostelSubmitting, setHostelSubmitting] = useState(false);
  const [transportSubmitting, setTransportSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [branchForm, setBranchForm] = useState({
    programId: "",
    branchName: "",
    totalCourseFee: "",
  });
  const [hostelForm, setHostelForm] = useState({
    academicYear: "",
    hostelYearlyFee: "",
  });
  const [transportForm, setTransportForm] = useState({
    academicYear: "",
    transportYearlyFee: "",
  });
  const [batchForm, setBatchForm] = useState({
    batchYear: new Date().getFullYear().toString(),
    departmentId: "",
    programIds: [],
  });
  const [useCustomBranchName, setUseCustomBranchName] = useState(false);

  const selectedDepartment = useMemo(
    () => departments.find((department) => String(department._id) === String(batchForm.departmentId)) || null,
    [departments, batchForm.departmentId]
  );

  const departmentProgramSet = useMemo(() => {
    const programList = Array.isArray(selectedDepartment?.program)
      ? selectedDepartment.program
      : Array.isArray(selectedDepartment?.programs)
      ? selectedDepartment.programs
      : [];
    return new Set(programList.map((item) => normalizeLoose(item)).filter(Boolean));
  }, [selectedDepartment]);

  const departmentPrograms = useMemo(() => {
    if (!batchForm.departmentId) return [];
    return programs.filter((program) =>
      matchesDepartmentProgram(program?.programName, departmentProgramSet)
    );
  }, [batchForm.departmentId, departmentProgramSet, programs]);

  const selectedBranchProgram = useMemo(
    () => programs.find((program) => String(program._id) === String(branchForm.programId)) || null,
    [programs, branchForm.programId]
  );

  const programBranchOptions = useMemo(() => {
    const branchMap = new Map();
    (feeBranches || []).forEach((branch) => {
      if (String(branch?.programId?._id || branch?.programId) !== String(branchForm.programId)) return;
      const branchName = String(branch?.branchName || "").trim();
      if (!branchName) return;
      const key = normalizeLoose(branchName);
      if (!branchMap.has(key)) {
        branchMap.set(key, branchName);
      }
    });

    (selectedBranchProgram?.branchIds || []).forEach((branch) => {
      const branchName =
        typeof branch === "string"
          ? ""
          : String(branch?.branchName || "").trim();
      if (!branchName) return;
      const key = normalizeLoose(branchName);
      if (!branchMap.has(key)) {
        branchMap.set(key, branchName);
      }
    });

    return Array.from(branchMap.values()).sort((a, b) => a.localeCompare(b));
  }, [feeBranches, selectedBranchProgram, branchForm.programId]);

  useEffect(() => {
    dispatch(fetchFeePrograms());
    dispatch(fetchHostelYearlyFees());
    dispatch(fetchTransportYearlyFees());
  }, [dispatch]);

  useEffect(() => {
    if (!branchForm.programId) return;
    dispatch(fetchFeeBranches({ programId: branchForm.programId }));
  }, [dispatch, branchForm.programId]);

  useEffect(() => {
    if (!apiBase) return;
    (async () => {
      try {
        const response = await axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
        });
        setDepartments(response.data?.departments || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch departments");
      }
    })();
  }, [apiBase]);

  const submitBranchAndBatch = async (event) => {
    event.preventDefault();
    if (setupSubmitting) return;

    if (!batchForm.departmentId) {
      toast.error("Department is required");
      return;
    }

    const totalCourseFee = Number(branchForm.totalCourseFee);
    if (!branchForm.programId || !branchForm.branchName.trim() || !Number.isFinite(totalCourseFee) || totalCourseFee <= 0) {
      toast.error("Program, branch and total course fee are required");
      return;
    }
    if (
      !batchForm.departmentId ||
      !Number(batchForm.batchYear) ||
      !Array.isArray(batchForm.programIds) ||
      batchForm.programIds.length === 0
    ) {
      toast.error("Batch year, department and program(s) are required");
      return;
    }
    if (!departmentPrograms.some((program) => String(program._id) === String(branchForm.programId))) {
      toast.error("Branch program must belong to selected department");
      return;
    }

    setSetupSubmitting(true);
    let branchSaved = false;
    try {
      await dispatch(
        createFeeBranch({
          programId: branchForm.programId,
          branchName: branchForm.branchName.trim(),
          totalCourseFee,
        })
      ).unwrap();
      branchSaved = true;

      await dispatch(
        createFeeBatch({
          batchYear: Number(batchForm.batchYear),
          departmentId: batchForm.departmentId,
          programIds: batchForm.programIds,
        })
      ).unwrap();
      await dispatch(fetchFeePrograms()).unwrap();
      toast.success("Branch and batch saved");
      setBranchForm({ programId: "", branchName: "", totalCourseFee: "" });
      setUseCustomBranchName(false);
      setBatchForm({
        batchYear: new Date().getFullYear().toString(),
        departmentId: "",
        programIds: [],
      });
    } catch (error) {
      if (branchSaved) {
        toast.error(error || "Branch saved, but batch save failed");
      } else {
        toast.error(error || "Failed to save branch and batch");
      }
    } finally {
      setSetupSubmitting(false);
    }
  };

  const submitHostelFee = async (event) => {
    event.preventDefault();
    if (hostelSubmitting) return;
    if (!hostelForm.academicYear || hostelForm.hostelYearlyFee === "") {
      toast.error("Academic year and hostel fee are required");
      return;
    }
    setHostelSubmitting(true);
    try {
      await dispatch(
        upsertHostelYearlyFee({
          academicYear: hostelForm.academicYear.trim(),
          hostelYearlyFee: Number(hostelForm.hostelYearlyFee),
        })
      ).unwrap();
      toast.success("Hostel fee saved");
      setHostelForm({ academicYear: "", hostelYearlyFee: "" });
    } catch (error) {
      toast.error(error || "Failed to save hostel fee");
    } finally {
      setHostelSubmitting(false);
    }
  };

  const submitTransportFee = async (event) => {
    event.preventDefault();
    if (transportSubmitting) return;
    if (!transportForm.academicYear || transportForm.transportYearlyFee === "") {
      toast.error("Academic year and transport fee are required");
      return;
    }
    setTransportSubmitting(true);
    try {
      await dispatch(
        upsertTransportYearlyFee({
          academicYear: transportForm.academicYear.trim(),
          transportYearlyFee: Number(transportForm.transportYearlyFee),
        })
      ).unwrap();
      toast.success("Transport fee saved");
      setTransportForm({ academicYear: "", transportYearlyFee: "" });
    } catch (error) {
      toast.error(error || "Failed to save transport fee");
    } finally {
      setTransportSubmitting(false);
    }
  };

  const handleDepartmentChange = (value) => {
    const department = departments.find((row) => String(row._id) === String(value));
    const list = Array.isArray(department?.program)
      ? department.program
      : Array.isArray(department?.programs)
      ? department.programs
      : [];
    const allowedProgramNameSet = new Set(list.map((item) => normalizeLoose(item)).filter(Boolean));
    const allowedProgramIds = new Set(
      programs
        .filter((program) => matchesDepartmentProgram(program?.programName, allowedProgramNameSet))
        .map((program) => String(program._id))
    );

    setBatchForm((prev) => ({
      ...prev,
      departmentId: value,
      programIds: value ? prev.programIds.filter((id) => allowedProgramIds.has(String(id))) : [],
    }));

    setBranchForm((prev) => ({
      ...prev,
      programId: value && allowedProgramIds.has(String(prev.programId)) ? prev.programId : "",
      branchName: "",
    }));
    setUseCustomBranchName(false);
  };

  return (
    <div className="fees-page">
      <header className="fee-structure-header">
        <div>
          <h1><FiLayers className="fee-header-icon" /> Fee Structure Management</h1>
          <p>Programs are auto-synced from the existing program list.</p>
        </div>
      </header>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title"><FiGrid className="fee-section-icon" /> Available Programs</h2>
        </div>
        <div className="fee-setup-form fee-setup-form--program">
          {programs.length === 0 ? (
            <p className="fee-empty-copy">No programs found.</p>
          ) : (
            programs.map((program) => (
              <div key={program._id} className="fee-program-pill">
                <strong><FiBookOpen className="fee-pill-icon" /> {program.programName}</strong>
                <span>
                  {program.durationYears} yrs • {program.totalSemesters} sems
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title"><FiGitBranch className="fee-section-icon" /> Branch & Batch Setup</h2>
        </div>
        <form onSubmit={submitBranchAndBatch} className="fee-branch-batch-form">
          <div className="fee-form-group">
            <p className="fee-form-group-label"><FiList className="fee-label-icon" /> Department</p>
            <select
              className="fee-setup-input"
              value={batchForm.departmentId}
              onChange={(event) => handleDepartmentChange(event.target.value)}
              required
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="fee-form-row-2">
            <div className="fee-form-group">
              <p className="fee-form-group-label"><FiBookOpen className="fee-label-icon" /> Program</p>
              <select
                className="fee-setup-input"
                value={branchForm.programId}
                onChange={(event) => {
                  setBranchForm((prev) => ({
                    ...prev,
                    programId: event.target.value,
                    branchName: "",
                  }));
                  setUseCustomBranchName(false);
                }}
                disabled={!batchForm.departmentId}
                required
              >
                <option value="">{batchForm.departmentId ? "Select program" : "Select department first"}</option>
                {departmentPrograms.map((program) => (
                  <option key={program._id} value={program._id}>
                    {program.programName}
                    {Array.isArray(program?.branchIds) && program.branchIds.length
                      ? ` (${program.branchIds.length} branches)`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="fee-form-group">
              <p className="fee-form-group-label"><FiGitBranch className="fee-label-icon" /> Branch Name</p>
              <select
                className="fee-setup-input"
                value={useCustomBranchName ? "__custom__" : branchForm.branchName}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__custom__") {
                    setUseCustomBranchName(true);
                    setBranchForm((prev) => ({ ...prev, branchName: "" }));
                    return;
                  }
                  setUseCustomBranchName(false);
                  setBranchForm((prev) => ({ ...prev, branchName: value }));
                }}
                disabled={!branchForm.programId}
                required
              >
                <option value="">
                  {branchForm.programId ? "Select branch" : "Select program first"}
                </option>
                {programBranchOptions.map((branchName) => (
                  <option key={branchName} value={branchName}>
                    {branchName}
                  </option>
                ))}
                <option value="__custom__">+ Add new branch</option>
              </select>
              {useCustomBranchName ? (
                <input
                  className="fee-setup-input"
                  type="text"
                  placeholder="Type new branch name"
                  value={branchForm.branchName}
                  onChange={(event) =>
                    setBranchForm((prev) => ({ ...prev, branchName: event.target.value }))
                  }
                  required
                />
              ) : null}
            </div>
          </div>

          <div className="fee-form-row-3">
            <div className="fee-form-group">
              <p className="fee-form-group-label"><FiDollarSign className="fee-label-icon" /> Total Course Fee</p>
              <input
                className="fee-setup-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 400000"
                value={branchForm.totalCourseFee}
                onChange={(event) =>
                  setBranchForm((prev) => ({ ...prev, totalCourseFee: event.target.value }))
                }
              />
              {branchForm.programId && branchForm.totalCourseFee ? (
                <p className="fee-setup-help">
                  {(() => {
                    const selectedProgram = selectedBranchProgram;
                    const semesters = Number(selectedProgram?.totalSemesters || 0);
                    const totalCourseFee = Number(branchForm.totalCourseFee);
                    if (!Number.isFinite(semesters) || semesters <= 0 || !Number.isFinite(totalCourseFee) || totalCourseFee <= 0) {
                      return "Semester split will appear after selecting a program and total fee.";
                    }
                    const perSemester = (totalCourseFee / semesters).toFixed(2);
                    return `Equal split: ${semesters} semesters × ₹${perSemester}`;
                  })()}
                </p>
              ) : null}
            </div>
            <div className="fee-form-group">
              <p className="fee-form-group-label"><FiCalendar className="fee-label-icon" /> Batch Year</p>
              <input
                className="fee-setup-input"
                type="number"
                min="2000"
                max="2100"
                value={batchForm.batchYear}
                onChange={(event) =>
                  setBatchForm((prev) => ({ ...prev, batchYear: event.target.value }))
                }
                required
              />
            </div>
            <div className="fee-form-group">
              <p className="fee-form-group-label"><FiLayers className="fee-label-icon" /> Batch Programs</p>
              <select
                className="fee-setup-input fee-setup-input--multi"
                multiple
                value={batchForm.programIds}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                  setBatchForm((prev) => ({ ...prev, programIds: values }));
                }}
                disabled={!batchForm.departmentId}
                required
              >
                {departmentPrograms.map((program) => (
                  <option key={program._id} value={program._id}>
                    {program.programName}
                  </option>
                ))}
              </select>
              <p className="fee-setup-help">Hold Ctrl/Cmd to select multiple programs.</p>
              {(() => {
                const batchYear = Number(batchForm.batchYear);
                if (!Number.isFinite(batchYear) || !batchForm.programIds.length) return null;
                const selected = programs.filter((program) =>
                  batchForm.programIds.some((id) => String(id) === String(program._id))
                );
                const maxDuration = selected.reduce(
                  (max, program) => Math.max(max, Number(program?.durationYears || 0)),
                  0
                );
                if (!maxDuration) return null;
                const endYear = batchYear + maxDuration;
                return (
                  <p className="fee-setup-help">
                    Fee batch window: {batchYear}–{endYear} (based on selected program duration).
                  </p>
                );
              })()}
            </div>
          </div>

          <div className="fee-setup-actions">
            <button className="fee-setup-submit-btn" type="submit" disabled={setupSubmitting}>
              <FiSave />
              {setupSubmitting ? "Saving..." : "Save Branch & Batch"}
            </button>
          </div>
        </form>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title"><FiHome className="fee-section-icon" /> Hostel Fees (Yearly)</h2>
        </div>
        <form
          onSubmit={submitHostelFee}
          className="fee-setup-form fee-setup-form--branch"
        >
          <input
            className="fee-setup-input"
            type="text"
            placeholder="Academic year (e.g. 2024-2025)"
            value={hostelForm.academicYear}
            onChange={(event) =>
              setHostelForm((prev) => ({ ...prev, academicYear: event.target.value }))
            }
            required
          />
          <input
            className="fee-setup-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Hostel yearly fee"
            value={hostelForm.hostelYearlyFee}
            onChange={(event) =>
              setHostelForm((prev) => ({ ...prev, hostelYearlyFee: event.target.value }))
            }
            required
          />
          <button className="fee-setup-submit-btn" type="submit" disabled={hostelSubmitting}>
            {hostelSubmitting ? "Saving..." : "Save Hostel Fee"}
          </button>
        </form>
        {hostelYearlyFees.length ? (
          <div className="fees-table-wrap">
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Hostel Yearly Fee</th>
                </tr>
              </thead>
              <tbody>
                {hostelYearlyFees.map((row) => (
                  <tr key={row._id}>
                    <td>{row.academicYear}</td>
                    <td>{row.hostelYearlyFee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="fee-setup-help">No hostel fees configured yet.</p>
        )}
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title"><FiTruck className="fee-section-icon" /> Transport Fees (Yearly)</h2>
        </div>
        <form
          onSubmit={submitTransportFee}
          className="fee-setup-form fee-setup-form--branch"
        >
          <input
            className="fee-setup-input"
            type="text"
            placeholder="Academic year (e.g. 2024-2025)"
            value={transportForm.academicYear}
            onChange={(event) =>
              setTransportForm((prev) => ({ ...prev, academicYear: event.target.value }))
            }
            required
          />
          <input
            className="fee-setup-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Transport yearly fee"
            value={transportForm.transportYearlyFee}
            onChange={(event) =>
              setTransportForm((prev) => ({ ...prev, transportYearlyFee: event.target.value }))
            }
            required
          />
          <button className="fee-setup-submit-btn" type="submit" disabled={transportSubmitting}>
            {transportSubmitting ? "Saving..." : "Save Transport Fee"}
          </button>
        </form>
        {transportYearlyFees.length ? (
          <div className="fees-table-wrap">
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Transport Yearly Fee</th>
                </tr>
              </thead>
              <tbody>
                {transportYearlyFees.map((row) => (
                  <tr key={row._id}>
                    <td>{row.academicYear}</td>
                    <td>{row.transportYearlyFee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="fee-setup-help">No transport fees configured yet.</p>
        )}
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title"><FiGrid className="fee-section-icon" /> Configured Programs</h2>
        </div>
        <div className="fees-table-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Duration</th>
                <th>Total Semesters</th>
                <th>Branches</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program._id}>
                  <td className="fees-name">{program.programName}</td>
                  <td>{program.durationYears} years</td>
                  <td>{program.totalSemesters}</td>
                  <td>
                    {(program.branchIds || [])
                      .map((branch) => branch.branchName || "Branch")
                      .join(", ") || "No branches"}
                  </td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td colSpan={4}>No programs found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FeesAcademic;
