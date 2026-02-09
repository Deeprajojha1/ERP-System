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

import './StudentDetails.css';

const StudentDetails = ({ studentData }) => {
  const { personalInfo, parentInfo, academicInfo } = studentData;
  
  /**
   * Get first letter of the name for profile logo
   * @param {string} name - Student name
   * @returns {string} First letter in uppercase
   */
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'S';
  };

  return (
    <div className="student-details-container">
      {/* Header with Profile Logo */}
      <div className="student-header">
        <div className="profile-section">
          <div className="profile-logo">
            <span className="profile-initial">{getInitial(personalInfo.name)}</span>
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
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">{personalInfo.email}</span>
          </div>
          <div className="info-row">
            <span className="label">Phone:</span>
            <span className="value">{personalInfo.phone}</span>
          </div>
          <div className="info-row">
            <span className="label">Date of Birth:</span>
            <span className="value">{personalInfo.dateOfBirth}</span>
          </div>
          <div className="info-row">
            <span className="label">Address:</span>
            <span className="value">{personalInfo.address}</span>
          </div>
          <div className="info-row">
            <span className="label">Father Name:</span>
            <span className="value">{parentInfo.fatherName}</span>
          </div>
          <div className="info-row">
            <span className="label">Father Phone:</span>
            <span className="value">{parentInfo.fatherPhone}</span>
          </div>
        </div>

        {/* Academic Information Box */}
        <div className="detail-box academic-info">
          <h3>Academic Information</h3>
          <div className="info-row">
            <span className="label">Course:</span>
            <span className="value">{academicInfo.course}</span>
          </div>
          <div className="info-row">
            <span className="label">Semester:</span>
            <span className="value">{academicInfo.semester}</span>
          </div>
          <div className="info-row">
            <span className="label">Academic Year:</span>
            <span className="value">{academicInfo.academicYear}</span>
          </div>
          <div className="info-row">
            <span className="label">Section:</span>
            <span className="value">{academicInfo.section}</span>
          </div>
          <div className="info-row">
            <span className="label">Batch:</span>
            <span className="value">{academicInfo.batch}</span>
          </div>
          <div className="info-row">
            <span className="label">University:</span>
            <span className="value">{academicInfo.university}</span>
          </div>
          <div className="info-row">
            <span className="label">College:</span>
            <span className="value">{academicInfo.college}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;