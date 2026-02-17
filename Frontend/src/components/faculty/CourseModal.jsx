import { X, FileText, ClipboardList, HelpCircle } from "lucide-react";

const tabs = [
  { id: "materials", label: "Materials", icon: FileText },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle },
];

export default function CourseModal({ open, course, tab, onTabChange, onClose, onOpenUpload, showToast }) {
  if (!open || !course) return null;

  // Mock data - in real implementation, this would come from backend
  const courseData = {
    materials: [],
    assignments: [],
    quizzes: [],
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-navy-800 rounded-2xl w-full max-w-4xl max-h-[90%] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-navy-600 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{course.courseName}</h3>
            <p className="text-sm text-gray-400">{course.code} • Semester {course.semester}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy-700 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-navy-600">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-colors ${
                  tab === t.id ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <button
            onClick={() => onOpenUpload(tab.replace("s", ""))}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg mb-4 transition-colors"
          >
            {tab === "materials" ? "Upload Material" : tab === "assignments" ? "Create Assignment" : "Create Quiz"}
          </button>

          <div className="space-y-2">
            {courseData[tab]?.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No {tab} available yet</p>
                <p className="text-sm mt-2">Click the button above to add {tab}</p>
              </div>
            ) : (
              courseData[tab]?.map((item) => (
                <div key={item.id} className="p-4 bg-navy-700/50 rounded-lg hover:bg-navy-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {item.date && `${item.date} • `}
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
      </div>
    </div>
  );
}
