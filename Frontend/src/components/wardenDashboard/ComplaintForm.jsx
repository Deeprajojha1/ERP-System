import React, { useState } from 'react';
import { AlertCircle, Upload, X, CheckCircle } from 'lucide-react';
import { issueTypes } from './complaintMockData';

const ComplaintForm = ({ studentRoom, onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    room: studentRoom || '',
    issueType: '',
    description: '',
    image: null,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, image: 'Please upload a valid image file' }));
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setErrors((prev) => ({ ...prev, image: '' }));
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
    document.getElementById('image-upload').value = '';
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.issueType) {
      newErrors.issueType = 'Please select an issue type';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // TODO: API Integration
    // const formDataToSend = new FormData();
    // formDataToSend.append('room', formData.room);
    // formDataToSend.append('issueType', formData.issueType);
    // formDataToSend.append('description', formData.description);
    // if (formData.image) {
    //   formDataToSend.append('image', formData.image);
    // }
    //
    // try {
    //   const response = await fetch('/api/student/complaints', {
    //     method: 'POST',
    //     body: formDataToSend,
    //     headers: {
    //       Authorization: `Bearer ${localStorage.getItem('token')}`,
    //     },
    //   });
    //   const data = await response.json();
    //   if (response.ok) {
    //     // Success handling
    //   }
    // } catch (error) {
    //   console.error('Error submitting complaint:', error);
    // }

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      
      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess({
          ...formData,
          id: `CMP${Date.now()}`,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        });
      }

      // Reset form
      setFormData({
        room: studentRoom || '',
        issueType: '',
        description: '',
        image: null,
      });
      setImagePreview(null);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }, 1500);
  };

  // Handle form reset
  const handleReset = () => {
    setFormData({
      room: studentRoom || '',
      issueType: '',
      description: '',
      image: null,
    });
    setImagePreview(null);
    setErrors({});
    if (document.getElementById('image-upload')) {
      document.getElementById('image-upload').value = '';
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Success Notification */}
      {showSuccess && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-900">Complaint Submitted Successfully!</p>
            <p className="text-sm text-green-700">Your complaint has been registered and will be addressed soon.</p>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-gray-900">Raise a Complaint</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Room Number (Disabled) */}
        <div>
          <label htmlFor="room" className="mb-2 block text-sm font-medium text-gray-700">
            Room Number
          </label>
          <input
            type="text"
            id="room"
            name="room"
            value={formData.room}
            disabled
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-600 cursor-not-allowed"
          />
        </div>

        {/* Issue Type Dropdown */}
        <div>
          <label htmlFor="issueType" className="mb-2 block text-sm font-medium text-gray-700">
            Issue Type <span className="text-red-500">*</span>
          </label>
          <select
            id="issueType"
            name="issueType"
            value={formData.issueType}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              errors.issueType ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          >
            <option value="">Select issue type</option>
            {issueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.issueType && (
            <p className="mt-1 text-sm text-red-600">{errors.issueType}</p>
          )}
        </div>

        {/* Description Textarea */}
        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="5"
            maxLength="500"
            placeholder="Describe the issue in detail (10-500 characters)"
            className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${
              errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.description ? (
              <p className="text-sm text-red-600">{errors.description}</p>
            ) : (
              <p className="text-sm text-gray-500">Minimum 10 characters required</p>
            )}
            <p className="text-sm text-gray-500">
              {formData.description.length}/500
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="image-upload" className="mb-2 block text-sm font-medium text-gray-700">
            Upload Image <span className="text-gray-500">(Optional)</span>
          </label>
          
          {!imagePreview ? (
            <div className="flex items-center gap-3">
              <label
                htmlFor="image-upload"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </label>
              <span className="text-sm text-gray-500">Max size: 5MB</span>
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-32 w-32 rounded-lg border border-gray-300 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {errors.image && (
            <p className="mt-1 text-sm text-red-600">{errors.image}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              'Submit Complaint'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default ComplaintForm;
