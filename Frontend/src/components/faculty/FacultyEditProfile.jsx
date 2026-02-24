import { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PencilLine } from "lucide-react";
import axios from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import { fetchFacultyProfile } from "../../redux/facultyDashboardSlice";
import "./FacultyEditProfile.css";

export default function FacultyEditProfile() {
  const apiBase = useSelector((s) => s.config.apiBase);
  const userData = useSelector((s) => s.user.userData);
  const facultyProfile = useSelector((s) => s.facultyDashboard.facultyProfile) || userData;
  const faculty = facultyProfile?.facultyDetails || facultyProfile?.roleDetails || {};
  const user = facultyProfile?.user || {};
  const roleDetails = facultyProfile?.roleDetails || {};
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const defaultUniversityName = "Haridwar university";

  const defaultForm = useMemo(() => ({
    phoneNumber: user.phoneNumber || "",
    DOB: user.DOB ? user.DOB.split("T")[0] : (user.DOB || ""),
    gender: user.gender || "",
    aadharNumber: user.aadharNumber || "",
    qualification: faculty.qualification || "",
    specialization: faculty.specialization || "",
    university: faculty.university || defaultUniversityName,
  }), [
    user.phoneNumber,
    user.DOB,
    user.gender,
    user.aadharNumber,
    faculty.qualification,
    faculty.specialization,
    faculty.university,
    defaultUniversityName,
  ]);

  const [form, setForm] = useState(defaultForm);
  const [isDirty, setIsDirty] = useState(false);
  const activeForm = isDirty ? form : defaultForm;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setIsDirty(true);
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        phoneNumber: activeForm.phoneNumber || undefined,
        DOB: activeForm.DOB || undefined,
        gender: activeForm.gender || undefined,
        aadharNumber: activeForm.aadharNumber || undefined,
        qualification: activeForm.qualification || undefined,
        specialization: activeForm.specialization || undefined,
        university: activeForm.university || defaultUniversityName,
      };

      const url = `${apiBase}/faculty/me`;
      await axios.put(url, payload, { withCredentials: true });
      toast.success("Profile updated");
      // refresh profile
      dispatch(fetchFacultyProfile({ apiBase }));
      navigate("/faculty/faculty-dashboard");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to update profile";
      toast.error(msg);
    }
  };

  return (
    <section className="faculty-edit-profile-page">
      <div className="faculty-edit-profile-shell">
        <div className="faculty-edit-profile-header">
          <button
            type="button"
            className="faculty-edit-profile-back-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="faculty-edit-profile-title">
            <PencilLine size={20} />
            Edit Profile
          </h1>
          <p>You can edit profile fields except Name, Email and Designation.</p>
        </div>

        <div className="faculty-edit-profile-static-grid">
          <div className="faculty-edit-profile-static-item">
            <span>Name</span>
            <strong>{user?.name || "N/A"}</strong>
          </div>
          <div className="faculty-edit-profile-static-item">
            <span>Email</span>
            <strong>{user?.email || "N/A"}</strong>
          </div>
          <div className="faculty-edit-profile-static-item">
            <span>Designation</span>
            <strong>{roleDetails?.designation || faculty?.designation || "Faculty"}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="faculty-edit-profile-form">
          <label className="faculty-edit-profile-field">
            <span>Phone</span>
            <input
              name="phoneNumber"
              value={activeForm.phoneNumber}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </label>

          <label className="faculty-edit-profile-field">
            <span>Date of Birth</span>
            <input name="DOB" type="date" value={activeForm.DOB} onChange={handleChange} />
          </label>

          <label className="faculty-edit-profile-field">
            <span>Gender</span>
            <select name="gender" value={activeForm.gender} onChange={handleChange}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="faculty-edit-profile-field">
            <span>Aadhar Number</span>
            <input
              name="aadharNumber"
              value={activeForm.aadharNumber}
              onChange={handleChange}
              placeholder="Enter aadhar number"
            />
          </label>

          <label className="faculty-edit-profile-field">
            <span>Qualification</span>
            <input
              name="qualification"
              value={activeForm.qualification}
              onChange={handleChange}
              placeholder="Enter qualification"
            />
          </label>

          <label className="faculty-edit-profile-field">
            <span>Specialization</span>
            <input
              name="specialization"
              value={activeForm.specialization}
              onChange={handleChange}
              placeholder="Enter specialization"
            />
          </label>

          <label className="faculty-edit-profile-field faculty-edit-profile-field-full">
            <span>University</span>
            <input
              name="university"
              value={activeForm.university}
              onChange={handleChange}
              placeholder="Enter university name"
            />
          </label>

          <div className="faculty-edit-profile-actions">
            <button type="button" onClick={() => navigate(-1)} className="faculty-edit-profile-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="faculty-edit-profile-save-btn">
              <PencilLine size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
