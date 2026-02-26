import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  FaArrowLeftLong,
  FaUserCheck,
  FaUserXmark,
  FaCheck,
  FaXmark,
  FaFloppyDisk,
  FaCircleCheck,
  FaCircleXmark,
} from 'react-icons/fa6'
import { Oval } from 'react-loader-spinner'
import { createFacultyApi } from './facultyApi'
import emptyStateImg from '../../assets/empty-state.svg'

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
  const queryGroupId = getQueryParam(location.search, 'groupId')

  const courseMeta = useMemo(() => {
    const routine = roleDetails?.routine || {}
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
        const dayLabel = day ? `${day.charAt(0).toUpperCase()}${day.slice(1)}` : 'Day'
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
  }, [roleDetails?.routine, courseId, queryGroupId])

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
        const res = await facultyApi.getGroupAttendancePage(courseMeta.groupId, {
          courseId: courseMeta.id,
        })
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
        console.error('Fetch attendance failed:', err.response?.data || err.message)
        toast.error(`${err.response?.data?.message || 'Failed to load attendance'}`)
        setError(err.response?.data?.message || 'Failed to load attendance')
      } finally {
        setLoading(false)
      }
    }

    fetchAttendancePage()
  }, [courseMeta?.groupId, courseMeta?.id, facultyApi])

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
      console.error('Save attendance failed:', err.response?.data || err.message)
      setSavedAt('Failed to save attendance.')
      toast.error(`${err.response?.data?.message || 'Failed to save attendance.'}`)
    }
  }

  if (!courseMeta) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="m-0 text-xl font-bold text-slate-900">Course not found</h2>
        <p className="mt-2 text-sm text-slate-600">
          The course you selected does not exist. Please return to the faculty dashboard.
        </p>
        <button
          className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => navigate('/')}
        >
          Go back
        </button>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)] md:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <button
              className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => navigate('/faculty/faculty-dashboard')}
            >
              <FaArrowLeftLong /> Back to faculty dashboard
            </button>
            <h2 className="m-0 text-2xl font-bold text-slate-900">{courseMeta.title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {courseMeta.code} | {courseMeta.schedule} | {courseMeta.room}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="m-0 text-xl text-emerald-700">
                <FaUserCheck className="inline" />
              </p>
              <p className="m-0 text-2xl font-bold text-emerald-800">{presentCount}</p>
              <p className="m-0 text-sm text-emerald-700">Present</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
              <p className="m-0 text-xl text-rose-700">
                <FaUserXmark className="inline" />
              </p>
              <p className="m-0 text-2xl font-bold text-rose-800">{absentCount}</p>
              <p className="m-0 text-sm text-rose-700">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="app-loader-state">
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
          <p className="m-0 mt-2 text-sm text-slate-600">Loading students...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
          <img src={emptyStateImg} alt="Failed" className="mx-auto mb-3 h-20 w-20 object-contain" />
          <h3 className="m-0 text-lg font-semibold text-rose-900">Failed to load students</h3>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <img src={emptyStateImg} alt="No data" className="mx-auto mb-3 h-20 w-20 object-contain" />
          <h3 className="m-0 text-lg font-semibold text-slate-900">No students found</h3>
          <p className="mt-1 text-sm text-slate-600">Please check the group or course setup.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  onClick={() => handleSetAll(true)}
                >
                  <FaCheck /> Mark all present
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  onClick={() => handleSetAll(false)}
                >
                  <FaXmark /> Mark all absent
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700"
                  onClick={handleSave}
                >
                  <FaFloppyDisk /> Save attendance
                </button>
              </div>
              <div>
                {savedAt ? (
                  <p className="m-0 text-sm font-medium text-emerald-700">{savedAt}</p>
                ) : (
                  <p className="m-0 text-sm text-slate-500">No changes saved yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[900px] w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Roll No</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Student Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Father Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact No</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
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
                    <tr key={student.studentId} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-sm font-semibold text-slate-700">{student.enrollmentNumber}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                            {initials}
                          </span>
                          <span className="text-sm font-medium text-slate-900">{student.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">{student.fatherName || 'N/A'}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{student.phoneNumber || 'N/A'}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            isPresent
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                              : 'border-rose-300 bg-rose-100 text-rose-800'
                          }`}
                          onClick={() => toggleAttendance(student.studentId)}
                          aria-label={`Mark ${student.name} as ${isPresent ? 'absent' : 'present'}`}
                        >
                          {isPresent ? (
                            <>
                              <FaCircleCheck /> Present
                            </>
                          ) : (
                            <>
                              <FaCircleXmark /> Absent
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default AttendancePage
