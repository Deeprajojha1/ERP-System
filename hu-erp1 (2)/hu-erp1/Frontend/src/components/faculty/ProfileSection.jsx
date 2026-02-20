export default function ProfileSection({ facultyData }) {
  const user = facultyData?.user || {};
  const faculty = facultyData?.facultyDetails || {};
  const department = faculty?.department || {};

  const getInitials = (name) => {
    if (!name) return "FA";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const calculateExperience = (joiningDate) => {
    if (!joiningDate) return "N/A";
    const start = new Date(joiningDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    return `${years} Year${years !== 1 ? "s" : ""}`;
  };

  return (
    <section className="profile-section">
      <div className="faculty-section-header">
        <h2 className="faculty-section-title">My Profile</h2>
        <p className="faculty-section-subtitle">Your personal and professional information</p>
      </div>

      <div className="profile-header-card">
        <div className="profile-banner"></div>
        <div className="profile-info-wrapper">
          <div className="profile-top">
            <div className="profile-avatar-large">
              {getInitials(user.name)}
            </div>
            <div className="profile-name-section">
              <h3 className="profile-name">{user.name || "Faculty Member"}</h3>
              <p className="profile-designation">{faculty.designation || "Faculty"}</p>
            </div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-item">
              <p className="profile-stat-label">Employee ID</p>
              <p className="profile-stat-value">{faculty.employeeId || "N/A"}</p>
            </div>
            <div className="profile-stat-item">
              <p className="profile-stat-label">Joining Date</p>
              <p className="profile-stat-value">{formatDate(faculty.joiningDate)}</p>
            </div>
            <div className="profile-stat-item">
              <p className="profile-stat-label">Experience</p>
              <p className="profile-stat-value">{calculateExperience(faculty.joiningDate)}</p>
            </div>
            <div className="profile-stat-item">
              <p className="profile-stat-label">Status</p>
              <p className="profile-stat-value status-active">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-details-grid">
        <div className="profile-detail-card">
          <h4 className="profile-detail-title">Personal Information</h4>
          <div className="profile-detail-list">
            <p className="profile-detail-item">
              <span className="profile-detail-label">Email: </span>
              {user.email || "N/A"}
            </p>
            <p className="profile-detail-item">
              <span className="profile-detail-label">Phone: </span>
              {user.phoneNumber || "N/A"}
            </p>
            <p className="profile-detail-item">
              <span className="profile-detail-label">DOB: </span>
              {formatDate(user.DOB)}
            </p>
            <p className="profile-detail-item">
              <span className="profile-detail-label">Aadhar Number: </span>
              {user.aadharNumber || "N/A"}
            </p>
          </div>
        </div>

        <div className="profile-detail-card">
          <h4 className="profile-detail-title">Professional Information</h4>
          <div className="profile-detail-list">
            <p className="profile-detail-item">
              <span className="profile-detail-label">Department: </span>
              {department.name || "N/A"}
            </p>
            <p className="profile-detail-item">
              <span className="profile-detail-label">Designation: </span>
              {faculty.designation || "N/A"}
            </p>
            <p className="profile-detail-item">
              <span className="profile-detail-label">Qualification: </span>
              {faculty.qualification || "N/A"}
            </p>
            <p className="profile-detail-item">
              <span className="profile-detail-label">Employee ID: </span>
              {faculty.employeeId || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
