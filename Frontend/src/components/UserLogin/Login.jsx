import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IoMdEyeOff } from "react-icons/io";
import { IoEyeOutline } from "react-icons/io5";
import { FiKey, FiLock, FiMail } from "react-icons/fi";
import axios from "../../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../../redux/userSlice";
import collegeLogo from "../../assets/college_47233.jpg";
import { TailSpin } from "react-loader-spinner";
import "./Login.css";
import toast from "react-hot-toast";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);

  const [loginMode, setLoginMode] = useState("password");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [otpStep, setOtpStep] = useState(1);
  const [otpData, setOtpData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [time, setTime] = useState(5);
  const [second, setSecond] = useState(0);

  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (loginMode !== "otp" || otpStep !== 2) return;
    if (time === 0 && second === 0) return;

    const timer = setInterval(() => {
      if (second > 0) {
        setSecond((prev) => prev - 1);
      } else if (time > 0) {
        setTime((prev) => prev - 1);
        setSecond(59);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [loginMode, otpStep, time, second]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOtpChange = (e) => {
    const { name, value } = e.target;
    setOtpData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    if (!apiBase) {
      toast.error("Server configuration missing. Please refresh and try again.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${apiBase}/user/login`, formData);

      if (res.data?.token && typeof window !== "undefined") {
        localStorage.setItem("authToken", res.data.token);
        // Backward-compatible key while old components are migrated.
        localStorage.setItem("token", res.data.token);
      }

      // Store user data in Redux
      dispatch(setUserData(res.data));
      toast.success(res.data.message || "Login successful");

      setFormData({
        email: "",
        password: "",
      });

      if (res.data.user.role === "faculty") {
        navigate("/faculty/faculty-dashboard", { replace: true });
      } else if (res.data.user.role === "student") {
        navigate("/dashboard", { replace: true });
      } else if (res.data.user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (res.data.user.role === "warden") {
        navigate("/warden-dashboard", { replace: true });
      } else if (res.data.user.role === "gateSecurity") {
        navigate("/gate-security-dashboard", { replace: true });
      }
    } catch (error) {
      if (!error.response) {
        toast.error(
          error.message?.includes("Network")
            ? "Unable to connect to server. Please check your network."
            : `Request failed: ${error.message || "Unknown error"}`
        );
      } else {
        toast.error(error.response?.data?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      if (!otpData.email) {
        toast.error("Please enter email first");
        return;
      }

      setOtpSending(true);
      const res = await axios.post(`${apiBase}/user/send-otp`, { email: otpData.email });
      toast.success(res.data?.message || "OTP sent successfully");

      setTime(5);
      setSecond(0);
      setOtpStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!otpData.email || !otpData.otp) {
        toast.error("Please fill email and OTP");
        return;
      }

      setOtpVerifying(true);
      const res = await axios.post(`${apiBase}/user/verify-otp`, {
        email: otpData.email,
        otp: otpData.otp,
      });

      toast.success(res.data?.message || "OTP verified");
      setOtpStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!otpData.newPassword || !otpData.confirmPassword) {
        toast.error("Please fill both password fields");
        return;
      }

      setResetLoading(true);
      const res = await axios.post(`${apiBase}/user/reset-password`, {
        email: otpData.email,
        newPassword: otpData.newPassword,
        confirmPassword: otpData.confirmPassword,
      });

      toast.success(res.data?.message || "Password reset successful");

      setOtpData({ email: "", otp: "", newPassword: "", confirmPassword: "" });
      setOtpStep(1);
      setLoginMode("password");
    } catch (error) {
      toast.error(error.response?.data?.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src={collegeLogo} alt="logo" className="login-logo" />
          <h2>Haridwar University</h2>
          <p>ERP Portal - Sign in to your account</p>
        </div>

        <div className="login-mode-tabs" role="tablist" aria-label="Login mode">
          <button
            type="button"
            className={`login-mode-tab ${loginMode === "password" ? "active" : ""}`}
            onClick={() => setLoginMode("password")}
          >
            <FiLock />
            Password
          </button>
          <button
            type="button"
            className={`login-mode-tab ${loginMode === "otp" ? "active" : ""}`}
            onClick={() => setLoginMode("otp")}
          >
            <FiKey />
            OTP
          </button>
        </div>

        {loginMode === "password" ? (
          <form onSubmit={handlePasswordLogin} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <span className="field-icon" aria-hidden="true">
                <FiMail />
              </span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <span className="field-icon" aria-hidden="true">
                <FiLock />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
                disabled={loading}
              />

              <span className="eye-icon" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? <IoMdEyeOff /> : <IoEyeOutline />}
              </span>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loader">
                  <TailSpin height="20" width="20" color="#ffffff" ariaLabel="loading" />
                  <span>Signing in...</span>
                </span>
              ) : "Sign In"}
            </button>
          </form>
        ) : (
          <div className="login-form">
            <div className="login-otp-steps">
              <div className={`login-otp-dot ${otpStep === 1 ? "active" : ""}`}>1</div>
              <div className="login-otp-line" />
              <div className={`login-otp-dot ${otpStep === 2 ? "active" : ""}`}>2</div>
              <div className="login-otp-line" />
              <div className={`login-otp-dot ${otpStep === 3 ? "active" : ""}`}>3</div>
            </div>

            {otpStep === 1 && (
              <>
                <h4 className="otp-step-title">Step 1: Send OTP</h4>
                <div className="form-group">
                  <label>Email Address</label>
                  <span className="field-icon" aria-hidden="true">
                    <FiMail />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={otpData.email}
                    onChange={handleOtpChange}
                    placeholder="Enter email address"
                    required
                    disabled={otpSending}
                  />
                </div>

                <button
                  type="button"
                  className="login-btn"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                >
                  {otpSending ? (
                    <span className="btn-loader">
                      <TailSpin height="20" width="20" color="#ffffff" ariaLabel="loading" />
                      <span>Sending...</span>
                    </span>
                  ) : "Send OTP"}
                </button>
              </>
            )}

            {otpStep === 2 && (
              <>
                <h4 className="otp-step-title">Step 2: Verify OTP</h4>
                <div className="form-group">
                  <label>OTP Code</label>
                  <span className="field-icon" aria-hidden="true">
                    <FiKey />
                  </span>
                  <input
                    type="text"
                    name="otp"
                    value={otpData.otp}
                    onChange={handleOtpChange}
                    placeholder="Enter OTP"
                    required
                    disabled={otpVerifying}
                  />
                </div>

                {time > 0 || second > 0 ? (
                  <p className="otp-timer">
                    OTP expires in {time < 10 ? `0${time}` : time}:{second < 10 ? `0${second}` : second}
                  </p>
                ) : (
                  <button className="otp-resend-btn" type="button" onClick={handleSendOtp} disabled={otpVerifying}>
                    Resend OTP
                  </button>
                )}

                <div className="otp-btn-row">
                  <button type="button" className="otp-secondary-btn" onClick={() => setOtpStep(1)} disabled={otpVerifying}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="login-btn"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying}
                  >
                    {otpVerifying ? (
                      <span className="btn-loader">
                        <TailSpin height="20" width="20" color="#ffffff" ariaLabel="loading" />
                        <span>Verifying...</span>
                      </span>
                    ) : "Verify OTP"}
                  </button>
                </div>
              </>
            )}

            {otpStep === 3 && (
              <>
                <h4 className="otp-step-title">Step 3: Reset Password</h4>
                <div className="form-group">
                  <label>New Password</label>
                  <span className="field-icon" aria-hidden="true">
                    <FiLock />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={otpData.newPassword}
                    onChange={handleOtpChange}
                    placeholder="Enter new password"
                    required
                    disabled={resetLoading}
                  />
                  <span className="eye-icon" onClick={() => setShowNewPassword((prev) => !prev)}>
                    {showNewPassword ? <IoMdEyeOff /> : <IoEyeOutline />}
                  </span>
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <span className="field-icon" aria-hidden="true">
                    <FiLock />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={otpData.confirmPassword}
                    onChange={handleOtpChange}
                    placeholder="Confirm password"
                    required
                    disabled={resetLoading}
                  />
                  <span className="eye-icon" onClick={() => setShowConfirmPassword((prev) => !prev)}>
                    {showConfirmPassword ? <IoMdEyeOff /> : <IoEyeOutline />}
                  </span>
                </div>

                <div className="otp-btn-row">
                  <button type="button" className="otp-secondary-btn" onClick={() => setOtpStep(2)} disabled={resetLoading}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="login-btn"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <span className="btn-loader">
                        <TailSpin height="20" width="20" color="#ffffff" ariaLabel="loading" />
                        <span>Resetting...</span>
                      </span>
                    ) : "Reset Password"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="login-register-row">
          <span>Don't have an account?</span>{" "}
          <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
