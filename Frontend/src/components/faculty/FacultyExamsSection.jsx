import React from "react";
import { FileText } from "lucide-react";

const FacultyExamsSection = () => {
  return (
    <section className="faculty-section faculty-coming-soon">
      <div className="faculty-coming-soon-card">
        <span className="faculty-coming-soon-icon">
          <FileText size={22} />
        </span>
        <h2>Exams Workspace</h2>
        <p>
          Exam workflow tools are being integrated. Use the Admit Cards section
          for live invigilation actions.
        </p>
      </div>
    </section>
  );
};

export default FacultyExamsSection;
