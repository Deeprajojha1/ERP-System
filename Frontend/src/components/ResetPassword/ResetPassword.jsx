import React, { useEffect, useState } from "react";
import "./ResetPassword.css";
import { useNavigate } from "react-router-dom";
import axios from "../../utils/axiosInstance";
import collegeLogo from "../../assets/college_47233.jpg";
import { useSelector } from "react-redux";
import { IoMdEyeOff } from "react-icons/io";
import { IoEyeOutline } from "react-icons/io5";
import toast from "react-hot-toast";

const ResetPassword = () => {
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [time, setTime] = useState(5);
    const [second, setSecond] = useState(0);

    const [sendLoading, setSendLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const navigate = useNavigate();
    const apiBase = useSelector((state) => state.config.apiBase);

    /* =========================
       TIMER
    ========================= */
    useEffect(() => {
        if (step !== 2) return;
        if (time === 0 && second === 0) return;

        const timer = setInterval(() => {
            if (second > 0) {
                setSecond((prev) => prev - 1);
            } else {
                if (time > 0) {
                    setTime((prev) => prev - 1);
                    setSecond(59);
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [step, time, second]);

    /* =========================
       STEP 1 â†’ SEND OTP
    ========================= */
    const sendOtp = async () => {
        try {
            if (!email) {
                return toast.error("Please enter email", { icon: "❌" });
            }

            setSendLoading(true);

            const res = await axios.post(
                `${apiBase}/user/send-otp`,
                { email }
            );

            toast.success(res.data?.message || "OTP sent", { icon: "✅" });

            setTime(5);
            setSecond(0);
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.message || "OTP send failed", { icon: "❌" });
        } finally {
            setSendLoading(false);
        }
    };

    /* =========================
       STEP 2 â†’ VERIFY OTP
    ========================= */
    const verifyOtp = async () => {
        try {
            if (!otp) {
                return toast.error("Please enter OTP", { icon: "❌" });
            }

            setVerifyLoading(true);

            const res = await axios.post(
                `${apiBase}/user/verify-otp`,
                { email, otp }
            );

            toast.success(res.data?.message || "OTP verified", { icon: "✅" });
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.message || "OTP verification failed", { icon: "❌" });
        } finally {
            setVerifyLoading(false);
        }
    };

    /* =========================
       STEP 3 â†’ RESET PASSWORD
    ========================= */
    const resetPassword = async () => {
        try {
            if (!newPassword || !confirmPassword) {
                return toast.error("Please fill both password fields", { icon: "❌" });
            }

            setResetLoading(true);

            const res = await axios.post(
                `${apiBase}/user/reset-password`,
                { email, newPassword, confirmPassword }
            );

            toast.success(res.data?.message || "Password reset successful", { icon: "✅" });

            navigate("/login", { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.message || "Reset failed", { icon: "❌" });
        } finally {
            setResetLoading(false);
        }
    };

    return (
  <div className="forget-page">
    <div className="forget-card">

      {/* HEADER */}
      <div className="forget-header">
        <img
          src={collegeLogo}
          alt="College Logo"
          className="forget-logo"
        />
        <h1>Forget Your Password?</h1>
        <p>No worries! Reset your password in just 3 steps.</p>
      </div>

      {/* STEPS */}
      <div className="forget-steps">
        <div className={`step-dot ${step === 1 ? "active" : ""}`}>1</div>
        <div className="step-line"></div>
        <div className={`step-dot ${step === 2 ? "active" : ""}`}>2</div>
        <div className="step-line"></div>
        <div className={`step-dot ${step === 3 ? "active" : ""}`}>3</div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="step-box">
          <h2 className="step-title">Step 1: Email</h2>

          <input
            type="text"
            className="forget-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="btn primary"
            onClick={sendOtp}
            disabled={sendLoading}
          >
            {sendLoading ? "Sending..." : "Send OTP"}
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="step-box">
          <h2 className="step-title">Step 2: Verify OTP</h2>

          <input
            type="text"
            className="forget-input"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          {(time > 0 || second > 0) ? (
            <p className="otp-text">
              OTP expires in{" "}
              <span>
                {time < 10 ? `0${time}` : time}:
                {second < 10 ? `0${second}` : second}
              </span>
            </p>
          ) : (
            <button className="resend-btn" onClick={sendOtp}>
              Resend OTP
            </button>
          )}

          <div className="btn-row">
            <button
              className="btn light"
              onClick={() => setStep(1)}
              type="button"
            >
              Back
            </button>

            <button
              className="btn primary"
              onClick={verifyOtp}
              disabled={verifyLoading}
              type="button"
            >
              {verifyLoading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="step-box">
          <h2 className="step-title">Step 3: Reset Password</h2>

          <div className="forget-input-group">
            <input
              type={showNewPassword ? "text" : "password"}
              className="forget-input"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <span
              className="forget-eye-icon"
              onClick={() =>
                setShowNewPassword((prev) => !prev)
              }
              role="button"
              tabIndex={0}
            >
              {showNewPassword ? <IoMdEyeOff /> : <IoEyeOutline />}
            </span>
          </div>

          <div className="forget-input-group">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="forget-input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <span
              className="forget-eye-icon"
              onClick={() =>
                setShowConfirmPassword((prev) => !prev)
              }
              role="button"
              tabIndex={0}
            >
              {showConfirmPassword ? <IoMdEyeOff /> : <IoEyeOutline />}
            </span>
          </div>

          <div className="btn-row">
            <button
              className="btn light"
              onClick={() => setStep(2)}
              type="button"
            >
              Back
            </button>

            <button
              className="btn primary"
              onClick={resetPassword}
              disabled={resetLoading}
              type="button"
            >
              {resetLoading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </div>
      )}

    </div>
  </div>
);

};

export default ResetPassword;

