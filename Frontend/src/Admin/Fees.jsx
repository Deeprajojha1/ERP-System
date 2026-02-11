import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBook,
  FiHome,
  FiTruck,
  FiRefreshCw,
  FiMoreHorizontal,
} from "react-icons/fi";
import "./Fees.css";

const Fees = () => {
  const navigate = useNavigate();

  const categories = [
    { label: "Academic", path: "/admin/fees/academic", icon: <FiBook /> },
    { label: "Hostel", path: "/admin/fees/hostel", icon: <FiHome /> },
    { label: "Transport", path: "/admin/fees/transport", icon: <FiTruck /> },
    { label: "Backpapers", path: "/admin/fees/backpapers", icon: <FiRefreshCw /> },
    { label: "Others", path: "/admin/fees/others", icon: <FiMoreHorizontal /> },
  ];

  return (
    <div className="fees-page">
      <h1 className="fees-title">Fee Management</h1>

      <div className="fees-summary">
        {categories.map((cat) => (
          <div
            className="fees-card fees-card-link"
            key={cat.label}
            onClick={() => navigate(cat.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(cat.path)}
          >
            <span className="fees-card-icon" aria-hidden="true">
              {cat.icon}
            </span>
            <h2 className="fees-card-value">{cat.label}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Fees;
