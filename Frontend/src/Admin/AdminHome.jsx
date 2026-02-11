import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Oval } from "react-loader-spinner";
import "./AdminHome.css";
import emptyStateImg from "../assets/empty-state.svg";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const AdminHome = () => {
  const [loadState] = useState("success");

  const userData = useSelector((state) => state.user.userData);

  const shortenDeptName = (name = "") => {
    const map = {
      "Computer Science & Engineering": "CSE",
      "Electronics & Communication": "ECE",
      "Mechanical Engineering": "ME",
      "Civil Engineering": "CE",
      "Electrical Engineering": "EE",
      "Chemical Engineering": "ChemE",
      Biotechnology: "Biotech",
      "Master of Business Administration": "MBA",
      "Applied Sciences": "Applied Sci",
    };

    if (map[name]) return map[name];

    // Fallback: if still long, keep first 2 words or trim length
    if (name.length > 18) {
      const words = name.split(" ");
      if (words.length > 2) {
        return `${words[0]} ${words[1]}`;
      }
      return `${name.slice(0, 16)}…`;
    }

    return name;
  };

  const fallbackFacultyData = [
    { dept: "Humanities", count: 11 },
    { dept: "Agriculture", count: 13 },
    { dept: "Mechanical", count: 11 },
    { dept: "Electronics", count: 5 },
    { dept: "Civil Engg", count: 7 },
    { dept: "Comp Sci", count: 8 },
  ];

  const facultyData =
    userData?.departmentFacultyStats?.length
      ? userData.departmentFacultyStats.map((dept) => ({
          dept: shortenDeptName(dept.name),
          count: dept.facultyCount ?? 0,
        }))
      : fallbackFacultyData;

  const barColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#06b6d4",
    "#8b5cf6",
    "#ef4444",
  ];
  const facultyStatusData = [
    { name: "Active", value: userData?.totalActiveFaculty ?? 0 },
    { name: "On Leave", value: userData?.totalOnLeaveFaculty ?? 0 },
    { name: "Inactive", value: userData?.totalInactiveFaculty ?? 0 },
  ];
  const studentStatusData = [
    { name: "Active", value: userData?.totalActiveStudents ?? 0 },
    { name: "Inactive", value: userData?.totalInactiveStudents ?? 0 },
  ];
  const statusColors = ["#10b981", "#f59e0b", "#ef4444"];

  const renderState = () => {
    switch (loadState) {
      case "pending":
        return (
          <div className="admin-state">
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
            <p className="admin-state-text">Loading dashboard data...</p>
          </div>
        );
      case "failure":
        return (
          <div className="admin-state error">
            <img
              src={emptyStateImg}
              alt="Failed"
              className="admin-state-img"
            />
            <h3>Something went wrong</h3>
            <p>Please try again in a moment.</p>
          </div>
        );
      default:
        return (
          <>
            <div className="admin-cards">
              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <h1 className="admin-stat-title">Total Faculty</h1>
                  <img
                    className="admin-stat-icon"
                    src="https://imgs.search.brave.com/hjp5uApQ3dwVX652Lo3gN48bbH-jJ2UpEd9PQmd0Da8/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/ZW1vamlhbGwuY29t/L2ltYWdlcy82MC9z/a3lwZS8xZjQ2OC0y/MDBkLTFmM2ViLnBu/Zw"
                    alt="faculty-img"
                  />
                </div>
                <h1 className="admin-stat-value">{userData?.totalFaculty ?? 0}</h1>
                <p className="admin-stat-subtitle">Active Members</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <h1 className="admin-stat-title">Students Enrolled</h1>
                  <img
                    className="admin-stat-icon"
                    src="https://imgs.search.brave.com/19wMZDul-Q_cp7kGWzgtNxjNiXAoRWqmRcxNoT7AjHM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wNjAv/MDY1LzYxOC9zbWFs/bC9yYWRpYW50LWRy/ZWFteS12aW50YWdl/LXN0dWRlbnQtYmFj/a3BhY2staG9sZGlu/Zy10ZXh0Ym9va3Mt/bm8tYmFja2dyb3Vu/ZC13aXRoLXRyYW5z/cGFyZW50LWJhY2tn/cm91bmQtcHJvZmVz/c2lvbmFsLWZyZWUt/cG5nLnBuZw"
                    alt="enrolled student-img"
                  />
                </div>
                <h1 className="admin-stat-value">{userData?.totalStudentsEnrolled ?? 0}</h1>
                <p className="admin-stat-subtitle">This semester</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <h1 className="admin-stat-title">Departments</h1>
                  <img
                    className="admin-stat-icon"
                    src="https://imgs.search.brave.com/4xIWRRV1mYRY3hHa0xGjNhEKUEJdpmeM-9yTNrgyhM8/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9jZG4z/LmVtb2ppLmdnL3Vu/aWNvZGUvbWljcm9z/b2Z0L2RlcGFydG1l/bnQtc3RvcmUucG5n"
                    alt="braches-img"
                  />
                </div>
                <h1 className="admin-stat-value">{userData?.totalDepartments ?? 0}</h1>
                <p className="admin-stat-subtitle">Branches</p>
              </div>
            </div>

            <div className="admin-card">
              <h1 className="admin-card-title">Faculty Distribution</h1>
              <div className="admin-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={facultyData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 80 }}
                  >
                    <CartesianGrid vertical={false} stroke="none" />
                    <XAxis
                      dataKey="dept"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={90}
                      tickMargin={12}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {facultyData.map((entry, index) => (
                        <Cell
                          key={entry.dept}
                          fill={barColors[index % barColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-card">
              <h1 className="admin-card-title">Status Overview</h1>
              <div className="admin-chart-grid">
                <div className="admin-chart-card">
                  <h2 className="admin-chart-title">Faculty Status</h2>
                  <div className="admin-chart">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={facultyStatusData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {facultyStatusData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={statusColors[index % statusColors.length]}
                            />
                          ))}
                        </Pie>
                        <Legend verticalAlign="top" align="center" iconType="circle" />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="admin-chart-card">
                  <h2 className="admin-chart-title">Student Status</h2>
                  <div className="admin-chart">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={studentStatusData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {studentStatusData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={statusColors[index % statusColors.length]}
                            />
                          ))}
                        </Pie>
                        <Legend verticalAlign="top" align="center" iconType="circle" />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="admin-dashboard">
      {renderState()}
    </div>
  );
};

export default AdminHome;
