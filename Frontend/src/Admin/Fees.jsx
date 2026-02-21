import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBook,
  FiHome,
  FiTruck,
  FiRefreshCw,
  FiMoreHorizontal,
} from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Fees.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";

const Fees = () => {
  const navigate = useNavigate();
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);

  const categories = [
    { label: "Academic", path: "/admin/fees/academic", icon: <FiBook /> },
    { label: "Hostel", path: "/admin/fees/hostel", icon: <FiHome /> },
    { label: "Transport", path: "/admin/fees/transport", icon: <FiTruck /> },
    { label: "Backpapers", path: "/admin/fees/backpapers", icon: <FiRefreshCw /> },
    { label: "Others", path: "/admin/fees/others", icon: <FiMoreHorizontal /> },
  ];

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="fees-state pending app-loader-state">
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
          <p>Loading fee modules...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="fees-state error">
          <img src={emptyStateImg} alt="Failed" className="fees-state-img" />
          <h3>Failed to load fee modules</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
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
      </>
    );
  };

  return (
    <div className="fees-page">
      {renderState()}
    </div>
  );
};

export default Fees;

