/**
 * StudentDetails.jsx - Student Information Display Component
 * 
 * Displays comprehensive student information including:
 * - Profile logo with first letter of name
 * - Personal information
 * - Father contact details
 * - Academic information
 * 
 * @param {Object} props - Component props
 * @param {Object} props.studentData - Student data object
 * @returns {JSX.Element} Student details UI
 * 
 * Note: React 18+ with new JSX transform - no need to import React
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from '../../utils/axiosInstance';
import toast from 'react-hot-toast';
import { setUserData } from '../../redux/userSlice';
import ClipLoader from '../../Admin/components/ClipLoader';
import { ADMIN_LOAD_STATES } from '../../Admin/constants/loadStates';
import { FiCamera, FiTrash2 } from 'react-icons/fi';
import './StudentDetails.css';

const buildProfileImageUrl = (apiBase, fileUrl, fileName) => {
  const backendBase = String(apiBase || '').replace(/\/api\/?$/, '');
  const normalizePath = (rawValue = '') => {
    const value = String(rawValue || '').trim();
    if (!value) return null;
    if (value.startsWith('http') || value.startsWith('data:')) return value;
    if (value.startsWith('/uploads/')) return `${backendBase}${value}`;
    if (value.startsWith('uploads/')) return `${backendBase}/${value}`;
    if (value.startsWith('/')) return `${backendBase}${value}`;

    const normalizedFileName = value
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${backendBase}/uploads/profile-images/${normalizedFileName}`;
  };

  return normalizePath(fileUrl) || normalizePath(fileName);
};

const StudentDetails = ({ studentData }) => {
  const { personalInfo, parentInfo, academicInfo } = studentData;
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);
  const dispatch = useDispatch();
  
  // Profile image states
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState(null);
  const [profileLoadState, setProfileLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);

  const resolveImageUrl = useCallback(
    (fileUrl, fileName) => buildProfileImageUrl(apiBase, fileUrl, fileName),
    [apiBase]
  );

  // Update current profile image when user data changes
  useEffect(() => {
    if (!userData?.user) {
      setProfileLoadState(ADMIN_LOAD_STATES.PENDING);
      return;
    }
    setCurrentProfileImage(resolveImageUrl(userData?.user?.profileImageUrl, userData?.user?.profileImage));
    setProfileLoadState(ADMIN_LOAD_STATES.SUCCESS);
  }, [userData?.user, userData?.user?.profileImage, userData?.user?.profileImageUrl, resolveImageUrl]);

  const isProfilePending = useMemo(
    () => uploadingImage || profileLoadState === ADMIN_LOAD_STATES.PENDING,
    [uploadingImage, profileLoadState]
  );
  
  /**
   * Get first letter of the name for profile logo
   * @param {string} name - Student name
   * @returns {string} First letter in uppercase
   */
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'S';
  };

  const formatDateYmd = (value) => {
    if (!value || value === "N/A") return "N/A";

    if (typeof value === "string") {
      const isoLikeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoLikeMatch) {
        return `${isoLikeMatch[1]}/${isoLikeMatch[2]}/${isoLikeMatch[3]}`;
      }

      const slashLikeMatch = value.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
      if (slashLikeMatch) {
        return `${slashLikeMatch[1]}/${slashLikeMatch[2]}/${slashLikeMatch[3]}`;
      }
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";

    return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(
      parsed.getDate()
    ).padStart(2, "0")}`;
  };

  // Handle profile image upload
  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const fileToDataUrl = (inputFile) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          if (!result) {
            reject(new Error("Failed to read selected image"));
            return;
          }
          resolve(result);
        };
        reader.onerror = () => reject(new Error("Failed to read selected image"));
        reader.readAsDataURL(inputFile);
      });

    // Upload to server
    try {
      const dataUrl = await fileToDataUrl(file);
      setProfileImage(dataUrl);
      setUploadingImage(true);
      setProfileLoadState(ADMIN_LOAD_STATES.PENDING);
      
      const uploadUrl = `${apiBase}/user/profile-image`;
      console.log("[Student] Uploading to:", uploadUrl);
      
      const response = await axios.put(
        uploadUrl,
        { profileImage: dataUrl }
      );
      
      // Update current profile image with the new URL
      const imageUrl = resolveImageUrl(
        response.data?.user?.profileImageUrl || response.data?.profileImageUrl,
        response.data?.user?.profileImage || response.data?.profileImage
      );
      setCurrentProfileImage(imageUrl);
      setProfileImage("");

      if (userData?.user) {
        dispatch(
          setUserData({
            ...userData,
            user: {
              ...userData.user,
              ...(response.data?.user || {}),
              profileImage: response.data?.user?.profileImage || response.data?.profileImage || imageUrl || "",
              profileImageUrl: imageUrl || response.data?.user?.profileImageUrl || response.data?.profileImageUrl || "",
            },
          })
        );
      }

      setProfileLoadState(ADMIN_LOAD_STATES.SUCCESS);
      
      toast.success('Profile image updated successfully');
      
    } catch (error) {
      setProfileLoadState(ADMIN_LOAD_STATES.FAILURE);
      console.error('Profile image upload error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload profile image';
      toast.error(errorMessage);
      
      // Reset preview on error
      setProfileImage(currentProfileImage || "");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle profile image deletion
  const handleDeleteProfileImage = async () => {
    try {
      setUploadingImage(true);
      setProfileLoadState(ADMIN_LOAD_STATES.PENDING);
      
      const deleteUrl = `${apiBase}/user/profile-image`;
      console.log("[Student] Deleting from:", deleteUrl);
      
      await axios.delete(deleteUrl);
      
      setCurrentProfileImage(null);
      setProfileImage("");

      if (userData?.user) {
        dispatch(
          setUserData({
            ...userData,
            user: {
              ...userData.user,
              profileImage: "",
              profileImageUrl: "",
            },
          })
        );
      }
      
      setProfileLoadState(ADMIN_LOAD_STATES.SUCCESS);
      
      toast.success('Profile image removed successfully');
      
    } catch (error) {
      setProfileLoadState(ADMIN_LOAD_STATES.FAILURE);
      console.error('Profile image delete error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove profile image';
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const personalRows = [
    { label: "Name", value: personalInfo.name || "N/A" },
    { label: "Email", value: personalInfo.email || "N/A" },
    { label: "Phone", value: personalInfo.phoneNumber || "N/A" },
    {
      label: "Date of Birth",
      value: formatDateYmd(personalInfo.DOB || personalInfo.dateOfBirth),
    },
  ];

  const guardianRows = [
    { label: 'Father Name', value: parentInfo.fatherName },
    { label: 'Father Phone', value: parentInfo.fatherPhone },
  ];

  const academicRows = [
    { label: 'Course', value: academicInfo.course },
    { label: 'Semester', value: academicInfo.semester },
    { label: 'Academic Year', value: academicInfo.academicYear },
    { label: 'Roll Number', value: academicInfo.rollNumber },
    { label: 'Section', value: academicInfo.section },
    { label: 'University', value: academicInfo.university },
  ];

  const cardFxClass =
    "group relative overflow-hidden rounded-2xl shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/40 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100";
  const parentCardClass = "relative overflow-hidden rounded-2xl shadow-md";
  const subCardHoverClass =
    "cursor-pointer border border-transparent transition-all duration-300 hover:border-blue-500 hover:ring-2 hover:ring-blue-400/40 hover:shadow-lg";

  const renderRows = (rows) =>
    rows.map((row) => (
      <div className="info-row relative z-10" key={row.label}>
        <span className="label !text-gray-500">{row.label}</span>
        <span className="value !text-black">{row.value || 'N/A'}</span>
      </div>
    ));

  if (!studentData) {
    return (
      <div className="student-details-container">
        <div className="loading">
          <ClipLoader
            size={20}
            color="#0284c7"
            trackColor="rgba(2, 132, 199, 0.22)"
          />
          <span>Loading profile data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`student-details-container !bg-white ${parentCardClass}`}>
      {/* Header with Profile Logo */}
      <div className="student-header">
        <div className="profile-section">
          <div className="profile-logo">
            {(profileImage || currentProfileImage) ? (
              <img 
                src={profileImage || currentProfileImage} 
                alt="Profile" 
                className="profile-avatar-img" 
              />
            ) : (
              <span className="profile-initial">{getInitial(userData?.user?.name || 'Student')}</span>
            )}
            <div className="profile-actions">
              <label htmlFor="profile-upload" className="profile-upload-btn">
                <input
                  type="file"
                  id="profile-upload"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  disabled={isProfilePending}
                  style={{ display: 'none' }}
                />
                {isProfilePending ? (
                  <ClipLoader
                    size={14}
                    color="#334155"
                    trackColor="rgba(51, 65, 85, 0.2)"
                  />
                ) : (
                  <FiCamera aria-hidden="true" />
                )}
              </label>
              {(currentProfileImage || profileImage) && (
                <button 
                  type="button"
                  className="profile-delete-btn"
                  onClick={handleDeleteProfileImage}
                  disabled={isProfilePending}
                >
                  {isProfilePending ? (
                    <ClipLoader
                      size={12}
                      color="#ef4444"
                      trackColor="rgba(239, 68, 68, 0.2)"
                    />
                  ) : (
                    <FiTrash2 aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="basic-info">
            <h2>{personalInfo.name}</h2>
            <p className="student-id">ID: {personalInfo.studentId}</p>
            <p className="roll-number">Roll: {academicInfo.rollNumber}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="details-grid">
        {/* Personal Information Box */}
        <div
          className={`detail-box personal-info border-l-4 border-blue-500 !bg-blue-50 ${cardFxClass} ${subCardHoverClass}`}
        >
          <h3 className="relative z-10 font-semibold !text-gray-900">Personal Information</h3>
          {renderRows(personalRows)}
        </div>

        {/* Guardian Information Box */}
        <div
          className={`detail-box guardian-info border-l-4 border-teal-500 !bg-teal-50 ${cardFxClass} ${subCardHoverClass}`}
        >
          <h3 className="relative z-10 font-semibold !text-gray-900">Guardian Contact</h3>
          {renderRows(guardianRows)}
        </div>

        {/* Academic Information Box */}
        <div
          className={`detail-box academic-info border-l-4 border-violet-500 !bg-violet-50 ${cardFxClass} ${subCardHoverClass}`}
        >
          <h3 className="relative z-10 font-semibold !text-gray-900">Academic Information</h3>
          {renderRows(academicRows)}
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
