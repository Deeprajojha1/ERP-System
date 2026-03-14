import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiActivity,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiFilePlus,
  FiFileText,
  FiPlusCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiUser,
  FiUsers,
  FiZap,
} from "react-icons/fi";
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
import axios from "../utils/axiosInstance";
import "./StudentRecords.css";

const formatCurrency = (value = 0) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatSemesterLabel = (semesterNo, scope) => {
  const normalizedScope = String(scope || "").toUpperCase();
  const sem = Number(semesterNo);
  if (normalizedScope === "YEAR" || sem === 0) return "Full Year";
  if (Number.isFinite(sem) && sem > 0) return `Semester ${sem}`;
  return "-";
};

const PAYMENT_MODES = ["UPI", "NETBANKING", "CARD", "CASH", "CHEQUE", "DD", "BANK_TRANSFER"];

const StudentRecords = () => {
  const dispatch = useDispatch();
  const demands = useSelector(selectFeeDemands);
  const payments = useSelector(selectFeePayments);
  const loading = useSelector(selectFeeLoading);
  const actionLoading = useSelector(selectFeeActionLoading);
  const apiBase = useSelector((state) => state.config.apiBase);
  // Keep a draft input for the UI, and apply the filter only when the admin clicks Search (or presses Enter).
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("demands");
  const [demandForm, setDemandForm] = useState({
    studentId: "",
    academicYear: "",
    semesterNo: "1",
    dueDate: "",
    tuitionAmount: "",
    hostelAmount: "",
  });
  const [manualStudentMeta, setManualStudentMeta] = useState({
    loading: false,
    name: "",
    fatherName: "",
    email: "",
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

  useEffect(() => {
    const enrollment = String(demandForm.studentId || "").trim();
    if (!apiBase || !enrollment) {
      setManualStudentMeta({ loading: false, name: "", fatherName: "", email: "" });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setManualStudentMeta((prev) => ({ ...prev, loading: true }));
        const response = await axios.get(
          `${apiBase}/admin/fee/student-lookup/${encodeURIComponent(enrollment)}`,
          { withCredentials: true }
        );
        const data = response.data?.data || {};
        setManualStudentMeta({
          loading: false,
          name: String(data.name || ""),
          fatherName: String(data.fatherName || ""),
          email: String(data.email || ""),
        });
      } catch (error) {
        setManualStudentMeta({ loading: false, name: "", fatherName: "", email: "" });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [apiBase, demandForm.studentId]);

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
        ? [
            demand?.studentMongoId?.userId?.name,
            demand.studentId,
            demand.academicYear,
            demand.status,
            demand.semesterNo,
            demand.scope,
            demand._id,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .some((value) => value.includes(needle))
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
        ? [
            p.studentName,
            p?.demandId?.studentMongoId?.userId?.name,
            p.studentId,
            p.status,
            p.mode,
            p.transactionId,
            p._id,
            p.demandId?._id || p.demandId,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .some((value) => value.includes(needle))
        : true;
    });
  }, [payments, search]);

  const submitDemand = async (event) => {
    event.preventDefault();

    const tuitionAmount = Number(demandForm.tuitionAmount || 0);
    const hostelAmount = Number(demandForm.hostelAmount || 0);
    if (!Number.isFinite(tuitionAmount) || tuitionAmount < 0) {
      toast.error("Invalid tuition amount");
      return;
    }
    if (!Number.isFinite(hostelAmount) || hostelAmount < 0) {
      toast.error("Invalid hostel amount");
      return;
    }

    const breakdown = [{ head: "TUITION", amount: tuitionAmount }];
    if (hostelAmount > 0) breakdown.push({ head: "HOSTEL", amount: hostelAmount });

    if (
      !demandForm.studentId ||
      !demandForm.academicYear ||
      !demandForm.semesterNo ||
      !demandForm.dueDate
    ) {
      toast.error("All demand fields are required");
      return;
    }

    try {
      await dispatch(
        createFeeDemand({
          studentId: demandForm.studentId,
          academicYear: demandForm.academicYear,
          semesterNo: Number(demandForm.semesterNo),
          dueDate: demandForm.dueDate,
          breakdown,
        })
      ).unwrap();
      toast.success("Fee demand created");
      setDemandForm({
        studentId: "",
        academicYear: "",
        semesterNo: "1",
        dueDate: "",
        tuitionAmount: "",
        hostelAmount: "",
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
          <h1>
            <FiUsers /> Demands & Payments
          </h1>
        </div>
      </header>

      <div className="sr-tabs">
        <button
          type="button"
          className={`sr-tab ${activeTab === "demands" ? "sr-tab-active" : ""}`}
          onClick={() => setActiveTab("demands")}
        >
          <FiFileText /> Demands ({demands.length})
        </button>
        <button
          type="button"
          className={`sr-tab ${activeTab === "payments" ? "sr-tab-active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          <FiCreditCard /> Payments ({payments.length})
        </button>
      </div>

      <section className="sr-controls">
        <div className="sr-search">
          <span className="sr-search-icon" aria-hidden="true">
            <FiSearch />
          </span>
          <input
            type="search"
            placeholder="Search by enrollment, name, academic year, status, demand id..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setSearch(searchInput);
              }
            }}
          />
        </div>
        <button
          type="button"
          className="sr-primary-btn sr-control-btn"
          onClick={() => setSearch(searchInput)}
          disabled={!searchInput.trim()}
          title="Apply search"
        >
          <FiSearch /> Search
        </button>
        <button
          type="button"
          className="sr-ghost-btn sr-control-btn"
          onClick={() => {
            setSearchInput("");
            setSearch("");
          }}
          disabled={!searchInput.trim() && !search.trim()}
          title="Clear search"
        >
          Clear
        </button>
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
              <p>
                <FiFilePlus /> Create Fee Demand
              </p>
              <div className="sr-demand-mode-toggle">
                <button
                  type="button"
                  className={`sr-tab ${demandMode === "manual" ? "sr-tab-active" : ""}`}
                  onClick={() => setDemandMode("manual")}
                >
                  <FiEdit3 /> Manual
                </button>
                <button
                  type="button"
                  className={`sr-tab ${demandMode === "auto" ? "sr-tab-active" : ""}`}
                  onClick={() => setDemandMode("auto")}
                >
                  <FiZap /> Auto (From Profile)
                </button>
              </div>
            </div>

            {demandMode === "manual" ? (
              <form onSubmit={submitDemand} className="sr-demand-form">
                <input className="sr-demand-input" type="text" placeholder="studentId (enrollment)"
                  value={demandForm.studentId}
                  onChange={(e) => setDemandForm((p) => ({ ...p, studentId: e.target.value }))}
                  required
                />
                <input
                  className="sr-demand-input"
                  type="text"
                  placeholder={manualStudentMeta.loading ? "Fetching student name..." : "Student name (auto)"}
                  value={manualStudentMeta.name}
                  disabled
                />
                <input
                  className="sr-demand-input"
                  type="text"
                  placeholder={manualStudentMeta.loading ? "Fetching father name..." : "Father name (auto)"}
                  value={manualStudentMeta.fatherName}
                  disabled
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
                <input
                  className="sr-demand-input"
                  type="number"
                  min="0"
                  placeholder="Tuition amount"
                  value={demandForm.tuitionAmount}
                  onChange={(e) => setDemandForm((p) => ({ ...p, tuitionAmount: e.target.value }))}
                  required
                />
                <input
                  className="sr-demand-input"
                  type="number"
                  min="0"
                  placeholder="Hostel amount (optional)"
                  value={demandForm.hostelAmount}
                  onChange={(e) => setDemandForm((p) => ({ ...p, hostelAmount: e.target.value }))}
                />
                <div className="sr-demand-actions">
                  <button type="submit" className="sr-primary-btn" disabled={actionLoading}>
                    {actionLoading ? (
                      <>
                        <FiRefreshCw /> Creating...
                      </>
                    ) : (
                      <>
                        <FiPlusCircle /> Create Demand
                      </>
                    )}
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
                    {actionLoading ? (
                      <>
                        <FiRefreshCw /> Generating...
                      </>
                    ) : (
                      <>
                        <FiZap /> Generate Demand
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="sr-table-card">
            <div className="sr-table-head">
              <p><FiUser /> Student</p>
              <p><FiBookOpen /> Academic</p>
              <p><FiDollarSign /> Total</p>
              <p><FiCheckCircle /> Paid</p>
              <p><FiClock /> Due</p>
              <p><FiActivity /> Status</p>
              <p><FiEdit3 /> Action</p>
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
                  const studentName = demand?.studentMongoId?.userId?.name || "";
                  return (
                    <article key={demand._id} className="sr-table-row">
                      <div>
                        <p className="sr-student-name">{studentName || "Unknown Student"}</p>
                        <span className="sr-student-id">
                          {demand.studentId}
                          {` • ${relatedPayments.length} payment(s)`}
                        </span>
                      </div>
                      <div>
                        <p>{demand.academicYear}</p>
                        <span className="sr-pill">{formatSemesterLabel(demand.semesterNo, demand.scope)}</span>
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
                            <FiPlusCircle /> Record Payment
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
              <p>
                <FiCreditCard /> Record Payment
              </p>
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
                  {actionLoading ? (
                    <>
                      <FiRefreshCw /> Recording...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle /> Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="sr-table-card">
            <div className="sr-table-head">
              <p><FiUser /> Student</p>
              <p><FiDollarSign /> Amount</p>
              <p><FiCreditCard /> Mode</p>
              <p><FiActivity /> Status</p>
              <p><FiCalendar /> Created</p>
              <p><FiEdit3 /> Action</p>
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
                      <p className="sr-student-name">
                        {p.studentName || p?.demandId?.studentMongoId?.userId?.name || "Unknown Student"}
                      </p>
                      <span className="sr-student-id">{p.studentId}</span>
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
                          <FiCheckCircle /> Mark Success
                        </button>
                      )}
                      {p.status === "SUCCESS" && (
                        <button type="button" className="sr-action-btn sr-action-btn-danger" disabled={actionLoading}
                          onClick={() => handleStatusChange(p._id, "REFUNDED")}
                        >
                          <FiRotateCcw /> Refund
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
