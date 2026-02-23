/**
 * ProfileSection.jsx - Faculty Profile Display Component
 * 
 * Displays comprehensive faculty information including:
 * - Profile photo with initials fallback
 * - Personal information
 * - Professional details
 * - Academic information
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import { getUser } from "../../redux/userSlice";
import { ClipLoader } from "react-spinners";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import { FiCamera, FiTrash2, FiEdit2 } from "react-icons/fi";
import "./ProfileSection.css";
import { useNavigate } from "react-router-dom";

export default function ProfileSection({ facultyData }) {
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);
  const dispatch = useDispatch();

  // Profile image states
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState(null);
  const [profileLoadState, setProfileLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);

  const user = facultyData?.user || {};
  const faculty = facultyData?.facultyDetails || facultyData?.roleDetails || {};
  const department = faculty?.department || {};
  const navigate = useNavigate();

  const resolveImageUrl = useCallback((fileUrl, fileName) => {
    const baseUrl = apiBase?.replace("/api", "") || "";
    if (fileUrl) {
      if (fileUrl.startsWith("http") || fileUrl.startsWith("data:")) return fileUrl;
      return `${baseUrl}${fileUrl}`;
    }
    if (fileName) {
      if (fileName.startsWith("http") || fileName.startsWith("data:")) return fileName;
      return `${baseUrl}/uploads/profile-images/${fileName}`;
    }
    return null;
  }, [apiBase]);

  // Update current profile image when user data changes
  useEffect(() => {
    if (!userData?.user) {
      setProfileLoadState(ADMIN_LOAD_STATES.PENDING);
      return;
    }
    setCurrentProfileImage(
      resolveImageUrl(userData?.user?.profileImageUrl, userData?.user?.profileImage)
    );
    setProfileLoadState(ADMIN_LOAD_STATES.SUCCESS);
  }, [userData?.user, userData?.user?.profileImage, userData?.user?.profileImageUrl, resolveImageUrl]);

  const isProfilePending = useMemo(
    () => uploadingImage || profileLoadState === ADMIN_LOAD_STATES.PENDING,
    [uploadingImage, profileLoadState]
  );

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : "F";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateExperience = (joiningDate) => {
    if (!joiningDate) return "N/A";
    const start = new Date(joiningDate);
    if (isNaN(start.getTime())) return "N/A";
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    const totalMonths = years * 12 + months;
    if (totalMonths < 12) return `${totalMonths} Month${totalMonths !== 1 ? "s" : ""}`;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return m > 0 ? `${y} Year${y !== 1 ? "s" : ""} ${m}m` : `${y} Year${y !== 1 ? "s" : ""}`;
  };

  // Handle profile image upload
  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = typeof reader.result === "string" ? reader.result : "";
      setProfileImage(base64Image);
      
      try {
        setUploadingImage(true);
        setProfileLoadState(ADMIN_LOAD_STATES.PENDING);

        // Use PUT with JSON body containing base64 image
        const uploadUrl = `${apiBase}/user/profile-image`;
        const response = await axios.put(uploadUrl, { profileImage: base64Image });

        const imageUrl = response.data.user?.profileImage || base64Image;
        setCurrentProfileImage(imageUrl);

        await dispatch(getUser());
        setProfileLoadState(ADMIN_LOAD_STATES.SUCCESS);
        toast.success("Profile image updated successfully");
      } catch (error) {
        setProfileLoadState(ADMIN_LOAD_STATES.FAILURE);
        const errorMessage = error.response?.data?.message || "Failed to upload profile image";
        toast.error(errorMessage);
        setProfileImage(currentProfileImage || "");
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle profile image deletion
  const handleDeleteProfileImage = async () => {
    try {
      setUploadingImage(true);
      setProfileLoadState(ADMIN_LOAD_STATES.PENDING);

      const deleteUrl = `${apiBase}/user/profile-image`;
      await axios.delete(deleteUrl);

      setCurrentProfileImage(null);
      setProfileImage("");

      await dispatch(getUser());
      setProfileLoadState(ADMIN_LOAD_STATES.SUCCESS);
      toast.success("Profile image removed successfully");
    } catch (error) {
      setProfileLoadState(ADMIN_LOAD_STATES.FAILURE);
      const errorMessage = error.response?.data?.message || "Failed to remove profile image";
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  // Info rows data
  const personalRows = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Phone", value: user.phoneNumber },
    { label: "Date of Birth", value: formatDate(user.DOB) },
    { label: "Gender", value: user.gender },
    { label: "Aadhar Number", value: user.aadharNumber },
  ];

  const professionalRows = [
    { label: "Employee ID", value: faculty.employeeId },
    { label: "Designation", value: faculty.designation },
    { label: "Department", value: department.name },
    { label: "Joining Date", value: formatDate(faculty.joiningDate) },
    { label: "Experience", value: calculateExperience(faculty.joiningDate) },
    { label: "Status", value: "Active", isStatus: true },
  ];

  const academicRows = [
    { label: "Qualification", value: faculty.qualification },
    { label: "Specialization", value: faculty.specialization },
    { label: "University", value: faculty.university || "Haridwar university" },
  ];

  const renderRows = (rows) =>
    rows.map((row) => (
      <div 
        className="faculty-info-row" 
        key={row.label}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid #f1f5f9',
          gap: '20px'
        }}
      >
        <span 
          className="faculty-info-label"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748b',
            whiteSpace: 'nowrap',
            minWidth: '120px',
            flexShrink: 0
          }}
        >
          {row.label}
        </span>
        {row.isStatus ? (
          <span 
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#059669',
              background: '#d1fae5',
              padding: '4px 14px',
              borderRadius: '12px',
              display: 'inline-block',
              width: 'fit-content'
            }}
          >
            {row.value || "N/A"}
          </span>
        ) : (
          <span 
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              textAlign: 'right',
              wordBreak: 'break-word'
            }}
          >
            {row.value || "N/A"}
          </span>
        )}
      </div>
    ));

  return (
    <div className="faculty-profile-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px', boxSizing: 'border-box' }}>
      {/* Header with Profile */}
      <div className="faculty-profile-header" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)' }}>
        <div className="faculty-profile-section" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          <div className="faculty-profile-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            {profileImage || currentProfileImage ? (
              <img
                src={profileImage || currentProfileImage}
                alt="Profile"
                className="faculty-profile-avatar-img"
                style={{ width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #3b82f6', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}
              />
            ) : (
              <span className="faculty-profile-initial" style={{ width: '130px', height: '130px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px', fontWeight: 700, color: '#ffffff', border: '4px solid #3b82f6', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}>
                {getInitial(userData?.user?.name || user.name || "Faculty")}
              </span>
            )}
            <div className="faculty-profile-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <label htmlFor="faculty-profile-upload" className="faculty-profile-upload-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#ffffff', minWidth: '40px' }}>
                <input
                  type="file"
                  id="faculty-profile-upload"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  disabled={isProfilePending}
                  style={{ display: "none" }}
                />
                {isProfilePending ? (
                  <ClipLoader size={14} color="#ffffff" />
                ) : (
                  <FiCamera aria-hidden="true" />
                )}
              </label>
              {(currentProfileImage || profileImage) && (
                <button
                  className="faculty-profile-delete-btn"
                  onClick={handleDeleteProfileImage}
                  disabled={isProfilePending}
                  type="button"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', minWidth: '40px' }}
                >
                  {isProfilePending ? (
                    <ClipLoader size={12} color="#ef4444" />
                  ) : (
                    <FiTrash2 aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="faculty-profile-basic-info" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0', lineHeight: 1.2 }}>{user.name || "Faculty Member"}</h2>
                <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 14px 0', fontWeight: 500, textTransform: 'capitalize' }}>{faculty.designation || "Faculty"}</p>
              </div>
              <div style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => navigate('/faculty/profile-edit')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
                >
                  <FiEdit2 size={14} aria-hidden="true" />
                  Edit Profile
                </button>
              </div>
            </div>
            <p style={{ display: 'inline-block', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#1d4ed8', padding: '8px 18px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0' }}>ID: {faculty.employeeId || "N/A"}</p>
            <p style={{ display: 'block', fontSize: '14px', color: '#475569', margin: '8px 0 0 0', fontWeight: 500 }}>{department.name || "Department"}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="faculty-profile-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Personal Information */}
        <div className="faculty-profile-detail-box" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '2px' }}></span>
            Personal Information
          </h3>
          {renderRows(personalRows)}
        </div>

        {/* Professional Information */}
        <div className="faculty-profile-detail-box" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '2px' }}></span>
            Professional Information
          </h3>
          {renderRows(professionalRows)}
        </div>

        {/* Academic Information */}
        <div className="faculty-profile-detail-box" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '2px' }}></span>
            Academic Information
          </h3>
          {renderRows(academicRows)}
        </div>
      </div>
    </div>
  );
}
