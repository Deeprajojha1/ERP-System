import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

const initialDailyState = {
  items: [],
  loading: false,
  error: null,
  date: null,
};

const initialGroupState = {
  students: [],
  loading: false,
  error: null,
  groupId: null,
  date: null,
  statusMap: {},
};

export const fetchAdminDailySummary = createAsyncThunk(
  "attendance/fetchAdminDailySummary",
  async ({ date }, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/admin/attendance/daily`, {
        params: { date },
        withCredentials: true,
      });
      return {
        date,
        items: Array.isArray(res.data?.summary) ? res.data.summary : [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load attendance summary"
      );
    }
  }
);

const mapStudentStatus = (students = []) => {
  const map = {};
  students.forEach((student) => {
    const { summary } = student;
    if (summary?.presentCount) map[student.studentId] = "present";
    else if (summary?.absentCount) map[student.studentId] = "absent";
    else map[student.studentId] = "not-marked";
  });
  return map;
};

export const fetchGroupAttendanceByDate = createAsyncThunk(
  "attendance/fetchGroupAttendanceByDate",
  async ({ groupId, date }, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(
        `${apiBase}/admin/attendance/group/${groupId}/date/${date}`,
        { withCredentials: true }
      );
      const students = Array.isArray(res.data?.students) ? res.data.students : [];
      return {
        groupId,
        date,
        students,
        statusMap: mapStudentStatus(students),
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load group attendance"
      );
    }
  }
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: {
    daily: initialDailyState,
    group: initialGroupState,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDailySummary.pending, (state) => {
        state.daily.loading = true;
        state.daily.error = null;
      })
      .addCase(fetchAdminDailySummary.fulfilled, (state, action) => {
        state.daily.loading = false;
        state.daily.items = action.payload.items;
        state.daily.date = action.payload.date;
      })
      .addCase(fetchAdminDailySummary.rejected, (state, action) => {
        state.daily.loading = false;
        state.daily.error = action.payload || "Failed to load attendance summary";
        state.daily.items = [];
      })
      .addCase(fetchGroupAttendanceByDate.pending, (state, action) => {
        state.group.loading = true;
        state.group.error = null;
        state.group.groupId = action.meta.arg.groupId;
        state.group.date = action.meta.arg.date;
      })
      .addCase(fetchGroupAttendanceByDate.fulfilled, (state, action) => {
        state.group.loading = false;
        state.group.students = action.payload.students;
        state.group.statusMap = action.payload.statusMap;
      })
      .addCase(fetchGroupAttendanceByDate.rejected, (state, action) => {
        state.group.loading = false;
        state.group.error = action.payload || "Failed to load group attendance";
        state.group.students = [];
        state.group.statusMap = {};
      });
  },
});

export const selectDailySummary = (state) => state.attendance.daily.items;
export const selectDailySummaryLoading = (state) => state.attendance.daily.loading;
export const selectDailySummaryError = (state) => state.attendance.daily.error;
export const selectGroupStudents = (state) => state.attendance.group.students;
export const selectGroupLoading = (state) => state.attendance.group.loading;
export const selectGroupError = (state) => state.attendance.group.error;
export const selectGroupStatusMap = (state) => state.attendance.group.statusMap;

export default attendanceSlice.reducer;
