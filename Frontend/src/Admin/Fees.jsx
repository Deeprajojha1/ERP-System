import React, { useMemo, useState } from "react";
import { FiAlertCircle, FiDollarSign, FiTrendingUp } from "react-icons/fi";
import { FiCheckCircle, FiClock, FiMinusCircle } from "react-icons/fi";
import "./Fees.css";

const Fees = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const summary = [
    {
      label: "Total Collections",
      value: "Rs 48.5L",
      note: "This semester",
      icon: <FiDollarSign />,
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

  const rows = [
    {
      name: "Priya Joshi",
      roll: "AGRICULTURE0001",
      due: "Rs 57307",
      paid: "Rs 42693",
      status: "PENDING",
    },
    {
      name: "Aditya Rao",
      roll: "AGRICULTURE0002",
      due: "Rs 97168",
      paid: "Rs 2832",
      status: "PENDING",
    },
    {
      name: "Karan Joshi",
      roll: "AGRICULTURE0003",
      due: "Rs 61724",
      paid: "Rs 38276",
      status: "PENDING",
    },
    {
      name: "Rohan Kumar",
      roll: "CSE0004",
      due: "Rs 60935",
      paid: "Rs 39065",
      status: "PENDING",
    },
    {
      name: "Divya Sharma",
      roll: "ECE0005",
      due: "Rs 45000",
      paid: "Rs 45000",
      status: "PAID",
    },
    {
      name: "Ananya Rao",
      roll: "MECH0006",
      due: "Rs 78000",
      paid: "Rs 40000",
      status: "PARTIAL",
    },
  ];

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(term) ||
        r.roll.toLowerCase().includes(term);
      const matchStatus = status === "All" || r.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  return (
    <div className="fees-page">
      <h1 className="fees-title">Fee Management</h1>

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

      <div className="fees-toolbar">
        <div className="fees-search">
          <span className="fees-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by student name or roll no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="fees-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["All", "PAID", "PARTIAL", "PENDING"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="fees-table-wrap">
        <table className="fees-table">
          <thead>
            <tr>
              <th>STUDENT NAME</th>
              <th>ROLL NO</th>
              <th>AMOUNT DUE</th>
              <th>PAID</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.roll}-${i}`}>
                <td className="fees-name">{r.name}</td>
                <td>{r.roll}</td>
                <td>{r.due}</td>
                <td>{r.paid}</td>
                <td>
                  <span
                    className={`fees-status-badge ${
                      r.status === "PAID"
                        ? "paid"
                        : r.status === "PARTIAL"
                        ? "partial"
                        : "pending"
                    }`}
                  >
                    {r.status === "PAID" ? (
                      <FiCheckCircle />
                    ) : r.status === "PARTIAL" ? (
                      <FiMinusCircle />
                    ) : (
                      <FiClock />
                    )}
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="fees-empty">
                  No fee records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Fees;
