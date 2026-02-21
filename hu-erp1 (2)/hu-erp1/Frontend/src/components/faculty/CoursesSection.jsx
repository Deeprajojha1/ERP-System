import { useState } from "react";
import { BookOpen, FileText, ClipboardList, HelpCircle } from "lucide-react";
import CourseModal from "./CourseModal";
import UploadModal from "./UploadModal";

export default function CoursesSection({ facultyData, showToast }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState("material");
  const [activeTab, setActiveTab] = useState("materials");

  // Extract courses from faculty routine
  const routine = facultyData?.facultyDetails?.routine || {};
  const courses = [];
  const courseMap = new Map();

  Object.values(routine).forEach((daySchedule) => {
    Object.values(daySchedule).forEach((slot) => {
      if (slot.course && !courseMap.has(slot.course._id)) {
        courseMap.set(slot.course._id, slot.course);
        courses.push(slot.course);
      }
    });
  });

  const handleOpenCourse = (course) => {
    setSelectedCourse(course);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCourse(null);
  };

  const handleOpenUpload = (type) => {
    setUploadType(type);
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = (title, file) => {
    // This would connect to backend API for file upload
    console.log("Upload:", { title, file, type: uploadType, course: selectedCourse });
    showToast(`${uploadType} uploaded successfully`, "success");
    setUploadModalOpen(false);
  };

  return (
    <section className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen size={28} className="text-purple-400" />
        <h2 className="text-2xl font-bold">My Courses</h2>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
          <p>No courses assigned</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <button
              key={course._id}
              onClick={() => handleOpenCourse(course)}
              className="text-left bg-navy-800 border border-navy-600 rounded-xl p-5 hover:translate-y-[-2px] hover:border-blue-500 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{course.courseName}</h3>
                  <p className="text-sm text-gray-400">{course.code}</p>
                </div>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>Semester {course.semester}</span>
                <span>•</span>
                <span>{course.credit} Credits</span>
              </div>
              <div className="mt-3 pt-3 border-t border-navy-600 text-sm text-gray-400">
                {course.department?.name || "Department"}
              </div>
            </button>
          ))}
        </div>
      )}

      <CourseModal
        open={modalOpen}
        course={selectedCourse}
        tab={activeTab}
        onTabChange={setActiveTab}
        onClose={handleCloseModal}
        onOpenUpload={handleOpenUpload}
        showToast={showToast}
      />

      <UploadModal
        open={uploadModalOpen}
        uploadType={uploadType}
        onClose={() => setUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
      />
    </section>
  );
}
