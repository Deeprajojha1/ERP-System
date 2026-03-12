import { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiFileText,
  FiChevronDown,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiEdit2,
  FiEye,
  FiArrowLeft,
  FiSend,
  FiRefreshCw,
  FiCamera,
  FiUpload,
} from "react-icons/fi";
import { ThreeDots } from "react-loader-spinner";
import toast from "react-hot-toast";
import {
  fetchMyExamRegistrations,
  applyExamRegistration,
  updateMyExamRegistration,
  uploadExamRegImage,
} from "../../redux/studentExamRegistrationSlice";
import "./StudentExamRegistration.css";

const formatDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toISOString().slice(0, 10);
};

const STATUS_CONFIG = {
  SUBMITTED: { icon: FiClock, label: "Submitted", cls: "reg-status--submitted" },
  VERIFIED: { icon: FiCheck, label: "Verified", cls: "reg-status--verified" },
  REJECTED: { icon: FiAlertCircle, label: "Rejected", cls: "reg-status--rejected" },
  DRAFT: { icon: FiEdit2, label: "Draft", cls: "reg-status--draft" },
};

const getSubjectSummary = (registration) => {
  const subjects = Array.isArray(registration?.subjects) ? registration.subjects : [];
  if (!subjects.length) return "Subjects auto-fetched from group & semester";
  if (subjects.length === 1) {
    return subjects[0]?.subjectName || subjects[0]?.subjectCode || "Subject";
  }
  return `${subjects[0]?.subjectName || subjects[0]?.subjectCode || "Subject"} +${subjects.length - 1} more`;
};

const EMPTY_FORM = {
  candidateName: "",
  studentNameHindi: "",
  rollNo: "",
  enrollmentNumber: "",
  formSerialNumber: "",
  fatherName: "",
  motherName: "",
  studentEmail: "",
  mobileNumber: "",
  gender: "",
  dateOfBirth: "",
  fatherPhoneNumber: "",
  motherPhoneNumber: "",
  fatherOccupation: "",
  motherOccupation: "",
  aadharNumber: "",
  academicBankCreditId: "",
  apaarId: "",
  digilockerId: "",
  addressLine: "",
  district: "",
  pinCode: "",
  courseName: "",
  branchName: "",
  semester: "",
  year: "",
  academicSession: "",
  batchLabel: "",
  photoUrl: "",
  studentSignatureUrl: "",
  declarationAccepted: false,
};

