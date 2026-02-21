import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

const DAY_LABEL_TO_KEY = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOTS = [
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "01:00-02:00",
  "02:00-03:00",
];

const buildScheduleFromBackend = (timetable = []) => {
  const byDay = {};
  timetable.forEach((entry) => {
    if (!entry?.day) return;
    byDay[String(entry.day).toLowerCase()] = entry.lectures || [];
  });

  return DAYS.map((label, dayIdx) => {
    const key = DAY_LABEL_TO_KEY[label];
    const lectures = byDay[key] || [];

    const rowSlots = SLOTS.map((_, slotIdx) => {
      const lectureNumber = slotIdx + 1;
      const lecture = lectures.find((l) => l.lectureNumber === lectureNumber);

      if (!lecture) {
        return { code: "FREE", name: "Free", by: "", color: 3 };
      }

      return {
        code: lecture.courseCode || "FREE",
        name: lecture.courseName || "Free",
        by: lecture.facultyName || "",
        color: (dayIdx + slotIdx) % 5,
      };
    });

    return { day: label, slots: rowSlots };
  });
};

export const fetchTimetableGroups = createAsyncThunk(
  "timetable/fetchTimetableGroups",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/admin/timetable/group`, {
        withCredentials: true,
      });
      return res.data?.groups || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load timetable groups"
      );
    }
  }
);

export const fetchGroupTimetable = createAsyncThunk(
  "timetable/fetchGroupTimetable",
  async (arg, { getState, rejectWithValue }) => {
    try {
      const groupId =
        typeof arg === "object" && arg !== null ? arg.groupId : arg;
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/admin/timetable/group/${groupId}`, {
        withCredentials: true,
      });
      const group = res.data?.group || {};
      return {
        timetable: group.timetable || [],
        courses: group.courses || [],
        departmentFaculty: group.departmentFaculty || [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load group timetable"
      );
    }
  }
);

export const saveGroupTimetable = createAsyncThunk(
  "timetable/saveGroupTimetable",
  async ({ groupId, putPayload, createPayload }, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      try {
        await axios.put(`${apiBase}/admin/timetable/group/${groupId}`, putPayload, {
          withCredentials: true,
        });
      } catch (putError) {
        if ([400, 404].includes(putError?.response?.status)) {
          await axios.post(
            `${apiBase}/admin/timetable/group/${groupId}`,
            createPayload,
            { withCredentials: true }
          );
        } else {
          throw putError;
        }
      }
      return { groupId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update timetable"
      );
    }
  }
);

const timetableSlice = createSlice({
  name: "timetable",
  initialState: {
    groupCards: [],
    selectedGroupCode: "",
    schedule: [],
    groupCourses: [],
    deptFaculty: [],
    loading: false,
    error: null,
    revision: 0,
  },
  reducers: {
    setSelectedGroupCode: (state, action) => {
      state.selectedGroupCode = action.payload || "";
    },
    applyTimetableEdit: (state, action) => {
      const { day, lecture, code, subject, faculty } = action.payload || {};
      const dayIndex = DAYS.indexOf(day);
      const slotIndex = Math.max(0, Number(lecture || 1) - 1);
      if (dayIndex < 0) return;
      if (!state.schedule?.[dayIndex]?.slots?.[slotIndex]) return;

      state.schedule[dayIndex].slots[slotIndex] = {
        ...state.schedule[dayIndex].slots[slotIndex],
        code: code || "FREE",
        name: subject || "Free",
        by: faculty || "",
      };
      state.revision += 1;
    },
    bumpTimetableRevision: (state) => {
      state.revision += 1;
    },
    clearTimetable: (state) => {
      state.groupCards = [];
      state.selectedGroupCode = "";
      state.schedule = [];
      state.groupCourses = [];
      state.deptFaculty = [];
      state.loading = false;
      state.error = null;
      state.revision = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimetableGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimetableGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groupCards = action.payload || [];
        if (!state.selectedGroupCode && state.groupCards.length > 0) {
          state.selectedGroupCode = state.groupCards[0].groupCode;
        }
      })
      .addCase(fetchTimetableGroups.rejected, (state, action) => {
        state.loading = false;
        state.groupCards = [];
        state.error = action.payload || "Failed to load timetable groups";
      })
      .addCase(fetchGroupTimetable.pending, (state, action) => {
        const isSilent = Boolean(action.meta?.arg?.silent);
        if (!isSilent) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchGroupTimetable.fulfilled, (state, action) => {
        state.loading = false;
        state.schedule = buildScheduleFromBackend(action.payload?.timetable || []);
        state.groupCourses = action.payload?.courses || [];
        state.deptFaculty = action.payload?.departmentFaculty || [];
      })
      .addCase(fetchGroupTimetable.rejected, (state, action) => {
        const isSilent = Boolean(action.meta?.arg?.silent);
        state.loading = false;
        state.error = action.payload || "Failed to load group timetable";
        if (!isSilent) {
          state.schedule = [];
          state.groupCourses = [];
          state.deptFaculty = [];
        }
      })
      .addCase(saveGroupTimetable.pending, (state) => {
        state.error = null;
      })
      .addCase(saveGroupTimetable.rejected, (state, action) => {
        state.error = action.payload || "Failed to update timetable";
      });
  },
});

export const {
  setSelectedGroupCode,
  applyTimetableEdit,
  bumpTimetableRevision,
  clearTimetable,
} = timetableSlice.actions;

export const selectTimetableGroupCards = (state) => state.timetable.groupCards;
export const selectTimetableSelectedGroupCode = (state) =>
  state.timetable.selectedGroupCode;
export const selectTimetableSchedule = (state) => state.timetable.schedule;
export const selectTimetableGroupCourses = (state) =>
  state.timetable.groupCourses;
export const selectTimetableDeptFaculty = (state) =>
  state.timetable.deptFaculty;
export const selectTimetableLoading = (state) => state.timetable.loading;
export const selectTimetableError = (state) => state.timetable.error;
export const selectTimetableRevision = (state) => state.timetable.revision;

export default timetableSlice.reducer;
