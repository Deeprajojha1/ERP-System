import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import {
  createStudentFeeDetails,
  fetchFeePrograms,
  selectFeeActionLoading,
  selectFeePrograms,
} from "../redux/feeSlice";
import "./StudentFeeMapping.css";

const defaultForm = {
  studentMongoId: "",
  userId: "",
  studentId: "",
  batchId: "",
  programId: "",
  branchId: "",
  currentSemester: "1",
  hostelOpted: false,
  transportOpted: false,
  scholarshipType: "NONE",
  scholarshipValue: "0",
  discountType: "NONE",
  discountValue: "0",
};

const StudentFeeMapping = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const programs = useSelector(selectFeePrograms);
  const submitting = useSelector(selectFeeActionLoading);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    dispatch(fetchFeePrograms());
  }, [dispatch]);

  useEffect(() => {
    if (!apiBase) return;
    (async () => {
      try {
        const response = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { noCache: "true" },
        });
        setStudents(response.data?.students || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch students");
      }
    })();
  }, [apiBase]);

  const selectedProgram = useMemo(
    () => programs.find((program) => String(program._id) === String(form.programId)),
    [programs, form.programId]
  );

  const branchOptions = useMemo(
    () => selectedProgram?.branchIds || [],
    [selectedProgram]
  );

  const selectStudent = (student) => {
    setForm((prev) => ({
      ...prev,
      studentMongoId: student._id || "",
      userId: student.user?._id || "",
      studentId: student.enrollmentNumber || "",
    }));
  };

  const submitMapping = async (event) => {
    event.preventDefault();
    if (!form.userId || !form.studentId || !form.batchId || !form.programId || !form.branchId) {
      toast.error("All required mapping fields must be filled");
      return;
    }

    try {
      await dispatch(
        createStudentFeeDetails({
          userId: form.userId,
          studentId: form.studentId,
          batchId: form.batchId,
          programId: form.programId,
          branchId: form.branchId,
          currentSemester: Number(form.currentSemester || 1),
          hostelOpted: Boolean(form.hostelOpted),
          transportOpted: Boolean(form.transportOpted),
          scholarship: {
            type: form.scholarshipType,
            value: Number(form.scholarshipValue || 0),
          },
          discount: {
            type: form.discountType,
            value: Number(form.discountValue || 0),
          },
        })
      ).unwrap();
      toast.success("Student fee mapping created");
      setForm(defaultForm);
    } catch (error) {
      toast.error(error || "Failed to create student fee mapping");
    }
  };

  return (
    <div className="student-fee-mapping-page">
      <header className="sfm-hero">
        <div>
          <p className="sfm-eyebrow">Student Fee Mapping</p>
          <h1>Create student fee profile</h1>
          <p className="sfm-supporting">
            Integrated endpoint: <code>/api/admin/fee/student-details</code>
          </p>
        </div>
      </header>

      <section className="sfm-table-card">
        <div className="sfm-table-head">
          <p>Enrollment</p>
          <p>Name</p>
          <p>Department</p>
          <p>Program</p>
          <p>Semester</p>
          <p>Action</p>
        </div>
        <div className="sfm-table-body">
          {students.slice(0, 20).map((student) => (
            <article key={student._id} className="sfm-table-row">
              <div className="sfm-student-cell">
                <p className="sfm-student-name">{student.enrollmentNumber || "N/A"}</p>
              </div>
              <div>{student.user?.name || "N/A"}</div>
              <div>{student.department?.name || "N/A"}</div>
              <div>{student.program || "N/A"}</div>
              <div>{student.semester || "N/A"}</div>
              <div>
                <button type="button" className="sfm-action-btn" onClick={() => selectStudent(student)}>
                  Use
                </button>
              </div>
            </article>
          ))}
          {students.length === 0 && (
            <div className="sfm-detail-empty">No students found</div>
          )}
        </div>
      </section>

      <section className="sfm-detail-panel">
        <div className="sfm-detail-top">
          <div>
            <p className="sfm-detail-eyebrow">Create Mapping</p>
            <h2>Student Fee Details</h2>
            <p className="sfm-supporting">
              Note: <code>batchId</code> is required by backend and must be provided.
            </p>
          </div>
        </div>

        <form
          onSubmit={submitMapping}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}
        >
          <input
            type="text"
            placeholder="Student document id (optional)"
            value={form.studentMongoId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, studentMongoId: event.target.value }))
            }
          />
          <input
            type="text"
            placeholder="User id"
            value={form.userId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, userId: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="Student enrollment id"
            value={form.studentId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, studentId: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="Batch id (Mongo ObjectId)"
            value={form.batchId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, batchId: event.target.value }))
            }
            required
          />
          <select
            value={form.programId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, programId: event.target.value, branchId: "" }))
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
          <select
            value={form.branchId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, branchId: event.target.value }))
            }
            required
          >
            <option value="">Select branch</option>
            {branchOptions.map((branch) => (
              <option key={branch._id} value={branch._id}>
                {branch.branchName}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Current semester"
            value={form.currentSemester}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, currentSemester: event.target.value }))
            }
            required
          />
          <label>
            Scholarship Type
            <select
              value={form.scholarshipType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, scholarshipType: event.target.value }))
              }
            >
              <option value="NONE">NONE</option>
              <option value="PERCENT">PERCENT</option>
              <option value="FIXED">FIXED</option>
            </select>
          </label>
          <input
            type="number"
            min="0"
            placeholder="Scholarship value"
            value={form.scholarshipValue}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, scholarshipValue: event.target.value }))
            }
          />
          <label>
            Discount Type
            <select
              value={form.discountType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountType: event.target.value }))
              }
            >
              <option value="NONE">NONE</option>
              <option value="PERCENT">PERCENT</option>
              <option value="FIXED">FIXED</option>
            </select>
          </label>
          <input
            type="number"
            min="0"
            placeholder="Discount value"
            value={form.discountValue}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, discountValue: event.target.value }))
            }
          />
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={form.hostelOpted}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, hostelOpted: event.target.checked }))
              }
            />
            Hostel opted
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={form.transportOpted}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, transportOpted: event.target.checked }))
              }
            />
            Transport opted
          </label>
          <button type="submit" className="sfm-export-btn" disabled={submitting}>
            {submitting ? "Saving..." : "Create Mapping"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default StudentFeeMapping;
