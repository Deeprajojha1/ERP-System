import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import "./AddJobModal.css";

const AddJobModal = ({ isOpen, onClose, onJobAdded, editingJob }) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    companyLogo: "",
    description: "",
    location: "",
    jobType: "full-time",
    workMode: "onsite",
    applicationUrl: "",
    salary: { min: "", max: "", currency: "INR" },
    skills: "",
    expirationDate: "",
    expirationTime: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingJob) {
      const expDate = new Date(editingJob.expirationDate || editingJob.expiresAt);
      const dateStr = expDate.toISOString().split('T')[0];
      const timeStr = expDate.toTimeString().slice(0, 5);
      
      setFormData({
        title: editingJob.title || "",
        company: editingJob.company || "",
        companyLogo: editingJob.companyLogo || "",
        description: editingJob.description || "",
        location: editingJob.location || "",
        jobType: editingJob.jobType || "full-time",
        workMode: editingJob.workMode || "onsite",
        applicationUrl: editingJob.applicationUrl || editingJob.externalUrl || "",
        salary: {
          min: editingJob.salary?.min || "",
          max: editingJob.salary?.max || "",
          currency: editingJob.salary?.currency || "INR",
        },
        skills: editingJob.skills?.join(", ") || "",
        expirationDate: dateStr,
        expirationTime: timeStr,
      });
    } else {
      resetForm();
    }
  }, [editingJob, isOpen]);

  const resetForm = () => {
    setFormData({
      title: "",
      company: "",
      companyLogo: "",
      description: "",
      location: "",
      jobType: "full-time",
      workMode: "onsite",
      applicationUrl: "",
      salary: { min: "", max: "", currency: "INR" },
      skills: "",
      expirationDate: "",
      expirationTime: "",
    });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSalaryChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      salary: { ...prev.salary, [field]: value },
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Job title is required";
    } else if (formData.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    if (!formData.company?.trim()) {
      newErrors.company = "Company name is required";
    }

    if (!formData.description?.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    if (!formData.location?.trim()) {
      newErrors.location = "Location is required";
    }

    if (!formData.applicationUrl?.trim()) {
      newErrors.applicationUrl = "Application URL is required";
    }

    if (!formData.expirationDate) {
      newErrors.expirationDate = "Expiration date is required";
    } else {
      const expDateTime = new Date(`${formData.expirationDate}T${formData.expirationTime || "23:59"}`);
      if (expDateTime <= new Date()) {
        newErrors.expirationDate = "Expiration date must be in the future";
      }
    }

    if (!formData.expirationTime) {
      newErrors.expirationTime = "Expiration time is required";
    }

    if (formData.salary.min && formData.salary.max) {
      if (Number(formData.salary.min) >= Number(formData.salary.max)) {
        newErrors.salary = "Minimum salary must be less than maximum";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const expirationDateTime = new Date(`${formData.expirationDate}T${formData.expirationTime}`);

      // Prepare data
      const jobData = {
        title: formData.title.trim(),
        company: formData.company.trim(),
        companyLogo: formData.companyLogo.trim() || undefined,
        description: formData.description.trim(),
        location: formData.location.trim(),
        jobType: formData.jobType,
        workMode: formData.workMode,
        applicationUrl: formData.applicationUrl.trim(),
        expirationDate: expirationDateTime.toISOString(),
        salary: {
          min: formData.salary.min ? Number(formData.salary.min) : undefined,
          max: formData.salary.max ? Number(formData.salary.max) : undefined,
          currency: formData.salary.currency,
        },
        skills: formData.skills
          ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };

      let response;
      if (editingJob && editingJob._id) {
        // Update existing job
        console.log("Updating job:", editingJob._id);
        console.log("API URL:", `${apiBase}/placement/manual-jobs/${editingJob._id}`);
        response = await axios.put(
          `${apiBase}/placement/manual-jobs/${editingJob._id}`,
          jobData,
          { withCredentials: true }
        );
        toast.success("Job updated successfully!");
      } else {
        // Create new job
        console.log("Creating new job");
        console.log("API Base:", apiBase);
        console.log("API URL:", `${apiBase}/placement/manual-jobs`);
        console.log("Job Data:", jobData);
        response = await axios.post(
          `${apiBase}/placement/manual-jobs`,
          jobData,
          { withCredentials: true }
        );
        toast.success("Job posted successfully!");
      }

      console.log("Response:", response.data);
      onJobAdded(response.data.job);
      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to save job:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      console.error("Error status:", error.response?.status);

      if (error.response?.status === 400) {
        const backendErrors = error.response.data.details || {};
        setErrors(backendErrors);
        toast.error(error.response.data.message || "Validation failed");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to manage jobs");
      } else if (error.response?.status === 401) {
        toast.error("Please login to continue");
      } else if (error.response?.status === 500) {
        toast.error(`Server error: ${error.response.data.message || "Internal server error"}`);
        console.error("Server error details:", error.response.data);
      } else {
        toast.error("Failed to save job. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-job-modal-overlay" onClick={onClose}>
      <div className="add-job-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="add-job-modal-header">
          <h2>{editingJob ? "Edit Campus Job" : "Add Campus Job Posting"}</h2>
          <button className="add-job-modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-job-modal-form">
          {/* Basic Information */}
          <div className="add-job-form-section">
            <h3>Basic Information</h3>
            
            <div className="add-job-form-group">
              <label>Job Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="e.g., Software Engineer"
                className={errors.title ? "error" : ""}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="add-job-form-group">
              <label>Company Name *</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="e.g., Google India"
                className={errors.company ? "error" : ""}
              />
              {errors.company && <span className="error-message">{errors.company}</span>}
            </div>

            <div className="add-job-form-group">
              <label>Company Logo URL (Optional)</label>
              <input
                type="text"
                value={formData.companyLogo}
                onChange={(e) => handleInputChange("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          {/* Job Details */}
          <div className="add-job-form-section">
            <h3>Job Details</h3>
            
            <div className="add-job-form-group">
              <label>Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="e.g., Bangalore, India"
                className={errors.location ? "error" : ""}
              />
              {errors.location && <span className="error-message">{errors.location}</span>}
            </div>

            <div className="add-job-form-row">
              <div className="add-job-form-group">
                <label>Job Type *</label>
                <select
                  value={formData.jobType}
                  onChange={(e) => handleInputChange("jobType", e.target.value)}
                >
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="internship">Internship</option>
                  <option value="contract">Contract</option>
                </select>
              </div>

              <div className="add-job-form-group">
                <label>Work Mode</label>
                <select
                  value={formData.workMode}
                  onChange={(e) => handleInputChange("workMode", e.target.value)}
                >
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="add-job-form-group">
              <label>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the job role, responsibilities, and requirements..."
                rows="5"
                className={errors.description ? "error" : ""}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>
          </div>

          {/* Application */}
          <div className="add-job-form-section">
            <h3>Application</h3>
            
            <div className="add-job-form-group">
              <label>Application URL *</label>
              <input
                type="text"
                value={formData.applicationUrl}
                onChange={(e) => handleInputChange("applicationUrl", e.target.value)}
                placeholder="https://careers.company.com/apply"
                className={errors.applicationUrl ? "error" : ""}
              />
              {errors.applicationUrl && <span className="error-message">{errors.applicationUrl}</span>}
            </div>
          </div>

          {/* Compensation */}
          <div className="add-job-form-section">
            <h3>Compensation (Optional)</h3>
            
            <div className="add-job-form-row">
              <div className="add-job-form-group">
                <label>Min Salary</label>
                <input
                  type="number"
                  value={formData.salary.min}
                  onChange={(e) => handleSalaryChange("min", e.target.value)}
                  placeholder="50000"
                />
              </div>

              <div className="add-job-form-group">
                <label>Max Salary</label>
                <input
                  type="number"
                  value={formData.salary.max}
                  onChange={(e) => handleSalaryChange("max", e.target.value)}
                  placeholder="100000"
                />
              </div>

              <div className="add-job-form-group">
                <label>Currency</label>
                <select
                  value={formData.salary.currency}
                  onChange={(e) => handleSalaryChange("currency", e.target.value)}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            {errors.salary && <span className="error-message">{errors.salary}</span>}
          </div>

          {/* Additional Details */}
          <div className="add-job-form-section">
            <h3>Additional Details</h3>
            
            <div className="add-job-form-group">
              <label>Skills Required (comma-separated)</label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => handleInputChange("skills", e.target.value)}
                placeholder="JavaScript, React, Node.js"
              />
            </div>
          </div>

          {/* Expiration */}
          <div className="add-job-form-section">
            <h3>Expiration *</h3>
            
            <div className="add-job-form-row">
              <div className="add-job-form-group">
                <label>Expiration Date *</label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => handleInputChange("expirationDate", e.target.value)}
                  className={errors.expirationDate ? "error" : ""}
                />
                {errors.expirationDate && <span className="error-message">{errors.expirationDate}</span>}
              </div>

              <div className="add-job-form-group">
                <label>Expiration Time *</label>
                <input
                  type="time"
                  value={formData.expirationTime}
                  onChange={(e) => handleInputChange("expirationTime", e.target.value)}
                  className={errors.expirationTime ? "error" : ""}
                />
                {errors.expirationTime && <span className="error-message">{errors.expirationTime}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="add-job-modal-actions">
            <button
              type="button"
              className="add-job-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="add-job-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : editingJob ? "Update Job" : "Publish Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddJobModal;
