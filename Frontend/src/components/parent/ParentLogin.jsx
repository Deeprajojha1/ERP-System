import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCreditCard, FiPhone } from "react-icons/fi";
import axiosInstance from "../../utils/axiosInstance";
import collegeLogo from "../../assets/college_47233.jpg";
import "../UserLogin/Login.css";

const ParentLogin = () => {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState("aadhar");
  const [formData, setFormData] = useState({
    aadharNumber: "",
    parentPhoneNumber: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const numeric = value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, [name]: numeric }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loginMode === "aadhar" && !/^\d{12}$/.test(formData.aadharNumber)) {
      toast.error("Aadhaar must be 12 digits.");
      return;
    }
    if (loginMode === "phone" && !/^\d{10}$/.test(formData.parentPhoneNumber)) {
      toast.error("Parent phone must be 10 digits.");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post("/api/parent/login", {
        loginVia: loginMode,
        aadharNumber: loginMode === "aadhar" ? formData.aadharNumber : "",
        parentPhoneNumber: loginMode === "phone" ? formData.parentPhoneNumber : "",
      });
      const token = String(response.data?.token || "").trim();
      if (token) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("token", token);
      }
      localStorage.setItem("parentStudent", JSON.stringify(response.data?.student || {}));
      toast.success("Parent login successful");
      navigate("/parent/dashboard", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Parent login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src={collegeLogo} alt="Haridwar University logo" className="login-logo" />
          <h2>Haridwar University</h2>
          <p>Parent ERP Portal - Sign in to your account</p>
        </div>

        <div className="login-mode-tabs" role="tablist" aria-label="Parent login mode">
          <button
            type="button"
            className={`login-mode-tab ${loginMode === "aadhar" ? "active" : ""}`}
            onClick={() => setLoginMode("aadhar")}
          >
            <FiCreditCard />
            Aadhaar
          </button>
          <button
            type="button"
            className={`login-mode-tab ${loginMode === "phone" ? "active" : ""}`}
            onClick={() => setLoginMode("phone")}
          >
            <FiPhone />
            Phone
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {loginMode === "aadhar" ? (
            <div className="form-group">
              <label htmlFor="aadharNumber">Student Aadhaar Number</label>
              <span className="field-icon" aria-hidden="true">
                <FiCreditCard />
              </span>
              <input
                id="aadharNumber"
                name="aadharNumber"
                type="text"
                maxLength={12}
                value={formData.aadharNumber}
                onChange={handleChange}
                placeholder="Enter 12-digit Aadhaar"
                required
                disabled={loading}
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="parentPhoneNumber">Parent Phone Number</label>
              <span className="field-icon" aria-hidden="true">
                <FiPhone />
              </span>
              <input
                id="parentPhoneNumber"
                name="parentPhoneNumber"
                type="text"
                maxLength={10}
                value={formData.parentPhoneNumber}
                onChange={handleChange}
                placeholder="Enter 10-digit phone"
                required
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="parent-login-row">
          <span>Student/Staff?</span> <Link to="/login">Go to Main Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ParentLogin;
