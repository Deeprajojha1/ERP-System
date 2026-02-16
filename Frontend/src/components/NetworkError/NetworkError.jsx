import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import networkErrorImg from "../../assets/Network_error.jpg.jpeg";
import "./NetworkError.css";

const MIN_NETWORK_SPEED_MBPS = 0.512; // 512 kbps
const LAST_FAILED_ROUTE_KEY = "lastFailedRoute";

const getConnection = () =>
  navigator.connection || navigator.mozConnection || navigator.webkitConnection;

const isNetworkHealthy = () => {
  if (!navigator.onLine) return false;

  const connection = getConnection();
  const downlink = connection?.downlink;
  const effectiveType = (connection?.effectiveType || "").toLowerCase();

  if (typeof downlink === "number") {
    return downlink >= MIN_NETWORK_SPEED_MBPS;
  }

  return effectiveType !== "slow-2g" && effectiveType !== "2g";
};

const getPreviousRoute = () => {
  const savedRoute = sessionStorage.getItem(LAST_FAILED_ROUTE_KEY);
  if (!savedRoute || savedRoute === "/network-error") return "/";
  return savedRoute;
};

const NetworkError = () => {
  const navigate = useNavigate();

  const navigateToPreviousRoute = useCallback(() => {
    const previousRoute = getPreviousRoute();
    sessionStorage.removeItem(LAST_FAILED_ROUTE_KEY);
    navigate(previousRoute, { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (isNetworkHealthy()) {
      navigateToPreviousRoute();
    }
  }, [navigateToPreviousRoute]);

  const handleRetry = () => {
    if (isNetworkHealthy()) {
      navigateToPreviousRoute();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="network-error-container">
      <div className="network-error-content">
        <img
          src={networkErrorImg}
          alt="Network Error"
          className="network-error-image"
        />
        <h1 className="network-error-title">Oops! No Internet Connection</h1>
        <p className="network-error-message">
          We couldn't connect to the server. Please check your internet connection and try again.
        </p>
        <p className="network-error-submessage">
          If the problem persists, please contact your system administrator.
        </p>
        <div className="network-error-actions">
          <button
            onClick={handleRetry}
            className="network-error-btn primary"
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkError;
