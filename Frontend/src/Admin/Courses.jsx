import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import "./Courses.css";
import { Oval } from "react-loader-spinner";
import { FiSearch } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";

const Courses = () => {
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState("All Branches");
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState("pending");
  const [courses, setCourses] = useState([]);

  const apiBase = useSelector((state) => state.config.apiBase);

  const branches = [
    "All Branches",
    "CSE",
    "MECH",
    "ECE",
    "CIVIL",
    "AGR",
    "HUM",
  ];

  const getBranchCode = (departmentName = "") => {
    const map = {
      "Computer Science & Engineering": "CSE",
      "Electronics & Communication": "ECE",
      "Mechanical Engineering": "MECH",
      "Civil Engineering": "CIVIL",
      "Agriculture": "AGR",
      Humanities: "HUM",
    };
    return map[departmentName] || departmentName;
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadState("pending");
        const res = await axios.get(`${apiBase}/admin/course`, {
          withCredentials: true,
        });
        setCourses(res.data?.courses || []);
        setLoadState("success");
      } catch (error) {
        console.error("Failed to load courses", error.response?.data || error.message);
        setLoadState("failure");
      }
    };

    if (apiBase) {
      fetchCourses();
    }
  }, [apiBase]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return courses.filter((c) => {
      const deptName = c.department || "";
      const branchCode = getBranchCode(deptName).toLowerCase();

      const matchSearch =
        (c.courseName || "").toLowerCase().includes(term) ||
        (c.code || "").toLowerCase().includes(term) ||
        deptName.toLowerCase().includes(term);

      const matchBranch =
        activeBranch === "All Branches" ||
        branchCode === activeBranch.toLowerCase();
      return matchSearch && matchBranch;
    });
  }, [search, activeBranch, courses]);


  const renderState = () => {
    if (loadState == "pending") {
      return (
        <div className="courses-state pending">
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
          <p>Loading courses...</p>
        </div>
      );
    }
    if (loadState == "failure") {
      return (
        <div className="courses-state error">
          <img src={emptyStateImg} alt="Failed" className="courses-state-img" />
          <h3>Failed to load courses</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="courses-header">
          <h1 className="courses-title">Courses</h1>
          <button
            className="courses-add-btn"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            + Add Course
          </button>
        </div>

        <div className="courses-toolbar">
          <div className="courses-search">
            <span className="courses-search-icon">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search courses by name, department, or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="courses-select"
            value={activeBranch}
            onChange={(e) => setActiveBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="courses-table-wrap">
          <table className="courses-table">
            <thead>
              <tr>
                <th>COURSE CODE</th>
                <th>COURSE NAME</th>
                <th>DEPARTMENT</th>
                <th>STUDENTS</th>
                <th>INSTRUCTOR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.code}>
                  <td className="courses-code">{c.code}</td>
                  <td>{c.courseName}</td>
                  <td>{c.department}</td>
                  <td>{c.studentsInDepartment}</td>
                  <td>{c.coordinatorName || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="courses-empty">
                    No courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="courses-page">
      {renderState()}
{isOpen && (
        <div className="courses-modal">
          <div
            className="courses-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="courses-modal-card">
            <div className="courses-modal-head">
              <h2>Add New Course</h2>
              <p>Create a new course entry</p>
            </div>
            <form className="courses-form">
              <label>
                Course Code
                <input placeholder="e.g., CS101" />
              </label>
              <label>
                Course Name
                <input placeholder="e.g., Data Structures" />
              </label>
              <div className="courses-form-row">
                <label>
                  Department
                  <select>
                    {branches
                      .filter((b) => b !== "All Branches")
                      .map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Credits
                  <input placeholder="4" type="number" />
                </label>
              </div>
              <label>
                Instructor
                <select>
                  <option>Select an instructor</option>
                  <option>Faculty 1</option>
                  <option>Faculty 2</option>
                  <option>Faculty 3</option>
                </select>
              </label>
              <div className="courses-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="button" className="btn-primary">
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
