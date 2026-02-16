import React from "react";
import { useNavigate } from "react-router-dom";
import networkErrorImg from "../../assets/Network_error.jpg.jpeg";
import "./NetworkError.css";

const NetworkError = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate("/");
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
          <button
            onClick={handleGoHome}
            className="network-error-btn secondary"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkError;
