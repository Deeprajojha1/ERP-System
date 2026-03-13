import { useOutletContext } from "react-router-dom";
import "./ParentPortal.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
};

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const ParentHostelAttendance = () => {
  const { data } = useOutletContext();
  const hostel = data?.hostel || {};
  const room = hostel?.room || {};
  const wardenContact = hostel?.wardenContact || null;
  const wardenContacts = Array.isArray(hostel?.wardenContacts) ? hostel.wardenContacts : [];
  const roommates = Array.isArray(room?.roommates) ? room.roommates : [];
  const hostelDailyAttendance = Array.isArray(hostel?.dailyAttendance) ? hostel.dailyAttendance : [];

  return (
    <section className="parent-card parent-card--wide parent-section">
      <h3>Hostel Module</h3>
      {!hostel?.isHosteller ? (
        <p className="parent-muted">Student is not currently an active hosteller.</p>
      ) : (
        <>
          <div className="parent-grid" style={{ marginTop: 14 }}>
            <section className="parent-card">
              <h3>Ward Hostel Details</h3>
              <div className="parent-kv"><span>Hostel Name</span><strong>{hostel?.hostel?.name || "N/A"}</strong></div>
              <div className="parent-kv"><span>Hostel Type</span><strong>{hostel?.hostel?.type || "N/A"}</strong></div>
              <div className="parent-kv"><span>Room No</span><strong>{room?.roomNumber || "N/A"}</strong></div>
              <div className="parent-kv"><span>Floor</span><strong>{room?.floorNumber ?? "N/A"}</strong></div>
              <div className="parent-kv"><span>Room Price</span><strong>{Number(room?.price || 0) > 0 ? `${formatAmount(room.price)} / ${room?.priceType || "Yearly"}` : "N/A"}</strong></div>
            </section>

            <section className="parent-card">
              <h3>Warden Contact</h3>
              <div className="parent-kv"><span>Name</span><strong>{wardenContact?.name || "N/A"}</strong></div>
              <div className="parent-kv"><span>Phone</span><strong>{wardenContact?.phoneNumber || "N/A"}</strong></div>
              <div className="parent-kv"><span>Email</span><strong>{wardenContact?.email || "N/A"}</strong></div>
            </section>
          </div>

          <section className="parent-card parent-card--wide">
            <h3>Roommates</h3>
            {roommates.length === 0 ? (
              <p className="parent-muted">No roommates found in this room.</p>
            ) : (
              <div className="parent-table-wrap">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Enrollment No</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roommates.map((mate) => (
                      <tr key={mate.id || `${mate.name}-${mate.enrollmentNumber}`}>
                        <td>{mate.name || "N/A"}</td>
                        <td>{mate.enrollmentNumber || "N/A"}</td>
                        <td>{mate.email || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {wardenContacts.length > 1 && (
            <section className="parent-card parent-card--wide">
              <h3>All Assigned Wardens</h3>
              <div className="parent-table-wrap">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wardenContacts.map((contact, index) => (
                      <tr key={contact.id || `${contact.name}-${index}`}>
                        <td>{contact.name || "N/A"}</td>
                        <td>{contact.phoneNumber || "N/A"}</td>
                        <td>{contact.email || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="parent-card parent-card--wide">
            <h3>Hostel Daily Attendance</h3>
            {hostelDailyAttendance.length === 0 ? (
              <p className="parent-muted">No daily attendance entries found.</p>
            ) : (
              <div className="parent-table-wrap">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Present Sessions</th>
                      <th>Absent Sessions</th>
                      <th>Total Sessions</th>
                      <th>Day Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hostelDailyAttendance.map((row) => (
                      <tr key={row.date}>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.presentSessions ?? 0}</td>
                        <td>{row.absentSessions ?? 0}</td>
                        <td>{row.totalSessions ?? 0}</td>
                        <td>{row.dayPercentage ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

export default ParentHostelAttendance;
