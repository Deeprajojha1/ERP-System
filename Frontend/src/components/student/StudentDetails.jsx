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

  const personalRows = [
    { label: 'Email', value: personalInfo.email },
    { label: 'Phone', value: personalInfo.phone },
    { label: 'Date of Birth', value: personalInfo.dateOfBirth },
    { label: 'Address', value: personalInfo.address },
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
