import React from "react";
import { FiAlertCircle, FiTrendingUp } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import "./Fees.css";

const FeesHostel = () => {
  const summary = [
    {
      label: "Total Collections",
      value: "Rs 48.5L",
      note: "This semester",
      icon: <FaRupeeSign />,
    },
    {
      label: "Pending Fees",
      value: "Rs 12.3L",
      note: "Due",
      icon: <FiAlertCircle />,
    },
    {
      label: "Collection Rate",
      value: "79.7%",
      note: "Completed",
      icon: <FiTrendingUp />,
    },
  ];

  return (
    <div className="fees-page">
      <h1 className="fees-title">Hostel Fees</h1>

      <div className="fees-summary">
        {summary.map((card) => (
          <div className="fees-card" key={card.label}>
            <div className="fees-card-head">
              <p className="fees-card-label">{card.label}</p>
              <span className="fees-card-icon" aria-hidden="true">
                {card.icon}
              </span>
            </div>
            <h2 className="fees-card-value">{card.value}</h2>
            <span className="fees-card-note">{card.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeesHostel;
