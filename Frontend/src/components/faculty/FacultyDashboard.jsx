import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import CourseCard from "./CourseCard";
import InfoRow from "./InfoRow";
import "./FacultyDashboard.css";

function FacultyDashboard() {
  const userData = useSelector((state) => state.user.userData);
  const apiBase = useSelector((state) => state.config.apiBase);
  const user = userData?.user;
  const roleDetails = userData?.roleDetails;
  const [departments, setDepartments] = useState([]);
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    leaveType: "Sick Leave",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const name = user?.name || "Faculty Member";
  const department = roleDetails?.department?.name || "Department";
  const designation = roleDetails?.designation || "Faculty";
  const email = user?.email || "N/A";
  const phone = user?.phoneNumber || "N/A";
  const employeeId = roleDetails?.employeeId || "N/A";
  const joiningDate = roleDetails?.joiningDate
    ? new Date(roleDetails.joiningDate).toLocaleDateString()
    : "N/A";

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(
          `${apiBase}/admin/department`,
          { withCredentials: true }
        );
        setDepartments(response.data?.departments || []);
      } catch (error) {
        console.error(
          "Fetch departments failed:",
          error.response?.data || error.message
        );
      }
    };

    if (apiBase) {
      fetchDepartments();
    }
  }, [apiBase]);

  const courses = useMemo(() => {
    const routine = roleDetails?.routine || {};
    const map = new Map();

    Object.entries(routine).forEach(([day, slots]) => {
      Object.entries(slots || {}).forEach(([slot, item]) => {
        const course = item?.course;
        const group = item?.group;
        if (!course || !group) return;

        const courseId = course._id || course.id;
        const groupId = group._id || group.id;
        if (!courseId || !groupId) return;

        const key = `${courseId}-${groupId}`;
        if (!map.has(key)) {
          map.set(key, {
            id: courseId,
            groupId,
            code: course.code || "N/A",
            title: course.courseName || course.title || "Untitled Course",
            term: course.semester ? `Semester ${course.semester}` : "Current Term",
            scheduleParts: [],
            room: group.roomNo || "N/A",
            enrolled: group.studentIds?.length ?? null,
            credits: course.credit ?? null,
          });
        }

        const entry = map.get(key);
        const dayLabel = day
          ? `${day.charAt(0).toUpperCase()}${day.slice(1)}`
          : "Day";
        entry.scheduleParts.push(`${dayLabel} (${slot})`);
      });
    });

    return Array.from(map.values()).map((entry) => ({
      ...entry,
      schedule: entry.scheduleParts.join(", "),
    }));
  }, [roleDetails?.routine]);

  const totalStudents = courses.reduce(
    (sum, course) => sum + (Number(course.enrolled) || 0),
    0
  );

  const handleRequestChange = (event) => {
    const { name, value } = event.target;
    setRequestForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    setRequestStatus(null);
    try {
      setRequestSubmitting(true);
      await axios.post(
        `${apiBase}/admin/faculty`,
        requestForm,
        { withCredentials: true }
      );
      setRequestStatus({
        type: "success",
        message: "Leave request submitted.",
      });
      setRequestForm((prev) => ({
        ...prev,
        leaveType: "Sick Leave",
        fromDate: "",
        toDate: "",
        reason: "",
      }));
    } catch (error) {
      console.error(
        "Faculty request failed:",
        error.response?.data || error.message
      );
      setRequestStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Unable to submit request.",
      });
    } finally {
      setRequestSubmitting(false);
    }
  };

  return (
    <section className="grid faculty-split">
      <article className="panel profile">
        <div className="profile-header">
          <div className="avatar">{name.charAt(0)}</div>
          <div>
            <h1>{name}</h1>
            <p className="muted">
              {designation} - {department}
            </p>
          </div>
        </div>
        <div className="profile-details">
          <InfoRow label="ID" value={employeeId} />
          <InfoRow label="Email" value={email} />
          <InfoRow label="Phone" value={phone} />
          <InfoRow label="Joining Date" value={joiningDate} />
        </div>
        <div className="profile-footer">
          <div>
            <p className="metric">{courses.length}</p>
            <p className="muted">Active Courses</p>
          </div>
          <div>
            <p className="metric">{totalStudents}</p>
            <p className="muted">Total Students</p>
          </div>
        </div>
      </article>

      <article className="panel courses">
        <div className="panel-title">
          <div>
            <h2>Your Courses</h2>
            <p className="muted">Select a course to take attendance.</p>
          </div>
          <div className="course-actions">
            <div className="chip accent">Attendance Ready</div>
            <button
              className="request-open-btn"
              type="button"
              onClick={() => setIsRequestOpen(true)}
            >
              + Add Request
            </button>
          </div>
        </div>
        <div className="course-list">
          {courses.length === 0 ? (
            <p className="muted">No courses assigned yet.</p>
          ) : (
            courses.map((course) => (
              <CourseCard
                key={`${course.id}-${course.groupId}`}
                course={course}
              />
            ))
          )}
        </div>
      </article>

      <div
        className={`faculty-request-modal ${
          isRequestOpen ? "show" : ""
        }`}
      >
        <div
          className="faculty-request-backdrop"
          onClick={() => setIsRequestOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
        <div className="faculty-request-card">
          <div className="faculty-request-head">
            <h1>New Leave Request</h1>
            <p>Create a new leave request</p>
          </div>
          <form className="request-form" onSubmit={handleRequestSubmit}>
            <label>
              Leave Type
              <select
                name="leaveType"
                value={requestForm.leaveType}
                onChange={handleRequestChange}
              >
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Annual Leave</option>
                <option>Special Leave</option>
              </select>
            </label>
            <div className="request-row">
              <label>
                From Date
                <input
                  type="date"
                  name="fromDate"
                  value={requestForm.fromDate}
                  onChange={handleRequestChange}
                />
              </label>
              <label>
                To Date
                <input
                  type="date"
                  name="toDate"
                  value={requestForm.toDate}
                  onChange={handleRequestChange}
                />
              </label>
            </div>
            <label>
              Reason
              <textarea
                name="reason"
                value={requestForm.reason}
                onChange={handleRequestChange}
                rows={5}
                placeholder="Enter reason for leave..."
              />
            </label>
            {requestStatus && (
              <p className={`request-status ${requestStatus.type}`}>
                {requestStatus.message}
              </p>
            )}
            <div className="request-actions">
              <button
                type="button"
                className="request-cancel"
                onClick={() => setIsRequestOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="request-submit"
                disabled={requestSubmitting}
              >
                {requestSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default FacultyDashboard
