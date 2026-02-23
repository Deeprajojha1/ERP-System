import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

const parseAlerts = (payload) => {
  if (Array.isArray(payload?.alerts)) return payload.alerts;
  if (Array.isArray(payload?.data?.alerts)) return payload.data.alerts;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const isNotImplementedError = (error) =>
  error?.response?.status === 501 ||
  String(error?.response?.data?.message || "")
    .toLowerCase()
    .includes("not implemented");

const toErrorPayload = (error, fallback) => ({
  message: error?.response?.data?.message || fallback,
  notImplemented: isNotImplementedError(error),
});

export const fetchAdminAlerts = createAsyncThunk(
  "alerts/fetchAdminAlerts",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/alerts`, {
        withCredentials: true,
      });
      return parseAlerts(response.data);
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to load alerts"));
    }
  }
);

export const createAdminAlert = createAsyncThunk(
  "alerts/createAdminAlert",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/alerts`, payload, {
        withCredentials: true,
      });
      return response.data?.alert || response.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to create alert"));
    }
  }
);

export const toggleAdminAlertStatus = createAsyncThunk(
  "alerts/toggleAdminAlertStatus",
  async ({ id, isActive }, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      await axios.put(
        `${apiBase}/admin/alerts/${id}`,
        { isActive: !isActive },
        { withCredentials: true }
      );
      return { id, isActive: !isActive };
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to update alert"));
    }
  }
);

export const deleteAdminAlert = createAsyncThunk(
  "alerts/deleteAdminAlert",
  async (id, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      await axios.delete(`${apiBase}/admin/alerts/${id}`, {
        withCredentials: true,
      });
      return id;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to delete alert"));
    }
  }
);

const alertSlice = createSlice({
  name: "alerts",
  initialState: {
    alerts: [],
    loading: false,
    submitting: false,
    updatingById: {},
    deletingById: {},
    error: null,
    notImplemented: false,
  },
  reducers: {
    clearAlertError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload || [];
        state.notImplemented = false;
      })
      .addCase(fetchAdminAlerts.rejected, (state, action) => {
        state.loading = false;
        state.alerts = [];
        state.error = action.payload?.message || "Failed to load alerts";
        state.notImplemented = Boolean(action.payload?.notImplemented);
      })
      .addCase(createAdminAlert.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createAdminAlert.fulfilled, (state, action) => {
        state.submitting = false;
        if (action.payload) {
          state.alerts.unshift(action.payload);
        }
      })
      .addCase(createAdminAlert.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload?.message || "Failed to create alert";
        state.notImplemented = Boolean(action.payload?.notImplemented);
      })
      .addCase(toggleAdminAlertStatus.pending, (state, action) => {
        const id = action.meta?.arg?.id;
        if (id) state.updatingById[id] = true;
        state.error = null;
      })
      .addCase(toggleAdminAlertStatus.fulfilled, (state, action) => {
        const { id, isActive } = action.payload || {};
        if (id) {
          delete state.updatingById[id];
          const alert = state.alerts.find((a) => a._id === id);
          if (alert) {
            alert.isActive = isActive;
          }
        }
      })
      .addCase(toggleAdminAlertStatus.rejected, (state, action) => {
        const id = action.meta?.arg?.id;
        if (id) delete state.updatingById[id];
        state.error = action.payload?.message || "Failed to update alert";
        state.notImplemented = Boolean(action.payload?.notImplemented);
      })
      .addCase(deleteAdminAlert.pending, (state, action) => {
        const id = action.meta?.arg;
        if (id) state.deletingById[id] = true;
        state.error = null;
      })
      .addCase(deleteAdminAlert.fulfilled, (state, action) => {
        const id = action.payload;
        if (id) {
          delete state.deletingById[id];
          state.alerts = state.alerts.filter((a) => a._id !== id);
        }
      })
      .addCase(deleteAdminAlert.rejected, (state, action) => {
        const id = action.meta?.arg;
        if (id) delete state.deletingById[id];
        state.error = action.payload?.message || "Failed to delete alert";
        state.notImplemented = Boolean(action.payload?.notImplemented);
      });
  },
});

export const { clearAlertError } = alertSlice.actions;

export const selectAdminAlerts = (state) => state?.alerts?.alerts || [];
export const selectAdminAlertsLoading = (state) => Boolean(state?.alerts?.loading);
export const selectAdminAlertsSubmitting = (state) => Boolean(state?.alerts?.submitting);
export const selectAdminAlertsUpdatingById = (state) => state?.alerts?.updatingById || {};
export const selectAdminAlertsDeletingById = (state) => state?.alerts?.deletingById || {};
export const selectAdminAlertsError = (state) => state?.alerts?.error || null;
export const selectAdminAlertsNotImplemented = (state) =>
  Boolean(state?.alerts?.notImplemented);

export default alertSlice.reducer;
