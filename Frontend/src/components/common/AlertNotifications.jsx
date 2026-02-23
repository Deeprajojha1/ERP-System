import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import axios from "../../utils/axiosInstance";
import { Bell, X, AlertCircle, AlertTriangle, Info } from "lucide-react";
import "./AlertNotifications.css";

export default function AlertNotifications() {
  const userRole = useSelector((state) => state.user.userData?.user?.role);
  const apiBase = useSelector((state) => state.config.apiBase);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const userId = useSelector((state) => state.user.userData?.user?._id);

  const alertsBasePath = (() => {
    if (!apiBase || !userRole) return "";
    if (userRole === "admin") return `${apiBase}/admin/alerts`;
    if (userRole === "faculty") return `${apiBase}/faculty/alerts`;
    if (userRole === "student") return `${apiBase}/student/alerts`;
    return "";
  })();

  const fetchAlerts = useCallback(async () => {
    if (!alertsBasePath) return;
    try {
      const response = await axios.get(alertsBasePath, {
        withCredentials: true,
      });
      const nextAlerts = Array.isArray(response.data?.alerts)
        ? response.data.alerts
        : [];
      setAlerts(nextAlerts);
      setUnreadCount(nextAlerts.filter((alert) => !alert?.isRead).length);
    } catch {
      setAlerts([]);
      setUnreadCount(0);
    }
  }, [alertsBasePath]);

  useEffect(() => {
    if (!alertsBasePath) return;
    const timerId = window.setTimeout(() => {
      fetchAlerts();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [alertsBasePath, fetchAlerts]);

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
    setUnreadCount(0);
  };

  // local persisted timestamp when the user last viewed notifications
  const seenStorageKey = useMemo(() => {
    return `alerts_last_seen_${userId || userRole || "anon"}`;
  }, [userId, userRole]);

  const readSeenAt = () => {
    const v = localStorage.getItem(seenStorageKey);
    return v ? Number(v) : 0;
  };

  const writeSeenAt = (ts) => {
    try {
      localStorage.setItem(seenStorageKey, String(ts || Date.now()));
    } catch (e) {
      /* ignore */
    }
  };

  // latest alert timestamp (ms)
  const latestAlertTime = useMemo(() => {
    if (!alerts || alerts.length === 0) return 0;
    return Math.max(...alerts.map((a) => new Date(a.createdAt).getTime()));
  }, [alerts]);

  // number of alerts that are newer than when user last looked
  const newSinceSeenCount = useMemo(() => {
    const seenAt = readSeenAt();
    if (!alerts || alerts.length === 0) return 0;
    return alerts.filter((a) => new Date(a.createdAt).getTime() > seenAt).length;
  }, [alerts, seenStorageKey]);

  const handleDropdownToggle = () => {
    if (!showDropdown) {
      // opening: mark as read locally and persist seen timestamp
      markAllAsRead();
      writeSeenAt(latestAlertTime || Date.now());
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
        {newSinceSeenCount > 0 && (
          <span className="alert-badge">{newSinceSeenCount}</span>
        )}
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
