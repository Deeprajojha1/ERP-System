import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiHome, FiRefreshCw, FiSend, FiUsers } from "react-icons/fi";
import axiosInstance from "../../utils/axiosInstance";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "../../Admin/constants/loadStates";
import emptyStateImg from "../../assets/empty-state.svg";
import "./StudentHostel.css";

const CATEGORY_OPTIONS = [
  { value: "Holiday", label: "Holiday" },
  { value: "Weekend", label: "Weekend" },
  { value: "Festival", label: "Festival" },
  { value: "Medical", label: "Medical" },
  { value: "Emergency", label: "Emergency" },
  { value: "Other", label: "Other" },
];

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const statusClass = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "cancelled") return "cancelled";
  return "pending";
};

const complaintStatusClass = (status = "") => {
  const normalized = String(status || "").toLowerCase().replace(/\s+/g, "-");
  if (normalized === "resolved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "in-progress") return "pending";
  return "pending";
};

const currentTimeInputValue = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StudentHostel = () => {
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState("");
  const [allocation, setAllocation] = useState(null);

  const [menuLoading, setMenuLoading] = useState(false);
  const [menu, setMenu] = useState(null);

  const [holidayLoading, setHolidayLoading] = useState(false);
	  const [holidayListLoading, setHolidayListLoading] = useState(false);
	  const [holidayList, setHolidayList] = useState([]);
	  const [holidayForm, setHolidayForm] = useState(() => ({
	    category: "Holiday",
	    outingTime: currentTimeInputValue(),
	    incomingTime: "23:00",
	    destination: "",
      emergencyContact: "",
      parentContact: "",
	    reason: "",
	  }));
  const [activeQrLoading, setActiveQrLoading] = useState(false);
  const [activeQr, setActiveQr] = useState(null);
  const activeQrRequestSeqRef = useRef(0);

	  const [complaintLoading, setComplaintLoading] = useState(false);
	  const [complaintListLoading, setComplaintListLoading] = useState(false);
	  const [complaintList, setComplaintList] = useState([]);
	  const [complaintForm, setComplaintForm] = useState(() => ({
	    issueType: "Cleanliness",
	    priority: "medium",
	    description: "",
	  }));

  const hostelId = allocation?.hostel?.id || allocation?.hostel?._id || "";
  const loadStateText = useMemo(() => {
    const hit = ADMIN_LOAD_STATE_OPTIONS.find((item) => item.id === loadState);
    return hit?.text || "Initial";
  }, [loadState]);

  const fetchContext = useCallback(async () => {
    try {
      setContextLoading(true);
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      setContextError("");
      const response = await axiosInstance.get("/api/student/hostel/context");
      const nextAllocation = response?.data?.allocation || null;
      setAllocation(nextAllocation);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      return nextAllocation;
    } catch (error) {
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      setContextError(error?.response?.data?.message || "Failed to load hostel details.");
      setAllocation(null);
      return null;
    } finally {
      setContextLoading(false);
    }
  }, []);

  const fetchMenu = useCallback(async (id) => {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) {
      setMenu(null);
      return;
    }
    try {
      setMenuLoading(true);
      const response = await axiosInstance.get(`/api/hostels/${normalizedId}/menu`);
      setMenu(response?.data || null);
    } catch (error) {
      void error;
      setMenu(null);
    } finally {
      setMenuLoading(false);
    }
  }, []);

	  const fetchHolidayList = useCallback(async () => {
	    try {
	      setHolidayListLoading(true);
	      const response = await axiosInstance.get("/api/student/hostel/holiday");
	      setHolidayList(Array.isArray(response?.data?.outpasses) ? response.data.outpasses : []);
	    } catch (error) {
	      void error;
	      setHolidayList([]);
	    } finally {
	      setHolidayListLoading(false);
	    }
	  }, []);

	  const fetchComplaintList = useCallback(async () => {
	    try {
	      setComplaintListLoading(true);
	      const response = await axiosInstance.get("/api/student/hostel/complaints");
	      setComplaintList(Array.isArray(response?.data?.complaints) ? response.data.complaints : []);
	    } catch (error) {
	      void error;
	      setComplaintList([]);
	    } finally {
	      setComplaintListLoading(false);
	    }
	  }, []);

  const fetchActiveQr = useCallback(async () => {
    const requestSeq = activeQrRequestSeqRef.current + 1;
    activeQrRequestSeqRef.current = requestSeq;
    try {
      setActiveQrLoading(true);
      const response = await axiosInstance.get("/api/student/hostel/holiday/active-qr");
      if (requestSeq === activeQrRequestSeqRef.current) {
        setActiveQr(response?.data || null);
      }
    } catch (error) {
      void error;
      if (requestSeq === activeQrRequestSeqRef.current) {
        setActiveQr(null);
      }
    } finally {
      if (requestSeq === activeQrRequestSeqRef.current) {
        setActiveQrLoading(false);
      }
    }
  }, []);

	  useEffect(() => {
	    let isMounted = true;
	    (async () => {
	      const nextAllocation = await fetchContext();
	      if (!isMounted) return;
	      if (nextAllocation?.hostel?.id) {
	        await Promise.all([fetchMenu(nextAllocation.hostel.id), fetchHolidayList(), fetchComplaintList(), fetchActiveQr()]);
	      } else {
	        setMenu(null);
	        setHolidayList([]);
	        setComplaintList([]);
          setActiveQr(null);
	      }
	    })();

	    return () => {
	      isMounted = false;
	    };
	  }, [fetchContext, fetchMenu, fetchHolidayList, fetchComplaintList, fetchActiveQr]);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchHolidayList();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchHolidayList]);

  const menuByDay = useMemo(() => {
    const items = Array.isArray(menu?.foodMenu) ? menu.foodMenu : [];
    const map = new Map();
    items.forEach((item) => {
      if (!item?.day) return;
      map.set(item.day, item);
    });
    const order = Array.isArray(menu?.availableDays) && menu.availableDays.length
      ? menu.availableDays
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return order.map((day) => ({
      day,
      breakfast: map.get(day)?.breakfast || "",
      lunch: map.get(day)?.lunch || "",
      snacks: map.get(day)?.snacks || "",
      dinner: map.get(day)?.dinner || "",
      breakfastTime: map.get(day)?.breakfastTime || "07:30 AM",
      lunchTime: map.get(day)?.lunchTime || "01:00 PM",
      snacksTime: map.get(day)?.snacksTime || "05:00 PM",
      dinnerTime: map.get(day)?.dinnerTime || "08:00 PM",
      notes: map.get(day)?.notes || "",
    }));
  }, [menu]);

	  const handleRefresh = async () => {
	    const nextAllocation = await fetchContext();
	    if (nextAllocation?.hostel?.id) {
	      await Promise.all([fetchMenu(nextAllocation.hostel.id), fetchHolidayList(), fetchComplaintList(), fetchActiveQr()]);
	    } else {
	      setMenu(null);
	      setHolidayList([]);
	      setComplaintList([]);
        setActiveQr(null);
	    }
	  };

	  const handleHolidaySubmit = async (e) => {
	    e.preventDefault();
	    if (!hostelId) return;

	    const payload = {
	      category: holidayForm.category,
	      outingTime: holidayForm.outingTime,
	      incomingTime: holidayForm.incomingTime,
	      destination: holidayForm.destination,
        emergencyContact: holidayForm.emergencyContact,
        parentContact: holidayForm.parentContact,
	      reason: holidayForm.reason,
	    };

    try {
	      setHolidayLoading(true);
	      await axiosInstance.post("/api/student/hostel/holiday", payload);
	      setHolidayForm((prev) => ({
          ...prev,
          destination: "",
          emergencyContact: "",
          parentContact: "",
          reason: "",
        }));
	      await Promise.all([fetchHolidayList(), fetchActiveQr()]);
	    } catch (error) {
	      const message = error?.response?.data?.message || "Failed to submit holiday request.";
	      alert(message);
    } finally {
      setHolidayLoading(false);
	    }
	  };

	  const handleComplaintSubmit = async (e) => {
	    e.preventDefault();
	    if (!allocation?.room?.id) return;

	    const payload = {
	      issueType: complaintForm.issueType,
	      priority: complaintForm.priority,
	      description: complaintForm.description,
	      roomId: allocation.room.id,
	    };

	    try {
	      setComplaintLoading(true);
	      await axiosInstance.post("/api/student/hostel/complaints", payload);
	      setComplaintForm((prev) => ({ ...prev, description: "" }));
	      await fetchComplaintList();
	    } catch (error) {
	      const message = error?.response?.data?.message || "Failed to submit complaint.";
	      alert(message);
	    } finally {
	      setComplaintLoading(false);
	    }
	  };

  if (contextLoading) {
    return (
      <section className="student-hostel-page student-hostel-page--center">
        <div className="student-hostel-state student-hostel-state--minimal" role="status" aria-live="polite">
          <div className="student-dashboard-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="student-hostel-state-copy">
            <p className="student-hostel-state-title">Loading Hostel</p>
            <p className="student-hostel-state-sub">Fetching room allocation and menu…</p>
          </div>
        </div>
      </section>
    );
  }

  if (contextError) {
    return (
      <section className="student-hostel-page student-hostel-page--center">
        <div className="student-hostel-state student-hostel-state--error">
          <img
            src={emptyStateImg}
            alt=""
            className="student-hostel-state-illustration"
            aria-hidden="true"
          />
          <div className="student-hostel-state-copy">
            <p className="student-hostel-state-title">Couldn’t load hostel details</p>
            <p className="student-hostel-state-sub">{contextError}</p>
          </div>
          <button type="button" className="student-hostel-btn" onClick={handleRefresh}>
            <FiRefreshCw /> Retry
          </button>
        </div>
      </section>
    );
  }

  if (!allocation?.hostel?.id || !allocation?.room?.id) {
    return (
      <section className="student-hostel-page">
        <div className="student-hostel-empty">
          <div className="student-hostel-empty-icon">
            <FiHome />
          </div>
          <h3>Hostel</h3>
          <p>You don’t have an active hostel room allocation.</p>
        </div>
      </section>
    );
  }

  const roommates = Array.isArray(allocation?.room?.roommates) ? allocation.room.roommates : [];

  return (
    <section className="student-hostel-page">
      <header className="student-hostel-head">
        <div>
          <h2>Hostel</h2>
          <p className="student-hostel-subtitle">
            {allocation.hostel?.name || "Hostel"} • {allocation.hostel?.type || "—"}
          </p>
        </div>
        <div className="student-hostel-head-actions">
          <span className={`student-hostel-load-chip ${loadState}`}>
            {loadStateText}
            {loadState === ADMIN_LOAD_STATES.PENDING ? (
              <span className="student-hostel-chip-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            ) : null}
          </span>
          <button type="button" className="student-hostel-btn" onClick={handleRefresh}>
            <FiRefreshCw />
            Refresh
          </button>
        </div>
      </header>

      <section className="student-hostel-grid">
        <article className="student-hostel-card">
          <div className="student-hostel-card-head">
            <h3>Room Details</h3>
            <span className="student-hostel-chip">Active</span>
          </div>
          <div className="student-hostel-kv">
            <div>
              <span>Room</span>
              <strong>{allocation.room?.roomNumber || "—"}</strong>
            </div>
            <div>
              <span>Floor</span>
              <strong>{allocation.room?.floorNumber || "—"}</strong>
            </div>
          </div>
          <div className="student-hostel-roommates">
            <div className="student-hostel-roommates-head">
              <div className="student-hostel-roommates-title">
                <FiUsers />
                <span>Roommates</span>
              </div>
              <span className="student-hostel-chip">{roommates.length}</span>
            </div>
            {roommates.length === 0 ? (
              <p className="student-hostel-muted">No roommates assigned yet.</p>
            ) : (
              <div className="student-hostel-roommates-list">
                {roommates.map((mate) => {
                  const name = String(mate?.name || "").trim();
                  const initials = name
                    ? name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join("")
                    : "ST";
                  return (
                    <div key={mate?.id || mate?.email || mate?.enrollmentNumber} className="student-hostel-roommate">
                      <div className="student-hostel-roommate-avatar">{initials}</div>
                      <div className="student-hostel-roommate-copy">
                        <strong>{name || mate?.enrollmentNumber || "Student"}</strong>
                        <span>{mate?.email || mate?.enrollmentNumber || ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className="student-hostel-card student-hostel-card--menu">
          <div className="student-hostel-card-head">
            <h3>Food Menu</h3>
            <span className="student-hostel-chip">
              {menuLoading ? "Loading…" : "Weekly"}
            </span>
          </div>
          <div className="student-hostel-menu">
            {menuByDay.map((day) => (
              <div key={day.day} className="student-hostel-menu-row">
                <div className="student-hostel-menu-day">{day.day}</div>
                <div className="student-hostel-menu-items">
                  <div>
                    <div className="student-hostel-meal-head">
                      <span>Breakfast</span>
                      <em>{day.breakfastTime}</em>
                    </div>
                    <p>{day.breakfast || "—"}</p>
                  </div>
                  <div>
                    <div className="student-hostel-meal-head">
                      <span>Lunch</span>
                      <em>{day.lunchTime}</em>
                    </div>
                    <p>{day.lunch || "—"}</p>
                  </div>
                  <div>
                    <div className="student-hostel-meal-head">
                      <span>Snacks</span>
                      <em>{day.snacksTime}</em>
                    </div>
                    <p>{day.snacks || "—"}</p>
                  </div>
                  <div>
                    <div className="student-hostel-meal-head">
                      <span>Dinner</span>
                      <em>{day.dinnerTime}</em>
                    </div>
                    <p>{day.dinner || "—"}</p>
                  </div>
                </div>
                {day.notes ? (
                  <div className="student-hostel-menu-notes">
                    <span>Notes</span>
                    <p>{day.notes}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>

	        <article className="student-hostel-card student-hostel-card--holiday">
	          <div className="student-hostel-card-head">
	            <h3>Holiday Apply</h3>
	            <span className="student-hostel-chip">Category Required</span>
	          </div>
	          <form className="student-hostel-form" onSubmit={handleHolidaySubmit}>
	            <div className="student-hostel-form-row">
              <label>
                Category
                <select
                  value={holidayForm.category}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Outing Time
                <input
                  type="time"
                  value={holidayForm.outingTime}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, outingTime: e.target.value }))}
                  required
                />
              </label>
	              <label>
	                Incoming Time
	                <input
	                  type="time"
	                  value={holidayForm.incomingTime}
	                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, incomingTime: e.target.value }))}
                    required
	                />
	              </label>
	            </div>
	            <label className="student-hostel-form-wide">
	              Destination (required)
	              <input
	                value={holidayForm.destination}
	                onChange={(e) => setHolidayForm((prev) => ({ ...prev, destination: e.target.value }))}
	                placeholder="Where are you going?"
	                required
	              />
	            </label>
            <div className="student-hostel-form-row">
              <label>
                Emergency Contact
                <input
                  value={holidayForm.emergencyContact}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="10-digit number"
                />
              </label>
              <label>
                Parent Contact
                <input
                  value={holidayForm.parentContact}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, parentContact: e.target.value }))}
                  placeholder="10-digit number"
                />
              </label>
            </div>
	            <label className="student-hostel-form-reason">
	              Reason (optional)
	              <textarea
                rows={3}
                value={holidayForm.reason}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Write a short reason…"
              />
            </label>
            <button type="submit" className="student-hostel-btn student-hostel-btn--primary" disabled={holidayLoading}>
              <FiSend />
              {holidayLoading ? "Submitting…" : "Submit Request"}
            </button>
          </form>

          <div className="student-hostel-list-head">
            <h4>My Active QR</h4>
            <span className="student-hostel-chip">
              {activeQrLoading ? "Loading..." : activeQr?.qrToken ? "Available" : "Not Issued"}
            </span>
          </div>
          {activeQr?.qrToken ? (
            <div className="student-hostel-request">
              <div className="student-hostel-request-main">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeQr.qrToken)}`}
                  alt="Outpass QR Code"
                  style={{ width: 220, height: 220, borderRadius: 12, border: "1px solid #dbe6f5" }}
                />
                <p className="student-hostel-request-meta" style={{ marginTop: 10 }}>
                  Expires: {formatDateTime(activeQr?.expiresAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="student-hostel-muted">QR will appear here after warden approval.</p>
          )}

          <div className="student-hostel-list-head">
            <h4>My Requests</h4>
            <span className="student-hostel-chip">{holidayListLoading ? "Loading…" : `${holidayList.length}`}</span>
          </div>

          {holidayList.length === 0 ? (
            <p className="student-hostel-muted">No holiday requests yet.</p>
          ) : (
            <div className="student-hostel-requests">
              {holidayList.map((item) => (
                <div key={item._id} className="student-hostel-request">
                  <div className="student-hostel-request-main">
                    <div className="student-hostel-request-title">
                      <strong>{item.category}</strong>
                      <span className={`student-hostel-status ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="student-hostel-request-meta">
                      {formatDateTime(item.dateFrom)} → {formatDateTime(item.dateTo)}
                      {item?.room?.roomNumber ? ` • Room ${item.room.roomNumber}` : ""}
                    </div>
                    {(item.exitTime || item.entryTime) ? (
                      <div className="student-hostel-request-meta">
                        {item.exitTime ? `Exit: ${formatDateTime(item.exitTime)}` : "Exit: -"}
                        {" | "}
                        {item.entryTime ? `Entry: ${formatDateTime(item.entryTime)}` : "Entry: -"}
                      </div>
                    ) : null}
	                    {item.destination ? (
	                      <p className="student-hostel-request-reason">
	                        <strong>Destination:</strong> {item.destination}
	                      </p>
	                    ) : null}
	                    {item.reason ? <p className="student-hostel-request-reason">{item.reason}</p> : null}
	                  </div>
                </div>
              ))}
            </div>
	          )}
	        </article>

	        <article className="student-hostel-card student-hostel-card--complaint">
	          <div className="student-hostel-card-head">
	            <h3>Complaint to Warden</h3>
	            <span className="student-hostel-chip">Helpdesk</span>
	          </div>

	          <form className="student-hostel-form" onSubmit={handleComplaintSubmit}>
	            <div className="student-hostel-form-row">
	              <label>
	                Issue Type
	                <select
	                  value={complaintForm.issueType}
	                  onChange={(e) => setComplaintForm((prev) => ({ ...prev, issueType: e.target.value }))}
	                >
	                  <option value="Cleanliness">Cleanliness</option>
	                  <option value="Water">Water</option>
	                  <option value="Electricity">Electricity</option>
	                  <option value="Furniture">Furniture</option>
	                  <option value="Security">Security</option>
	                  <option value="Other">Other</option>
	                </select>
	              </label>
	              <label>
	                Priority
	                <select
	                  value={complaintForm.priority}
	                  onChange={(e) => setComplaintForm((prev) => ({ ...prev, priority: e.target.value }))}
	                >
	                  <option value="low">Low</option>
	                  <option value="medium">Medium</option>
	                  <option value="high">High</option>
	                </select>
	              </label>
	              <label>
	                Room
	                <input value={allocation?.room?.roomNumber || ""} readOnly />
	              </label>
	            </div>

	            <label className="student-hostel-form-reason">
	              Complaint Details (min 10 chars)
	              <textarea
	                rows={3}
	                value={complaintForm.description}
	                onChange={(e) => setComplaintForm((prev) => ({ ...prev, description: e.target.value }))}
	                placeholder="Describe the issue clearly so the warden can take action…"
	                required
	              />
	            </label>

	            <button type="submit" className="student-hostel-btn student-hostel-btn--primary" disabled={complaintLoading}>
	              <FiAlertCircle />
	              {complaintLoading ? "Submitting…" : "Submit Complaint"}
	            </button>
	          </form>

	          <div className="student-hostel-list-head">
	            <h4>My Complaints</h4>
	            <span className="student-hostel-chip">{complaintListLoading ? "Loading…" : `${complaintList.length}`}</span>
	          </div>

	          {complaintList.length === 0 ? (
	            <p className="student-hostel-muted">No complaints raised yet.</p>
	          ) : (
	            <div className="student-hostel-requests">
	              {complaintList.map((item) => (
	                <div key={item.id || item._id} className="student-hostel-request">
	                  <div className="student-hostel-request-main">
	                    <div className="student-hostel-request-title">
	                      <strong>{item.issueType || "Complaint"}</strong>
	                      <span className={`student-hostel-status ${complaintStatusClass(item.status)}`}>
	                        {String(item.status || "pending").replace(/-/g, " ")}
	                      </span>
	                    </div>
	                    <div className="student-hostel-request-meta">
	                      {formatDate(item.createdAt || item.created_at || item.date)}
	                      {item?.room?.roomNumber ? ` • Room ${item.room.roomNumber}` : ""}
	                      {item?.priority ? ` • ${String(item.priority).toUpperCase()}` : ""}
	                    </div>
	                    {item.description ? <p className="student-hostel-request-reason">{item.description}</p> : null}
	                  </div>
	                </div>
	              ))}
	            </div>
	          )}
	        </article>
	      </section>
	    </section>
	  );
};

export default StudentHostel;

