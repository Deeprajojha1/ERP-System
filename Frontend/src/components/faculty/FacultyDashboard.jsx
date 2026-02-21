import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";
import CourseCard from "./CourseCard";
import InfoRow from "./InfoRow";
import {
  createFacultyLeave,
  selectFacultyLeaveCreating,
} from "../../redux/leavesSlice";
import "./FacultyDashboard.css";

function FacultyDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const requestSubmitting = useSelector(selectFacultyLeaveCreating);

  const user = userData?.user;
  const roleDetails = userData?.roleDetails;

  const [requestStatus, setRequestStatus] = useState(null);
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
            term: course.semester
              ? `Semester ${course.semester}`
              : "Current Term",
            scheduleParts: [],
            room: group.roomNo || "N/A",
            enrolled: group.studentIds?.length ?? null,
            credits: course.credit ?? null,
          });
        }

        const entry = map.get(key);
        entry.scheduleParts.push(`${day} (${slot})`);
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

  const leaveTypeMap = {
    "Casual Leave": "casual",
    "Sick Leave": "sick",
    "Annual Leave": "annual",
    "Special Leave": "special",
    Other: "other",
  };

  const toDDMMYYYY = (isoDate) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}.${m}.${y}`;
  };

  const handleRequestChange = (e) => {
    const { name, value } = e.target;
    setRequestForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestStatus(null);

    try {
      const facultyId = roleDetails?._id;
      const reason = requestForm.reason.trim();
      const dateFrom = toDDMMYYYY(requestForm.fromDate);
      const dateTo = toDDMMYYYY(requestForm.toDate);
      const type = leaveTypeMap[requestForm.leaveType] || "other";

      const res = await dispatch(
        createFacultyLeave({
          faculty: facultyId,
          dateFrom,
          dateTo,
          type,
          status: "pending",
          reason,
        })
      ).unwrap();

      toast.success(res?.message || "Leave applied successfully");
      setIsRequestOpen(false);
    } catch (error) {
      toast.error(error?.message || "Unable to submit request.");
    }
  };

  return (
    <section className="dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Welcome back, {name}</h1>
        <p className="muted">
          Manage your courses and attendance from one place
        </p>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3 className="courseCount">{courses.length}</h3>
          <span>Active Courses</span>
        </div>

        <div className="stat-card">
          <h3 className="stuCount">{totalStudents}</h3>
          <span>Total Students</span>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="dashboard-main">
        {/* PROFILE */}
        <div className="panel profile">
          <div className="profile-header">
            <div className="avatar">{name.charAt(0)}</div>
            <div>
              <h2>{name}</h2>
              <p className="muted">
                {designation} — {department}
              </p>
            </div>
          </div>

          <InfoRow label="ID" value={employeeId} />
          <InfoRow label="Email" value={email} />
          <InfoRow label="Phone" value={phone} />
          <InfoRow label="Joining Date" value={joiningDate} />
        </div>

        {/* COURSES */}
        <div className="panel courses">
          <div className="courses-header">
            <h2>Your Courses</h2>
            <button onClick={() => setIsRequestOpen(true)}>
              + Add Request
            </button>
          </div>

          <div className="course-list">
            {courses.map((course) => (
              <CourseCard
                key={`${course.id}-${course.groupId}`}
                course={course}
              />
            ))}
          </div>
        </div>
      </div>

      {/* FLOATING BUTTON */}
      <button
        className="leaves-btn"
        onClick={() => navigate("/faculty/leaves")}
      >
        <FiFileText /> Leaves
      </button>
    </section>
  );
}

export default FacultyDashboard;
