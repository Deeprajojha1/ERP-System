import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import { Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import emptyStateImg from "../assets/empty-state.svg";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";
import ClipLoader from "./components/ClipLoader";
import {
  createAdminAlert,
  deleteAdminAlert,
  fetchAdminAlerts,
  selectAdminAlerts,
  selectAdminAlertsError,
  selectAdminAlertsLoading,
  selectAdminAlertsNotImplemented,
  selectAdminAlertsSubmitting,
  selectAdminAlertsUpdatingById,
  selectAdminAlertsDeletingById,
  toggleAdminAlertStatus,
} from "../redux/alertSlice";
import "./Alert.css";

const TITLE_LIMIT = 120;
const MESSAGE_LIMIT = 2000;
const INITIAL_FORM_DATA = {
  title: "",
  message: "",
  audience: [],
  priority: "info",
  expiresAt: "",
};

const AUDIENCE_OPTIONS = [
  {
    value: "student",
    label: "Students",
    description: "Visible to all student users",
  },
  {
    value: "faculty",
    label: "Faculty",
    description: "Visible to all faculty users",
  },
];

const PRIORITY_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "urgent", label: "Urgent" },
];

export default function Alerts() {
  const dispatch = useDispatch();
  const alerts = useSelector(selectAdminAlerts);
  const loading = useSelector(selectAdminAlertsLoading);
  const isSubmitting = useSelector(selectAdminAlertsSubmitting);
  const updatingById = useSelector(selectAdminAlertsUpdatingById);
  const deletingById = useSelector(selectAdminAlertsDeletingById);
  const loadError = useSelector(selectAdminAlertsError);
  const notImplemented = useSelector(selectAdminAlertsNotImplemented);

  const [showModal, setShowModal] = useState(false);
  const [audienceError, setAudienceError] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    const load = async () => {
      await dispatch(fetchAdminAlerts());
      setHasFetchedOnce(true);
    };
    load();
  }, [dispatch]);

  const closeModal = () => {
    setShowModal(false);
    setAudienceError("");
    setFormData(INITIAL_FORM_DATA);
  };

  const openModal = () => {
    setAudienceError("");
    setFormData(INITIAL_FORM_DATA);
    setShowModal(true);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const title = formData.title.trim();
    const message = formData.message.trim();
    if (!title || !message) return;

    if (formData.audience.length === 0) {
      setAudienceError("Select at least one audience.");
      return;
    }

    const payload = {
      ...formData,
      title,
      message,
    };

    try {
      await dispatch(createAdminAlert(payload)).unwrap();
      toast.success("Alert created successfully");
      closeModal();
    } catch (error) {
      toast.error(error?.message || error || "Failed to create alert");
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await dispatch(toggleAdminAlertStatus({ id, isActive })).unwrap();
      toast.success(`Alert ${isActive ? "deactivated" : "activated"} successfully`);
    } catch (error) {
      toast.error(error?.message || error || "Failed to update alert");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return;
    try {
      await dispatch(deleteAdminAlert(id)).unwrap();
      toast.success("Alert deleted successfully");
    } catch (error) {
      toast.error(error?.message || error || "Failed to delete alert");
    }
  };

  const formatPriority = (priority = "") =>
    priority.charAt(0).toUpperCase() + priority.slice(1);

  const formatAudience = (audience = []) =>
    audience.map((role) => role.charAt(0).toUpperCase() + role.slice(1)).join(", ");

  const formatExpiry = (dateValue) => {
    if (!dateValue) return "No expiry";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "No expiry";
    return date.toLocaleString();
  };

  const getLoadStateText = (stateId) =>
    ADMIN_LOAD_STATE_OPTIONS.find((option) => option.id === stateId)?.text || "Unknown";

  const loadState =
    loading || !hasFetchedOnce
      ? ADMIN_LOAD_STATES.PENDING
      : notImplemented || loadError
      ? ADMIN_LOAD_STATES.FAILURE
      : ADMIN_LOAD_STATES.SUCCESS;

  const renderAlertsContent = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="alerts-state pending app-loader-state">
          <Oval
            height={42}
            width={42}
            color="#0284c7"
            secondaryColor="#93c5fd"
            strokeWidth={4}
            strokeWidthSecondary={4}
            ariaLabel="Loading alerts"
            visible
          />
          <p>Loading alerts...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      const message = notImplemented
        ? "Alert backend routes are present but not implemented yet."
        : loadError || "Failed to load alerts";
      return (
        <div className="alerts-state error">
          <img src={emptyStateImg} alt="Failed to load alerts" className="alerts-state-img" />
          <h3>Failed to load alerts</h3>
          <p>{message}</p>
          <button
            type="button"
            className="alerts-retry-btn"
            onClick={() => dispatch(fetchAdminAlerts())}
          >
            Retry
          </button>
        </div>
      );
    }

    if (alerts.length === 0) {
      return (
        <div className="alerts-empty-state">
          <h3>No alerts yet</h3>
          <p>Create your first alert to notify users about important updates.</p>
        </div>
      );
    }

    return alerts.map((alert) => (
      <div key={alert._id} className={`alert-card priority-${alert.priority}`}>
        <div className="alert-card-header">
          <div className="alert-card-copy">
            <h3>{alert.title}</h3>
            <p className="alert-message">{alert.message}</p>
          </div>
          <span
            className={`alert-status-badge ${alert.isActive ? "active" : "inactive"}`}
          >
            {alert.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="alert-meta">
          <span>
            <strong>Audience:</strong> {formatAudience(alert.audience)}
          </span>
          <span>
            <strong>Priority:</strong> {formatPriority(alert.priority)}
          </span>
          <span>
            <strong>Expires:</strong> {formatExpiry(alert.expiresAt)}
          </span>
        </div>

        <div className="alert-actions">
          <button
            type="button"
            onClick={() => toggleActive(alert._id, alert.isActive)}
            className="alert-toggle-btn"
            disabled={Boolean(updatingById[alert._id]) || Boolean(deletingById[alert._id])}
          >
            {updatingById[alert._id] ? (
              "Updating..."
            ) : alert.isActive ? (
              <>
                <ToggleRight size={16} />
                <span>Deactivate</span>
              </>
            ) : (
              <>
                <ToggleLeft size={16} />
                <span>Activate</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(alert._id)}
            className="alert-delete-btn"
            disabled={Boolean(updatingById[alert._id]) || Boolean(deletingById[alert._id])}
          >
            <Trash2 size={16} />
            <span>{deletingById[alert._id] ? "Deleting..." : "Delete"}</span>
          </button>
        </div>
      </div>
    ));
  };

  const handleAudienceChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      audience: prev.audience.includes(role)
        ? prev.audience.filter((value) => value !== role)
        : [...prev.audience, role],
    }));

    setAudienceError("");
  };

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div className="alerts-title-block">
          <h2>Manage Alerts</h2>
          <p className="alerts-subtitle">
            Create targeted notices for students and faculty with clear priority and expiry.
          </p>
          <span className={`alerts-load-chip ${loadState}`}>
            {getLoadStateText(loadState)}
          </span>
        </div>
        <button onClick={openModal} className="btn-create-alert" type="button">
          Create Alert
        </button>
      </div>

      <div className="alerts-list">{renderAlertsContent()}</div>

      {showModal && (
        <div className="alerts-modal-overlay" onClick={closeModal}>
          <div
            className="alerts-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="alerts-modal-head">
              <h3>Create New Alert</h3>
              <p>Use concise language and choose a priority that matches urgency.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="alerts-form-group">
                <div className="alerts-label-row">
                  <label htmlFor="alert-title">
                    Title <span className="required-mark">*</span>
                  </label>
                  <span className="char-counter">
                    {formData.title.length}/{TITLE_LIMIT}
                  </span>
                </div>
                <input
                  id="alert-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  required
                  maxLength={TITLE_LIMIT}
                  placeholder="Example: Exam schedule updated for Semester 2"
                />
              </div>

              <div className="alerts-form-group">
                <div className="alerts-label-row">
                  <label htmlFor="alert-message">
                    Message <span className="required-mark">*</span>
                  </label>
                  <span className="char-counter">
                    {formData.message.length}/{MESSAGE_LIMIT}
                  </span>
                </div>
                <textarea
                  id="alert-message"
                  value={formData.message}
                  onChange={(e) => handleFieldChange("message", e.target.value)}
                  required
                  maxLength={MESSAGE_LIMIT}
                  rows={5}
                  placeholder="Provide complete details, date, time, and required action."
                />
                <p className="alerts-field-help">
                  Keep it specific so users can act without follow-up clarification.
                </p>
              </div>

              <div className="alerts-form-group">
                <div className="alerts-label-row">
                  <label>
                    Audience <span className="required-mark">*</span>
                  </label>
                </div>
                <div className="alerts-audience-grid">
                  {AUDIENCE_OPTIONS.map((option) => {
                    const checked = formData.audience.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`alerts-audience-option ${checked ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleAudienceChange(option.value)}
                        />
                        <span className="alerts-audience-copy">
                          <span className="alerts-audience-title">{option.label}</span>
                          <span className="alerts-audience-desc">{option.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {audienceError ? <p className="alerts-form-error">{audienceError}</p> : null}
              </div>

              <div className="alerts-form-row">
                <div className="alerts-form-group">
                  <label htmlFor="alert-priority">Priority</label>
                  <select
                    id="alert-priority"
                    value={formData.priority}
                    onChange={(e) => handleFieldChange("priority", e.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="alerts-form-group">
                  <label htmlFor="alert-expiry">Expires At (Optional)</label>
                  <input
                    id="alert-expiry"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => handleFieldChange("expiresAt", e.target.value)}
                  />
                </div>
              </div>

              <div className="alerts-form-actions">
                <button type="button" onClick={closeModal} className="alerts-btn-cancel">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="alerts-btn-submit admin-btn-with-loader"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <ClipLoader size={15} color="#000000" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    "Create Alert"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
