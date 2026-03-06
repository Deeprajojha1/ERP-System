import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiUsers,
  FiDollarSign,
  FiEdit2,
  FiTag,
  FiSearch,
  FiRefreshCw,
} from "react-icons/fi";
import toast from "react-hot-toast";
import ClipLoader from "./components/ClipLoader";
import {
  fetchStudentFeeDetails,
  updateStudentBenefits,
  selectStudentFeeDetails,
  selectFeeLoading,
  selectFeeActionLoading,
} from "../redux/feeSlice";
import "./FeesDiscounts.css";

const BENEFIT_TYPES = ["NONE", "PERCENT", "FIXED"];

const formatCurrency = (value = 0) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const FeesDiscounts = () => {
  const dispatch = useDispatch();
  const studentDetails = useSelector(selectStudentFeeDetails);
  const loading = useSelector(selectFeeLoading);
  const actionLoading = useSelector(selectFeeActionLoading);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    scholarshipType: "NONE",
    scholarshipValue: 0,
    discountType: "NONE",
    discountValue: 0,
  });

  useEffect(() => {
    dispatch(fetchStudentFeeDetails());
  }, [dispatch]);

  const studentsWithBenefits = useMemo(
    () =>
      studentDetails.filter(
        (s) =>
          (s.scholarship?.type && s.scholarship.type !== "NONE") ||
          (s.discount?.type && s.discount.type !== "NONE")
      ),
    [studentDetails]
  );

  const stats = useMemo(() => {
    let totalScholarship = 0;
    let totalDiscount = 0;
    studentsWithBenefits.forEach((s) => {
      totalScholarship += Number(s.feeSummary?.scholarshipAmount || 0);
      totalDiscount += Number(s.feeSummary?.discountAmount || 0);
    });
    return {
      totalStudents: studentDetails.length,
      withBenefits: studentsWithBenefits.length,
      totalScholarship,
      totalDiscount,
      totalBenefits: totalScholarship + totalDiscount,
    };
  }, [studentDetails, studentsWithBenefits]);

  const filtered = useMemo(() => {
    let list = studentDetails;
    if (filter === "scholarship") {
      list = list.filter((s) => s.scholarship?.type && s.scholarship.type !== "NONE");
    } else if (filter === "discount") {
      list = list.filter((s) => s.discount?.type && s.discount.type !== "NONE");
    } else if (filter === "none") {
      list = list.filter(
        (s) =>
          (!s.scholarship?.type || s.scholarship.type === "NONE") &&
          (!s.discount?.type || s.discount.type === "NONE")
      );
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          String(s.studentId || "").toLowerCase().includes(needle) ||
          String(s.userId?.name || "").toLowerCase().includes(needle)
      );
    }
    return list;
  }, [studentDetails, filter, search]);

  const openEdit = (student) => {
    setEditingId(student._id);
    setEditForm({
      scholarshipType: student.scholarship?.type || "NONE",
      scholarshipValue: student.scholarship?.value || 0,
      discountType: student.discount?.type || "NONE",
      discountValue: student.discount?.value || 0,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await dispatch(
        updateStudentBenefits({
          id: editingId,
          scholarship: {
            type: editForm.scholarshipType,
            value: Number(editForm.scholarshipValue || 0),
          },
          discount: {
            type: editForm.discountType,
            value: Number(editForm.discountValue || 0),
          },
        })
      ).unwrap();
      toast.success("Benefits updated successfully");
      setEditingId(null);
    } catch (error) {
      toast.error(error || "Failed to update benefits");
    }
  };

  return (
    <div className="fees-page fees-discounts-page">
      <header className="fee-discounts-header">
        <div>
          <h1>Scholarships & Discounts</h1>
          <p>View and manage student scholarship and discount benefits from fee profiles.</p>
        </div>
        <button
          type="button"
          className="fee-export-btn"
          onClick={() => dispatch(fetchStudentFeeDetails())}
          disabled={loading}
        >
          <FiRefreshCw />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </header>

      <section className="fee-discounts-stats">
        <article className="fee-discount-stat">
          <div className="fee-discount-stat-icon"><FiUsers /></div>
          <div>
            <p>Total Students</p>
            <strong>{stats.totalStudents}</strong>
            <span>With fee profiles</span>
          </div>
        </article>
        <article className="fee-discount-stat">
          <div className="fee-discount-stat-icon"><FiTag /></div>
          <div>
            <p>Students With Benefits</p>
            <strong>{stats.withBenefits}</strong>
            <span>Scholarship or discount applied</span>
          </div>
        </article>
        <article className="fee-discount-stat">
          <div className="fee-discount-stat-icon"><FiDollarSign /></div>
          <div>
            <p>Total Benefit Amount</p>
            <strong>{formatCurrency(stats.totalBenefits)}</strong>
            <span>
              Scholarship: {formatCurrency(stats.totalScholarship)} | Discount:{" "}
              {formatCurrency(stats.totalDiscount)}
            </span>
          </div>
        </article>
      </section>

      <div className="fee-discounts-controls">
        <div className="fee-discounts-search">
          <FiSearch />
          <input
            type="search"
            placeholder="Search by student ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="fee-discounts-filters">
          {[
            { key: "all", label: "All" },
            { key: "scholarship", label: "Scholarship" },
            { key: "discount", label: "Discount" },
            { key: "none", label: "No Benefits" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              className={`fee-discounts-filter ${filter === f.key ? "is-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Student Fee Benefits</h2>
        </div>
        <div className="fees-table-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Program</th>
                <th>Scholarship</th>
                <th>Discount</th>
                <th>Gross Fee</th>
                <th>Net Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td className="fees-name">{s.studentId}</td>
                  <td>{s.userId?.name || "N/A"}</td>
                  <td>{s.programId?.programName || "N/A"}</td>
                  <td>
                    {s.scholarship?.type === "PERCENT"
                      ? `${s.scholarship.value}%`
                      : s.scholarship?.type === "FIXED"
                      ? formatCurrency(s.scholarship.value)
                      : "None"}
                    {s.feeSummary?.scholarshipAmount > 0 && (
                      <span style={{ color: "#16a34a", fontSize: "0.75rem", display: "block" }}>
                        (-{formatCurrency(s.feeSummary.scholarshipAmount)})
                      </span>
                    )}
                  </td>
                  <td>
                    {s.discount?.type === "PERCENT"
                      ? `${s.discount.value}%`
                      : s.discount?.type === "FIXED"
                      ? formatCurrency(s.discount.value)
                      : "None"}
                    {s.feeSummary?.discountAmount > 0 && (
                      <span style={{ color: "#16a34a", fontSize: "0.75rem", display: "block" }}>
                        (-{formatCurrency(s.feeSummary.discountAmount)})
                      </span>
                    )}
                  </td>
                  <td>{formatCurrency(s.feeSummary?.courseGrossFee)}</td>
                  <td>{formatCurrency(s.feeSummary?.courseNetFee)}</td>
                  <td>
                    <button
                      type="button"
                      className="fee-discounts-edit-btn"
                      onClick={() => openEdit(s)}
                    >
                      <FiEdit2 /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>No student fee details found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingId && (
        <div className="fee-discounts-modal-overlay" onClick={() => !actionLoading && setEditingId(null)}>
          <div
            className="fee-discounts-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fee-discounts-modal-head">
              <h2>Edit Student Benefits</h2>
              <button type="button" onClick={() => !actionLoading && setEditingId(null)}>×</button>
            </div>

            <div className="fee-discounts-modal-section">
              <p className="fee-discounts-modal-label">Scholarship</p>
              <div className="fee-discounts-modal-grid">
                <label>
                  Type
                  <select
                    value={editForm.scholarshipType}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, scholarshipType: e.target.value }))
                    }
                  >
                    {BENEFIT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Value
                  <input
                    type="number"
                    min="0"
                    value={editForm.scholarshipValue}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        scholarshipValue: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="fee-discounts-modal-section">
              <p className="fee-discounts-modal-label">Discount</p>
              <div className="fee-discounts-modal-grid">
                <label>
                  Type
                  <select
                    value={editForm.discountType}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, discountType: e.target.value }))
                    }
                  >
                    {BENEFIT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Value
                  <input
                    type="number"
                    min="0"
                    value={editForm.discountValue}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        discountValue: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="fee-discounts-modal-actions">
              <button
                type="button"
                className="fee-discounts-modal-secondary"
                onClick={() => setEditingId(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fee-discounts-modal-primary admin-btn-with-loader"
                onClick={handleSave}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <ClipLoader size={15} />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesDiscounts;
