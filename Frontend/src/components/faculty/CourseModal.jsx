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
    <div className="faculty-modal-overlay" onClick={onClose}>
      <div className="faculty-modal faculty-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="faculty-modal-header">
          <div>
            <h3>{course.courseName}</h3>
            <p className="faculty-course-modal-meta">
              {course.code} - Semester {course.semester}
            </p>
          </div>
          <button type="button" onClick={onClose} className="faculty-modal-close" aria-label="Close modal">
            <X size={24} />
          </button>
        </div>

        <div className="faculty-course-tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`faculty-course-tab ${tab === t.id ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="faculty-modal-body">
          <button
            type="button"
            onClick={() => onOpenUpload(tab.replace("s", ""))}
            className="faculty-primary-btn"
          >
            {tab === "materials"
              ? "Upload Material"
              : tab === "assignments"
                ? "Create Assignment"
                : "Create Quiz"}
          </button>

          <div className="faculty-course-content-list">
            {courseData[tab]?.length === 0 ? (
              <div className="faculty-empty-state faculty-course-content-empty">
                <p>No {tab} available yet</p>
                <p className="faculty-empty-subtitle">Click the button above to add {tab}</p>
              </div>
            ) : (
              courseData[tab]?.map((item) => (
                <div key={item.id} className="faculty-course-content-item">
                  <div className="faculty-course-content-header">
                    <div>
                      <p className="faculty-course-content-title">{item.title}</p>
                      <p className="faculty-course-content-meta">
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

        <div className="faculty-modal-actions">
          <button type="button" className="faculty-secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
