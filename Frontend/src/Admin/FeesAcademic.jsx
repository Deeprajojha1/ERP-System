import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import {
  createFeeBatch,
  createFeeBranch,
  fetchFeePrograms,
  fetchHostelYearlyFees,
  fetchTransportYearlyFees,
  selectHostelYearlyFees,
  selectFeePrograms,
  selectTransportYearlyFees,
  upsertHostelYearlyFee,
  upsertTransportYearlyFee,
} from "../redux/feeSlice";
import "./Fees.css";

const HOSTEL_ROOM_TYPE_OPTIONS = [
  "2 SEATER",
  "3 SEATER",
];
const CUSTOM_ROOM_TYPE_OPTION = "__CUSTOM__";
const EXCLUDED_ROOM_TYPES = new Set(["GENERAL", "1 SEATER", "4 SEATER"]);

const formatHostelRoomTypeLabel = (value = "") => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "2 SEATER" || raw === "TWO-TIER" || raw === "TWO TIER") return "Two Tier (2 Seater)";
  if (raw === "3 SEATER" || raw === "THREE-TIER" || raw === "THREE TIER") return "Three Tier (3 Seater)";
  if (raw === "1 SEATER" || raw === "SINGLE") return "Single (1 Seater)";
  if (raw === "4 SEATER" || raw === "FOUR-TIER" || raw === "FOUR TIER") return "Four Tier (4 Seater)";
  if (raw === "GENERAL") return "General";
  return value || "-";
};

