import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IoMdEyeOff } from "react-icons/io";
import { IoEyeOutline } from "react-icons/io5";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../../redux/userSlice";
import collegeLogo from "../../assets/college_47233.jpg";
import "./Login.css";
import toast from "react-hot-toast";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  /* Handle Input */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* Submit Login */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await axios.post(
        `${apiBase}/user/login`,
        formData,
        {
          withCredentials: true, // for cookies
        }
      );

      console.log("Login Success â†’", res.data);
      dispatch(setUserData(res.data));
      toast.success(res.data.message || "Login successful", {
        icon: "✅",
      });
      setFormData({
        email: "",
        password: "",
      })
      
      /* Redirect based on user role */
      if (res.data.user.role === 'faculty') {
        navigate('/faculty/faculty-dashboard',{replace:true});
      } else if (res.data.user.role === 'student') {
        navigate('/dashboard',{replace:true});
      } else if (res.data.user.role === 'admin') {
        navigate('/admin/dashboard',{replace:true});
      }

    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message ||
          "Login failed",
        {
          icon: "❌",
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* Header */}
        <div className="login-header">
          <img
            src={collegeLogo}
            alt="logo"
            className="login-logo"
          />
          <h2>Welcome Back</h2>
          <p>Login to your account</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="login-form"
        >
          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />

            <span
              className="eye-icon"
              onClick={() =>
                setShowPassword(
                  (prev) => !prev
                )
              }
            >
              {showPassword ? (
                <IoMdEyeOff />
              ) : (
                <IoEyeOutline />
              )}
            </span>
          </div>

          {/* Forgot */}
          <div className="reset-link">
            <Link to="/reset-password">
              Forgot Password?
            </Link>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

