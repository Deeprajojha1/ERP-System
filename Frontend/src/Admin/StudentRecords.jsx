import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiSearch } from "react-icons/fi";
import {
  createFeeDemand,
  createFeePayment,
  updateFeePaymentStatus,
  generateFeeDemandFromProfile,
  fetchFeeDemands,
  fetchFeePayments,
  selectFeeActionLoading,
  selectFeeDemands,
  selectFeeLoading,
  selectFeePayments,
} from "../redux/feeSlice";
import toast from "react-hot-toast";
import "./StudentRecords.css";

const formatCurrency = (value = 0) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const PAYMENT_MODES = ["UPI", "NETBANKING", "CARD", "CASH", "CHEQUE", "DD", "BANK_TRANSFER"];

const StudentRecords = () => {
  const dispatch = useDispatch();
  const demands = useSelector(selectFeeDemands);
  const payments = useSelector(selectFeePayments);
  const loading = useSelector(selectFeeLoading);
  const actionLoading = useSelector(selectFeeActionLoading);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("demands");
  const [demandForm, setDemandForm] = useState({
    studentMongoId: "",
    studentId: "",
    academicYear: "",
    semesterNo: "1",
    dueDate: "",
    breakdown: "TUITION:0",
  });
  const [generateForm, setGenerateForm] = useState({
    studentId: "",
    academicYear: "",
    semesterNo: "1",
    dueDate: "",
    hostelAmount: "0",
    transportAmount: "0",
  });
  const [paymentForm, setPaymentForm] = useState({
    studentId: "",
    demandId: "",
    amount: "",
    mode: "UPI",
    transactionId: "",
  });
  const [demandMode, setDemandMode] = useState("manual");

  useEffect(() => {
    dispatch(fetchFeeDemands());
    dispatch(fetchFeePayments());
  }, [dispatch]);

  const paymentByDemand = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      const key = String(payment.demandId?._id || payment.demandId);
      if (!key) return;
      const existing = map.get(key) || [];
      existing.push(payment);
      map.set(key, existing);
    });
    return map;
  }, [payments]);

  const filteredDemands = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return demands.filter((demand) => {
      const matchesSearch = needle
        ? String(demand.studentId || "").toLowerCase().includes(needle)
        : true;
      const matchesStatus =
        statusFilter === "all" || String(demand.status) === String(statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [demands, search, statusFilter]);

  const filteredPayments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return payments.filter((p) => {
      return needle
        ? String(p.studentId || "").toLowerCase().includes(needle)
        : true;
    });
  }, [payments, search]);

  const submitDemand = async (event) => {
    event.preventDefault();
    const breakdown = String(demandForm.breakdown || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [head, amount] = part.split(":").map((token) => token.trim());
        return {
          head: String(head || "").toUpperCase(),
          amount: Number(amount || 0),
        };
      })
      .filter((row) => row.head && Number.isFinite(row.amount));

    if (
      !demandForm.studentMongoId ||
      !demandForm.studentId ||
      !demandForm.academicYear ||
      !demandForm.semesterNo ||
      !demandForm.dueDate ||
      breakdown.length === 0
    ) {
      toast.error("All demand fields are required");
      return;
    }

    try {
      await dispatch(
        createFeeDemand({
          studentMongoId: demandForm.studentMongoId,
          studentId: demandForm.studentId,
          academicYear: demandForm.academicYear,
          semesterNo: Number(demandForm.semesterNo),
          dueDate: demandForm.dueDate,
          breakdown,
        })
      ).unwrap();
      toast.success("Fee demand created");
      setDemandForm({
        studentMongoId: "",
        studentId: "",
        academicYear: "",
        semesterNo: "1",
        dueDate: "",
        breakdown: "TUITION:0",
      });
    } catch (error) {
      toast.error(error || "Failed to create demand");
    }
  };

  const submitGenerateDemand = async (event) => {
    event.preventDefault();
    if (!generateForm.studentId || !generateForm.academicYear || !generateForm.dueDate) {
      toast.error("Student ID, academic year, and due date are required");
      return;
    }
    try {
      await dispatch(
        generateFeeDemandFromProfile({
          studentId: generateForm.studentId,
          academicYear: generateForm.academicYear,
          semesterNo: Number(generateForm.semesterNo),
          dueDate: generateForm.dueDate,
          hostelAmount: Number(generateForm.hostelAmount || 0),
          transportAmount: Number(generateForm.transportAmount || 0),
        })
      ).unwrap();
      toast.success("Fee demand generated from profile");
      setGenerateForm({
        studentId: "",
        academicYear: "",
        semesterNo: "1",
        dueDate: "",
        hostelAmount: "0",
        transportAmount: "0",
      });
    } catch (error) {
      toast.error(error || "Failed to generate demand");
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.studentId || !paymentForm.demandId || !paymentForm.amount) {
      toast.error("Student ID, demand ID, and amount are required");
      return;
    }
    try {
      await dispatch(
        createFeePayment({
          studentId: paymentForm.studentId,
          demandId: paymentForm.demandId,
          amount: Number(paymentForm.amount),
          mode: paymentForm.mode,
          transactionId: paymentForm.transactionId || undefined,
        })
      ).unwrap();
      toast.success("Payment recorded");
      setPaymentForm({ studentId: "", demandId: "", amount: "", mode: "UPI", transactionId: "" });
    } catch (error) {
      toast.error(error || "Failed to record payment");
    }
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    try {
      await dispatch(updateFeePaymentStatus({ paymentId, status: newStatus })).unwrap();
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (error) {
      toast.error(error || "Failed to update status");
    }
  };

  const selectDemandForPayment = (demand) => {
    setPaymentForm((prev) => ({
      ...prev,
      studentId: demand.studentId,
      demandId: demand._id,
    }));
    setActiveTab("payments");
  };

  return (
    <div className="student-records-page">
      <header className="sr-hero">
        <div>
          <p className="sr-eyebrow">Student Fee Records</p>
          <h1>Demands & Payments</h1>
        </div>
      </header>

      <div className="sr-tabs">
        <button
          type="button"
          className={`sr-tab ${activeTab === "demands" ? "sr-tab-active" : ""}`}
          onClick={() => setActiveTab("demands")}
        >
          Demands ({demands.length})
        </button>
        <button
          type="button"
          className={`sr-tab ${activeTab === "payments" ? "sr-tab-active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          Payments ({payments.length})
        </button>
      </div>

      <section className="sr-controls">
        <div className="sr-search">
          <span className="sr-search-icon" aria-hidden="true">
            <FiSearch />
          </span>
          <input
            type="search"
            placeholder="Search by student id..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {activeTab === "demands" && (
          <select
            className="sr-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
          </select>
        )}
      </section>

      {activeTab === "demands" && (
        <>
          <section className="sr-table-card sr-demand-card">
            <div className="sr-demand-head">
              <p>Create Fee Demand</p>
              <div className="sr-demand-mode-toggle">
                <button
                  type="button"
                  className={`sr-tab ${demandMode === "manual" ? "sr-tab-active" : ""}`}
                  onClick={() => setDemandMode("manual")}
                >
                  Manual
                </button>
                <button
                  type="button"
                  className={`sr-tab ${demandMode === "auto" ? "sr-tab-active" : ""}`}
                  onClick={() => setDemandMode("auto")}
                >
                  Auto (From Profile)
                </button>
              </div>
            </div>

            {demandMode === "manual" ? (
              <form onSubmit={submitDemand} className="sr-demand-form">
                <input className="sr-demand-input" type="text" placeholder="studentMongoId"
                  value={demandForm.studentMongoId}
                  onChange={(e) => setDemandForm((p) => ({ ...p, studentMongoId: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="text" placeholder="studentId (enrollment)"
                  value={demandForm.studentId}
                  onChange={(e) => setDemandForm((p) => ({ ...p, studentId: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="text" placeholder="academicYear (e.g. 2025-26)"
                  value={demandForm.academicYear}
                  onChange={(e) => setDemandForm((p) => ({ ...p, academicYear: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="number" min="1" placeholder="semesterNo"
                  value={demandForm.semesterNo}
                  onChange={(e) => setDemandForm((p) => ({ ...p, semesterNo: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="date"
                  value={demandForm.dueDate}
                  onChange={(e) => setDemandForm((p) => ({ ...p, dueDate: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="text" placeholder="breakdown (TUITION:50000,HOSTEL:10000)"
                  value={demandForm.breakdown}
                  onChange={(e) => setDemandForm((p) => ({ ...p, breakdown: e.target.value }))}
                  required
                />
                <div className="sr-demand-actions">
                  <button type="submit" className="sr-primary-btn" disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create Demand"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitGenerateDemand} className="sr-demand-form">
                <input className="sr-demand-input" type="text" placeholder="studentId (enrollment)"
                  value={generateForm.studentId}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, studentId: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="text" placeholder="academicYear (e.g. 2025-26)"
                  value={generateForm.academicYear}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, academicYear: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="number" min="1" placeholder="semesterNo"
                  value={generateForm.semesterNo}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, semesterNo: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="date" placeholder="dueDate"
                  value={generateForm.dueDate}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, dueDate: e.target.value }))}
                  required
                />
                <input className="sr-demand-input" type="number" min="0" placeholder="hostelAmount (optional)"
                  value={generateForm.hostelAmount}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, hostelAmount: e.target.value }))}
                />
                <input className="sr-demand-input" type="number" min="0" placeholder="transportAmount (optional)"
                  value={generateForm.transportAmount}
                  onChange={(e) => setGenerateForm((p) => ({ ...p, transportAmount: e.target.value }))}
                />
                <div className="sr-demand-actions">
                  <button type="submit" className="sr-primary-btn" disabled={actionLoading}>
                    {actionLoading ? "Generating..." : "Generate Demand"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="sr-table-card">
            <div className="sr-table-head">
              <p>Student</p>
              <p>Academic</p>
              <p>Total</p>
              <p>Paid</p>
              <p>Due</p>
              <p>Status</p>
              <p>Action</p>
            </div>
            <div className="sr-table-body">
              {loading ? (
                <article className="sr-table-row sr-table-row-empty">
                  <p>Loading records...</p>
                </article>
              ) : filteredDemands.length === 0 ? (
                <article className="sr-table-row sr-table-row-empty">
                  <p>No demand records found</p>
                </article>
              ) : (
                filteredDemands.map((demand) => {
                  const relatedPayments = paymentByDemand.get(String(demand._id)) || [];
                  return (
                    <article key={demand._id} className="sr-table-row">
                      <div>
                        <p className="sr-student-name">{demand.studentId}</p>
                        <span className="sr-student-id">{relatedPayments.length} payment(s)</span>
                      </div>
                      <div>
                        <p>{demand.academicYear}</p>
                        <span className="sr-pill">Semester {demand.semesterNo}</span>
                      </div>
                      <p className="sr-text-strong">{formatCurrency(demand.totalAmount)}</p>
                      <p>{formatCurrency(demand.paidAmount)}</p>
                      <p>{formatCurrency(demand.dueAmount)}</p>
                      <div className="sr-status-cell">
                        <span className={`sr-status sr-status-${String(demand.status || "").toLowerCase()}`}>
                          {demand.status}
                        </span>
                      </div>
                      <div>
                        {demand.status !== "PAID" && (
                          <button
                            type="button"
                            className="sr-action-btn"
                            onClick={() => selectDemandForPayment(demand)}
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "payments" && (
        <>
          <section className="sr-table-card sr-demand-card">
            <div className="sr-demand-head">
              <p>Record Payment</p>
            </div>
            <form onSubmit={submitPayment} className="sr-demand-form">
              <input className="sr-demand-input" type="text" placeholder="studentId (enrollment)"
                value={paymentForm.studentId}
                onChange={(e) => setPaymentForm((p) => ({ ...p, studentId: e.target.value }))}
                required
              />
              <input className="sr-demand-input" type="text" placeholder="demandId"
                value={paymentForm.demandId}
                onChange={(e) => setPaymentForm((p) => ({ ...p, demandId: e.target.value }))}
                required
              />
              <input className="sr-demand-input" type="number" min="1" placeholder="Amount"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              <select className="sr-demand-input"
                value={paymentForm.mode}
                onChange={(e) => setPaymentForm((p) => ({ ...p, mode: e.target.value }))}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input className="sr-demand-input" type="text" placeholder="Transaction ID (optional)"
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm((p) => ({ ...p, transactionId: e.target.value }))}
              />
              <div className="sr-demand-actions">
                <button type="submit" className="sr-primary-btn" disabled={actionLoading}>
                  {actionLoading ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </section>

          <section className="sr-table-card">
            <div className="sr-table-head">
              <p>Student</p>
              <p>Amount</p>
              <p>Mode</p>
              <p>Status</p>
              <p>Created</p>
              <p>Action</p>
            </div>
            <div className="sr-table-body">
              {loading ? (
                <article className="sr-table-row sr-table-row-empty">
                  <p>Loading payments...</p>
                </article>
              ) : filteredPayments.length === 0 ? (
                <article className="sr-table-row sr-table-row-empty">
                  <p>No payment records found</p>
                </article>
              ) : (
                filteredPayments.map((p) => (
                  <article key={p._id} className="sr-table-row">
                    <div>
                      <p className="sr-student-name">{p.studentId}</p>
                    </div>
                    <p className="sr-text-strong">{formatCurrency(p.amount)}</p>
                    <p>{p.mode || "N/A"}</p>
                    <div className="sr-status-cell">
                      <span className={`sr-status sr-status-${String(p.status || "").toLowerCase()}`}>
                        {p.status}
                      </span>
                    </div>
                    <p>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}</p>
                    <div>
                      {p.status === "CREATED" && (
                        <button type="button" className="sr-action-btn" disabled={actionLoading}
                          onClick={() => handleStatusChange(p._id, "SUCCESS")}
                        >
                          Mark Success
                        </button>
                      )}
                      {p.status === "SUCCESS" && (
                        <button type="button" className="sr-action-btn sr-action-btn-danger" disabled={actionLoading}
                          onClick={() => handleStatusChange(p._id, "REFUNDED")}
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default StudentRecords;
