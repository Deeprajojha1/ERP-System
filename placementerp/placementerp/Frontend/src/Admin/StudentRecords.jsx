import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createFeeDemand,
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

const StudentRecords = () => {
  const dispatch = useDispatch();
  const demands = useSelector(selectFeeDemands);
  const payments = useSelector(selectFeePayments);
  const loading = useSelector(selectFeeLoading);
  const actionLoading = useSelector(selectFeeActionLoading);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [demandForm, setDemandForm] = useState({
    studentMongoId: "",
    studentId: "",
    academicYear: "",
    semesterNo: "1",
    dueDate: "",
    breakdown: "TUITION:0",
  });

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

  return (
    <div className="student-records-page">
      <header className="sr-hero">
        <div>
          <p className="sr-eyebrow">Student Fee Records</p>
          <h1>Demands and payments</h1>
          <p className="sr-supporting">
            Integrated with <code>/api/admin/fee/demand</code> and{" "}
            <code>/api/admin/fee/payment</code>.
          </p>
        </div>
      </header>

      <section className="sr-controls">
        <div className="sr-search">
          <input
            type="search"
            placeholder="Search by student id..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
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
      </section>

      <section className="sr-table-card" style={{ marginBottom: "12px" }}>
        <div className="sr-table-head">
          <p>Create Fee Demand</p>
        </div>
        <form
          onSubmit={submitDemand}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px",
            padding: "10px",
          }}
        >
          <input
            type="text"
            placeholder="studentMongoId"
            value={demandForm.studentMongoId}
            onChange={(event) =>
              setDemandForm((prev) => ({ ...prev, studentMongoId: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="studentId (enrollment)"
            value={demandForm.studentId}
            onChange={(event) =>
              setDemandForm((prev) => ({ ...prev, studentId: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="academicYear (e.g. 2025-26)"
            value={demandForm.academicYear}
            onChange={(event) =>
              setDemandForm((prev) => ({ ...prev, academicYear: event.target.value }))
            }
            required
          />
          <input
            type="number"
            min="1"
            placeholder="semesterNo"
            value={demandForm.semesterNo}
            onChange={(event) =>
              setDemandForm((prev) => ({ ...prev, semesterNo: event.target.value }))
            }
            required
          />
          <input
            type="date"
            value={demandForm.dueDate}
            onChange={(event) =>
              setDemandForm((prev) => ({ ...prev, dueDate: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="breakdown (TUITION:50000,HOSTEL:10000)"
            value={demandForm.breakdown}
            onChange={(event) =>
              setDemandForm((prev) => ({ ...prev, breakdown: event.target.value }))
            }
            required
          />
          <button type="submit" className="sr-primary-btn" disabled={actionLoading}>
            {actionLoading ? "Creating..." : "Create Demand"}
          </button>
        </form>
      </section>

      <section className="sr-table-card">
        <div className="sr-table-head">
          <p>Student</p>
          <p>Academic</p>
          <p>Total</p>
          <p>Paid</p>
          <p>Due</p>
          <p>Status</p>
        </div>
        <div className="sr-table-body">
          {loading ? (
            <article className="sr-table-row">
              <p>Loading records...</p>
            </article>
          ) : filteredDemands.length === 0 ? (
            <article className="sr-table-row">
              <p>No demand records found</p>
            </article>
          ) : (
            filteredDemands.map((demand) => {
              const relatedPayments =
                paymentByDemand.get(String(demand._id)) || [];
              return (
                <article key={demand._id} className="sr-table-row">
                  <div>
                    <p className="sr-student-name">{demand.studentId}</p>
                    <span className="sr-student-id">
                      {relatedPayments.length} payment(s)
                    </span>
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
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default StudentRecords;
