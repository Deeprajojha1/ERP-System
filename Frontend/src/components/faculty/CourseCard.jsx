import { Link } from 'react-router-dom'
import { FaArrowRightLong } from 'react-icons/fa6'
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
      <div>
        <p className="course-code">{course.code}</p>
        <h3>{course.title}</h3>
        <p className="muted">{course.term}</p>
      </div>
      <div className="course-meta">
        <div>
          <p className="label">Schedule</p>
          <p>{course.schedule}</p>
        </div>
        <div>
          <p className="label">Room</p>
          <p>{course.room}</p>
        </div>
        <div>
          <p className="label">Enrolled</p>
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
          Take Attendance <FaArrowRightLong className="cta-icon" />
        </span>
      </div>
    </Link>
  )
}

export default CourseCard
