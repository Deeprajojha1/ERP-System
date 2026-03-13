import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  FiBookOpen,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiEdit3,
  FiGitBranch,
  FiHome,
  FiLayers,
  FiList,
  FiMapPin,
  FiPercent,
  FiPlusCircle,
  FiSave,
  FiTruck,
  FiUser,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import axios from "../utils/axiosInstance";
import {
  createStudentFeeDetails,
  fetchStudentFeeDetails,
  selectStudentFeeDetails,
  updateStudentOptions,
  fetchFeePrograms,
  fetchFeeBatches,
  selectFeeActionLoading,
  selectFeePrograms,
  selectFeeBatches,
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
  const batches = useSelector(selectFeeBatches);
  const feeProfiles = useSelector(selectStudentFeeDetails);
  const submitting = useSelector(selectFeeActionLoading);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [editProfileId, setEditProfileId] = useState("");
  const [editHostelOpted, setEditHostelOpted] = useState(false);
  const [editTransportOpted, setEditTransportOpted] = useState(false);

  useEffect(() => {
    dispatch(fetchFeePrograms());
    dispatch(fetchFeeBatches());
    dispatch(fetchStudentFeeDetails());
  }, [dispatch]);

  useEffect(() => {
    if (!apiBase) return;
    (async () => {
      try {
        const response = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { noCache: "true", full: "true" },
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
    const resolvedUserId =
      typeof student.user === "object" ? student.user?._id || "" : student.user || "";
    if (!resolvedUserId) {
      toast.error("Selected student is missing user id");
      return;
    }

    setForm((prev) => ({
      ...prev,
      studentMongoId: student._id || "",
      userId: resolvedUserId,
      studentId: student.enrollmentNumber || student.rollNo || "",
      currentSemester: String(student.semester || prev.currentSemester || "1"),
    }));
    setSelectedStudentId(String(student._id || ""));
    toast.success("Student selected");
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

  const selectProfileForEdit = (profileId) => {
    const profile = feeProfiles.find((item) => String(item._id) === String(profileId));
    if (!profile) return;
    setEditProfileId(profile._id);
    setEditHostelOpted(Boolean(profile.hostelOpted));
    setEditTransportOpted(Boolean(profile.transportOpted));
  };

  const submitProfileUpdate = async (event) => {
    event.preventDefault();
    if (!editProfileId) {
      toast.error("Select a fee profile to update");
      return;
    }
    try {
      await dispatch(
        updateStudentOptions({
          id: editProfileId,
          hostelOpted: editHostelOpted,
          transportOpted: editTransportOpted,
        })
      ).unwrap();
      toast.success("Student fee options updated");
    } catch (error) {
      toast.error(error || "Failed to update student options");
    }
  };

  return (
    <div className="student-fee-mapping-page">
      <header className="sfm-hero">
        <div>
          <p className="sfm-eyebrow">Student Fee Mapping</p>
          <h1>
            <FiUserCheck /> Create student fee profile
          </h1>
        </div>
      </header>

      <section className="sfm-table-card">
        <div className="sfm-table-head">
          <p><FiCreditCard /> Enrollment</p>
          <p><FiUser /> Name</p>
          <p><FiBriefcase /> Department</p>
          <p><FiLayers /> Program</p>
          <p><FiBookOpen /> Semester</p>
          <p><FiCheckCircle /> Action</p>
        </div>
        <div className="sfm-table-body">
          {students.slice(0, 20).map((student) => (
            <article key={student._id} className="sfm-table-row">
              <div className="sfm-student-cell">
                <p className="sfm-student-name">
                  {student.enrollmentNumber || student.rollNo || "N/A"}
                </p>
              </div>
              <div>{student.user?.name || student.studentName || "N/A"}</div>
              <div>{student.department?.name || student.department || "N/A"}</div>
              <div>{student.program || student.programme || "N/A"}</div>
              <div>{student.semester || "N/A"}</div>
              <div>
                <button
                  type="button"
                  className="sfm-action-btn"
                  onClick={() => selectStudent(student)}
                >
                  {String(student._id || "") === selectedStudentId ? (
                    <>
                      <FiCheckCircle /> Selected
                    </>
                  ) : (
                    <>
                      <FiPlusCircle /> Use
                    </>
                  )}
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
            <h2>
              <FiEdit3 /> Student Fee Details
            </h2>
            <p className="sfm-supporting">
              Select the student and fill in the mapping details below.
            </p>
          </div>
        </div>

        <form
          onSubmit={submitMapping}
          className="sfm-form-grid"
        >
          <label className="sfm-form-field">
            <span><FiList /> Student document id (optional)</span>
            <input
              type="text"
              placeholder="Student document id"
              value={form.studentMongoId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, studentMongoId: event.target.value }))
              }
            />
          </label>
          <label className="sfm-form-field">
            <span><FiUsers /> User id</span>
            <input
              type="text"
              placeholder="User id"
              value={form.userId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, userId: event.target.value }))
              }
              required
            />
          </label>
          <label className="sfm-form-field">
            <span><FiCreditCard /> Student enrollment id</span>
            <input
              type="text"
              placeholder="Student enrollment id"
              value={form.studentId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, studentId: event.target.value }))
              }
              required
            />
          </label>
          <label className="sfm-form-field">
            <span><FiLayers /> Batch</span>
            <select
              value={form.batchId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, batchId: event.target.value }))
              }
              required
            >
              <option value="">Select batch</option>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.batchYear} {batch.departmentId?.name || ""}
                </option>
              ))}
            </select>
          </label>
          <label className="sfm-form-field">
            <span><FiBookOpen /> Program</span>
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
          </label>
          <label className="sfm-form-field">
            <span><FiGitBranch /> Branch</span>
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
          </label>
          <label className="sfm-form-field">
            <span><FiBookOpen /> Current semester</span>
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
          </label>
          <label className="sfm-form-field">
            <span><FiPercent /> Scholarship Type</span>
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
          <label className="sfm-form-field">
            <span><FiPercent /> Scholarship value</span>
            <input
              type="number"
              min="0"
              placeholder="Scholarship value"
              value={form.scholarshipValue}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, scholarshipValue: event.target.value }))
              }
            />
          </label>
          <label className="sfm-form-field">
            <span><FiPercent /> Discount Type</span>
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
          <label className="sfm-form-field">
            <span><FiPercent /> Discount value</span>
            <input
              type="number"
              min="0"
              placeholder="Discount value"
              value={form.discountValue}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountValue: event.target.value }))
              }
            />
          </label>
          <label className="sfm-checkbox-field">
            <input
              type="checkbox"
              checked={form.hostelOpted}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, hostelOpted: event.target.checked }))
              }
            />
            <span><FiHome /> Hostel opted</span>
          </label>
          <label className="sfm-checkbox-field">
            <input
              type="checkbox"
              checked={form.transportOpted}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, transportOpted: event.target.checked }))
              }
            />
            <span><FiTruck /> Transport opted</span>
          </label>
          <div className="sfm-form-actions">
            <button type="submit" className="sfm-export-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <FiSave /> Saving...
                </>
              ) : (
                <>
                  <FiPlusCircle /> Create Mapping
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="sfm-detail-panel">
        <div className="sfm-detail-top">
          <div>
            <p className="sfm-detail-eyebrow">Update Profile</p>
            <h2>
              <FiMapPin /> Transport & Hostel Options
            </h2>
            <p className="sfm-supporting">
              Select an existing fee profile and update hostel/transport opt-in.
            </p>
          </div>
        </div>

        <form onSubmit={submitProfileUpdate} className="sfm-form-grid sfm-update-form-grid">
          <label className="sfm-form-field sfm-profile-select-field">
            <span><FiUser /> Fee profile</span>
            <select
              value={editProfileId}
              onChange={(event) => {
                setEditProfileId(event.target.value);
                selectProfileForEdit(event.target.value);
              }}
              required
            >
              <option value="">Select student fee profile</option>
              {feeProfiles.map((profile) => (
                <option key={profile._id} value={profile._id}>
                  {profile.studentId} ({profile.userId?.name || "Student"})
                </option>
              ))}
            </select>
          </label>

          <label className="sfm-form-field sfm-option-field">
            <span><FiHome /> Hostel opted</span>
            <div className="sfm-option-toggle">
              <input
                type="checkbox"
                checked={editHostelOpted}
                onChange={(event) => setEditHostelOpted(event.target.checked)}
              />
              <span className="sfm-switch" />
              <p>{editHostelOpted ? "Enabled" : "Disabled"}</p>
            </div>
          </label>

          <label className="sfm-form-field sfm-option-field">
            <span><FiTruck /> Transport opted</span>
            <div className="sfm-option-toggle">
              <input
                type="checkbox"
                checked={editTransportOpted}
                onChange={(event) => setEditTransportOpted(event.target.checked)}
              />
              <span className="sfm-switch" />
              <p>{editTransportOpted ? "Enabled" : "Disabled"}</p>
            </div>
          </label>

          <div className="sfm-form-actions sfm-update-actions">
            <button type="submit" className="sfm-export-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <FiSave /> Updating...
                </>
              ) : (
                <>
                  <FiEdit3 /> Update Options
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default StudentFeeMapping;
