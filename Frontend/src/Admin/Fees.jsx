import React, { useEffect, useMemo } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchFeeBootstrap,
  fetchFeeReportExports,
  fetchFinancialSummary,
  selectFeeDemands,
  selectFeeReportExports,
  selectFeeLoading,
  selectFeePayments,
  selectFinancialSummary,
  selectFeePrograms,
} from "../redux/feeSlice";
import "./Fees.css";

const formatCurrency = (value = 0) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatSemesterLabel = (semesterNo, scope) => {
  const normalizedScope = String(scope || "").toUpperCase();
  const sem = Number(semesterNo);
  if (normalizedScope === "YEAR" || sem === 0) return "Full Year";
  if (Number.isFinite(sem) && sem > 0) return `Sem ${sem}`;
  return "-";
};

const Fees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const programs = useSelector(selectFeePrograms);
  const demands = useSelector(selectFeeDemands);
  const payments = useSelector(selectFeePayments);
  const reportExports = useSelector(selectFeeReportExports);
  const financialSummary = useSelector(selectFinancialSummary);
  const loading = useSelector(selectFeeLoading);

  useEffect(() => {
    dispatch(fetchFeeBootstrap());
    dispatch(fetchFeeReportExports());
    dispatch(fetchFinancialSummary());
  }, [dispatch]);

  const summary = useMemo(() => {
    const expected = demands.reduce((sum, demand) => sum + Number(demand.totalAmount || 0), 0);
    const collected = demands.reduce((sum, demand) => sum + Number(demand.paidAmount || 0), 0);
    const outstanding = demands.reduce((sum, demand) => sum + Number(demand.dueAmount || 0), 0);
    const paidCount = demands.filter((demand) => demand.status === "PAID").length;
    const pendingCount = demands.filter((demand) => demand.status !== "PAID").length;
    return {
      expected,
      collected,
      outstanding,
      paidCount,
      pendingCount,
      collectionRate: expected ? (collected / expected) * 100 : 0,
    };
  }, [demands]);

  const recentPayments = useMemo(
    () => (payments || []).slice(0, 8),
    [payments]
  );

  const analyticsSnapshot = useMemo(
    () => ({
      demand: Number(financialSummary?.totalAmount || 0),
      paid: Number(financialSummary?.paidAmount || 0),
      due: Number(financialSummary?.dueAmount || 0),
      exports: Array.isArray(reportExports) ? reportExports.length : 0,
    }),
    [financialSummary, reportExports]
  );

  return (
    <div className="fees-page">
      <section className="fee-dashboard-headline">
        <div className="fee-dashboard-copy">
          <h1 className="fee-dashboard-title">Fee Management Dashboard</h1>
          <p className="fee-dashboard-context">
            Live data from <code>/api/admin/fee/*</code> routes.
          </p>
        </div>
        <div className="fee-dashboard-actions">
          <button
            type="button"
            className="fee-export-btn"
            onClick={() => dispatch(fetchFeeBootstrap())}
            disabled={loading}
          >
            <FiRefreshCw />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </section>

      <section className="fee-card-grid">
        <article className="fee-card fee-card--primary">
          <p className="fee-card-label">Programs</p>
          <p className="fee-card-value">{programs.length}</p>
          <p className="fee-card-note">Configured fee programmes</p>
        </article>
        <article className="fee-card fee-card--success">
          <p className="fee-card-label">Expected Revenue</p>
          <p className="fee-card-value">{formatCurrency(summary.expected)}</p>
          <p className="fee-card-note">Total generated demands</p>
        </article>
        <article className="fee-card fee-card--success">
          <p className="fee-card-label">Collected</p>
          <p className="fee-card-value">{formatCurrency(summary.collected)}</p>
          <p className="fee-card-note">{summary.collectionRate.toFixed(2)}% collection rate</p>
        </article>
        <article className="fee-card fee-card--warning">
          <p className="fee-card-label">Outstanding</p>
          <p className="fee-card-value">{formatCurrency(summary.outstanding)}</p>
          <p className="fee-card-note">
            {summary.pendingCount} pending/partial demands
          </p>
        </article>
      </section>

      <section className="fee-table-section fees-feature-section">
        <div className="fee-table-head">
          <div>
            <h2 className="fee-table-title">Analytics & Reports</h2>
            <p className="fee-table-subtitle">
              Integrated fee intelligence modules with real-time API data.
            </p>
          </div>
        </div>

        <div className="fees-feature-grid">
          <article className="fees-feature-card">
            <div className="fees-feature-head">
              <h3>Reports Hub</h3>
              <span>{analyticsSnapshot.exports} exports</span>
            </div>
            <p>
              Generate, track, and download fee exports from the centralized reports pipeline.
            </p>
            <div className="fees-feature-metrics">
              <span>Latest module: /admin/fees/reports</span>
            </div>
            <button
              type="button"
              className="fee-export-btn"
              onClick={() => navigate("/admin/fees/reports")}
            >
              Open Reports Hub
            </button>
          </article>

          <article className="fees-feature-card fees-feature-card--analytics">
            <div className="fees-feature-head">
              <h3>Financial Analytics</h3>
              <span>Live</span>
            </div>
            <p>
              Program-wise demand, collection, and due trend insights from financial analytics APIs.
            </p>
            <div className="fees-feature-metrics">
              <strong>Demand: {formatCurrency(analyticsSnapshot.demand)}</strong>
              <strong>Collected: {formatCurrency(analyticsSnapshot.paid)}</strong>
              <strong>Outstanding: {formatCurrency(analyticsSnapshot.due)}</strong>
            </div>
            <button
              type="button"
              className="fee-export-btn"
              onClick={() => navigate("/admin/fees/financial")}
            >
              Open Financial Analytics
            </button>
          </article>
        </div>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <div>
            <h2 className="fee-table-title">Demand Status</h2>
            <p className="fee-table-subtitle">
              Paid: {summary.paidCount} | Pending: {summary.pendingCount}
            </p>
          </div>
        </div>
        <div className="fees-table-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Academic Year</th>
                <th>Semester</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {demands.slice(0, 12).map((demand) => (
                <tr key={demand._id}>
                  <td className="fees-name">{demand.studentId}</td>
                  <td>{demand.academicYear}</td>
                  <td>{formatSemesterLabel(demand.semesterNo, demand.scope)}</td>
                  <td>{formatCurrency(demand.totalAmount)}</td>
                  <td>{formatCurrency(demand.paidAmount)}</td>
                  <td>{formatCurrency(demand.dueAmount)}</td>
                  <td>{demand.status}</td>
                </tr>
              ))}
              {demands.length === 0 && (
                <tr>
                  <td colSpan={7}>No fee demands found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <div>
            <h2 className="fee-table-title">Recent Payments</h2>
          </div>
        </div>
        <div className="fees-table-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((payment) => (
                <tr key={payment._id}>
                  <td className="fees-name">{payment.studentId}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{payment.mode}</td>
                  <td>{payment.status}</td>
                  <td>{new Date(payment.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr>
                  <td colSpan={5}>No payments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Fees;
