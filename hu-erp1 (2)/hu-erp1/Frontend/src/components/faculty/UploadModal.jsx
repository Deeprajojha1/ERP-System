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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-navy-800 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">
            {uploadType === "material" ? "Upload Course Material" : uploadType === "assignment" ? "Create Assignment" : "Create Quiz"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-navy-700 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              name="title"
              required
              placeholder="Enter title"
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">File</label>
            <input
              name="file"
              type="file"
              required
              accept={acceptByType[uploadType] || "*"}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Accepted formats: {acceptByType[uploadType]}</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
            <textarea
              name="desc"
              rows="3"
              placeholder="Enter description"
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2">
            <Upload size={18} />
            Upload
          </button>
        </div>
      </form>
    </div>
  );
}
