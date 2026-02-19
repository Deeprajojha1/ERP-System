import React, { useMemo, useState } from "react";
import {
  FiPlus,
  FiEdit2,
  FiCopy,
  FiTrash2,
  FiCheckCircle,
} from "react-icons/fi";
import "./Fees.css";

const ACADEMIC_YEAR_OPTIONS = ["2024-2025", "2023-2024", "2022-2023"];
const PROGRAM_OPTIONS = ["All Programs", "B.Tech", "MBA", "BCA", "M.Tech", "MCA"];

const COMPONENT_FIELDS = [
  { key: "tuitionFee", label: "Tuition Fee" },
  { key: "labFee", label: "Lab Fee" },
  { key: "libraryFee", label: "Library Fee" },
  { key: "hostelFee", label: "Hostel Fee" },
  { key: "transportFee", label: "Transport Fee" },
  { key: "examFee", label: "Examination Fee" },
  { key: "developmentFee", label: "Development Fee" },
  { key: "sportsFee", label: "Sports Fee" },
  { key: "miscFee", label: "Miscellaneous" },
];

const BASE_STRUCTURES = [
  {
    id: "btech-cs-sem1",
    title: "B.Tech - Computer Science",
    program: "B.Tech",
    department: "Computer Science",
    semester: "Semester 1",
    academicYear: "2024-2025",
    status: "active",
    components: {
      tuitionFee: 75000,
      labFee: 15000,
      libraryFee: 5000,
      hostelFee: 0,
      transportFee: 0,
      examFee: 3000,
      developmentFee: 10000,
      sportsFee: 2000,
      miscFee: 15000,
    },
  },
  {
    id: "btech-cs-sem2",
    title: "B.Tech - Computer Science",
    program: "B.Tech",
    department: "Computer Science",
    semester: "Semester 2",
    academicYear: "2024-2025",
    status: "active",
    components: {
      tuitionFee: 65000,
      labFee: 12000,
      libraryFee: 5000,
      hostelFee: 0,
      transportFee: 0,
      examFee: 3000,
      developmentFee: 10000,
      sportsFee: 2000,
      miscFee: 15000,
    },
  },
  {
    id: "mba-sem1",
    title: "MBA - Management",
    program: "MBA",
    department: "Management",
    semester: "Semester 1",
    academicYear: "2024-2025",
    status: "active",
    components: {
      tuitionFee: 125000,
      labFee: 10000,
      libraryFee: 8000,
      hostelFee: 0,
      transportFee: 0,
      examFee: 5000,
      developmentFee: 20000,
      sportsFee: 4000,
      miscFee: 13000,
    },
  },
  {
    id: "btech-electronics",
    title: "B.Tech - Electronics",
    program: "B.Tech",
    department: "Electronics",
    semester: "Semester 1",
    academicYear: "2024-2025",
    status: "active",
    components: {
      tuitionFee: 70000,
      labFee: 12000,
      libraryFee: 5000,
      hostelFee: 0,
      transportFee: 0,
      examFee: 3000,
      developmentFee: 9000,
      sportsFee: 2000,
      miscFee: 9000,
    },
  },
];

const defaultFormValues = {
  program: "B.Tech",
  department: "Computer Science",
  semester: "Semester 1",
  academicYear: ACADEMIC_YEAR_OPTIONS[0],
  components: COMPONENT_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {}),
};

