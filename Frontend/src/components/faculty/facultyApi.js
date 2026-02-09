import axios from 'axios'

const withCreds = { withCredentials: true }

export const createFacultyApi = (apiBase) => {
  const base = `${apiBase}/faculty`

  return {
    getGroupAttendancePage: (groupId, params = {}) =>
      axios.get(`${base}/attendance/${groupId}`, {
        ...withCreds,
        params,
      }),

    markGroupAttendance: (groupId, payload) =>
      axios.post(`${base}/attendance/${groupId}`, payload, withCreds),

    updateAttendance: (sessionId, payload) =>
      axios.put(`${base}/attendance/session/${sessionId}`, payload, withCreds),

    getStudentsByGroup: (groupId) =>
      axios.get(`${base}/attendance/group/${groupId}/students`, withCreds),

    getAttendanceByGroupAndCourse: (groupId, courseId, params = {}) =>
      axios.get(`${base}/attendance/group/${groupId}/course/${courseId}`, {
        ...withCreds,
        params,
      }),

    getStudentOverallAttendance: (studentId) =>
      axios.get(`${base}/attendance/student/${studentId}`, withCreds),

    getStudentAttendanceReport: (studentId, courseId, params = {}) =>
      axios.get(`${base}/attendance/student/${studentId}/course/${courseId}`, {
        ...withCreds,
        params,
      }),

    getAttendanceById: (sessionId) =>
      axios.get(`${base}/attendance/session/${sessionId}`, withCreds),
  }
}
