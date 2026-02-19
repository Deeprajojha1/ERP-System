import React, { useMemo, useState } from "react";
import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import ClipLoader from "./components/ClipLoader";
import "./PaymentMethods.css";

const DEFAULT_METHODS = [
  {
    id: "upi",
    name: "UPI",
    provider: "Razorpay",
    fees: "0.35%",
    status: "Active",
    settlement: "Same day",
  },
  {
    id: "netbanking",
    name: "Net Banking",
    provider: "PayU",
    fees: "0.75%",
    status: "Active",
    settlement: "T+1",
  },
  {
    id: "cards",
    name: "Credit / Debit Card",
    provider: "Stripe",
    fees: "1.5%",
    status: "Maintenance",
    settlement: "T+2",
  },
];

const CASH_RULES = [
  {
    id: "limit",
    title: "Per-transaction limit",
    detail: "Allow cash payments up to ₹25,000 for compliance",
  },
  {
    id: "window",
    title: "Collection window",
    detail: "Accept cash only during 10 AM – 2 PM at the bursar desk",
  },
  {
    id: "recon",
    title: "Reconciliation logic",
    detail: "Deposit receipts must be uploaded within 24 hours",
  },
];

const PaymentMethods = () => {
  const [methods, setMethods] = useState(DEFAULT_METHODS);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cashEntry, setCashEntry] = useState({
    studentName: "",
    enrollment: "",
    amount: "",
    date: "",
    receipt: "",
  });
  const [cashEntries, setCashEntries] = useState([]);
  const [savingCashEntry, setSavingCashEntry] = useState(false);
  const activeCount = useMemo(
    () => methods.filter((method) => method.status === "Active").length,
    [methods]
  );

  const toggleStatus = (id) => {
    setMethods((previous) =>
      previous.map((method) => {
        if (method.id !== id) return method;
        const nextStatus = method.status === "Active" ? "Maintenance" : "Active";
        return { ...method, status: nextStatus };
      })
    );
  };

  const handleCashEntryChange = (field, value) => {
    setCashEntry((previous) => ({ ...previous, [field]: value }));
  };

  const handleCashEntrySubmit = async (event) => {
    event.preventDefault();
    if (savingCashEntry) return;
    if (!cashEntry.studentName || !cashEntry.enrollment || !cashEntry.amount) return;
    setSavingCashEntry(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      setCashEntries((previous) => [
        {
          id: Date.now().toString(),
          ...cashEntry,
        },
        ...previous,
      ]);
      setCashEntry({ studentName: "", enrollment: "", amount: "", date: "", receipt: "" });
    } finally {
      setSavingCashEntry(false);
    }
  };

  return (
    <div className="payment-methods-page">
      <header className="pm-hero">
        <div>
          <p className="pm-eyebrow">Configuration · Fees</p>
          <h1>Payment Methods</h1>
          <p>
            Enable or pause collection channels, review gateway fees, and share the recommended payment mix with parents.
          </p>
        </div>
        <div className="pm-hero-stats">
          <article>
            <p>Active methods</p>
            <strong>{activeCount}</strong>
          </article>
          <article>
            <p>Total providers</p>
            <strong>{methods.length}</strong>
          </article>
        </div>
      </header>

      <section className="pm-table-card">
        <div className="pm-table-head">
          <p>Method</p>
          <p>Provider</p>
          <p>Gateway Fees</p>
          <p>Settlement</p>
          <p>Status</p>
          <p>Action</p>
        </div>
        <div className="pm-table-body">
          {methods.map((method) => (
            <article key={method.id} className="pm-row">
              <div>
                <p className="pm-method-name">{method.name}</p>
                <small>{method.id.toUpperCase()}</small>
              </div>
              <p>{method.provider}</p>
              <p>{method.fees}</p>
              <p>{method.settlement}</p>
              <div className="pm-status">
                <span className={`pm-status-chip ${method.status === "Active" ? "is-success" : "is-warning"}`}>
                  {method.status === "Active" ? <FiCheckCircle /> : <FiAlertCircle />}
                  {method.status}
                </span>
              </div>
              <div>
                <button type="button" className="pm-toggle-btn" onClick={() => toggleStatus(method.id)}>
                  {method.status === "Active" ? "Pause" : "Activate"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pm-cash-card">
        <div className="pm-cash-head">
          <div>
            <h2>Cash Payment Logic</h2>
            <p>Define how offline cash collections should behave for your campuses.</p>
          </div>
          <button
            type="button"
            className={`pm-cash-toggle ${cashEnabled ? "is-enabled" : ""}`}
            onClick={() => setCashEnabled((previous) => !previous)}
          >
            {cashEnabled ? "Disable Cash" : "Enable Cash"}
          </button>
        </div>
        <ul className="pm-cash-rules">
          {CASH_RULES.map((rule) => (
            <li key={rule.id}>
              <p>{rule.title}</p>
              <span>{rule.detail}</span>
            </li>
          ))}
        </ul>
        <div className={`pm-cash-status ${cashEnabled ? "success" : "muted"}`}>
          {cashEnabled
            ? "Cash counters are enabled with compliance checks."
            : "Cash counters are currently disabled for this session."}
        </div>
      </section>

      <section className="pm-cash-form">
        <div>
          <h3>Manual Cash Entry</h3>
          <p>Capture over-the-counter payments with receipt details for reconciliation.</p>
        </div>
        <form onSubmit={handleCashEntrySubmit} className="pm-cash-form-grid">
          <label>
            <span>Student Name</span>
            <input
              type="text"
              value={cashEntry.studentName}
              onChange={(event) => handleCashEntryChange("studentName", event.target.value)}
              placeholder="e.g. Riya Mehta"
              required
            />
          </label>
          <label>
            <span>Enrollment ID</span>
            <input
              type="text"
              value={cashEntry.enrollment}
              onChange={(event) => handleCashEntryChange("enrollment", event.target.value)}
              placeholder="e.g. 2024CS045"
              required
            />
          </label>
          <label>
            <span>Amount (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashEntry.amount}
              onChange={(event) => handleCashEntryChange("amount", event.target.value)}
              placeholder="25000"
              required
            />
          </label>
          <label>
            <span>Deposit Date</span>
            <input
              type="date"
              value={cashEntry.date}
              onChange={(event) => handleCashEntryChange("date", event.target.value)}
            />
          </label>
          <label>
            <span>Receipt / Notes</span>
            <input
              type="text"
              value={cashEntry.receipt}
              onChange={(event) => handleCashEntryChange("receipt", event.target.value)}
              placeholder="Receipt # or remarks"
            />
          </label>
          <button type="submit" className="pm-cash-submit admin-btn-with-loader" disabled={savingCashEntry}>
            {savingCashEntry ? (
              <>
                <ClipLoader size={15} />
                <span>Saving...</span>
              </>
            ) : (
              "Save Entry"
            )}
          </button>
        </form>

        {cashEntries.length > 0 && (
          <div className="pm-cash-entries">
            <h4>Recent Cash Entries</h4>
            <div className="pm-cash-entry-head">
              <span>Student</span>
              <span>Enrollment</span>
              <span>Amount</span>
              <span>Date</span>
              <span>Receipt</span>
            </div>
            {cashEntries.map((entry) => (
              <div key={entry.id} className="pm-cash-entry-row">
                <span>{entry.studentName}</span>
                <span>{entry.enrollment}</span>
                <span>₹{Number(entry.amount).toLocaleString("en-IN")}</span>
                <span>{entry.date || "—"}</span>
                <span>{entry.receipt || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PaymentMethods;
