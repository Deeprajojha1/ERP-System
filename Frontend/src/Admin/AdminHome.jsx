import React from "react";
import "./AdminHome.css";
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
  const facultyData = [
    { dept: "Humanities", count: 11 },
    { dept: "Agriculture", count: 13 },
    { dept: "Mechanical", count: 11 },
    { dept: "Electronics", count: 5 },
    { dept: "Civil Engg", count: 7 },
    { dept: "Comp Sci", count: 8 },
  ];
  const barColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#06b6d4",
    "#8b5cf6",
    "#ef4444",
  ];
  const statusData = [
    { name: "Active", value: 60 },
    { name: "On Leave", value: 22 },
    { name: "Inactive", value: 18 },
  ];
  const statusColors = ["#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="admin-dashboard">
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
          <h1 className="admin-stat-value">55</h1>
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
          <h1 className="admin-stat-value">320</h1>
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
          <h1 className="admin-stat-value">6</h1>
          <p className="admin-stat-subtitle">Branches</p>
        </div>
      </div>

      <div className="admin-card">
        <h1 className="admin-card-title">Faculty Distribution</h1>
        <div className="admin-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={facultyData}
              margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
            >
              <CartesianGrid vertical={false} stroke="none" />
              <XAxis
                dataKey="dept"
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
                tickMargin={8}
                tick={{ fontSize: 12 }}
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
        <div className="admin-chart">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={110}
                paddingAngle={2}
              >
                {statusData.map((entry, index) => (
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
  );
};

export default AdminHome;
