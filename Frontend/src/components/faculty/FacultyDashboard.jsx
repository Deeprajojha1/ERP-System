import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiFileText } from "react-icons/fi";
import { LayoutGrid, Rows3 } from "lucide-react";
import toast from "react-hot-toast";
import CourseCard from "./CourseCard";
import InfoRow from "./InfoRow";
import {
  createFacultyLeave,
  selectFacultyLeaveCreating,
} from "../../redux/leavesSlice";

function FacultyDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const requestSubmitting = useSelector(selectFacultyLeaveCreating);

  const user = userData?.user;
  const roleDetails = userData?.roleDetails;

  const [requestStatus, setRequestStatus] = useState(null);
  const [compactView, setCompactView] = useState(false);

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
            term: course.semester ? `Semester ${course.semester}` : "Current Term",
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
    const { name: fieldName, value } = e.target;
    setRequestForm((prev) => ({ ...prev, [fieldName]: value }));
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
      setRequestStatus("success");
    } catch (error) {
      toast.error(error?.message || "Unable to submit request.");
    }
  };

  return (
    <section className="relative w-full max-w-full overflow-x-hidden p-4 md:p-6">
      <div className="fixed right-4 top-[84px] z-[95] max-[640px]:right-3">
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100"
          onClick={() => setCompactView((v) => !v)}
          aria-pressed={compactView}
          aria-label={compactView ? "Switch to grid view" : "Switch to compact view"}
        >
          {compactView ? <LayoutGrid size={18} /> : <Rows3 size={18} />}
        </button>
      </div>

      <div className="mb-6 text-center md:text-left">
        <h1 className="m-0 text-2xl font-bold text-slate-900">Welcome back, {name}</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your courses and attendance from one place</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
          <h3 className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">{courses.length}</h3>
          <span>Active Courses</span>
        </div>

        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
          <h3 className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">{totalStudents}</h3>
          <span>Total Students</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-base font-bold text-blue-700">{name.charAt(0)}</div>
            <div>
              <h2 className="m-0 text-lg font-semibold text-slate-900">{name}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{designation} - {department}</p>
            </div>
          </div>

          <InfoRow label="ID" value={employeeId} />
          <InfoRow label="Email" value={email} />
          <InfoRow label="Phone" value={phone} />
          <InfoRow label="Joining Date" value={joiningDate} />
        </div>

        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-lg font-semibold text-slate-900">Your Courses</h2>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => navigate("/faculty/leaves")}
            >
              + Add Request
            </button>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${compactView ? "hidden" : ""}`}>
            {courses.length > 0 ? (
              courses.map((course) => (
                <CourseCard
                  key={`${course.id}-${course.groupId}`}
                  course={course}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/85 px-4 py-10 text-center text-slate-600">
                No courses are available in your routine yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-700 hover:to-blue-700"
        onClick={() => navigate("/faculty/leaves")}
      >
        <FiFileText /> Leaves
      </button>

      {/* Keep legacy request state references so behavior remains unchanged if form is reintroduced */}
      <form onSubmit={handleRequestSubmit} className="hidden">
        <input name="leaveType" value={requestForm.leaveType} onChange={handleRequestChange} />
        <input name="fromDate" value={requestForm.fromDate} onChange={handleRequestChange} />
        <input name="toDate" value={requestForm.toDate} onChange={handleRequestChange} />
        <input name="reason" value={requestForm.reason} onChange={handleRequestChange} />
        <button type="submit" disabled={requestSubmitting}>Submit</button>
        <span>{requestStatus || ""}</span>
      </form>
    </section>
  );
}

export default FacultyDashboard;

