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

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from '../../utils/axiosInstance';
import toast from 'react-hot-toast';
import { getUser } from '../../redux/userSlice';
import './StudentDetails.css';

const StudentDetails = ({ studentData }) => {
  const { personalInfo, parentInfo, academicInfo } = studentData;
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);
  const dispatch = useDispatch();
  
  // Profile image states
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState(null);

  const resolveImageUrl = (fileUrl, fileName) => {
    const baseUrl = apiBase?.replace('/api', '') || '';
    if (fileUrl) {
      if (fileUrl.startsWith('http')) return fileUrl;
      return `${baseUrl}${fileUrl}`;
    }
    if (fileName) {
      return `${baseUrl}/uploads/profile-images/${fileName}`;
    }
    return null;
  };

  // Update current profile image when user data changes
  useEffect(() => {
    setCurrentProfileImage(resolveImageUrl(userData?.user?.profileImageUrl, userData?.user?.profileImage));
  }, [userData?.user?.profileImage, userData?.user?.profileImageUrl, apiBase]);
  
  /**
   * Get first letter of the name for profile logo
   * @param {string} name - Student name
   * @returns {string} First letter in uppercase
   */
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'S';
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

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const uploadUrl = `${apiBase}/user/student/upload-image`;
      console.log("[Student] Uploading to:", uploadUrl);
      
      const response = await axios.post(
        uploadUrl,
        formData,
        {
          headers: {
            // Don't set Content-Type manually for FormData - let browser set it with boundary
          },
        }
      );
      
      // Update current profile image with the new URL
      const imageUrl = resolveImageUrl(response.data.profileImageUrl, response.data.profileImage);
      setCurrentProfileImage(imageUrl);
      
      // Refresh user data to get updated profile image
      await dispatch(getUser());
      
      toast.success('Profile image updated successfully');
      
    } catch (error) {
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
      
      const deleteUrl = `${apiBase}/user/student/delete-image`;
      console.log("[Student] Deleting from:", deleteUrl);
      
      await axios.delete(deleteUrl);
      
      setCurrentProfileImage(null);
      setProfileImage("");
      
      // Refresh user data to get updated profile image
      await dispatch(getUser());
      
      toast.success('Profile image removed successfully');
      
    } catch (error) {
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
    { label: "Date of Birth", value: personalInfo.DOB || "N/A" },
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
    { label: 'Batch', value: academicInfo.batch },
    { label: 'University', value: academicInfo.university },
    { label: 'College', value: academicInfo.college },
  ];

  const renderRows = (rows) =>
    rows.map((row) => (
      <div className="info-row" key={row.label}>
        <span className="label">{row.label}</span>
        <span className="value">{row.value || 'N/A'}</span>
      </div>
    ));

  if (!studentData) {
    return (
      <div className="student-details-container">
        <div className="loading">Loading profile data...</div>
      </div>
    );
  }

  return (
    <div className="student-details-container">
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
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
                {uploadingImage ? (
                  <div className="settings-spinner"></div>
                ) : (
                  <span className="upload-icon">📷</span>
                )}
              </label>
              {(currentProfileImage || profileImage) && (
                <button 
                  className="profile-delete-btn"
                  onClick={handleDeleteProfileImage}
                  disabled={uploadingImage}
                >
                  <span className="delete-icon">🗑️</span>
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
        <div className="detail-box personal-info">
          <h3>Personal Information</h3>
          {renderRows(personalRows)}
        </div>

        {/* Guardian Information Box */}
        <div className="detail-box guardian-info">
          <h3>Guardian Contact</h3>
          {renderRows(guardianRows)}
        </div>

        {/* Academic Information Box */}
        <div className="detail-box academic-info">
          <h3>Academic Information</h3>
          {renderRows(academicRows)}
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
