import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiHash,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUserCheck,
  FiXCircle,
} from "react-icons/fi";
import {
  createFeePayment,
  fetchFeeDemands,
  fetchFeePayments,
  selectFeeActionLoading,
  selectFeeDemands,
  selectFeePayments,
} from "../redux/feeSlice";
import "./PaymentMethods.css";

const formatSemesterLabel = (semesterNo, scope) => {
  const normalizedScope = String(scope || "").toUpperCase();
  const sem = Number(semesterNo);
  if (normalizedScope === "YEAR" || sem === 0) return "Full Year";
  if (Number.isFinite(sem) && sem > 0) return `Sem ${sem}`;
  return "-";
};

const getStudentName = (demand) => {
  const name =
    demand?.studentName ||
    demand?.studentMongoId?.userId?.name ||
    demand?.studentMongoId?.user?.name ||
    demand?.student?.name ||
    "";
  return String(name || "").trim();
};

const getFatherName = (demand) => {
  const name =
    demand?.studentFatherName ||
    demand?.fatherName ||
    demand?.student?.fatherName ||
    "";
  return String(name || "").trim();
};

const buildDemandOptionLabel = (demand) => {
  const name = getStudentName(demand);
  const fatherName = getFatherName(demand);
  const parts = [
    demand?.studentId,
    name || null,
    fatherName ? `Father: ${fatherName}` : null,
    demand?.academicYear,
    formatSemesterLabel(demand?.semesterNo, demand?.scope),
    `Due ${demand?.dueAmount ?? 0}`,
  ].filter(Boolean);
  return parts.join(" - ");
};

const getStatusClass = (status = "") => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "SUCCESS") return "is-success";
  if (normalized === "FAILED") return "is-failed";
  if (normalized === "CANCELLED") return "is-cancelled";
  if (normalized === "REFUNDED") return "is-refunded";
  return "is-warning";
};

