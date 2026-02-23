import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  createFeePayment,
  fetchFeeDemands,
  fetchFeePayments,
  selectFeeActionLoading,
  selectFeeDemands,
  selectFeePayments,
  updateFeePaymentStatus,
} from "../redux/feeSlice";
import "./PaymentMethods.css";

const PAYMENT_MODES = [
  "UPI",
  "NETBANKING",
  "CARD",
  "CASH",
  "CHEQUE",
  "DD",
  "BANK_TRANSFER",
];

const STATUS_OPTIONS = ["SUCCESS", "FAILED", "CANCELLED", "REFUNDED"];

const PaymentMethods = () => {
  const dispatch = useDispatch();
  const demands = useSelector(selectFeeDemands);
  const payments = useSelector(selectFeePayments);
  const actionLoading = useSelector(selectFeeActionLoading);
  const [paymentForm, setPaymentForm] = useState({
    demandId: "",
    amount: "",
    mode: "UPI",
    transactionId: "",
    gateway: "NONE",
    receiptNo: "",
  });
  const [statusForm, setStatusForm] = useState({});

  useEffect(() => {
    dispatch(fetchFeeDemands());
    dispatch(fetchFeePayments());
  }, [dispatch]);

  const pendingDemands = useMemo(
    () => demands.filter((demand) => Number(demand.dueAmount || 0) > 0),
    [demands]
  );

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.demandId || !paymentForm.amount || !paymentForm.mode) {
      toast.error("Demand, amount and mode are required");
      return;
    }

    try {
      await dispatch(
        createFeePayment({
          demandId: paymentForm.demandId,
          amount: Number(paymentForm.amount),
          mode: paymentForm.mode,
          transactionId: paymentForm.transactionId || undefined,
          gateway: paymentForm.gateway || "NONE",
          receiptNo: paymentForm.receiptNo || undefined,
          createdBy: "ACCOUNTS",
        })
      ).unwrap();
      toast.success("Payment recorded");
      setPaymentForm({
        demandId: "",
        amount: "",
        mode: "UPI",
        transactionId: "",
        gateway: "NONE",
        receiptNo: "",
      });
    } catch (error) {
      toast.error(error || "Failed to record payment");
    }
  };

  const updateStatus = async (paymentId) => {
    const status = statusForm[paymentId];
    if (!status) return;
    try {
      await dispatch(updateFeePaymentStatus({ paymentId, status })).unwrap();
      toast.success("Payment status updated");
    } catch (error) {
      toast.error(error || "Failed to update status");
    }
  };

  return (
    <div className="payment-methods-page">
      <header className="pm-hero">
        <div>
          <p className="pm-eyebrow">Fees · Payment Processing</p>
          <h1>Payment Methods & Status</h1>
          <p>
            Integrated endpoints: <code>/api/admin/fee/payment</code> and{" "}
            <code>/api/admin/fee/payment/:paymentId/status</code>.
          </p>
        </div>
      </header>

      <section className="pm-cash-form">
        <div>
          <h3>Record New Payment</h3>
          <p>Use this for cash/counter/manual settlement entries.</p>
        </div>
        <form onSubmit={submitPayment} className="pm-cash-form-grid">
          <label>
            <span>Demand</span>
            <select
              value={paymentForm.demandId}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, demandId: event.target.value }))
              }
              required
            >
              <option value="">Select demand</option>
              {pendingDemands.map((demand) => (
                <option key={demand._id} value={demand._id}>
                  {demand.studentId} · {demand.academicYear} · Sem {demand.semesterNo} · Due{" "}
                  {demand.dueAmount}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Amount</span>
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
            <span>Mode</span>
            <select
              value={paymentForm.mode}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, mode: event.target.value }))
              }
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Gateway</span>
            <input
              type="text"
              value={paymentForm.gateway}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, gateway: event.target.value }))
              }
              placeholder="NONE / RAZORPAY / PAYU..."
            />
          </label>
          <label>
            <span>Transaction Id</span>
            <input
              type="text"
              value={paymentForm.transactionId}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, transactionId: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Receipt No</span>
            <input
              type="text"
              value={paymentForm.receiptNo}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, receiptNo: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="pm-cash-submit" disabled={actionLoading}>
            {actionLoading ? "Saving..." : "Record Payment"}
          </button>
        </form>
      </section>

      <section className="pm-table-card">
        <div className="pm-table-head">
          <p>Student</p>
          <p>Amount</p>
          <p>Mode</p>
          <p>Status</p>
          <p>Update Status</p>
          <p>Created</p>
        </div>
        <div className="pm-table-body">
          {payments.map((payment) => (
            <article key={payment._id} className="pm-row">
              <div>
                <p className="pm-method-name">{payment.studentId}</p>
                <small>{payment.transactionId || payment.receiptNo || "No ref"}</small>
              </div>
              <p>{payment.amount}</p>
              <p>{payment.mode}</p>
              <p>{payment.status}</p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  value={statusForm[payment._id] || ""}
                  onChange={(event) =>
                    setStatusForm((prev) => ({ ...prev, [payment._id]: event.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button type="button" className="pm-toggle-btn" onClick={() => updateStatus(payment._id)}>
                  Update
                </button>
              </div>
              <p>{new Date(payment.createdAt).toLocaleString()}</p>
            </article>
          ))}
          {payments.length === 0 && (
            <article className="pm-row">
              <p>No payments found</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
};

export default PaymentMethods;
