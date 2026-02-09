import { useMemo } from "react";
import { useSelector } from "react-redux";
import CourseCard from "./CourseCard";
import InfoRow from "./InfoRow";
import "./FacultyDashboard.css";

function FacultyDashboard() {
  const userData = useSelector((state) => state.user.userData);
  const user = userData?.user;
  const roleDetails = userData?.roleDetails;

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

  return (
    <section className="grid">
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
          <div className="chip accent">Attendance Ready</div>
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
    </section>
  )
}

export default FacultyDashboard