const PaymentMethods = () => {
  const dispatch = useDispatch();
  const demands = useSelector(selectFeeDemands);
  const payments = useSelector(selectFeePayments);
  const actionLoading = useSelector(selectFeeActionLoading);
  const [paymentForm, setPaymentForm] = useState({
    demandId: "",
    amount: "",
    mode: "CASH",
    gateway: "NONE",
    receiptNo: "",
  });
  const [demandSearch, setDemandSearch] = useState("");

  useEffect(() => {
    dispatch(fetchFeeDemands());
    dispatch(fetchFeePayments());
  }, [dispatch]);

  useEffect(() => {
    const refresh = () => {
      dispatch(fetchFeePayments());
      dispatch(fetchFeeDemands());
    };
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const pendingDemands = useMemo(
    () =>
      demands.filter(
        (demand) =>
          Number(demand.dueAmount || 0) > 0 &&
          demand?.studentMongoId &&
          demand?.studentMongoId?.userId
      ),
    [demands]
  );

  const normalizedDemandSearch = demandSearch.trim().toLowerCase();
  const filteredDemands = useMemo(() => {
    if (!normalizedDemandSearch) return pendingDemands;
    return pendingDemands.filter((demand) => {
      const haystack = [
        demand?.studentId,
        getStudentName(demand),
        getFatherName(demand),
        demand?.academicYear,
        formatSemesterLabel(demand?.semesterNo, demand?.scope),
        demand?.dueAmount,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedDemandSearch);
    });
  }, [pendingDemands, normalizedDemandSearch]);

  const bestMatchedDemand = useMemo(
    () => filteredDemands[0] || null,
    [filteredDemands]
  );

  const selectDemand = (demand) => {
    setPaymentForm((prev) => ({ ...prev, demandId: demand._id }));
    setDemandSearch(buildDemandOptionLabel(demand));
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.demandId || !paymentForm.amount) {
      toast.error("Demand and amount are required");
      return;
    }

    try {
      await dispatch(
        createFeePayment({
          demandId: paymentForm.demandId,
          amount: Number(paymentForm.amount),
          mode: "CASH",
          gateway: "NONE",
          receiptNo: paymentForm.receiptNo || undefined,
          createdBy: "ACCOUNTS",
        })
      ).unwrap();
      toast.success("Payment recorded");
      setPaymentForm({
        demandId: "",
        amount: "",
        mode: "CASH",
        gateway: "NONE",
        receiptNo: "",
      });
      setDemandSearch("");
    } catch (error) {
      toast.error(error || "Failed to record payment");
    }
  };

  return (
    <div className="payment-methods-page">
      <header className="pm-hero">
        <div>
          <p className="pm-eyebrow">Fees - Payment Processing</p>
          <h1>Payment Methods & Status</h1>
          <p>Track pending fee demands and quickly record cash payments for students.</p>
        </div>
        <div className="pm-hero-stats">
          <article>
            <p>
              <FiLayers /> Pending Demands
            </p>
            <strong>{pendingDemands.length}</strong>
          </article>
          <article>
            <p>
              <FiCreditCard /> Payments Logged
            </p>
            <strong>{payments.length}</strong>
          </article>
        </div>
      </header>

      <section className="pm-cash-form">
        <div>
          <h3>
            <FiDollarSign /> Record New Payment
          </h3>
          <p>Manual entry is enabled only for cash payments. Online payments are auto-recorded.</p>
        </div>
        <form onSubmit={submitPayment} className="pm-cash-form-grid">
          <label className="pm-demand-field">
            <span className="pm-field-label">
              <FiSearch /> Search Student
            </span>
            <div className="pm-demand-combobox">
              <FiSearch className="pm-input-icon" />
              <input
                type="text"
                placeholder="Search by student name or ID"
                value={demandSearch}
                onChange={(event) => {
                  setDemandSearch(event.target.value);
                  setPaymentForm((prev) => ({ ...prev, demandId: "" }));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (bestMatchedDemand) {
                      selectDemand(bestMatchedDemand);
                    }
                  }
                }}
              />
            </div>
            <input type="hidden" required value={paymentForm.demandId} readOnly />
            {bestMatchedDemand ? (
              <button
                type="button"
                className="pm-demand-match"
                onClick={() => selectDemand(bestMatchedDemand)}
              >
                <span className="pm-demand-primary">
                  <FiUserCheck />
                  {bestMatchedDemand.studentId} - {getStudentName(bestMatchedDemand)}
                </span>
                <span className="pm-demand-secondary">
                  {bestMatchedDemand.academicYear} -{" "}
                  {formatSemesterLabel(bestMatchedDemand.semesterNo, bestMatchedDemand.scope)} - Due{" "}
                  {bestMatchedDemand.dueAmount}
                </span>
              </button>
            ) : (
              <small className="pm-demand-hint">No matching pending demand found for this search.</small>
            )}
            <small className="pm-demand-hint">
              Matches: {filteredDemands.length} of {pendingDemands.length}. Press Enter to select top
              match.
            </small>
          </label>
          <label>
            <span className="pm-field-label">
              <FiDollarSign /> Amount
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span className="pm-field-label">
              <FiCreditCard /> Mode
            </span>
            <input type="text" value="CASH" readOnly />
          </label>
          <label>
            <span className="pm-field-label">
              <FiHash /> Receipt No
            </span>
            <input
              type="text"
              value={paymentForm.receiptNo}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, receiptNo: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="pm-cash-submit" disabled={actionLoading}>
            {actionLoading ? (
              <>
                <FiRefreshCw /> Saving...
              </>
            ) : (
              <>
                <FiCheckCircle /> Record Payment
              </>
            )}
          </button>
        </form>
      </section>

      <section className="pm-table-card">
        <div className="pm-table-head">
          <p className="pm-head-cell">
            <FiUser /> Student
          </p>
          <p className="pm-head-cell">
            <FiDollarSign /> Amount
          </p>
          <p className="pm-head-cell">
            <FiCreditCard /> Mode
          </p>
          <p className="pm-head-cell">
            <FiActivity /> Status
          </p>
          <p className="pm-head-cell">
            <FiCalendar /> Created
          </p>
        </div>
        <div className="pm-table-body">
          {payments.map((payment) => (
            <article key={payment._id} className="pm-row">
              <div>
                <p className="pm-method-name">{payment.studentId}</p>
                <small>{payment.transactionId || payment.receiptNo || "No ref"}</small>
              </div>
              <p className="pm-amount-cell">
                <FiDollarSign />
                <span>{payment.amount}</span>
              </p>
              <p>{payment.mode}</p>
              <p className="pm-status">
                <span className={`pm-status-chip ${getStatusClass(payment.status)}`}>
                  {String(payment.status || "").toUpperCase() === "SUCCESS" ? (
                    <FiCheckCircle />
                  ) : String(payment.status || "").toUpperCase() === "FAILED" ? (
                    <FiXCircle />
                  ) : (
                    <FiClock />
                  )}
                  <span>{payment.status}</span>
                </span>
              </p>
              <p>{new Date(payment.createdAt).toLocaleString()}</p>
            </article>
          ))}
          {payments.length === 0 && (
            <article className="pm-row pm-empty-row">
              <p>No payments found</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
};

export default PaymentMethods;
