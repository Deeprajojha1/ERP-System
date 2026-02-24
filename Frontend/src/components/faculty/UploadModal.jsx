import { X, Upload } from "lucide-react";

const acceptByType = {
  material: ".pdf,.ppt,.pptx,.doc,.docx",
  assignment: ".pdf,.doc,.docx",
  quiz: ".pdf,.doc,.docx,.csv,.xlsx",
};

export default function UploadModal({ open, uploadType, onClose, onSubmit }) {
  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = e.currentTarget.title.value;
    const file = e.currentTarget.file?.files?.[0] || null;
    const desc = e.currentTarget.desc?.value || "";
    onSubmit(title, file, desc);
    e.currentTarget.reset();
  };

  return (
    <div className="faculty-modal-overlay" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="faculty-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="faculty-modal-header">
          <h3>
            {uploadType === "material"
              ? "Upload Course Material"
              : uploadType === "assignment"
                ? "Create Assignment"
                : "Create Quiz"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="faculty-modal-close"
            aria-label="Close upload modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="faculty-modal-body faculty-modal-form">
          <div className="faculty-form-group">
            <label>Title</label>
            <input
              name="title"
              required
              placeholder="Enter title"
              className="faculty-form-input"
            />
          </div>

          <div className="faculty-form-group">
            <label>File</label>
            <input
              name="file"
              type="file"
              required
              accept={acceptByType[uploadType] || "*"}
              className="faculty-form-input"
            />
            <p className="faculty-upload-hint">Accepted formats: {acceptByType[uploadType]}</p>
          </div>

          <div className="faculty-form-group">
            <label>Description (Optional)</label>
            <textarea
              name="desc"
              rows="3"
              placeholder="Enter description"
              className="faculty-form-textarea"
            />
          </div>
        </div>

        <div className="faculty-modal-actions">
          <button type="button" onClick={onClose} className="faculty-secondary-btn">
            Cancel
          </button>
          <button type="submit" className="faculty-primary-btn faculty-upload-submit-btn">
            <Upload size={18} />
            <span>Upload</span>
          </button>
        </div>
      </form>
    </div>
  );
}
