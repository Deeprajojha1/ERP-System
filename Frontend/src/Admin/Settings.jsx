import React, { useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createPortal } from "react-dom";
import axios from "axios";
import axiosInstance from "../utils/axiosInstance";
import toast from "react-hot-toast";
import { setUserData } from "../redux/userSlice";
import {
  FiBookOpen,
  FiCamera,
  FiEye,
  FiEyeOff,
  FiLock,
  FiSettings,
  FiShield,
  FiUser,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import "./Settings.css";

const Settings = () => {
  const userData = useSelector((state) => state.user.userData);
  const user = userData?.user || {};
  const apiBase = useSelector((state) => state.config.apiBase);
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showAddLibrarianModal, setShowAddLibrarianModal] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [securityError, setSecurityError] = useState("");
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [librarianError, setLibrarianError] = useState("");
  const [adminForm, setAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [librarianForm, setLibrarianForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const fullName = user?.name || "System Administrator";
  const email = user?.email || "admin@huroorkee.ac.in";
  const role = (user?.role || "admin").toUpperCase();

  const initials = useMemo(() => {
    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
  }, [fullName]);

  const [form, setForm] = useState(() => {
    const parts = fullName.split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
    };
  });
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState(null);

  // Update current profile image when user data changes
  React.useEffect(() => {
    if (user?.profileImage) {
      // If it's already a full URL (starts with http or /), use it directly
      if (user.profileImage.startsWith('http') || user.profileImage.startsWith('/')) {
        setCurrentProfileImage(user.profileImage);
      } else {
        // If it's just a filename, construct the full URL
        const baseUrl = apiBase?.replace('/api', '') || '';
        const imageUrl = `${baseUrl}/uploads/profile-images/${user.profileImage}`;
        setCurrentProfileImage(imageUrl);
      }
    } else {
      setCurrentProfileImage(null);
    }
  }, [user?.profileImage, apiBase]);

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("[Frontend] File selected:", {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('Image size should be less than 5MB');
      return;
    }

    if (!apiBase) {
      toast.error("Server configuration missing. Please refresh and try again.");
      return;
    }

    // Skip API test for now to isolate the issue

    // Show preview
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
      
      const uploadUrl = `${apiBase || '/api'}/admin/profile/upload-image`;
      console.log("[Frontend] API Base:", apiBase);
      console.log("[Frontend] Uploading to:", uploadUrl);
      console.log("[Frontend] FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }
      
      // First try a simple request to check authentication
      console.log("[Frontend] Checking authentication...");
      const authCheck = await axiosInstance.get(`${apiBase || '/api'}/user/me`, { withCredentials: true });
      console.log("[Frontend] Auth check successful:", authCheck.data.user?.id);
      
      // Now try the upload using axiosInstance for consistent auth
      const response = await axiosInstance.post(
        uploadUrl,
        formData,
        {
          headers: {
            // Don't set Content-Type manually for FormData - let browser set it with boundary
          },
        }
      );
      
      // Update current profile image with the new URL
      const imageUrl = response.data.profileImage;
      setCurrentProfileImage(imageUrl);
      
      // Update user data in Redux to reflect the change
      dispatch(setUserData({
        ...userData,
        user: {
          ...userData.user,
          profileImage: imageUrl
        }
      }));
      
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

  const handleDeleteProfileImage = async () => {
    if (!apiBase) {
      toast.error("Server configuration missing. Please refresh and try again.");
      return;
    }

    try {
      setUploadingImage(true);
      await axios.delete(
        `${apiBase}/admin/profile/delete-image`,
        { withCredentials: true }
      );
      
      setCurrentProfileImage(null);
      setProfileImage("");
      
      // Update user data in Redux to reflect the change
      dispatch(setUserData({
        ...userData,
        user: {
          ...userData.user,
          profileImage: null
        }
      }));
      
      toast.success('Profile image removed successfully');
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: <FiUser /> },
    { id: "security", label: "Security", icon: <FiLock /> },
    { id: "admin", label: "Admin Management", icon: <FiShield /> },
    { id: "library", label: "Librarian Management", icon: <FiBookOpen /> },
  ];

  const renderModal = (content) => {
    if (typeof document === "undefined") return null;
    return createPortal(content, document.body);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setSecurityError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleSecurityInput = (field, value) => {
    setSecurityForm((prev) => ({ ...prev, [field]: value }));
    if (securityError) setSecurityError("");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = securityForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError("All password fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Confirm password does not match.");
      return;
    }

    if (!apiBase) {
      setSecurityError("Server configuration missing. Please refresh and try again.");
      return;
    }

    try {
      setSecuritySubmitting(true);
      await axios.post(
        `${apiBase}/admin/change-password`,
        { currentPassword, newPassword, confirmPassword },
        { withCredentials: true }
      );
      toast.success("Password changed successfully");
      closePasswordModal();
    } catch (error) {
      setSecurityError(
        error.response?.data?.message || "Failed to change password"
      );
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const closeAddAdminModal = () => {
    setShowAddAdminModal(false);
    setAdminError("");
    setAdminForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });
  };

  const handleAdminInput = (field, value) => {
    setAdminForm((prev) => ({ ...prev, [field]: value }));
    if (adminError) setAdminError("");
  };

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    const { firstName, lastName, email: adminEmail, password } = adminForm;

    if (!firstName || !lastName || !adminEmail || !password) {
      setAdminError("All fields are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setAdminError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setAdminError("Password must be at least 8 characters.");
      return;
    }

    closeAddAdminModal();
  };

  const closeAddLibrarianModal = () => {
    setShowAddLibrarianModal(false);
    setLibrarianError("");
    setLibrarianForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });
  };

  const handleLibrarianInput = (field, value) => {
    setLibrarianForm((prev) => ({ ...prev, [field]: value }));
    if (librarianError) setLibrarianError("");
  };

  const handleCreateLibrarian = (e) => {
    e.preventDefault();
    const { firstName, lastName, email: librarianEmail, password } = librarianForm;

    if (!firstName || !lastName || !librarianEmail || !password) {
      setLibrarianError("All fields are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(librarianEmail)) {
      setLibrarianError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setLibrarianError("Password must be at least 8 characters.");
      return;
    }

    closeAddLibrarianModal();
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-title-row">
          <FiSettings  className="setting-logo"/>
          <h1>Settings</h1>
        </div>
        <p>Manage your account and system settings</p>
      </div>

      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" ? (
        <div className="settings-card">
          <h2>Profile Information</h2>

          <div className="settings-user-row">
            <div className="settings-avatar-wrap">
              {(profileImage || currentProfileImage) ? (
                <img
                  src={profileImage || currentProfileImage}
                  alt="Profile preview"
                  className="settings-avatar-image"
                />
              ) : (
                <div className="settings-avatar">{initials || "AD"}</div>
              )}
              <div className="settings-avatar-actions">
                <button
                  type="button"
                  className="settings-avatar-camera"
                  aria-label="Change profile picture"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <div className="settings-spinner"></div>
                  ) : (
                    <FiCamera />
                  )}
                </button>
                {currentProfileImage && (
                  <button
                    type="button"
                    className="settings-avatar-delete"
                    aria-label="Remove profile picture"
                    onClick={handleDeleteProfileImage}
                    disabled={uploadingImage}
                    title="Remove profile picture"
                  >
                    <FiX />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="settings-avatar-file-input"
                onChange={handleProfileImageChange}
                disabled={uploadingImage}
              />
            </div>
            <div className="settings-user-info">
              <h3>{fullName}</h3>
              <p>{email}</p>
              <span>
                Role: <strong>{role}</strong>
              </span>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-form-grid">
            <label>
              First Name
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
              />
            </label>
            <label>
              Last Name
              <input
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
            </label>
          </div>

          <label className="settings-email-field">
            Email
            <input
              value={email}
              readOnly
              disabled
              className="settings-readonly-input"
            />
          </label>
        </div>
      ) : activeTab === "security" ? (
        <div className="settings-card security-card">
          <h2>Security Settings</h2>
          <div className="security-row">
            <div>
              <h3>Password</h3>
              <p>Change your account password</p>
            </div>
            <button
              type="button"
              className="security-change-btn"
              onClick={() => setShowPasswordModal(true)}
            >
              <FiLock />
              Change Password
            </button>
          </div>
        </div>
      ) : activeTab === "admin" ? (
        <div className="settings-card admin-management-card">
          <div className="admin-management-top">
            <h2>Admin Management</h2>
            <button
              type="button"
              className="admin-add-btn"
              onClick={() => setShowAddAdminModal(true)}
            >
              <FiUserPlus />
              Add New Admin
            </button>
          </div>
          <p>
            Create new admin accounts to manage the system. New admins will receive
            login credentials via email.
          </p>
        </div>
      ) : activeTab === "library" ? (
        <div className="settings-card admin-management-card librarian-management-card">
          <div className="admin-management-top">
            <h2>Librarian Management</h2>
            <button
              type="button"
              className="admin-add-btn"
              onClick={() => setShowAddLibrarianModal(true)}
            >
              <FiUserPlus />
              Add New Librarian
            </button>
          </div>
          <div className="librarian-empty-state">
            No librarians found. Add a librarian to manage the library system.
          </div>
        </div>
      ) : (
        <div className="settings-card settings-empty">
          <h2>Coming Soon</h2>
          <p>{tabs.find((t) => t.id === activeTab)?.label} settings will be added here.</p>
        </div>
      )}

      {showPasswordModal &&
        renderModal(
        <div className="security-modal-overlay" onClick={closePasswordModal}>
          <div
            className="security-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="security-modal-header">
              <h2>Change Password</h2>
              <button
                type="button"
                className="security-close-btn"
                onClick={closePasswordModal}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <label className="security-input-label">
                Current Password
                <div className="security-input-wrap">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={securityForm.currentPassword}
                    onChange={(e) =>
                      handleSecurityInput("currentPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="security-eye-btn"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                  >
                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </label>

              <label className="security-input-label">
                New Password
                <div className="security-input-wrap">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={securityForm.newPassword}
                    onChange={(e) =>
                      handleSecurityInput("newPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="security-eye-btn"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={
                      showNewPassword ? "Hide new password" : "Show new password"
                    }
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </label>

              <label className="security-input-label">
                Confirm New Password
                <div className="security-input-wrap">
                  <input
                    type="password"
                    value={securityForm.confirmPassword}
                    onChange={(e) =>
                      handleSecurityInput("confirmPassword", e.target.value)
                    }
                  />
                </div>
              </label>

              {securityError && (
                <p className="security-error-text">{securityError}</p>
              )}

              <div className="security-actions">
                <button
                  type="button"
                  className="security-cancel-btn"
                  onClick={closePasswordModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="security-submit-btn"
                  disabled={securitySubmitting}
                >
                  {securitySubmitting ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddAdminModal &&
        renderModal(
        <div className="security-modal-overlay" onClick={closeAddAdminModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="security-modal-header">
              <h2>Add New Admin</h2>
              <button
                type="button"
                className="security-close-btn"
                onClick={closeAddAdminModal}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin}>
              <label className="security-input-label">
                First Name
                <div className="security-input-wrap">
                  <input
                    type="text"
                    placeholder="John"
                    value={adminForm.firstName}
                    onChange={(e) => handleAdminInput("firstName", e.target.value)}
                  />
                </div>
              </label>

              <label className="security-input-label">
                Last Name
                <div className="security-input-wrap">
                  <input
                    type="text"
                    placeholder="Doe"
                    value={adminForm.lastName}
                    onChange={(e) => handleAdminInput("lastName", e.target.value)}
                  />
                </div>
              </label>

              <label className="security-input-label">
                Email
                <div className="security-input-wrap">
                  <input
                    type="email"
                    placeholder="admin@huroorkee.ac.in"
                    value={adminForm.email}
                    onChange={(e) => handleAdminInput("email", e.target.value)}
                  />
                </div>
              </label>

              <label className="security-input-label">
                Password
                <div className="security-input-wrap">
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={adminForm.password}
                    onChange={(e) => handleAdminInput("password", e.target.value)}
                  />
                </div>
              </label>

              <div className="admin-note-box">
                The new admin will be able to access all admin features and manage
                the system.
              </div>

              {adminError && <p className="security-error-text">{adminError}</p>}

              <div className="security-actions">
                <button
                  type="button"
                  className="security-cancel-btn"
                  onClick={closeAddAdminModal}
                >
                  Cancel
                </button>
                <button type="submit" className="security-submit-btn">
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddLibrarianModal &&
        renderModal(
        <div className="security-modal-overlay" onClick={closeAddLibrarianModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="security-modal-header">
              <h2>Add New Librarian</h2>
              <button
                type="button"
                className="security-close-btn"
                onClick={closeAddLibrarianModal}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleCreateLibrarian}>
              <label className="security-input-label">
                First Name
                <div className="security-input-wrap">
                  <input
                    type="text"
                    placeholder="John"
                    value={librarianForm.firstName}
                    onChange={(e) => handleLibrarianInput("firstName", e.target.value)}
                  />
                </div>
              </label>

              <label className="security-input-label">
                Last Name
                <div className="security-input-wrap">
                  <input
                    type="text"
                    placeholder="Doe"
                    value={librarianForm.lastName}
                    onChange={(e) => handleLibrarianInput("lastName", e.target.value)}
                  />
                </div>
              </label>

              <label className="security-input-label">
                Email
                <div className="security-input-wrap">
                  <input
                    type="email"
                    placeholder="librarian@huroorkee.ac.in"
                    value={librarianForm.email}
                    onChange={(e) => handleLibrarianInput("email", e.target.value)}
                  />
                </div>
              </label>

              <label className="security-input-label">
                Password
                <div className="security-input-wrap">
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={librarianForm.password}
                    onChange={(e) => handleLibrarianInput("password", e.target.value)}
                  />
                </div>
              </label>

              <div className="admin-note-box">
                The librarian will only have access to the library management
                system.
              </div>

              {librarianError && (
                <p className="security-error-text">{librarianError}</p>
              )}

              <div className="security-actions">
                <button
                  type="button"
                  className="security-cancel-btn"
                  onClick={closeAddLibrarianModal}
                >
                  Cancel
                </button>
                <button type="submit" className="security-submit-btn">
                  Create Librarian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
