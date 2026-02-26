import { X, FileText, ClipboardList, HelpCircle } from "lucide-react";

const tabs = [
  { id: "materials", label: "Materials", icon: FileText },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle },
];

export default function CourseModal({ open, course, tab, onTabChange, onClose, onOpenUpload }) {
  if (!open || !course) return null;

  // Mock data - in real implementation, this would come from backend
  const courseData = {
    materials: [],
    assignments: [],
    quizzes: [],
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="m-0 text-base font-semibold text-slate-900">{course.courseName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {course.code} - Semester {course.semester}
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Close modal">
            <X size={24} />
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-slate-200 px-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  tab === t.id
                    ? "border-cyan-600 text-cyan-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={18} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={() => onOpenUpload(tab.replace("s", ""))}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700"
          >
            {tab === "materials"
              ? "Upload Material"
              : tab === "assignments"
                ? "Create Assignment"
                : "Create Quiz"}
          </button>

          <div className="mt-3 flex flex-col gap-2">
            {courseData[tab]?.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="m-0 text-base font-semibold text-slate-700">No {tab} available yet</p>
                <p className="mt-1 text-sm text-slate-500">Click the button above to add {tab}</p>
              </div>
            ) : (
              courseData[tab]?.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.date && `${item.date} - `}
                        {item.size && item.size}
                        {item.deadline && `Due: ${item.deadline}`}
                        {item.questions && `${item.questions} questions`}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
