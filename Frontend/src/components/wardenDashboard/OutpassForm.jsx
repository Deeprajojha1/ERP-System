import { useState } from "react";
import { Calendar, MapPin, FileText, Phone, Send, RotateCcw, AlertCircle } from "lucide-react";

function OutpassForm({ onSubmit, hasActiveOutpass = false }) {
  const [formData, setFormData] = useState({
    fromDateTime: "",
    toDateTime: "",
    destination: "",
    reason: "",
    emergencyContact: "",
    parentContact: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nowLocal = (() => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  })();

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{4,10}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fromDateTime) {
      newErrors.fromDateTime = "From date & time is required";
    }

    if (!formData.toDateTime) {
      newErrors.toDateTime = "To date & time is required";
    }

    if (formData.fromDateTime && formData.toDateTime) {
      const fromDate = new Date(formData.fromDateTime);
      const toDate = new Date(formData.toDateTime);
      
      if (toDate <= fromDate) {
        newErrors.toDateTime = "To date must be after from date";
      }

      // Check if from date is in the past
      const now = new Date();
      if (fromDate < now) {
        newErrors.fromDateTime = "Cannot apply for past date/time";
      }
    }

    if (!formData.destination || formData.destination.trim().length < 3) {
      newErrors.destination = "Destination is required (min 3 characters)";
    }

    if (!formData.reason || formData.reason.trim().length < 10) {
      newErrors.reason = "Reason is required (min 10 characters)";
    }

    if (!formData.emergencyContact) {
      newErrors.emergencyContact = "Emergency contact is required";
    } else if (!validatePhone(formData.emergencyContact)) {
      newErrors.emergencyContact = "Invalid phone number";
    }

    if (formData.parentContact && !validatePhone(formData.parentContact)) {
      newErrors.parentContact = "Invalid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasActiveOutpass) {
      alert("You already have an active outpass. Please complete or cancel it first.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      onSubmit(formData);
      setIsSubmitting(false);
      handleReset();
      alert("Outpass request submitted successfully!");
    }, 1500);
  };

  const handleReset = () => {
    setFormData({
      fromDateTime: "",
      toDateTime: "",
      destination: "",
      reason: "",
      emergencyContact: "",
      parentContact: "",
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "fromDateTime") {
        const nextTo = prev.toDateTime && prev.toDateTime < value ? value : prev.toDateTime;
        return { ...prev, fromDateTime: value, toDateTime: nextTo };
      }
      return { ...prev, [name]: value };
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-gray-900">Apply for Outpass</h3>
      </div>

      {hasActiveOutpass && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden="true" />
          <p className="text-sm text-yellow-800">
            You have an active outpass. Complete it before applying for a new one.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* From Date & Time */}
        <div>
          <label htmlFor="fromDateTime" className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            From Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="fromDateTime"
            name="fromDateTime"
            value={formData.fromDateTime}
            onChange={handleChange}
            disabled={hasActiveOutpass}
            min={nowLocal}
            className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.fromDateTime
                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20"
            } disabled:cursor-not-allowed disabled:bg-gray-100`}
          />
          {errors.fromDateTime && (
            <p className="mt-1 text-xs text-red-600">{errors.fromDateTime}</p>
          )}
        </div>

        {/* To Date & Time */}
        <div>
          <label htmlFor="toDateTime" className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            To Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="toDateTime"
            name="toDateTime"
            value={formData.toDateTime}
            onChange={handleChange}
            disabled={hasActiveOutpass}
            min={formData.fromDateTime || nowLocal}
            className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.toDateTime
                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20"
            } disabled:cursor-not-allowed disabled:bg-gray-100`}
          />
          {errors.toDateTime && (
            <p className="mt-1 text-xs text-red-600">{errors.toDateTime}</p>
          )}
        </div>

        {/* Destination */}
        <div>
          <label htmlFor="destination" className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Destination <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="destination"
            name="destination"
            placeholder="e.g., Home, Mumbai"
            value={formData.destination}
            onChange={handleChange}
            disabled={hasActiveOutpass}
            className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.destination
                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20"
            } disabled:cursor-not-allowed disabled:bg-gray-100`}
          />
          {errors.destination && (
            <p className="mt-1 text-xs text-red-600">{errors.destination}</p>
          )}
        </div>

        {/* Emergency Contact */}
        <div>
          <label htmlFor="emergencyContact" className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Emergency Contact <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="emergencyContact"
            name="emergencyContact"
            placeholder="+91 9876543210"
            value={formData.emergencyContact}
            onChange={handleChange}
            disabled={hasActiveOutpass}
            className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.emergencyContact
                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20"
            } disabled:cursor-not-allowed disabled:bg-gray-100`}
          />
          {errors.emergencyContact && (
            <p className="mt-1 text-xs text-red-600">{errors.emergencyContact}</p>
          )}
        </div>

        {/* Parent Contact (Optional) */}
        <div className="md:col-span-2">
          <label htmlFor="parentContact" className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Parent Contact <span className="text-xs text-gray-500">(Optional)</span>
          </label>
          <input
            type="tel"
            id="parentContact"
            name="parentContact"
            placeholder="+91 9123456789"
            value={formData.parentContact}
            onChange={handleChange}
            disabled={hasActiveOutpass}
            className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.parentContact
                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20"
            } disabled:cursor-not-allowed disabled:bg-gray-100`}
          />
          {errors.parentContact && (
            <p className="mt-1 text-xs text-red-600">{errors.parentContact}</p>
          )}
        </div>

        {/* Reason */}
        <div className="md:col-span-2">
          <label htmlFor="reason" className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            placeholder="Please provide a detailed reason for the outpass..."
            value={formData.reason}
            onChange={handleChange}
            disabled={hasActiveOutpass}
            className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.reason
                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20"
            } disabled:cursor-not-allowed disabled:bg-gray-100`}
          />
          {errors.reason && (
            <p className="mt-1 text-xs text-red-600">{errors.reason}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {formData.reason.length} / 500 characters
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || hasActiveOutpass}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit Request
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting || hasActiveOutpass}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </button>
      </div>
    </form>
  );
}

export default OutpassForm;
