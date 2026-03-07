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

const BACKPAPER_HEADS = ["BACK_EXAM"];

const FeesBackpapers = () => {
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
        if (BACKPAPER_HEADS.includes(b.head)) {
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

  const backpaperDemands = useMemo(
    () => demands.filter((d) => (d.breakdown || []).some((b) => BACKPAPER_HEADS.includes(b.head))),
    [demands]
  );

  return (
    <div className="fees-page">
      <div className="fee-dashboard-headline">
        <div className="fee-dashboard-copy">
          <h1 className="fee-dashboard-title">Backpapers Fees</h1>
          <p className="fee-dashboard-context">Real-time back exam fee data</p>
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
          <span className="fees-card-note">{stats.studentCount} students with back exam fees</span>
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
          <span className="fees-card-note">Back exam fee recovery</span>
        </div>
      </div>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Back Exam Fee Demands</h2>
        </div>
        <div className="fees-table-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Academic Year</th>
                <th>Semester</th>
                <th>Back Exam Amount</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {backpaperDemands.map((d) => {
                const bk = (d.breakdown || []).find((b) => BACKPAPER_HEADS.includes(b.head));
                return (
                  <tr key={d._id}>
                    <td className="fees-name">{d.studentId}</td>
                    <td>{d.academicYear}</td>
                    <td>{d.semesterNo}</td>
                    <td>{formatCurrency(bk?.amount)}</td>
                    <td>{formatCurrency(bk?.paid)}</td>
                    <td>{d.status}</td>
                  </tr>
                );
              })}
              {backpaperDemands.length === 0 && (
                <tr><td colSpan={6}>No back exam fee demands found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FeesBackpapers;
