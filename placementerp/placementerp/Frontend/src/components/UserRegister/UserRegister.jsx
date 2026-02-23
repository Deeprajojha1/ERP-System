import React from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiLock } from "react-icons/fi";
import collegeLogo from "../../assets/college_47233.jpg";
import "./UserRegister.css";

const UserRegister = () => {
  const navigate = useNavigate();

  return (
    <div className="register-block-page">
      <div className="register-block-card">
        <img src={collegeLogo} alt="Haridwar University" className="register-block-logo" />

        <h1 className="register-block-title">Registration Disabled</h1>
        <p className="register-block-subtitle">Haridwar University ERP Portal</p>

        <div className="register-block-panel">
          <div className="register-block-head">
            <FiLock />
            <h2>Admin-Only Registration</h2>
          </div>
          <p className="register-block-text">
            Public registration is disabled. Only administrators can create student and
            faculty accounts.
          </p>

          <div className="register-block-note">
            <div className="register-block-note-head">
              <FiAlertCircle />
              <span>Already have an account?</span>
            </div>
            <p>
              If your account has been created by an administrator, you can login using
              the OTP system.
            </p>
          </div>

          <div className="register-block-steps">
            <h3>How to get access:</h3>
            <ol>
              <li>Contact your administrator</li>
              <li>Admin will create your account with your email</li>
              <li>Login using OTP sent to your email</li>
            </ol>
          </div>

          <button
            type="button"
            className="register-block-login-btn"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;
