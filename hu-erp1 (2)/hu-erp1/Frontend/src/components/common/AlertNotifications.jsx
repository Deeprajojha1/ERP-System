import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { Bell, X, AlertCircle, AlertTriangle, Info } from "lucide-react";
import "./AlertNotifications.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function AlertNotifications() {
  const userRole = useSelector((state) => state.user.userData?.user?.role);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const alertsBasePath =
    userRole === "faculty"
      ? `${API_BASE_URL}/faculty/alerts`
      : userRole === "student"
      ? `${API_BASE_URL}/student/alerts`
      : `${API_BASE_URL}/admin/alerts`;

  useEffect(() => {
    fetchAlerts();
  }, [alertsBasePath]);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(alertsBasePath, {
        withCredentials: true,
      });
      setAlerts(response.data?.alerts || []);
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mark all unread alerts as read
      const unreadAlerts = alerts.filter(a => !a.isRead);
      await Promise.all(
        unreadAlerts.map(alert =>
          axios.post(`${alertsBasePath}/${alert._id}/read`, {}, {
            withCredentials: true,
          })
        )
      );
      
      // Update local state
      setAlerts(alerts.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking alerts as read:", error);
    }
  };

  const handleDropdownToggle = () => {
    if (!showDropdown && unreadCount > 0) {
      // When opening dropdown, mark all as read
      markAllAsRead();
    }
    setShowDropdown(!showDropdown);
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle size={20} className="icon-urgent" />;
      case "warning":
        return <AlertTriangle size={20} className="icon-warning" />;
      default:
        return <Info size={20} className="icon-info" />;
    }
  };

  return (
    <div className="alert-notifications">
      <button
        className="alert-bell-btn"
        onClick={handleDropdownToggle}
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="alert-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="alert-dropdown">
          <div className="alert-dropdown-header">
            <h4>Notifications</h4>
            <button onClick={() => setShowDropdown(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="alert-dropdown-body">
            {alerts.length === 0 ? (
              <p className="no-alerts">No notifications</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`alert-item priority-${alert.priority} ${alert.isRead ? "" : "unread"}`}
                >
                  <div className="alert-item-icon">
                    {getPriorityIcon(alert.priority)}
                  </div>
                  <div className="alert-item-content">
                    <h5>{alert.title}</h5>
                    <p>{alert.message}</p>
                    <span className="alert-time">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
