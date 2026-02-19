import { useState, useEffect } from "react";
import axios from "axios";
import "./Alert.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    audience: [],
    priority: "info",
    expiresAt: "",
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/alerts`, {
        withCredentials: true,
      });
      setAlerts(response.data.alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/admin/alerts`, formData, {
        withCredentials: true,
      });
      setShowModal(false);
      setFormData({
        title: "",
        message: "",
        audience: [],
        priority: "info",
        expiresAt: "",
      });
      fetchAlerts();
    } catch (error) {
      console.error("Error creating alert:", error);
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await axios.put(`${API_BASE_URL}/admin/alerts/${id}`, { isActive: !isActive }, {
        withCredentials: true,
      });
      fetchAlerts();
    } catch (error) {
      console.error("Error updating alert:", error);
    }
  };

  const handleAudienceChange = (role) => {
    setFormData(prev => ({
      ...prev,
      audience: prev.audience.includes(role)
        ? prev.audience.filter(r => r !== role)
        : [...prev.audience, role]
    }));
  };

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <h2>Manage Alerts</h2>
        <button onClick={() => setShowModal(true)} className="btn-create-alert">
          Create New Alert
        </button>
      </div>

      <div className="alerts-list">
        {alerts.map((alert) => (
          <div key={alert._id} className={`alert-card priority-${alert.priority}`}>
            <div className="alert-card-header">
              <h3>{alert.title}</h3>
              <span className={`badge ${alert.isActive ? 'active' : 'inactive'}`}>
                {alert.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="alert-message">{alert.message}</p>
            <div className="alert-meta">
              <span>Audience: {alert.audience.join(", ")}</span>
              <span>Priority: {alert.priority}</span>
              {alert.expiresAt && <span>Expires: {new Date(alert.expiresAt).toLocaleDateString()}</span>}
            </div>
            <button
              onClick={() => toggleActive(alert._id, alert.isActive)}
              className="btn-toggle"
            >
              {alert.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Alert</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  maxLength={120}
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                  maxLength={2000}
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Audience</label>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.audience.includes("student")}
                      onChange={() => handleAudienceChange("student")}
                    />
                    Students
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.audience.includes("faculty")}
                      onChange={() => handleAudienceChange("faculty")}
                    />
                    Faculty
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label>Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
