import { Link } from 'react-router-dom'
import { FaArrowRightLong } from 'react-icons/fa6'
import { FiUsers, FiClock, FiMapPin, FiBookOpen } from 'react-icons/fi'
import './CourseCard.css'

function CourseCard({ course }) {
  const enrolledLabel =
    course.enrolled === null || course.enrolled === undefined
      ? 'N/A'
      : course.enrolled
  const creditsLabel =
    course.credits === null || course.credits === undefined
      ? 'N/A'
      : course.credits

  return (
    <Link
      to={`/faculty/course/${course.id}?groupId=${course.groupId}`}
      className="course-card"
    >
      <div className="course-head">
        <div className="course-badge">
          <FiBookOpen />
        </div>
        <div>
          <p className="course-code">{course.code}</p>
          <h3>{course.title}</h3>
          <p className="muted">{course.term}</p>
        </div>
      </div>

      <div className="course-meta">
        <div>
          <p className="label">Schedule</p>
          <span className="meta-icon"><FiClock /></span>
          <p>{course.schedule}</p>
        </div>
        <div>
          <p className="label">Room</p>
          <span className="meta-icon"><FiMapPin /></span>
          <p>{course.room}</p>
        </div>
        <div>
          <p className="label">Enrolled</p>
          <span className="meta-icon"><FiUsers /></span>
          <p>
            {enrolledLabel}
            {enrolledLabel === 'N/A' ? '' : ' students'}
          </p>
        </div>
      </div>
      <div className="course-footer">
        <span className="pill">
          {creditsLabel}
          {creditsLabel === 'N/A' ? '' : ' credits'}
        </span>
        <span className="cta">
          Take Attendance <FaArrowRightLong />
        </span>
      </div>
    </Link>
  )
}

export default CourseCard
