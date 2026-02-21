import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

const initialBucket = {
  items: [],
  loading: false,
  error: null,
};

export const fetchAdminLeaves = createAsyncThunk(
  "leaves/fetchAdminLeaves",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/admin/facultyleave`, {
        withCredentials: true,
      });
      return Array.isArray(res.data?.leaves) ? res.data.leaves : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch admin leaves"
      );
    }
  }
);

export const updateAdminLeaveStatus = createAsyncThunk(
  "leaves/updateAdminLeaveStatus",
  async ({ leaveId, status }, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const normalizedStatus = String(status || "").trim().toLowerCase();
      await axios.patch(
        `${apiBase}/admin/facultyleave/${leaveId}/status`,
        { status: normalizedStatus },
        { withCredentials: true }
      );
      return { leaveId, status: normalizedStatus };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update leave status"
      );
    }
  }
);

export const fetchFacultyLeaves = createAsyncThunk(
  "leaves/fetchFacultyLeaves",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/faculty/leave`, {
        withCredentials: true,
      });
      return Array.isArray(res.data?.leaves) ? res.data.leaves : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch faculty leaves"
      );
    }
  }
);

export const createFacultyLeave = createAsyncThunk(
  "leaves/createFacultyLeave",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.post(`${apiBase}/faculty/leave`, payload, {
        withCredentials: true,
      });
      dispatch(fetchFacultyLeaves());
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Unable to submit request."
      );
    }
  }
);

const leavesSlice = createSlice({
  name: "leaves",
  initialState: {
    admin: initialBucket,
    faculty: initialBucket,
    updatingStatus: false,
    updateError: null,
    creating: false,
    createError: null,
  },
  reducers: {
    clearLeaves: (state) => {
      state.admin = { ...initialBucket };
      state.faculty = { ...initialBucket };
      state.updatingStatus = false;
      state.updateError = null;
      state.creating = false;
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminLeaves.pending, (state) => {
        state.admin.loading = true;
        state.admin.error = null;
      })
      .addCase(fetchAdminLeaves.fulfilled, (state, action) => {
        state.admin.loading = false;
        state.admin.items = action.payload || [];
      })
      .addCase(fetchAdminLeaves.rejected, (state, action) => {
        state.admin.loading = false;
        state.admin.error = action.payload || "Failed to fetch admin leaves";
        state.admin.items = [];
      })
      .addCase(updateAdminLeaveStatus.pending, (state) => {
        state.updatingStatus = true;
        state.updateError = null;
      })
      .addCase(updateAdminLeaveStatus.fulfilled, (state, action) => {
        const { leaveId, status } = action.payload;
        state.updatingStatus = false;
        state.admin.items = state.admin.items.map((leave) =>
          leave?._id === leaveId ? { ...leave, status } : leave
        );
      })
      .addCase(updateAdminLeaveStatus.rejected, (state, action) => {
        state.updatingStatus = false;
        state.updateError = action.payload || "Failed to update leave status";
      })
      .addCase(fetchFacultyLeaves.pending, (state) => {
        state.faculty.loading = true;
        state.faculty.error = null;
      })
      .addCase(fetchFacultyLeaves.fulfilled, (state, action) => {
        state.faculty.loading = false;
        state.faculty.items = action.payload || [];
      })
      .addCase(fetchFacultyLeaves.rejected, (state, action) => {
        state.faculty.loading = false;
        state.faculty.error = action.payload || "Failed to fetch faculty leaves";
        state.faculty.items = [];
      })
      .addCase(createFacultyLeave.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createFacultyLeave.fulfilled, (state) => {
        state.creating = false;
      })
      .addCase(createFacultyLeave.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload || "Unable to submit request.";
      });
  },
});

export const { clearLeaves } = leavesSlice.actions;

export const selectAdminLeaves = (state) => state.leaves.admin.items;
export const selectAdminLeavesLoading = (state) => state.leaves.admin.loading;
export const selectAdminLeavesError = (state) => state.leaves.admin.error;
export const selectPendingAdminLeavesCount = (state) =>
  state.leaves.admin.items.filter((leave) =>
    String(leave?.status || "").trim().toLowerCase().startsWith("pending")
  ).length;

export const selectFacultyLeaves = (state) => state.leaves.faculty.items;
export const selectFacultyLeavesLoading = (state) =>
  state.leaves.faculty.loading;
export const selectFacultyLeavesError = (state) => state.leaves.faculty.error;
export const selectAdminLeaveUpdating = (state) => state.leaves.updatingStatus;
export const selectFacultyLeaveCreating = (state) => state.leaves.creating;

export default leavesSlice.reducer;