const FeesAcademic = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const programs = useSelector(selectFeePrograms);
  const hostelYearlyFees = useSelector(selectHostelYearlyFees);
  const transportYearlyFees = useSelector(selectTransportYearlyFees);
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [hostelSubmitting, setHostelSubmitting] = useState(false);
  const [transportSubmitting, setTransportSubmitting] = useState(false);
  const [programRefreshing, setProgramRefreshing] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [branchForm, setBranchForm] = useState({
    programId: "",
    branchName: "",
    totalCourseFee: "",
  });
  const [hostelForm, setHostelForm] = useState({
    academicYear: "",
    roomType: "",
    customRoomType: "",
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

  const normalizeLoose = (value = "") =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

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
    return programs.filter((program) => departmentProgramSet.has(normalizeLoose(program?.programName)));
  }, [batchForm.departmentId, departmentProgramSet, programs]);

  const selectedBranchProgram = useMemo(
    () => programs.find((program) => String(program._id) === String(branchForm.programId)) || null,
    [programs, branchForm.programId]
  );

  const hostelRoomTypeOptions = useMemo(() => {
    const set = new Set(HOSTEL_ROOM_TYPE_OPTIONS);
    (hostelYearlyFees || []).forEach((row) => {
      const type = String(row?.roomType || "").trim().toUpperCase();
      if (type && !EXCLUDED_ROOM_TYPES.has(type)) set.add(type);
    });
    return Array.from(set);
  }, [hostelYearlyFees]);

  useEffect(() => {
    dispatch(fetchFeePrograms());
    dispatch(fetchHostelYearlyFees());
    dispatch(fetchTransportYearlyFees());
  }, [dispatch]);

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
    const resolvedRoomType =
      hostelForm.roomType === CUSTOM_ROOM_TYPE_OPTION
        ? hostelForm.customRoomType
        : hostelForm.roomType;
    if (!hostelForm.academicYear || !resolvedRoomType || hostelForm.hostelYearlyFee === "") {
      toast.error("Academic year, room type and hostel fee are required");
      return;
    }
    setHostelSubmitting(true);
    try {
      await dispatch(
        upsertHostelYearlyFee({
          academicYear: hostelForm.academicYear.trim(),
          roomType: String(resolvedRoomType).trim().toUpperCase(),
          hostelYearlyFee: Number(hostelForm.hostelYearlyFee),
        })
      ).unwrap();
      toast.success("Hostel fee saved");
      setHostelForm({
        academicYear: "",
        roomType: "",
        customRoomType: "",
        hostelYearlyFee: "",
      });
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

  const refreshPrograms = async () => {
    if (programRefreshing) return;
    setProgramRefreshing(true);
    try {
      await dispatch(fetchFeePrograms()).unwrap();
    } catch {
      // error toast is handled by slice consumers; keep refresh button silent here.
    } finally {
      setProgramRefreshing(false);
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
        .filter((program) => allowedProgramNameSet.has(normalizeLoose(program?.programName)))
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
    }));
  };

  return (
    <div className="fees-page">
      <header className="fee-structure-header">
        <div>
          <h1>Fee Structure Management</h1>
          <p>Programs are auto-synced from the existing program list.</p>
        </div>
      </header>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Available Programs</h2>
        </div>
        <div className="fee-setup-form fee-setup-form--program">
          {programs.length === 0 ? (
            <p className="fee-empty-copy">No programs found. Refresh to sync.</p>
          ) : (
            programs.map((program) => (
              <div key={program._id} className="fee-program-pill">
                <strong>{program.programName}</strong>
                <span>
                  {program.durationYears} yrs • {program.totalSemesters} sems
                </span>
              </div>
            ))
          )}
          <button
            className="fee-setup-submit-btn"
            type="button"
            onClick={refreshPrograms}
            disabled={programRefreshing}
          >
            {programRefreshing ? "Refreshing..." : "Refresh Programs"}
          </button>
        </div>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Branch & Batch Setup</h2>
        </div>
        <form onSubmit={submitBranchAndBatch}>
          <div className="fee-setup-grid">
            <div className="fee-setup-form fee-setup-form--branch">
            <select
              className="fee-setup-input"
              value={branchForm.programId}
              onChange={(event) =>
                setBranchForm((prev) => ({ ...prev, programId: event.target.value }))
              }
              disabled={!batchForm.departmentId}
              required
            >
              <option value="">{batchForm.departmentId ? "Select program" : "Select department first"}</option>
              {departmentPrograms.map((program) => (
                <option key={program._id} value={program._id}>
                  {program.programName}
                </option>
              ))}
            </select>
            <input
              className="fee-setup-input"
              type="text"
              placeholder="Branch name"
              value={branchForm.branchName}
              onChange={(event) =>
                setBranchForm((prev) => ({ ...prev, branchName: event.target.value }))
              }
              required
            />
            <input
              className="fee-setup-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Total course fee"
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
                  return `Equal split: ${semesters} semesters x ${perSemester}`;
                })()}
              </p>
            ) : null}
            </div>
            <div className="fee-setup-form fee-setup-form--batch">
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
            <p className="fee-setup-help">For multiple programs, hold Ctrl/Cmd and select options.</p>
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
                  Fee batch window: {batchYear}-{endYear} (based on selected program duration).
                </p>
              );
            })()}
            </div>
          </div>
          <div className="fee-setup-actions">
            <button className="fee-setup-submit-btn" type="submit" disabled={setupSubmitting}>
              {setupSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Hostel Fees (Yearly)</h2>
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
          <select
            className="fee-setup-input"
            value={hostelForm.roomType}
            onChange={(event) =>
              setHostelForm((prev) => ({
                ...prev,
                roomType: event.target.value,
                customRoomType:
                  event.target.value === CUSTOM_ROOM_TYPE_OPTION ? prev.customRoomType : "",
              }))
            }
            required
          >
            <option value="">Select room type</option>
            {hostelRoomTypeOptions.map((type) => (
              <option key={type} value={type}>
                {formatHostelRoomTypeLabel(type)}
              </option>
            ))}
            <option value={CUSTOM_ROOM_TYPE_OPTION}>+ Create room type</option>
          </select>
          {hostelForm.roomType === CUSTOM_ROOM_TYPE_OPTION ? (
            <input
              className="fee-setup-input"
              type="text"
              placeholder="New room type (e.g. 5 SEATER)"
              value={hostelForm.customRoomType}
              onChange={(event) =>
                setHostelForm((prev) => ({
                  ...prev,
                  customRoomType: event.target.value.toUpperCase(),
                }))
              }
              required
            />
          ) : null}
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
                  <th>Room Type</th>
                  <th>Hostel Yearly Fee</th>
                </tr>
              </thead>
              <tbody>
                {hostelYearlyFees.map((row) => (
                  <tr key={row._id}>
                    <td>{row.academicYear}</td>
                    <td>{formatHostelRoomTypeLabel(row.roomType)}</td>
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
          <h2 className="fee-table-title">Transport Fees (Yearly)</h2>
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
          <h2 className="fee-table-title">Configured Programs</h2>
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
