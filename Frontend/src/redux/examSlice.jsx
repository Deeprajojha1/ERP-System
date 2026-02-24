import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

// Async thunks
export const fetchExams = createAsyncThunk(
  "exam/fetchExams",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${apiBase}/admin/exam`, {
        withCredentials: true,
      });
      return res.data?.exams || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch exams");
    }
  }
);

export const fetchExamSupportData = createAsyncThunk(
  "exam/fetchExamSupportData",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const [courseRes, groupRes, facultyRes] = await Promise.all([
        axios.get(`${apiBase}/admin/course`, { withCredentials: true, params: { noCache: "true" } }),
        axios.get(`${apiBase}/admin/group`, { withCredentials: true, params: { noCache: "true" } }),
        axios.get(`${apiBase}/admin/faculty`, { withCredentials: true, params: { noCache: "true" } }),
      ]);
      return {
        courses: courseRes.data?.courses || [],
        groups: groupRes.data?.groups || [],
        faculty: facultyRes.data?.faculty || [],
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch support data");
    }
  }
);

export const createExam = createAsyncThunk(
  "exam/createExam",
  async ({ apiBase, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${apiBase}/admin/exam`, payload, {
        withCredentials: true,
      });
      return res.data?.exam || res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to create exam");
    }
  }
);

export const updateExam = createAsyncThunk(
  "exam/updateExam",
  async ({ apiBase, id, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${apiBase}/admin/exam/${id}`, payload, {
        withCredentials: true,
      });
      return { id, data: res.data?.exam || res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update exam");
    }
  }
);

export const deleteExam = createAsyncThunk(
  "exam/deleteExam",
  async ({ apiBase, id, hardDelete = false }, { rejectWithValue }) => {
    try {
      if (hardDelete) {
        await axios.delete(`${apiBase}/admin/exam/${id}`, {
          withCredentials: true,
        });
      } else {
        await axios.patch(`${apiBase}/admin/exam/${id}/delete`, {}, {
          withCredentials: true,
        });
      }
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete exam");
    }
  }
);

const examSlice = createSlice({
  name: "exam",
  initialState: {
    exams: [],
    courses: [],
    groups: [],
    faculty: [],
    loading: false,
    supportDataLoading: false,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearExams: (state) => {
      state.exams = [];
      state.error = null;
    },
    // Optimistic update for local changes
    updateExamLocal: (state, action) => {
      const index = state.exams.findIndex((e) => e._id === action.payload._id);
      if (index !== -1) {
        state.exams[index] = { ...state.exams[index], ...action.payload };
      }
    },
    addExamLocal: (state, action) => {
      state.exams.unshift(action.payload);
    },
    removeExamLocal: (state, action) => {
      state.exams = state.exams.filter((e) => e._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Exams
      .addCase(fetchExams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.loading = false;
        state.exams = action.payload;
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Support Data (courses, groups, faculty)
      .addCase(fetchExamSupportData.pending, (state) => {
        state.supportDataLoading = true;
        state.error = null;
      })
      .addCase(fetchExamSupportData.fulfilled, (state, action) => {
        state.supportDataLoading = false;
        state.courses = action.payload.courses;
        state.groups = action.payload.groups;
        state.faculty = action.payload.faculty;
      })
      .addCase(fetchExamSupportData.rejected, (state, action) => {
        state.supportDataLoading = false;
        state.error = action.payload;
      })
      // Create Exam
      .addCase(createExam.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createExam.fulfilled, (state, action) => {
        state.createLoading = false;
        // Add new exam to the beginning of the list
        if (action.payload) {
          state.exams.unshift(action.payload);
        }
      })
      .addCase(createExam.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })
      // Update Exam
      .addCase(updateExam.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateExam.fulfilled, (state, action) => {
        state.updateLoading = false;
        // Update the exam in the list
        const index = state.exams.findIndex((e) => e._id === action.payload.id);
        if (index !== -1 && action.payload.data) {
          state.exams[index] = { ...state.exams[index], ...action.payload.data };
        }
      })
      .addCase(updateExam.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      })
      // Delete Exam
      .addCase(deleteExam.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.deleteLoading = false;
        // Remove from state immediately without refetch
        state.exams = state.exams.filter((e) => e._id !== action.payload);
      })
      .addCase(deleteExam.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearExams,
  updateExamLocal,
  addExamLocal,
  removeExamLocal,
} = examSlice.actions;

// Selectors (with safe fallbacks)
export const selectExams = (state) => state.exam?.exams ?? [];
export const selectExamCourses = (state) => state.exam?.courses ?? [];
export const selectExamGroups = (state) => state.exam?.groups ?? [];
export const selectExamFaculty = (state) => state.exam?.faculty ?? [];
export const selectExamLoading = (state) => state.exam?.loading ?? false;
export const selectSupportDataLoading = (state) => state.exam?.supportDataLoading ?? false;
export const selectCreateLoading = (state) => state.exam?.createLoading ?? false;
export const selectUpdateLoading = (state) => state.exam?.updateLoading ?? false;
export const selectDeleteLoading = (state) => state.exam?.deleteLoading ?? false;
export const selectExamError = (state) => state.exam?.error ?? null;

export default examSlice.reducer;
