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
import { createPortal } from "react-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import { getUser } from "../../redux/userSlice";
import { ClipLoader } from "react-spinners";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import { FiCamera, FiTrash2, FiEdit2 } from "react-icons/fi";
import FacultyEditProfile from "./FacultyEditProfile";

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
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!showEditModal) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showEditModal]);

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
        className="flex flex-col items-start gap-1.5 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5" 
        key={row.label}
      >
        <span 
          className="min-w-0 text-[13px] font-medium text-slate-500 sm:min-w-[96px]"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748b',
            whiteSpace: 'normal'
          }}
        >
          {row.label}
        </span>
        {row.isStatus ? (
          <span 
            className="inline-flex w-fit rounded-xl bg-emerald-100 px-3.5 py-1 text-[13px] font-semibold text-emerald-700"
            style={{
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {row.value || "N/A"}
          </span>
        ) : (
          <span 
            className="w-full text-left text-[14px] font-semibold text-slate-800 sm:w-auto sm:max-w-[62%]"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              textAlign: 'left',
              wordBreak: 'break-word'
            }}
          >
            {row.value || "N/A"}
          </span>
        )}
      </div>
    ));

  return (
    <div className="mx-auto w-full max-w-[1200px] box-border p-3 sm:p-6" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Header with Profile */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_4px_20px_rgba(15,23,42,0.08)] sm:p-8" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)' }}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8" style={{ display: 'flex', gap: 'clamp(14px, 4vw, 32px)', flexWrap: 'wrap' }}>
          <div className="flex shrink-0 flex-col items-center gap-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            {profileImage || currentProfileImage ? (
              <img
                src={profileImage || currentProfileImage}
                alt="Profile"
                className="h-24 w-24 rounded-full border-4 border-blue-500 object-cover shadow-[0_8px_24px_rgba(59,130,246,0.3)] sm:h-[130px] sm:w-[130px]"
                style={{ borderRadius: '50%', objectFit: 'cover', border: '4px solid #3b82f6', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-500 bg-gradient-to-br from-blue-500 to-violet-500 text-4xl font-bold text-white shadow-[0_8px_24px_rgba(59,130,246,0.3)] sm:h-[130px] sm:w-[130px] sm:text-[52px]" style={{ borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#ffffff', border: '4px solid #3b82f6', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}>
                {getInitial(userData?.user?.name || user.name || "Faculty")}
              </span>
            )}
            <div className="flex flex-wrap justify-center gap-2" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <label htmlFor="faculty-profile-upload" className="inline-flex min-w-10 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white cursor-pointer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#ffffff', minWidth: '40px' }}>
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
                  className="inline-flex min-w-10 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-[13px] font-semibold text-rose-600"
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
          <div className="w-full flex-1" style={{ flex: 1 }}>
            <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div className="min-w-0 flex-1" style={{ flex: 1 }}>
                <h2 className="text-left" style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0', lineHeight: 1.2 }}>{user.name || "Faculty Member"}</h2>
                <p className="text-left" style={{ fontSize: 'clamp(13px, 3vw, 15px)', color: '#64748b', margin: '0 0 14px 0', fontWeight: 500, textTransform: 'capitalize' }}>{faculty.designation || "Faculty"}</p>
              </div>
              <div className="w-full sm:w-auto" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '13px' }}
                >
                  <FiEdit2 size={14} aria-hidden="true" />
                  Edit Profile
                </button>
              </div>
            </div>
            <p className="text-left" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#1d4ed8', padding: '7px 14px', borderRadius: '20px', fontSize: 'clamp(12px, 3vw, 14px)', fontWeight: 600, margin: '0 0 10px 0' }}>ID: {faculty.employeeId || "N/A"}</p>
            <p className="text-left" style={{ display: 'block', fontSize: 'clamp(12px, 3vw, 14px)', color: '#475569', margin: '8px 0 0 0', fontWeight: 500 }}>{department.name || "Department"}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" style={{ display: 'grid', gap: '20px' }}>
        {/* Personal Information */}
        <div className="rounded-[14px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)]" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '14px', padding: 'clamp(14px, 3.2vw, 24px)', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '2px' }}></span>
            Personal Information
          </h3>
          {renderRows(personalRows)}
        </div>

        {/* Professional Information */}
        <div className="rounded-[14px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)]" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '14px', padding: 'clamp(14px, 3.2vw, 24px)', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '2px' }}></span>
            Professional Information
          </h3>
          {renderRows(professionalRows)}
        </div>

        {/* Academic Information */}
        <div className="rounded-[14px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)]" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '14px', padding: 'clamp(14px, 3.2vw, 24px)', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '2px' }}></span>
            Academic Information
          </h3>
          {renderRows(academicRows)}
        </div>
      </div>

      {showEditModal && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[210] overflow-y-auto overscroll-contain touch-pan-y px-2 pb-4 pt-[82px] sm:px-4 sm:pb-6 sm:pt-[86px] md:px-6 md:pb-8 md:pt-[94px]">
              <button
                type="button"
                aria-label="Close profile editor"
                className="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px] touch-none"
                onClick={() => setShowEditModal(false)}
              />
              <div className="relative z-[1] mx-auto w-full max-w-[820px] max-h-[calc(100dvh-92px)] overflow-hidden rounded-2xl sm:max-h-[calc(100dvh-104px)] sm:rounded-3xl">
                <FacultyEditProfile
                  embedded
                  onClose={() => setShowEditModal(false)}
                  onSaved={() => setShowEditModal(false)}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
