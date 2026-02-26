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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="m-0 text-base font-semibold text-slate-900">
            {uploadType === "material"
              ? "Upload Course Material"
              : uploadType === "assignment"
                ? "Create Assignment"
                : "Create Quiz"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close upload modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Title</label>
            <input
              name="title"
              required
              placeholder="Enter title"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">File</label>
            <input
              name="file"
              type="file"
              required
              accept={acceptByType[uploadType] || "*"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-slate-700"
            />
            <p className="m-0 text-xs text-slate-500">Accepted formats: {acceptByType[uploadType]}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Description (Optional)</label>
            <textarea
              name="desc"
              rows="3"
              placeholder="Enter description"
              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700">
            <Upload size={18} />
            <span>Upload</span>
          </button>
        </div>
      </form>
    </div>
  );
}
