import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import {
  createFeeBatch,
  createFeeBranch,
  createFeeProgram,
  fetchFeePrograms,
  selectFeeActionLoading,
  selectFeePrograms,
} from "../redux/feeSlice";
import "./Fees.css";

const parseSemesterBaseFees = (value) => {
  const parts = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.map((part) => {
    const [semesterNo, baseFee] = part.split(":").map((token) => token.trim());
    return {
      semesterNo: Number(semesterNo),
      baseFee: Number(baseFee),
    };
  });
};

const FeesAcademic = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const programs = useSelector(selectFeePrograms);
  const actionLoading = useSelector(selectFeeActionLoading);
  const [departments, setDepartments] = useState([]);
  const [programForm, setProgramForm] = useState({
    programName: "",
    durationYears: "4",
  });
  const [branchForm, setBranchForm] = useState({
    programId: "",
    branchName: "",
    semesterBaseFees: "",
  });
  const [batchForm, setBatchForm] = useState({
    batchYear: new Date().getFullYear().toString(),
    departmentId: "",
    programIds: [],
  });

  useEffect(() => {
    dispatch(fetchFeePrograms());
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

  const totalSemesters = useMemo(
    () => Number(programForm.durationYears || 0) * 2,
    [programForm.durationYears]
  );

  const submitProgram = async (event) => {
    event.preventDefault();
    if (!programForm.programName.trim() || !Number(programForm.durationYears)) {
      toast.error("Program name and duration are required");
      return;
    }
    try {
      await dispatch(
        createFeeProgram({
          programName: programForm.programName.trim(),
          durationYears: Number(programForm.durationYears),
          totalSemesters,
        })
      ).unwrap();
      toast.success("Program created");
      setProgramForm({ programName: "", durationYears: "4" });
      dispatch(fetchFeePrograms());
    } catch (error) {
      toast.error(error || "Failed to create program");
    }
  };

  const submitBranch = async (event) => {
    event.preventDefault();
    const semesterBaseFees = parseSemesterBaseFees(branchForm.semesterBaseFees);
    if (!branchForm.programId || !branchForm.branchName.trim() || !semesterBaseFees.length) {
      toast.error("Program, branch and semester fees are required");
      return;
    }
    try {
      await dispatch(
        createFeeBranch({
          programId: branchForm.programId,
          branchName: branchForm.branchName.trim(),
          semesterBaseFees,
        })
      ).unwrap();
      toast.success("Branch created");
      setBranchForm({ programId: "", branchName: "", semesterBaseFees: "" });
      dispatch(fetchFeePrograms());
    } catch (error) {
      toast.error(error || "Failed to create branch");
    }
  };

  const submitBatch = async (event) => {
    event.preventDefault();
    if (
      !batchForm.departmentId ||
      !Number(batchForm.batchYear) ||
      !Array.isArray(batchForm.programIds) ||
      batchForm.programIds.length === 0
    ) {
      toast.error("Batch year, department and program(s) are required");
      return;
    }
    try {
      await dispatch(
        createFeeBatch({
          batchYear: Number(batchForm.batchYear),
          departmentId: batchForm.departmentId,
          programIds: batchForm.programIds,
        })
      ).unwrap();
      toast.success("Batch created");
      setBatchForm((prev) => ({ ...prev, programIds: [] }));
    } catch (error) {
      toast.error(error || "Failed to create batch");
    }
  };

  return (
    <div className="fees-page">
      <header className="fee-structure-header">
        <div>
          <h1>Fee Structure Management</h1>
          <p>Live integration with program, branch, and batch endpoints.</p>
        </div>
      </header>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Create Program</h2>
        </div>
        <form
          onSubmit={submitProgram}
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "10px", marginBottom: "12px" }}
        >
          <input
            type="text"
            placeholder="Program name (e.g. B.Tech)"
            value={programForm.programName}
            onChange={(event) =>
              setProgramForm((prev) => ({ ...prev, programName: event.target.value }))
            }
            required
          />
          <input
            type="number"
            min="1"
            placeholder="Duration years"
            value={programForm.durationYears}
            onChange={(event) =>
              setProgramForm((prev) => ({ ...prev, durationYears: event.target.value }))
            }
            required
          />
          <input type="number" value={totalSemesters} readOnly />
          <button type="submit" disabled={actionLoading}>
            {actionLoading ? "Saving..." : "Create Program"}
          </button>
        </form>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Create Branch</h2>
        </div>
        <form
          onSubmit={submitBranch}
          style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 2fr auto", gap: "10px", marginBottom: "12px" }}
        >
          <select
            value={branchForm.programId}
            onChange={(event) =>
              setBranchForm((prev) => ({ ...prev, programId: event.target.value }))
            }
            required
          >
            <option value="">Select program</option>
            {programs.map((program) => (
              <option key={program._id} value={program._id}>
                {program.programName}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Branch name"
            value={branchForm.branchName}
            onChange={(event) =>
              setBranchForm((prev) => ({ ...prev, branchName: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="Semester fees (e.g. 1:50000,2:50000)"
            value={branchForm.semesterBaseFees}
            onChange={(event) =>
              setBranchForm((prev) => ({ ...prev, semesterBaseFees: event.target.value }))
            }
            required
          />
          <button type="submit" disabled={actionLoading}>
            {actionLoading ? "Saving..." : "Create Branch"}
          </button>
        </form>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Create Batch</h2>
        </div>
        <form
          onSubmit={submitBatch}
          style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 2fr auto", gap: "10px", marginBottom: "12px" }}
        >
          <input
            type="number"
            min="2000"
            max="2100"
            value={batchForm.batchYear}
            onChange={(event) =>
              setBatchForm((prev) => ({ ...prev, batchYear: event.target.value }))
            }
            required
          />
          <select
            value={batchForm.departmentId}
            onChange={(event) =>
              setBatchForm((prev) => ({ ...prev, departmentId: event.target.value }))
            }
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
            multiple
            value={batchForm.programIds}
            onChange={(event) => {
              const values = Array.from(event.target.selectedOptions).map((option) => option.value);
              setBatchForm((prev) => ({ ...prev, programIds: values }));
            }}
            required
          >
            {programs.map((program) => (
              <option key={program._id} value={program._id}>
                {program.programName}
              </option>
            ))}
          </select>
          <button type="submit" disabled={actionLoading}>
            {actionLoading ? "Saving..." : "Create Batch"}
          </button>
        </form>
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
