import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Oval } from "react-loader-spinner";
import { FiPrinter } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import "./Subjectattendance.css";

const STATIC_DEPARTMENTS = [
  { _id: "dep-cse", code: "CS", name: "Computer Science (CSE)" },
  { _id: "dep-ece", code: "EC", name: "Electronics (ECE)" },
  { _id: "dep-me", code: "ME", name: "Mechanical (ME)" },
  { _id: "dep-ce", code: "CE", name: "Civil (CE)" },
  { _id: "dep-bba", code: "BA", name: "Business Admin (BBA)" },
];

const STATIC_BATCHES = [
  "2020-24",
  "2021-25",
  "2022-26",
  "2023-27",
  "2024-28",
  "2025-29",
];

const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, i) => i + 1);
const GROUP_LETTERS = ["A", "B", "C"];

const DEPT_SUBJECT_CATALOG = {
  CS: ["Data Structures", "DBMS", "Operating Systems", "Computer Networks", "Web Tech"],
  EC: ["Digital Electronics", "Signals", "Communication", "Control Systems", "VLSI Basics"],
  ME: ["Thermodynamics", "Fluid Mechanics", "SOM", "Machine Design", "Heat Transfer"],
  CE: ["Surveying", "RCC Design", "Soil Mechanics", "Transportation", "Hydraulics"],
  BA: ["Marketing", "Finance", "HRM", "Business Law", "Operations"],
};

const FIRST_NAMES = [
  "Aarav", "Vihaan", "Aditya", "Krishna", "Arjun", "Rohan", "Kabir", "Ishaan", "Neha", "Diya",
  "Ananya", "Pooja", "Sneha", "Ritika", "Kavya", "Mansi", "Tanya", "Sakshi", "Naina", "Meera",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Singh", "Gupta", "Joshi", "Yadav", "Mishra", "Mehta", "Jain", "Nair",
];

const hashString = (input) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seedInput) => {
  let seed = hashString(seedInput) || 1;
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const formatDepartmentShort = (name = "") => {
  if (name.includes("CSE")) return "CSE";
  if (name.includes("ECE")) return "ECE";
  if (name.includes("Mechanical")) return "ME";
  if (name.includes("Civil")) return "CE";
  if (name.includes("BBA")) return "BBA";
  return "DEP";
};

const buildSubjectsForCombo = (departmentCode, semester) => {
  const names = DEPT_SUBJECT_CATALOG[departmentCode] || DEPT_SUBJECT_CATALOG.CS;
  return names.map((subjectName, idx) => {
    const codeNum = semester * 100 + (idx + 1);
    return {
      courseId: `${departmentCode}${codeNum}`,
      courseCode: `${departmentCode}${codeNum}`,
      courseName: subjectName,
    };
  });
};

const buildGroupOptions = (departmentId, selectedBatch, selectedSemester) => {
  if (!departmentId) return [];
  const dept = STATIC_DEPARTMENTS.find((d) => d._id === departmentId);
  if (!dept) return [];

  const semesters = selectedSemester
    ? [Number(selectedSemester)]
    : SEMESTER_OPTIONS;
  const effectiveBatch = selectedBatch || STATIC_BATCHES[0];

  const groups = [];
  semesters.forEach((sem) => {
    GROUP_LETTERS.forEach((letter) => {
      const groupCode = `${formatDepartmentShort(dept.name)}-S${sem}${letter}`;
      const id = `${departmentId}-${effectiveBatch}-sem${sem}-grp${letter}`;
      groups.push({
        _id: id,
        name: groupCode,
        departmentId,
        batch: effectiveBatch,
        semester: sem,
        letter,
      });
    });
  });
  return groups;
};

const getClassCountByDate = (fromDate, toDate, rng) => {
  if (!fromDate || !toDate) return 32 + Math.floor(rng() * 12);
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return null;
  }
  const days = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(8, Math.min(90, Math.floor(days * 0.8)));
};

