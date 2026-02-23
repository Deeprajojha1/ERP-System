import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

const parseAssignments = (payload) => {
  if (Array.isArray(payload?.assignments)) return payload.assignments;
  if (Array.isArray(payload?.data?.assignments)) return payload.data.assignments;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const parseSingleAssignment = (payload) => {
  if (payload?.assignment) return payload.assignment;
  if (payload?.data?.assignment) return payload.data.assignment;
  if (payload?.data) return payload.data;
  return payload || null;
};

const buildErrorMessage = (error, fallback) => {
  if (error?.response?.status === 501) {
    return "Assignment API route exists but is not implemented in backend yet.";
  }
  return error?.response?.data?.message || fallback;
};

// Async thunks
export const fetchAssignments = createAsyncThunk(
  "assignment/fetchAssignments",
  async ({ apiBase, departmentId, groupId, facultyId }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (departmentId) query.append("departmentId", departmentId);
      if (groupId) query.append("groupId", groupId);
      if (facultyId) query.append("facultyId", facultyId);

      const res = await axios.get(`${apiBase}/admin/assignments?${query.toString()}`, {
        withCredentials: true,
      });
      return parseAssignments(res.data);
    } catch (error) {
      return rejectWithValue(buildErrorMessage(error, "Failed to fetch assignments"));
    }
  }
);

export const fetchSingleAssignment = createAsyncThunk(
  "assignment/fetchSingleAssignment",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${apiBase}/admin/assignment/${id}`, {
        withCredentials: true,
      });
      return parseSingleAssignment(res.data);
    } catch (error) {
      return rejectWithValue(buildErrorMessage(error, "Failed to fetch assignment"));
    }
  }
);

export const deleteAssignment = createAsyncThunk(
  "assignment/deleteAssignment",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      await axios.delete(`${apiBase}/admin/assignment/${id}`, {
        withCredentials: true,
      });
      return id;
    } catch (error) {
      return rejectWithValue(buildErrorMessage(error, "Failed to delete assignment"));
    }
  }
);

const assignmentSlice = createSlice({
  name: "assignment",
  initialState: {
    assignments: [],
    viewAssignment: null,
    loading: false,
    viewLoading: false,
    deleteLoading: false,
    error: null,
    filters: {
      departmentId: "",
      groupId: "",
      facultyId: "",
    },
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { departmentId: "", groupId: "", facultyId: "" };
    },
    clearViewAssignment: (state) => {
      state.viewAssignment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAssignments: (state) => {
      state.assignments = [];
      state.viewAssignment = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Assignments
      .addCase(fetchAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Single Assignment
      .addCase(fetchSingleAssignment.pending, (state) => {
        state.viewLoading = true;
        state.error = null;
      })
      .addCase(fetchSingleAssignment.fulfilled, (state, action) => {
        state.viewLoading = false;
        state.viewAssignment = action.payload;
      })
      .addCase(fetchSingleAssignment.rejected, (state, action) => {
        state.viewLoading = false;
        state.error = action.payload;
      })
      // Delete Assignment
      .addCase(deleteAssignment.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteAssignment.fulfilled, (state, action) => {
        state.deleteLoading = false;
        // Remove from state immediately without refetch
        state.assignments = state.assignments.filter((a) => a._id !== action.payload);
      })
      .addCase(deleteAssignment.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  clearViewAssignment,
  clearError,
  clearAssignments,
} = assignmentSlice.actions;

// Selectors
export const selectAssignments = (state) => state.assignment.assignments;
export const selectViewAssignment = (state) => state.assignment.viewAssignment;
export const selectAssignmentLoading = (state) => state.assignment.loading;
export const selectViewLoading = (state) => state.assignment.viewLoading;
export const selectDeleteLoading = (state) => state.assignment.deleteLoading;
export const selectAssignmentError = (state) => state.assignment.error;
export const selectAssignmentFilters = (state) => state.assignment.filters;

export default assignmentSlice.reducer;
