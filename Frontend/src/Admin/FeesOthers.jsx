import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiAlertCircle, FiTrendingUp, FiRefreshCw } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import {
  fetchFeeDemands,
  selectFeeDemands,
  selectFeeLoading,
} from "../redux/feeSlice";
import "./Fees.css";

const formatCurrency = (value = 0) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatSemesterLabel = (semesterNo, scope) => {
  const normalizedScope = String(scope || "").toUpperCase();
  const sem = Number(semesterNo);
  if (normalizedScope === "YEAR" || sem === 0) return "Full Year";
  if (Number.isFinite(sem) && sem > 0) return `Sem ${sem}`;
  return "-";
};

const OTHER_HEADS = ["EXAM", "FINE"];

const FeesOthers = () => {
  const dispatch = useDispatch();
  const demands = useSelector(selectFeeDemands);
  const loading = useSelector(selectFeeLoading);

  useEffect(() => {
    dispatch(fetchFeeDemands());
  }, [dispatch]);

  const stats = useMemo(() => {
    let totalAmount = 0;
    let paidAmount = 0;
    const studentSet = new Set();
    demands.forEach((d) => {
      (d.breakdown || []).forEach((b) => {
        if (OTHER_HEADS.includes(b.head)) {
          totalAmount += Number(b.amount || 0);
          paidAmount += Number(b.paid || 0);
          studentSet.add(d.studentId);
        }
      });
    });
    const pending = totalAmount - paidAmount;
    const rate = totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : "0.0";
    return { totalAmount, paidAmount, pending, rate, studentCount: studentSet.size };
  }, [demands]);

  const otherDemands = useMemo(
    () => demands.filter((d) => (d.breakdown || []).some((b) => OTHER_HEADS.includes(b.head))),
    [demands]
  );

  return (
    <div className="fees-page">
      <div className="fee-dashboard-headline">
        <div className="fee-dashboard-copy">
          <h1 className="fee-dashboard-title">Other Fees (Exam & Fines)</h1>
          <p className="fee-dashboard-context">Real-time exam fee and fine data</p>
        </div>
        <button
          type="button"
          className="fee-export-btn"
          onClick={() => dispatch(fetchFeeDemands())}
          disabled={loading}
        >
          <FiRefreshCw />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      <div className="fees-summary">
        <div className="fees-card">
          <div className="fees-card-head">
            <p className="fees-card-label">Total Collections</p>
            <span className="fees-card-icon"><FaRupeeSign /></span>
          </div>
          <h2 className="fees-card-value">{formatCurrency(stats.paidAmount)}</h2>
          <span className="fees-card-note">{stats.studentCount} students</span>
        </div>
        <div className="fees-card">
          <div className="fees-card-head">
            <p className="fees-card-label">Pending Fees</p>
            <span className="fees-card-icon"><FiAlertCircle /></span>
          </div>
          <h2 className="fees-card-value">{formatCurrency(stats.pending)}</h2>
          <span className="fees-card-note">Out of {formatCurrency(stats.totalAmount)} total</span>
        </div>
        <div className="fees-card">
          <div className="fees-card-head">
            <p className="fees-card-label">Collection Rate</p>
            <span className="fees-card-icon"><FiTrendingUp /></span>
          </div>
          <h2 className="fees-card-value">{stats.rate}%</h2>
          <span className="fees-card-note">Exam & fine fee recovery</span>
        </div>
      </div>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Exam & Fine Fee Demands</h2>
        </div>
        <div className="fees-table-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Academic Year</th>
                <th>Semester</th>
                <th>Head</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {otherDemands.map((d) =>
                (d.breakdown || [])
                  .filter((b) => OTHER_HEADS.includes(b.head))
                  .map((b) => (
                    <tr key={`${d._id}-${b.head}`}>
                      <td className="fees-name">{d.studentId}</td>
                      <td>{d.academicYear}</td>
                      <td>{formatSemesterLabel(d.semesterNo, d.scope)}</td>
                      <td>{b.head}</td>
                      <td>{formatCurrency(b.amount)}</td>
                      <td>{formatCurrency(b.paid)}</td>
                      <td>{d.status}</td>
                    </tr>
                  ))
              )}
              {otherDemands.length === 0 && (
                <tr><td colSpan={7}>No exam or fine fee demands found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FeesOthers;