const buildStudentsForCombination = ({ dept, batch, semester, groupName, subjects, fromDate, toDate }) => {
  const comboSeed = `${dept._id}-${batch}-${semester}-${groupName}`;
  const rng = createRng(comboSeed);
  const classBase = getClassCountByDate(fromDate, toDate, rng);
  if (!classBase) return null;

  return Array.from({ length: 50 }, (_, idx) => {
    const studentRng = createRng(`${comboSeed}-student-${idx + 1}`);
    const firstName = FIRST_NAMES[Math.floor(studentRng() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(studentRng() * LAST_NAMES.length)];
    const roll = `${dept.code}${batch.slice(2, 4)}${String(semester)}${String(idx + 1).padStart(3, "0")}`;
    const fatherName = `${FIRST_NAMES[Math.floor(studentRng() * FIRST_NAMES.length)]} ${lastName}`;
    const phone = `9${String(100000000 + Math.floor(studentRng() * 899999999)).slice(0, 9)}`;

    const subjectAttendance = subjects.map((subject, subIdx) => {
      const subRng = createRng(`${comboSeed}-${idx + 1}-${subIdx + 1}`);
      const total = Math.max(1, classBase - 2 + Math.floor(subRng() * 5));
      const ratio = 0.52 + subRng() * 0.43;
      const present = Math.min(total, Math.max(0, Math.round(total * ratio)));
      return {
        courseId: subject.courseId,
        present,
        total,
      };
    });

    const totalPresent = subjectAttendance.reduce((sum, item) => sum + item.present, 0);
    const totalClasses = subjectAttendance.reduce((sum, item) => sum + item.total, 0);

    return {
      _id: `${comboSeed}-stu-${idx + 1}`,
      name: `${firstName} ${lastName}`,
      fatherName: `Mr. ${fatherName}`,
      enrollmentNo: roll,
      phone,
      subjectAttendance,
      totalPresent,
      totalClasses,
    };
  });
};

const SubjectAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [attendanceData, setAttendanceData] = useState(null);

  const groups = useMemo(
    () => buildGroupOptions(selectedDepartment, selectedBatch, selectedSemester),
    [selectedDepartment, selectedBatch, selectedSemester]
  );

  useEffect(() => {
    if (selectedGroup && !groups.some((g) => g._id === selectedGroup)) {
      setSelectedGroup("");
      setAttendanceData(null);
    }
  }, [selectedGroup, groups]);

  const fetchAttendanceReport = async () => {
    if (!selectedDepartment || !selectedBatch || !selectedSemester || !selectedGroup) {
      toast.error("Please select Batch, Department, Semester and Group");
      return;
    }

    try {
      setLoading(true);
      const dept = STATIC_DEPARTMENTS.find((d) => d._id === selectedDepartment);
      const groupMeta = groups.find((g) => g._id === selectedGroup);
      if (!dept || !groupMeta) {
        toast.error("Invalid selection");
        setAttendanceData(null);
        return;
      }

      if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        toast.error("From date cannot be after To date");
        setAttendanceData(null);
        return;
      }

      const subjects = buildSubjectsForCombo(dept.code, Number(selectedSemester));
      const students = buildStudentsForCombination({
        dept,
        batch: selectedBatch,
        semester: Number(selectedSemester),
        groupName: groupMeta.name,
        subjects,
        fromDate,
        toDate,
      });

      if (!students) {
        toast.error("Invalid date range");
        setAttendanceData(null);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      setAttendanceData({
        success: true,
        subjects,
        students,
      });
    } catch (error) {
      console.error("Build static attendance report failed:", error);
      toast.error("Failed to load attendance report");
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedDeptName = useMemo(() => {
    const dept = STATIC_DEPARTMENTS.find((d) => d._id === selectedDepartment);
    return dept?.name || "";
  }, [selectedDepartment]);

  const selectedGroupName = useMemo(() => {
    const group = groups.find((g) => g._id === selectedGroup);
    return group?.name || "";
  }, [groups, selectedGroup]);

  const calculateAttendancePercentage = (present, total) => {
    if (total === 0) return "0%";
    return `${Math.round((present / total) * 100)}%`;
  };

  const formatAttendance = (present, total) => `${present || 0} / ${total || 0}`;

  return (
    <div className="subject-attendance-page">
      <div className="subject-attendance-header no-print">
        <div>
          <h1 className="subject-attendance-title">Subject-wise Attendance Report</h1>
          <p className="subject-attendance-subtitle">
            View detailed attendance records by subject and group
          </p>
        </div>
      </div>

      <div className="subject-attendance-panel">
        <div className="subject-attendance-filters no-print">
          <div className="filter-row">
            <div className="subject-attendance-filter-group">
              <label htmlFor="batch-select">Batch</label>
              <select
                id="batch-select"
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setSelectedGroup("");
                  setAttendanceData(null);
                }}
              >
                <option value="">Select Batch</option>
                {STATIC_BATCHES.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="department-select">Department</label>
              <select
                id="department-select"
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedGroup("");
                  setAttendanceData(null);
                }}
              >
                <option value="">Select Department</option>
                {STATIC_DEPARTMENTS.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="semester-select">Semester</label>
              <select
                id="semester-select"
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setSelectedGroup("");
                  setAttendanceData(null);
                }}
                disabled={!selectedDepartment}
              >
                <option value="">Select Semester</option>
                {SEMESTER_OPTIONS.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="group-select">Group</label>
              <select
                id="group-select"
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setAttendanceData(null);
                }}
                disabled={!selectedDepartment || !selectedBatch || !selectedSemester}
              >
                <option value="">Select Group</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="subject-attendance-filter-group">
              <label htmlFor="from-date">From</label>
              <input
                type="date"
                id="from-date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="to-date">To</label>
              <input
                type="date"
                id="to-date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <button
              className="subject-attendance-show-btn"
              onClick={fetchAttendanceReport}
              disabled={!selectedGroup}
            >
              Show Attendance
            </button>

            <button
              className="subject-attendance-print-btn"
              onClick={handlePrint}
              disabled={!attendanceData}
            >
              <FiPrinter />
              Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="subject-attendance-loading">
            <Oval
              height={64}
              width={64}
              color="#2563eb"
              secondaryColor="#bfdbfe"
              strokeWidth={4}
              strokeWidthSecondary={4}
              ariaLabel="Loading"
              visible
            />
            <p>Loading attendance report...</p>
          </div>
        ) : !attendanceData ? (
          <div className="subject-attendance-empty">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select Filters to View Report</h3>
            <p>Choose batch, department, semester and group to generate attendance report</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h2>HARIDWAR UNIVERSITY</h2>
              <h3>
                Batch: {selectedBatch || "N/A"} | Semester: {selectedSemester || "N/A"}
              </h3>
              <h4>
                Department: {selectedDeptName || "N/A"} | Group: {selectedGroupName || "N/A"}
              </h4>
              <p>
                Date Range: {fromDate || "N/A"} to {toDate || "N/A"}
              </p>
              <h3>Subject-wise Attendance Report</h3>
            </div>

            <div className="subject-attendance-table-wrapper">
              <table className="subject-attendance-table">
                <thead>
                  <tr>
                    <th rowSpan="2" className="sr-no-col">SR NO.</th>
                    <th rowSpan="2" className="student-col">STUDENT DETAILS</th>
                    {attendanceData.subjects?.map((subject, idx) => (
                      <th key={idx} className="subject-col">
                        <div className="subject-code">{subject.courseCode}</div>
                        <div className="subject-name">{subject.courseName}</div>
                      </th>
                    ))}
                    <th rowSpan="2" className="total-col">TOTAL PRESENT</th>
                    <th rowSpan="2" className="total-col">TOTAL CLASSES</th>
                    <th rowSpan="2" className="percentage-col">PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.students?.map((student, index) => (
                    <tr key={student._id || index}>
                      <td className="sr-no-cell">{index + 1}</td>
                      <td className="student-details">
                        <div className="student-name">{student.name}</div>
                        <div className="student-info">Father: {student.fatherName}</div>
                        <div className="student-info">Enrollment: {student.enrollmentNo}</div>
                        <div className="student-info">Phone: {student.phone}</div>
                      </td>
                      {student.subjectAttendance?.map((subAtt, idx) => (
                        <td key={idx} className="attendance-cell">
                          {formatAttendance(subAtt.present, subAtt.total)}
                        </td>
                      ))}
                      <td className="total-present">{student.totalPresent || 0}</td>
                      <td className="total-classes">{student.totalClasses || 0}</td>
                      <td className="percentage">
                        {calculateAttendancePercentage(student.totalPresent, student.totalClasses)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubjectAttendance;
