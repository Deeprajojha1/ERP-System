import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import networkErrorImg from "../../assets/Network_error.jpg.jpeg";
import "./NetworkError.css";

const LAST_FAILED_ROUTE_KEY = "lastFailedRoute";
const isOnline = () =>
  typeof navigator !== "undefined" && navigator.onLine;

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

  React.useEffect(() => {
    const handleOnline = () => navigateToPreviousRoute();
    window.addEventListener("online", handleOnline);

    if (isOnline()) {
      navigateToPreviousRoute();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [navigateToPreviousRoute]);

  const handleRetry = () => {
    if (isOnline()) {
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
