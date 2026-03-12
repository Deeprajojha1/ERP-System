import React, { useCallback, useEffect, useMemo } from "react";
import "./FinancialAnalytics.css";
import { useDispatch, useSelector } from "react-redux";
import { FiBarChart2, FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import {
  fetchFinancialCashflow,
  fetchFinancialProgramBreakup,
  fetchFinancialSummary,
  selectCashflow,
  selectFeeError,
  selectFeeLoading,
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
  const loading = useSelector(selectFeeLoading);
  const error = useSelector(selectFeeError);

  const refreshAnalytics = useCallback(() => {
    dispatch(fetchFinancialSummary());
    dispatch(fetchFinancialProgramBreakup());
    dispatch(fetchFinancialCashflow());
  }, [dispatch]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  const metrics = useMemo(() => {
    const totalAmount = Number(summary?.totalAmount || 0);
    const paidAmount = Number(summary?.paidAmount || 0);
    const dueAmount = Number(summary?.dueAmount || 0);
    const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    return {
      totalAmount,
      paidAmount,
      dueAmount,
      collectionRate,
    };
  }, [summary]);

  const rankedBreakup = useMemo(
    () =>
      [...(breakup || [])].sort(
        (a, b) => Number(b?.totalAmount || 0) - Number(a?.totalAmount || 0)
      ),
    [breakup]
  );

  return (
    <div className="financial-analytics-page">
      <header className="fa-hero">
        <div>
          <p className="fa-eyebrow">Fees Intelligence</p>
          <h1>Financial Analytics</h1>
          <p>
            Comprehensive fee collection analytics from live
            <code> /admin/fee/analytics/financial/* </code>
            APIs.
          </p>
        </div>
        <button
          type="button"
          className="fa-export-btn"
          onClick={refreshAnalytics}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "fa-spin" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </header>

      {error ? <div className="fa-error">Failed to load analytics: {error}</div> : null}

      <section className="fa-metrics">
        <article className="fa-metric-card">
          <span className="fa-metric-icon">
            <FiBarChart2 />
          </span>
          <div>
            <p>Total Demand</p>
            <strong>{formatCurrency(metrics.totalAmount)}</strong>
            <small>All fee demands raised</small>
          </div>
        </article>
        <article className="fa-metric-card">
          <span className="fa-metric-icon">
            <FiTrendingUp />
          </span>
          <div>
            <p>Collected</p>
            <strong>{formatCurrency(metrics.paidAmount)}</strong>
            <small>{metrics.collectionRate.toFixed(2)}% collection rate</small>
          </div>
        </article>
        <article className="fa-metric-card">
          <span className="fa-metric-icon">
            <FiRefreshCw />
          </span>
          <div>
            <p>Outstanding</p>
            <strong>{formatCurrency(metrics.dueAmount)}</strong>
            <small>Pending recovery pipeline</small>
          </div>
        </article>
      </section>

      <section className="fa-panels">
        <article className="fa-panel">
          <div className="fa-panel-head">
            <h2>Program Breakup</h2>
            <span>{rankedBreakup.length} programs</span>
          </div>
          <div className="fa-progress-list">
            {rankedBreakup.map((row) => {
              const total = Number(row?.totalAmount || 0);
              const paid = Number(row?.paidAmount || 0);
              const rate = total > 0 ? (paid / total) * 100 : 0;
              return (
                <div className="fa-progress-row" key={row.programId || row.programName}>
                  <div className="fa-program-meta">
                    <p>{row.programName || "Unknown Program"}</p>
                    <small>{row.studentCount || 0} students</small>
                  </div>
                  <div className="fa-progress-track">
                    <span className="fa-progress-fill" style={{ width: `${rate}%` }} />
                  </div>
                  <div className="fa-program-values">
                    <strong>{formatCurrency(total)}</strong>
                    <small>Paid {formatCurrency(paid)}</small>
                  </div>
                </div>
              );
            })}
            {rankedBreakup.length === 0 && (
              <p className="fa-empty">No program breakup data available.</p>
            )}
          </div>
        </article>

        <article className="fa-panel fa-panel--highlight">
          <div className="fa-panel-head">
            <h2>Cashflow (Last 6 months)</h2>
            <span>{cashflow.length} points</span>
          </div>
          <div className="fa-cashflow">
            {cashflow.map((row) => (
              <div className="fa-cashflow-column" key={row._id}>
                <span>{row._id}</span>
                <strong>{formatCurrency(row.total)}</strong>
                <small>{row.count} payments</small>
              </div>
            ))}
            {cashflow.length === 0 && (
              <p className="fa-empty">No cashflow data available.</p>
            )}
          </div>
        </article>
      </section>

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
    </div>
  );
}

export default FinancialAnalytics;