const StudentExamRegistration = () => {
  const dispatch = useDispatch();

  const registrations = useSelector((s) => s.studentExamRegistration?.registrations) || [];
  const registrationsLoading = useSelector((s) => s.studentExamRegistration?.registrationsLoading);
  const submitLoading = useSelector((s) => s.studentExamRegistration?.submitLoading);

  const [view, setView] = useState("list"); // "list" | "form" | "detail"
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [viewingReg, setViewingReg] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchMyExamRegistrations());
  }, [dispatch]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file, fieldType) => {
    if (!file) return;
    const isPhoto = fieldType === "photo";
    const setUploading = isPhoto ? setUploadingPhoto : setUploadingSignature;
    const setPreview = isPhoto ? setPhotoPreview : setSignaturePreview;
    const urlField = isPhoto ? "photoUrl" : "studentSignatureUrl";

    // show local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const result = await dispatch(uploadExamRegImage({ file, fieldType })).unwrap();
      setFormData((prev) => ({ ...prev, [urlField]: result.imageUrl }));
      toast.success(`${isPhoto ? "Photo" : "Signature"} uploaded`);
    } catch (err) {
      toast.error(err || `Failed to upload ${isPhoto ? "photo" : "signature"}`);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const openNewForm = useCallback(() => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setPhotoPreview(null);
    setSignaturePreview(null);
    setView("form");
  }, []);

  const openEditForm = useCallback((reg) => {
    setFormData({
      candidateName: reg.candidateName || "",
      studentNameHindi: reg.studentNameHindi || "",
      rollNo: reg.rollNo || "",
      enrollmentNumber: reg.enrollmentNumber || "",
      formSerialNumber: reg.formSerialNumber || "",
      fatherName: reg.fatherName || "",
      motherName: reg.motherName || "",
      studentEmail: reg.studentEmail || "",
      mobileNumber: reg.mobileNumber || "",
      gender: reg.gender || "",
      dateOfBirth: reg.dateOfBirth ? formatDate(reg.dateOfBirth) : "",
      fatherPhoneNumber: reg.fatherPhoneNumber || "",
      motherPhoneNumber: reg.motherPhoneNumber || "",
      fatherOccupation: reg.fatherOccupation || "",
      motherOccupation: reg.motherOccupation || "",
      aadharNumber: reg.aadharNumber || "",
      academicBankCreditId: reg.academicBankCreditId || "",
      apaarId: reg.apaarId || "",
      digilockerId: reg.digilockerId || "",
      addressLine: reg.addressLine || "",
      district: reg.district || "",
      pinCode: reg.pinCode || "",
      courseName: reg.courseName || "",
      branchName: reg.branchName || "",
      semester: reg.semester ?? "",
      year: reg.year ?? "",
      academicSession: reg.academicSession || "",
      batchLabel: reg.batchLabel || "",
      photoUrl: reg.photoUrl || "",
      studentSignatureUrl: reg.studentSignatureUrl || "",
      declarationAccepted: reg.declarationAccepted || false,
    });
    setEditingId(reg._id);
    setPhotoPreview(reg.photoUrl || null);
    setSignaturePreview(reg.studentSignatureUrl || null);
    setView("form");
  }, []);

  const openDetail = useCallback((reg) => {
    setViewingReg(reg);
    setView("detail");
  }, []);

  const goBack = useCallback(() => {
    setView("list");
    setEditingId(null);
    setViewingReg(null);
    setPhotoPreview(null);
    setSignaturePreview(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.candidateName || !formData.rollNo || !formData.enrollmentNumber || !formData.fatherName) {
      toast.error("Name, Roll No, Enrollment No, and Father's Name are required");
      return;
    }
    if (!formData.declarationAccepted) {
      toast.error("Please accept the declaration");
      return;
    }
    try {
      if (editingId) {
        await dispatch(updateMyExamRegistration({ id: editingId, payload: formData })).unwrap();
        toast.success("Registration updated successfully");
      } else {
        await dispatch(applyExamRegistration(formData)).unwrap();
        toast.success("Registration submitted successfully");
      }
      dispatch(fetchMyExamRegistrations());
      goBack();
    } catch (err) {
      toast.error(err || "Failed to submit registration");
    }
  };

  // ─── LIST VIEW ───
  if (view === "list") {
    return (
      <div className="ser-container">
        <div className="ser-header">
          <div className="ser-header-left">
            <FiFileText size={22} />
            <h2 className="ser-title">Exam Registration</h2>
          </div>
          <div className="ser-header-right">
            <button
              type="button"
              className="ser-refresh-btn"
              onClick={() => {
                dispatch(fetchMyExamRegistrations());
              }}
            >
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="ser-apply-btn" onClick={openNewForm}>
              + New Registration
            </button>
          </div>
        </div>

        {registrationsLoading ? (
          <div className="ser-loading">
            <ThreeDots visible height={40} width={70} color="#2563eb" radius={8} />
          </div>
        ) : registrations.length === 0 ? (
          <div className="ser-empty">
            <FiFileText size={40} />
            <p>No exam registrations yet.</p>
            <button type="button" className="ser-apply-btn" onClick={openNewForm}>
              Apply for Registration
            </button>
          </div>
        ) : (
          <div className="ser-cards">
            {registrations.map((reg) => {
              const st = STATUS_CONFIG[reg.registrationStatus] || STATUS_CONFIG.DRAFT;
              const StIcon = st.icon;
              return (
                <div key={reg._id} className="ser-reg-card">
                  <div className="ser-reg-card-top">
                    <div>
                      <h3 className="ser-reg-exam-name">{getSubjectSummary(reg)}</h3>
                      <p className="ser-reg-meta">
                        Session: {reg.academicSession || "-"} &bull; Sem: {reg.semester || "-"}
                      </p>
                    </div>
                    <span className={`ser-reg-status ${st.cls}`}>
                      <StIcon size={13} /> {st.label}
                    </span>
                  </div>
                  <div className="ser-reg-card-body">
                    <div className="ser-reg-info-row">
                      <span>Roll No:</span> <strong>{reg.rollNo || "-"}</strong>
                    </div>
                    <div className="ser-reg-info-row">
                      <span>Enrollment:</span> <strong>{reg.enrollmentNumber || "-"}</strong>
                    </div>
                    <div className="ser-reg-info-row">
                      <span>Candidate:</span> <strong>{reg.candidateName || "-"}</strong>
                    </div>
                    <div className="ser-reg-info-row">
                      <span>Applied On:</span> <strong>{formatDate(reg.createdAt)}</strong>
                    </div>
                  </div>
                  <div className="ser-reg-card-actions">
                    <button type="button" className="ser-btn ser-btn--view" onClick={() => openDetail(reg)}>
                      <FiEye size={13} /> View
                    </button>
                    {reg.registrationStatus === "SUBMITTED" && (
                      <button type="button" className="ser-btn ser-btn--edit" onClick={() => openEditForm(reg)}>
                        <FiEdit2 size={13} /> Edit
                      </button>
                    )}
                    {reg.registrationStatus === "REJECTED" && (
                      <button type="button" className="ser-btn ser-btn--edit" onClick={() => openEditForm(reg)}>
                        <FiEdit2 size={13} /> Re-apply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── DETAIL VIEW ───
  if (view === "detail" && viewingReg) {
    const st = STATUS_CONFIG[viewingReg.registrationStatus] || STATUS_CONFIG.DRAFT;
    const StIcon = st.icon;
    return (
      <div className="ser-container">
        <button type="button" className="ser-back-btn" onClick={goBack}>
          <FiArrowLeft size={16} /> Back to Registrations
        </button>

        <div className="ser-form-paper">
          <div className="ser-paper-header">
            <button type="button" className="ser-paper-back-btn" onClick={goBack}>
              <FiArrowLeft size={14} /> Back
            </button>
            <h2>HARIDWAR UNIVERSITY, ROORKEE</h2>
            <p className="ser-paper-sub">(A University U/s 2(f) of the UGC Act 1956)</p>
            <h3>REGULAR EXAMINATION FORM</h3>
            <span className={`ser-reg-status ${st.cls}`} style={{ marginTop: 8 }}>
              <StIcon size={13} /> {st.label}
            </span>
          </div>

          {viewingReg.registrationStatus === "REJECTED" && viewingReg.rejectionReason && (
            <div className="ser-rejection-box">
              <FiAlertCircle size={15} />
              <span><strong>Rejection Reason:</strong> {viewingReg.rejectionReason}</span>
            </div>
          )}

          <div className="ser-detail-grid">
            <div className="ser-detail-section">
              <h4>Academic Details</h4>
              <div className="ser-detail-row"><span>Roll No.</span><strong>{viewingReg.rollNo || "-"}</strong></div>
              <div className="ser-detail-row"><span>Enrollment No.</span><strong>{viewingReg.enrollmentNumber || "-"}</strong></div>
              <div className="ser-detail-row"><span>S. No.</span><strong>{viewingReg.formSerialNumber || "-"}</strong></div>
              <div className="ser-detail-row"><span>Course Name</span><strong>{viewingReg.courseName || "-"}</strong></div>
              <div className="ser-detail-row"><span>Branch Name</span><strong>{viewingReg.branchName || "-"}</strong></div>
              <div className="ser-detail-row"><span>Semester</span><strong>{viewingReg.semester || "-"}</strong></div>
              <div className="ser-detail-row"><span>Year</span><strong>{viewingReg.year || "-"}</strong></div>
              <div className="ser-detail-row"><span>Session</span><strong>{viewingReg.academicSession || "-"}</strong></div>
              <div className="ser-detail-row"><span>Batch</span><strong>{viewingReg.batchLabel || "-"}</strong></div>
            </div>

            <div className="ser-detail-section">
              <h4>Personal Details</h4>
              <div className="ser-detail-row"><span>Student Name</span><strong>{viewingReg.candidateName || "-"}</strong></div>
              <div className="ser-detail-row"><span>Student Name (Hindi)</span><strong>{viewingReg.studentNameHindi || "-"}</strong></div>
              <div className="ser-detail-row"><span>Email</span><strong>{viewingReg.studentEmail || "-"}</strong></div>
              <div className="ser-detail-row"><span>Father&apos;s Name</span><strong>{viewingReg.fatherName || "-"}</strong></div>
              <div className="ser-detail-row"><span>Mother&apos;s Name</span><strong>{viewingReg.motherName || "-"}</strong></div>
              <div className="ser-detail-row"><span>Mobile No.</span><strong>{viewingReg.mobileNumber || "-"}</strong></div>
              <div className="ser-detail-row"><span>Gender</span><strong>{viewingReg.gender || "-"}</strong></div>
              <div className="ser-detail-row"><span>D.O.B</span><strong>{formatDate(viewingReg.dateOfBirth)}</strong></div>
              <div className="ser-detail-row"><span>Father Phone No.</span><strong>{viewingReg.fatherPhoneNumber || "-"}</strong></div>
              <div className="ser-detail-row"><span>Mother Phone No.</span><strong>{viewingReg.motherPhoneNumber || "-"}</strong></div>
              <div className="ser-detail-row"><span>Father Occupation</span><strong>{viewingReg.fatherOccupation || "-"}</strong></div>
              <div className="ser-detail-row"><span>Mother Occupation</span><strong>{viewingReg.motherOccupation || "-"}</strong></div>
              <div className="ser-detail-row"><span>Aadhar Card No.</span><strong>{viewingReg.aadharNumber || "-"}</strong></div>
              <div className="ser-detail-row"><span>APAAR ID</span><strong>{viewingReg.apaarId || "-"}</strong></div>
              <div className="ser-detail-row"><span>Digi Locker ID</span><strong>{viewingReg.digilockerId || "-"}</strong></div>
              <div className="ser-detail-row"><span>Academic Bank Credit ID</span><strong>{viewingReg.academicBankCreditId || "-"}</strong></div>
              <div className="ser-detail-row"><span>Address</span><strong>{viewingReg.addressLine || "-"}</strong></div>
              <div className="ser-detail-row"><span>District</span><strong>{viewingReg.district || "-"}</strong></div>
              <div className="ser-detail-row"><span>Pin Code</span><strong>{viewingReg.pinCode || "-"}</strong></div>
            </div>
          </div>

          {(viewingReg.photoUrl || viewingReg.studentSignatureUrl) && (
            <div className="ser-detail-section" style={{ marginTop: 16 }}>
              <h4>Uploaded Documents</h4>
              <div className="ser-detail-images">
                {viewingReg.photoUrl && (
                  <div className="ser-detail-img-box">
                    <span>Photo</span>
                    <img src={viewingReg.photoUrl} alt="Student" className="ser-detail-photo" />
                  </div>
                )}
                {viewingReg.studentSignatureUrl && (
                  <div className="ser-detail-img-box">
                    <span>Signature</span>
                    <img src={viewingReg.studentSignatureUrl} alt="Signature" className="ser-detail-signature" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="ser-detail-section" style={{ marginTop: 16 }}>
            <h4>Declaration</h4>
            <p className="ser-declaration-text">
              {viewingReg.declarationAccepted
                ? "✅ Candidate has accepted the declaration."
                : "❌ Declaration not accepted."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM VIEW ───
  return (
    <div className="ser-container">
      <button type="button" className="ser-back-btn" onClick={goBack}>
        <FiArrowLeft size={16} /> Back to Registrations
      </button>

      <form className="ser-form-paper" onSubmit={handleSubmit}>
        <div className="ser-paper-header">
          <button type="button" className="ser-paper-back-btn" onClick={goBack}>
            <FiArrowLeft size={14} /> Back
          </button>
          <h2>HARIDWAR UNIVERSITY, ROORKEE</h2>
          <p className="ser-paper-sub">(A University U/s 2(f) of the UGC Act 1956 with the right to confer degree U/s 22(1) of the UGC Act)</p>
          <h3>REGULAR EXAMINATION FORM</h3>
        </div>

        {/* ── Photo & Signature Upload ── */}
        <fieldset className="ser-fieldset">
          <legend>Upload Photo &amp; Signature</legend>
          <div className="ser-upload-row">
            {/* Photo Upload */}
            <div className="ser-upload-box">
              <label className="ser-upload-label">Passport Size Photo</label>
              <div
                className="ser-upload-area"
                onClick={() => photoInputRef.current?.click()}
              >
                {uploadingPhoto ? (
                  <ThreeDots visible height={28} width={48} color="#2563eb" radius={6} />
                ) : photoPreview || formData.photoUrl ? (
                  <img
                    src={photoPreview || formData.photoUrl}
                    alt="Student Photo"
                    className="ser-upload-preview"
                  />
                ) : (
                  <div className="ser-upload-placeholder">
                    <FiCamera size={28} />
                    <span>Click to upload photo</span>
                  </div>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "photo");
                  e.target.value = "";
                }}
              />
              <small className="ser-hint">JPG, PNG or WEBP (max 5MB)</small>
            </div>

            {/* Signature Upload */}
            <div className="ser-upload-box">
              <label className="ser-upload-label">Student Signature</label>
              <div
                className="ser-upload-area ser-upload-area--sig"
                onClick={() => signatureInputRef.current?.click()}
              >
                {uploadingSignature ? (
                  <ThreeDots visible height={28} width={48} color="#2563eb" radius={6} />
                ) : signaturePreview || formData.studentSignatureUrl ? (
                  <img
                    src={signaturePreview || formData.studentSignatureUrl}
                    alt="Student Signature"
                    className="ser-upload-preview ser-upload-preview--sig"
                  />
                ) : (
                  <div className="ser-upload-placeholder">
                    <FiUpload size={24} />
                    <span>Click to upload signature</span>
                  </div>
                )}
              </div>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "signature");
                  e.target.value = "";
                }}
              />
              <small className="ser-hint">JPG, PNG or WEBP (max 5MB)</small>
            </div>
          </div>
        </fieldset>

        {/* ── Academic Details ── */}
        <fieldset className="ser-fieldset">
          <legend>Academic Details</legend>
          <div className="ser-field-grid">
            <div className="ser-field">
              <label>Roll No. <span className="ser-req">*</span></label>
              <input type="text" value={formData.rollNo} onChange={handleChange("rollNo")} required />
            </div>
            <div className="ser-field">
              <label>Enrollment No. <span className="ser-req">*</span></label>
              <input type="text" value={formData.enrollmentNumber} onChange={handleChange("enrollmentNumber")} required />
            </div>
            <div className="ser-field">
              <label>S. No.</label>
              <input type="text" value={formData.formSerialNumber} onChange={handleChange("formSerialNumber")} />
            </div>
            <div className="ser-field">
              <label>Course Name</label>
              <input type="text" value={formData.courseName} onChange={handleChange("courseName")} />
            </div>
            <div className="ser-field">
              <label>Branch Name</label>
              <input type="text" value={formData.branchName} onChange={handleChange("branchName")} />
            </div>
            <div className="ser-field">
              <label>Semester</label>
              <div className="ser-select-wrap">
                <select value={formData.semester} onChange={handleChange("semester")}>
                  <option value="">--</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <FiChevronDown className="ser-select-icon" />
              </div>
            </div>
            <div className="ser-field">
              <label>Year</label>
              <div className="ser-select-wrap">
                <select value={formData.year} onChange={handleChange("year")}>
                  <option value="">--</option>
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <FiChevronDown className="ser-select-icon" />
              </div>
            </div>
            <div className="ser-field">
              <label>Session</label>
              <input type="text" value={formData.academicSession} onChange={handleChange("academicSession")} placeholder="e.g. 2025-26" />
            </div>
            <div className="ser-field">
              <label>Batch</label>
              <input type="text" value={formData.batchLabel} onChange={handleChange("batchLabel")} />
            </div>
          </div>
        </fieldset>

        {/* ── Personal Details ── */}
        <fieldset className="ser-fieldset">
          <legend>Personal Details</legend>
          <div className="ser-field-grid">
            <div className="ser-field">
              <label>Student Name (In Caps) <span className="ser-req">*</span></label>
              <input type="text" value={formData.candidateName} onChange={handleChange("candidateName")} required
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="ser-field">
              <label>Student Name (In Hindi)</label>
              <input type="text" value={formData.studentNameHindi} onChange={handleChange("studentNameHindi")} />
            </div>
            <div className="ser-field">
              <label>Student Email</label>
              <input type="email" value={formData.studentEmail} onChange={handleChange("studentEmail")} />
            </div>
            <div className="ser-field">
              <label>Father&apos;s Name (In Caps) <span className="ser-req">*</span></label>
              <input type="text" value={formData.fatherName} onChange={handleChange("fatherName")} required
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="ser-field">
              <label>Mother&apos;s Name (In Caps)</label>
              <input type="text" value={formData.motherName} onChange={handleChange("motherName")}
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="ser-field">
              <label>Mobile No.</label>
              <input type="tel" value={formData.mobileNumber} onChange={handleChange("mobileNumber")} maxLength={10} />
            </div>
            <div className="ser-field">
              <label>Father Phone No.</label>
              <input type="tel" value={formData.fatherPhoneNumber} onChange={handleChange("fatherPhoneNumber")} maxLength={10} />
            </div>
            <div className="ser-field">
              <label>Mother Phone No.</label>
              <input type="tel" value={formData.motherPhoneNumber} onChange={handleChange("motherPhoneNumber")} maxLength={10} />
            </div>
            <div className="ser-field">
              <label>Father Occupation</label>
              <input type="text" value={formData.fatherOccupation} onChange={handleChange("fatherOccupation")} />
            </div>
            <div className="ser-field">
              <label>Mother Occupation</label>
              <input type="text" value={formData.motherOccupation} onChange={handleChange("motherOccupation")} />
            </div>
            <div className="ser-field">
              <label>Gender</label>
              <div className="ser-radio-group">
                {["MALE", "FEMALE", "TRANSGENDER"].map((g) => (
                  <label key={g} className="ser-radio-label">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={formData.gender === g}
                      onChange={handleChange("gender")}
                    />
                    {g.charAt(0) + g.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="ser-field">
              <label>D.O.B</label>
              <input type="date" value={formData.dateOfBirth} onChange={handleChange("dateOfBirth")} />
            </div>
            <div className="ser-field">
              <label>Aadhar Card No.</label>
              <input type="text" value={formData.aadharNumber} onChange={handleChange("aadharNumber")} maxLength={12} />
            </div>
            <div className="ser-field">
              <label>Digi Locker ID</label>
              <input type="text" value={formData.digilockerId} onChange={handleChange("digilockerId")} />
            </div>
            <div className="ser-field">
              <label>Academic Bank Credit ID</label>
              <input type="text" value={formData.academicBankCreditId} onChange={handleChange("academicBankCreditId")} />
            </div>
            <div className="ser-field">
              <label>APAAR ID</label>
              <input type="text" value={formData.apaarId} onChange={handleChange("apaarId")} />
            </div>
          </div>
        </fieldset>

        {/* ── Address ── */}
        <fieldset className="ser-fieldset">
          <legend>Address Details</legend>
          <div className="ser-field-grid">
            <div className="ser-field ser-field--full">
              <label>Address</label>
              <input type="text" value={formData.addressLine} onChange={handleChange("addressLine")} />
            </div>
            <div className="ser-field">
              <label>District</label>
              <input type="text" value={formData.district} onChange={handleChange("district")} />
            </div>
            <div className="ser-field">
              <label>Pin Code</label>
              <input type="text" value={formData.pinCode} onChange={handleChange("pinCode")} maxLength={6} />
            </div>
          </div>
        </fieldset>

        {/* ── Declaration ── */}
        <fieldset className="ser-fieldset ser-fieldset--declaration">
          <legend>Declaration by Candidate</legend>
          <p className="ser-declaration-text">
            I hereby declare that the information given above has been filled by me and are correct to the best of my knowledge and belief.
          </p>
          <label className="ser-checkbox-label">
            <input
              type="checkbox"
              checked={formData.declarationAccepted}
              onChange={handleChange("declarationAccepted")}
              required
            />
            I accept the above declaration <span className="ser-req">*</span>
          </label>
        </fieldset>

        {/* ── Submit ── */}
        <div className="ser-form-actions">
          <button type="button" className="ser-btn ser-btn--cancel" onClick={goBack} disabled={submitLoading}>
            Cancel
          </button>
          <button type="submit" className="ser-btn ser-btn--submit" disabled={submitLoading}>
            {submitLoading ? (
              <ThreeDots visible height={18} width={36} color="#fff" radius={6} />
            ) : (
              <>
                <FiSend size={14} />
                {editingId ? "Update Registration" : "Submit Registration"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentExamRegistration;
