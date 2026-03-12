import React, { useEffect } from "react";
import "./FinancialAnalytics.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFinancialCashflow,
  fetchFinancialProgramBreakup,
  fetchFinancialSummary,
  selectCashflow,
  selectFinancialSummary,
  selectProgramBreakup,
} from "../redux/feeSlice";

const formatCurrency = (value = 0) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function FinancialAnalytics() {
  const dispatch = useDispatch();
  const summary = useSelector(selectFinancialSummary);
  const breakup = useSelector(selectProgramBreakup);
  const cashflow = useSelector(selectCashflow);

  useEffect(() => {
    dispatch(fetchFinancialSummary());
    dispatch(fetchFinancialProgramBreakup());
    dispatch(fetchFinancialCashflow());
  }, [dispatch]);

  return (
    <div className="financial-analytics-page">
      <div className="page-header">
        <h1>Financial Analytics</h1>
        <p>Comprehensive financial reporting and analytics dashboard</p>
      </div>

      <section className="fa-summary-grid">
        <article className="fa-summary-card">
          <span>Total Demand</span>
          <strong>{formatCurrency(summary?.totalAmount)}</strong>
        </article>
        <article className="fa-summary-card">
          <span>Collected</span>
          <strong>{formatCurrency(summary?.paidAmount)}</strong>
        </article>
        <article className="fa-summary-card">
          <span>Outstanding</span>
          <strong>{formatCurrency(summary?.dueAmount)}</strong>
        </article>
      </section>

      <section className="fa-breakup">
        <h2>Program Breakup</h2>
        <div className="fa-breakup-list">
          {breakup.map((row) => (
            <div className="fa-breakup-row" key={row.programId || row.programName}>
              <div>
                <strong>{row.programName || "Unknown Program"}</strong>
                <span>{row.studentCount} students</span>
              </div>
              <div>
                <span>Total: {formatCurrency(row.totalAmount)}</span>
                <span>Paid: {formatCurrency(row.paidAmount)}</span>
                <span>Due: {formatCurrency(row.dueAmount)}</span>
              </div>
            </div>
          ))}
          {breakup.length === 0 && <p>No program breakup data available.</p>}
        </div>
      </section>

      <section className="fa-cashflow">
        <h2>Cashflow (Last 6 months)</h2>
        <div className="fa-cashflow-list">
          {cashflow.map((row) => (
            <div className="fa-cashflow-row" key={row._id}>
              <span>{row._id}</span>
              <strong>{formatCurrency(row.total)}</strong>
              <small>{row.count} payments</small>
            </div>
          ))}
          {cashflow.length === 0 && <p>No cashflow data available.</p>}
        </div>
      </section>
    </div>
  );
}

export default FinancialAnalytics;