const formatCurrency = (value = 0) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const FeesAcademic = () => {
  const [selectedYear, setSelectedYear] = useState(ACADEMIC_YEAR_OPTIONS[0]);
  const [selectedProgram, setSelectedProgram] = useState(PROGRAM_OPTIONS[0]);
  const [structures] = useState(BASE_STRUCTURES);
  const [modalMode, setModalMode] = useState(null);
  const [formValues, setFormValues] = useState(defaultFormValues);

  const handleDuplicate = (structure) => {
    console.log("Duplicate structure", structure.id);
  };

  const handleDelete = (structure) => {
    console.log("Delete structure", structure.id);
  };

  const filteredStructures = useMemo(() => {
    return structures.filter((structure) => {
      const matchesYear = structure.academicYear === selectedYear;
      const matchesProgram =
        selectedProgram === "All Programs" || structure.program === selectedProgram;
      return matchesYear && matchesProgram;
    });
  }, [structures, selectedYear, selectedProgram]);

  const activeCount = filteredStructures.filter(
    (structure) => structure.status === "active"
  ).length;

  const currentFormTotal = useMemo(() => {
    return Object.values(formValues.components || {}).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );
  }, [formValues]);

  const openCreateModal = () => {
    setFormValues({ ...defaultFormValues, academicYear: selectedYear });
    setModalMode("create");
  };

  const openEditModal = (structure) => {
    const mappedComponents = COMPONENT_FIELDS.reduce((acc, field) => {
      acc[field.key] = structure.components[field.key] || 0;
      return acc;
    }, {});
    setFormValues({
      program: structure.program,
      department: structure.department,
      semester: structure.semester,
      academicYear: structure.academicYear,
      components: mappedComponents,
    });
    setModalMode("edit");
  };

  const closeModal = () => setModalMode(null);

  const handleComponentChange = (key, value) => {
    setFormValues((prev) => ({
      ...prev,
      components: {
        ...prev.components,
        [key]: Number(value) || 0,
      },
    }));
  };

  return (
    <div className="fees-page">
      <header className="fee-structure-header">
        <div>
          <h1>Fee Structure Management</h1>
          <p>Configure program and semester-based fee structures.</p>
        </div>
        <button type="button" className="fee-structure-add-btn" onClick={openCreateModal}>
          <FiPlus /> Add Fee Structure
        </button>
      </header>

      <section className="fee-structure-toolbar">
        <div className="fee-structure-select-group">
          <label>
            <span>Academic Year</span>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {ACADEMIC_YEAR_OPTIONS.map((yearOption) => (
                <option key={yearOption}>{yearOption}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Program</span>
            <select
              value={selectedProgram}
              onChange={(event) => setSelectedProgram(event.target.value)}
            >
              {PROGRAM_OPTIONS.map((programOption) => (
                <option key={programOption}>{programOption}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="fee-structure-stats">
          <span className="fee-structure-chip">{filteredStructures.length} Structures</span>
          <span className="fee-structure-chip fee-structure-chip--success">
            {activeCount} Active
          </span>
        </div>
      </section>

      <section className="fee-structure-grid">
        {filteredStructures.map((structure) => {
          const total = Object.values(structure.components).reduce(
            (sum, value) => sum + Number(value || 0),
            0
          );
          return (
            <article className="fee-structure-card" key={structure.id}>
              <div className="fee-structure-card-head">
                <div>
                  <p className="fee-structure-title">{structure.title}</p>
                  <span className="fee-structure-meta">
                    {structure.semester} • {structure.academicYear}
                  </span>
                </div>
                <span className="fee-structure-status">
                  <FiCheckCircle /> Active
                </span>
              </div>
              <div className="fee-structure-total">
                <span>Total Fee</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <div className="fee-structure-list">
                {COMPONENT_FIELDS.map((field) => (
                  <div className="fee-structure-list-row" key={field.key}>
                    <span>{field.label}</span>
                    <span>{formatCurrency(structure.components[field.key] || 0)}</span>
                  </div>
                ))}
              </div>
              <div className="fee-structure-actions">
                <button type="button" onClick={() => openEditModal(structure)}>
                  <FiEdit2 />
                </button>
                <button type="button" onClick={() => handleDuplicate(structure)}>
                  <FiCopy />
                </button>
                <button type="button" onClick={() => handleDelete(structure)}>
                  <FiTrash2 />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {modalMode && (
        <div className="fee-structure-modal-overlay" onClick={closeModal}>
          <div
            className="fee-structure-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fee-structure-modal-head">
              <h2>{modalMode === "edit" ? "Edit Fee Structure" : "Add Fee Structure"}</h2>
              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="fee-modal-section">
              <p className="fee-modal-label">Basic Information</p>
              <div className="fee-modal-grid">
                <label>
                  Program *
                  <select
                    value={formValues.program}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, program: event.target.value }))
                    }
                  >
                    {PROGRAM_OPTIONS.filter((option) => option !== "All Programs").map(
                      (option) => (
                        <option key={option}>{option}</option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  Department *
                  <input
                    value={formValues.department}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, department: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Semester *
                  <select
                    value={formValues.semester}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, semester: event.target.value }))
                    }
                  >
                    {["Semester 1", "Semester 2", "Semester 3", "Semester 4"].map(
                      (sem) => (
                        <option key={sem}>{sem}</option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  Academic Year *
                  <select
                    value={formValues.academicYear}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        academicYear: event.target.value,
                      }))
                    }
                  >
                    {ACADEMIC_YEAR_OPTIONS.map((yearOption) => (
                      <option key={yearOption}>{yearOption}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="fee-modal-section">
              <p className="fee-modal-label">Fee Components</p>
              <div className="fee-modal-grid">
                {COMPONENT_FIELDS.map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <input
                      type="number"
                      min="0"
                      value={formValues.components[field.key] ?? 0}
                      onChange={(event) =>
                        handleComponentChange(field.key, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="fee-modal-total">
              <span>Total Fee Amount</span>
              <strong>{formatCurrency(currentFormTotal)}</strong>
            </div>

            <div className="fee-modal-actions">
              <button type="button" className="fee-modal-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="fee-modal-primary">
                {modalMode === "edit" ? "Update Structure" : "Create Structure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesAcademic;
