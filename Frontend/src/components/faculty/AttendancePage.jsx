import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import "./AttendancePage.css";
import toast from "react-hot-toast";
import {
  FaArrowLeftLong,
  FaUserCheck,
  FaUserXmark,
  FaCheck,
  FaXmark,
  FaFloppyDisk,
  FaCircleCheck,
  FaCircleXmark,
} from "react-icons/fa6";
import { Oval } from "react-loader-spinner";
import { createFacultyApi } from './facultyApi'
import emptyStateImg from "../../assets/empty-state.svg";
const getQueryParam = (search, key) => {
  const params = new URLSearchParams(search)
  return params.get(key)
}

function AttendancePage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const userData = useSelector((state) => state.user.userData)
  const apiBase = useSelector((state) => state.config.apiBase)
  const facultyApi = useMemo(() => createFacultyApi(apiBase), [apiBase])
  const roleDetails = userData?.roleDetails
  const routine = roleDetails?.routine || {}
  const queryGroupId = getQueryParam(location.search, 'groupId')

  const courseMeta = useMemo(() => {
    let found = null
    Object.entries(routine).forEach(([day, slots]) => {
      Object.entries(slots || {}).forEach(([slot, item]) => {
        const course = item?.course
        const group = item?.group
        const cId = course?._id || course?.id
        const gId = group?._id || group?.id
        if (cId !== courseId) return
        if (queryGroupId && gId !== queryGroupId) return
        if (!found) {
          found = {
            course,
            group,
            scheduleParts: [],
          }
        }
        const dayLabel = day
          ? `${day.charAt(0).toUpperCase()}${day.slice(1)}`
          : 'Day'
        found.scheduleParts.push(`${dayLabel} (${slot})`)
      })
    })
    if (!found) return null
    return {
      id: courseId,
      code: found.course?.code || 'N/A',
      title: found.course?.courseName || 'Untitled Course',
      room: found.group?.roomNo || 'N/A',
      groupId: found.group?._id || found.group?.id || queryGroupId,
      schedule: found.scheduleParts.join(', '),
    }
  }, [routine, courseId, queryGroupId])

  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [savedAt, setSavedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAttendancePage = async () => {
      if (!courseMeta?.groupId) return
      try {
        setLoading(true)
        setError('')
        const res = await facultyApi.getGroupAttendancePage(
          courseMeta.groupId,
          { courseId: courseMeta.id }
        )
        let list = res.data?.students || []
        if (!list.length) {
          const fallback = await facultyApi.getStudentsByGroup(courseMeta.groupId)
          list =
            fallback.data?.students?.map((s) => ({
              studentId: s._id,
              name: s.user?.name || '',
              enrollmentNumber: s.enrollmentNumber || '',
              phoneNumber: s.user?.phoneNumber || '',
              fatherName: s.fatherName || '',
              status: null,
            })) || []
        }
        setStudents(list)
        const initial = list.reduce((acc, student) => {
          if (student.status === 'present') acc[student.studentId] = true
          else if (student.status === 'absent') acc[student.studentId] = false
          else acc[student.studentId] = true
          return acc
        }, {})
        setAttendance(initial)
      } catch (err) {
        console.error(
          'Fetch attendance failed:',
          err.response?.data || err.message
        )
        toast.error(`${err.response?.data?.message || 'Failed to load attendance'}`)
        setError(
          err.response?.data?.message || 'Failed to load attendance'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAttendancePage()
  }, [courseMeta?.groupId, courseMeta?.id])

  const presentCount = Object.values(attendance).filter(Boolean).length
  const absentCount = students.length - presentCount

  const toggleAttendance = (studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }))
  }

  const handleSetAll = (value) => {
    const updated = students.reduce((acc, student) => {
      acc[student.studentId] = value
      return acc
    }, {})
    setAttendance(updated)
  }

  const handleSave = async () => {
    if (!courseMeta?.groupId || !courseMeta?.id) {
      toast.error('Missing course or group information. Please try again.')
      return
    }
    if (students.length === 0) {
      toast.error('No students found to save attendance.')
      return
    }
    try {
      const records = students.map((student) => ({
        student: student.studentId,
        status: attendance[student.studentId] ? 'present' : 'absent',
      }))
      await facultyApi.markGroupAttendance(courseMeta.groupId, {
        courseId: courseMeta.id,
        records,
      })
      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      setSavedAt(`Attendance saved at ${timestamp}`)
      toast.success('Attendance saved successfully.')
    } catch (err) {
      console.error(
        'Save attendance failed:',
        err.response?.data || err.message
      )
      setSavedAt('Failed to save attendance.')
      toast.error(
        `${err.response?.data?.message || 'Failed to save attendance.'}`
      )
    }
  }

  if (!courseMeta) {
    return (
      <section className="panel">
        <h2>Course not found</h2>
        <p className="muted">
          The course you selected does not exist. Please return to the faculty
          dashboard.
        </p>
        <button className="btn" onClick={() => navigate('/')}>
          Go back
        </button>
      </section>
    )
  }

  return (
    <section className="panel attendance">
      <div className="attendance-hero">
        <div className="attendance-heading">
          <button className="link-button" onClick={() => navigate('/faculty/faculty-dashboard')}>
            <FaArrowLeftLong  className='icon'/> Back to faculty dashboard
          </button>
          <h2>{courseMeta.title}</h2>
          <p className="muted">
            {courseMeta.code} | {courseMeta.schedule} | {courseMeta.room}
          </p>
        </div>
        <div className="summary-cards">
          <div className="summary-card present">
            <p className="summary-icon">
              <FaUserCheck />
            </p>
            <p className="metric">{presentCount}</p>
            <p className="muted">Present</p>
          </div>
          <div className="summary-card absent">
            <p className="summary-icon">
              <FaUserXmark />
            </p>
            <p className="metric">{absentCount}</p>
            <p className="muted">Absent</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="attendance-state pending app-loader-state">
          <Oval
            height={64}
            width={64}
            color="#0ea5a6"
            secondaryColor="#99f6e4"
            strokeWidth={4}
            strokeWidthSecondary={4}
            ariaLabel="Loading"
            visible
          />
          <p>Loading students...</p>
        </div>
      ) : error ? (
        <div className="attendance-state error">
          <img
            src={emptyStateImg}
            alt="Failed"
            className="attendance-state-img"
          />
          <h3>Failed to load students</h3>
          <p>{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="attendance-state empty">
          <img
            src={emptyStateImg}
            alt="No data"
            className="attendance-state-img"
          />
          <h3>No students found</h3>
          <p>Please check the group or course setup.</p>
        </div>
      ) : (
        <>
          <div className="attendance-toolbar">
            <div className="attendance-actions">
              <button className="btn ghost" onClick={() => handleSetAll(true)}>
                <FaCheck className="icon" />
                Mark all present
              </button>
              <button className="btn ghost" onClick={() => handleSetAll(false)}>
                <FaXmark className="icon" />
                Mark all absent
              </button>
              <button className="btn primary" onClick={handleSave}>
                <FaFloppyDisk className="icon" />
                Save attendance
              </button>
            </div>
            <div className="attendance-status">
              {savedAt ? (
                <p className="saved">{savedAt}</p>
              ) : (
                <p className="muted">No changes saved yet.</p>
              )}
            </div>
          </div>

          <div className="attendance-table-wrap">
            <div className="attendance-table">
              <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Father Name</th>
                  <th>Contact No</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const isPresent = attendance[student.studentId]
                  const initials = student.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  return (
                    <tr key={student.studentId} className="table-row">
                      <td className="roll">{student.enrollmentNumber}</td>
                      <td>
                        <span className="student-cell">
                          <span className="avatar-sm">{initials}</span>
                          <span className="student-name">{student.name}</span>
                        </span>
                      </td>
                      <td>{student.fatherName || 'N/A'}</td>
                      <td>{student.phoneNumber || 'N/A'}</td>
                      <td>
                        <div className="action-cell">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={isPresent}
                              onChange={() => toggleAttendance(student.studentId)}
                              aria-label={`Mark ${student.name} as ${isPresent ? 'absent' : 'present'}`}
                            />
                            <span className="slider">
                              <span className="state">
                                {isPresent ? (
                                  <>
                                    <FaCircleCheck className="icon" /> Present
                                  </>
                                ) : (
                                  <>
                                    <FaCircleXmark className="icon" /> Absent
                                  </>
                                )}
                              </span>
                            </span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default AttendancePage



