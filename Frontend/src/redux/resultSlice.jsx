import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../Admin/constants/loadStates";

const initialState = {
  results: [],
  students: [],
  courses: [],
  listLoadState: ADMIN_LOAD_STATES.INITIAL,
  submitLoadState: ADMIN_LOAD_STATES.IDLE,
  error: null,
};

export const fetchResults = createAsyncThunk(
  "result/fetchResults",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const [resultsRes, studentsRes, coursesRes] = await Promise.all([
        axios.get(`${apiBase}/admin/result`),
        axios.get(`${apiBase}/admin/student`),
        axios.get(`${apiBase}/admin/course`),
      ]);

      return {
        results: Array.isArray(resultsRes?.data?.results) ? resultsRes.data.results : [],
        students: Array.isArray(studentsRes?.data?.students) ? studentsRes.data.students : [],
        courses: Array.isArray(coursesRes?.data?.courses) ? coursesRes.data.courses : [],
      };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to load results");
    }
  }
);

export const createResult = createAsyncThunk(
  "result/createResult",
  async ({ apiBase, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${apiBase}/admin/result`, payload);
      return res?.data?.result || null;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to create result");
    }
  }
);

export const updateResult = createAsyncThunk(
  "result/updateResult",
  async ({ apiBase, id, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${apiBase}/admin/result/${id}`, payload);
      return res?.data?.result || null;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to update result");
    }
  }
);

const resultSlice = createSlice({
  name: "result",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
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
        state.error = action.payload || action.error.message;
      })
      .addCase(createResult.pending, (state) => {
        state.submitLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(createResult.fulfilled, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.SUCCESS;
        if (action.payload) {
          state.results.unshift(action.payload);
        }
      })
      .addCase(createResult.rejected, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || action.error.message;
      })
      .addCase(updateResult.pending, (state) => {
        state.submitLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(updateResult.fulfilled, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.SUCCESS;
        const updated = action.payload;
        if (!updated?._id) return;
        state.results = state.results.map((item) =>
          String(item?._id || "") === String(updated._id) ? updated : item
        );
      })
      .addCase(updateResult.rejected, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || action.error.message;
      });
  },
});

export const selectResults = (state) => state.result.results;
export const selectResultStudents = (state) => state.result.students;
export const selectResultCourses = (state) => state.result.courses;
export const selectResultListLoadState = (state) => state.result.listLoadState;
export const selectResultSubmitLoadState = (state) => state.result.submitLoadState;

export default resultSlice.reducer;
