import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../Admin/constants/loadStates";

const resolveErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

// Fetch all results and support data
export const fetchResults = createAsyncThunk(
  "result/fetchResults",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const [resultRes, studentRes, courseRes] = await Promise.all([
        axios.get(`${apiBase}/admin/result`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { full: "true", noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/course`, {
          withCredentials: true,
          params: { noCache: "true" },
        }),
      ]);
      return {
        results: resultRes.data?.results || [],
        students: studentRes.data?.students || [],
        courses: courseRes.data?.courses || [],
      };
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to load results"));
    }
  }
);

// Create result
export const createResult = createAsyncThunk(
  "result/createResult",
  async ({ apiBase, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${apiBase}/admin/result`, payload, {
        withCredentials: true,
      });
      return res.data?.result || res.data;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to create result"));
    }
  }
);

// Update result
export const updateResult = createAsyncThunk(
  "result/updateResult",
  async ({ apiBase, id, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${apiBase}/admin/result/${id}`, payload, {
        withCredentials: true,
      });
      return { id, data: res.data?.result || res.data };
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to update result"));
    }
  }
);

// Delete result
export const deleteResult = createAsyncThunk(
  "result/deleteResult",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      await axios.patch(
        `${apiBase}/admin/result/${id}/delete`,
        {},
        { withCredentials: true }
      );
      return id;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to delete result"));
    }
  }
);

// Refresh single result after update
export const refreshSingleResult = createAsyncThunk(
  "result/refreshSingleResult",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${apiBase}/admin/result/${id}`, {
        withCredentials: true,
      });
      return res.data?.result || res.data;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to refresh result"));
    }
  }
);

const resultSlice = createSlice({
  name: "result",
  initialState: {
    results: [],
    students: [],
    courses: [],
    listLoadState: ADMIN_LOAD_STATES.INITIAL,
    submitLoadState: ADMIN_LOAD_STATES.INITIAL,
    deleteLoadState: ADMIN_LOAD_STATES.INITIAL,
    deletingId: null,
    error: null,
  },
  reducers: {
    clearResultError: (state) => {
      state.error = null;
    },
    resetResultSlice: () => ({
      results: [],
      students: [],
      courses: [],
      listLoadState: ADMIN_LOAD_STATES.INITIAL,
      submitLoadState: ADMIN_LOAD_STATES.INITIAL,
      deleteLoadState: ADMIN_LOAD_STATES.INITIAL,
      deletingId: null,
      error: null,
    }),
  },
  extraReducers: (builder) => {
    builder
      // Fetch results
      .addCase(fetchResults.pending, (state) => {
        state.listLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(fetchResults.fulfilled, (state, action) => {
        state.listLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.results = action.payload.results;
        state.students = action.payload.students;
        state.courses = action.payload.courses;
      })
      .addCase(fetchResults.rejected, (state, action) => {
        state.listLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || "Failed to load results";
      })
      // Create result
      .addCase(createResult.pending, (state) => {
        state.submitLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(createResult.fulfilled, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.SUCCESS;
        if (action.payload?._id) {
          state.results = [action.payload, ...state.results];
        }
      })
      .addCase(createResult.rejected, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || "Failed to create result";
      })
      // Update result
      .addCase(updateResult.pending, (state) => {
        state.submitLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(updateResult.fulfilled, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.SUCCESS;
        const { id, data } = action.payload;
        if (data?._id) {
          state.results = state.results.map((item) =>
            item._id === id ? data : item
          );
        }
      })
      .addCase(updateResult.rejected, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || "Failed to update result";
      })
      // Delete result
      .addCase(deleteResult.pending, (state, action) => {
        state.deleteLoadState = ADMIN_LOAD_STATES.PENDING;
        state.deletingId = action.meta?.arg?.id || null;
        state.error = null;
      })
      .addCase(deleteResult.fulfilled, (state, action) => {
        state.deleteLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.deletingId = null;
        state.results = state.results.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteResult.rejected, (state, action) => {
        state.deleteLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.deletingId = null;
        state.error = action.payload || "Failed to delete result";
      })
      // Refresh single result
      .addCase(refreshSingleResult.fulfilled, (state, action) => {
        if (action.payload?._id) {
          state.results = state.results.map((item) =>
            item._id === action.payload._id ? action.payload : item
          );
        }
      });
  },
});

export const { clearResultError, resetResultSlice } = resultSlice.actions;

// Selectors
export const selectResults = (state) => state.result?.results || [];
export const selectResultStudents = (state) => state.result?.students || [];
export const selectResultCourses = (state) => state.result?.courses || [];
export const selectResultListLoadState = (state) =>
  state.result?.listLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectResultSubmitLoadState = (state) =>
  state.result?.submitLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectResultDeleteLoadState = (state) =>
  state.result?.deleteLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectResultDeletingId = (state) => state.result?.deletingId || null;
export const selectResultError = (state) => state.result?.error || null;

export default resultSlice.reducer;
