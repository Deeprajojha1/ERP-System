import { useOutletContext } from "react-router-dom";
import "./ParentPortal.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
};

const ParentFees = () => {
  const { data } = useOutletContext();
  const feeSummary = data?.fees?.summary || {};
  const feeDemands = Array.isArray(data?.fees?.demands) ? data.fees.demands : [];
  const feePayments = Array.isArray(data?.fees?.payments) ? data.fees.payments : [];

  return (
    <>
      <div className="parent-grid parent-grid--fees">
        <section className="parent-card">
          <h3>Fee Summary</h3>
          <div className="parent-kv"><span>Total Demand</span><strong>{feeSummary.totalDemand ?? 0}</strong></div>
          <div className="parent-kv"><span>Total Paid</span><strong>{feeSummary.totalPaid ?? 0}</strong></div>
          <div className="parent-kv"><span>Total Due</span><strong>{feeSummary.totalDue ?? 0}</strong></div>
        </section>
      </div>

      <section className="parent-card parent-card--wide parent-section">
        <h3>Fee Demands</h3>
        {feeDemands.length === 0 ? (
          <p className="parent-muted">No fee demands found.</p>
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Category</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {feeDemands.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{row.feeCategory || row.feeType || "N/A"}</td>
                    <td>{row.totalAmount ?? 0}</td>
                    <td>{row.paidAmount ?? 0}</td>
                    <td>{row.dueAmount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="parent-card parent-card--wide parent-section">
        <h3>Fee Payments</h3>
        {feePayments.length === 0 ? (
          <p className="parent-muted">No fee payments found.</p>
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt/Txn</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {feePayments.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{row.receiptNo || row.transactionId || "N/A"}</td>
                    <td>{row.paymentMethod || "N/A"}</td>
                    <td>{row.amountPaid ?? row.amount ?? 0}</td>
                    <td>{row.status || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default ParentFees;
