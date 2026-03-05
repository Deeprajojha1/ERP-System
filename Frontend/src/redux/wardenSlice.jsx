import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";

export const fetchWardenProfile = createAsyncThunk(
  "warden/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/api/warden/me");
      return res.data?.profile || null;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to load warden profile");
    }
  }
);

export const fetchWardenOverview = createAsyncThunk(
  "warden/fetchOverview",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/api/warden/overview");
      return res.data?.overview || null;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to load overview");
    }
  }
);

export const fetchWardenHostels = createAsyncThunk(
  "warden/fetchHostels",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/api/warden/hostels");
      return Array.isArray(res.data?.hostels) ? res.data.hostels : [];
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Failed to load hostels");
    }
  }
);

const wardenSlice = createSlice({
  name: "warden",
  initialState: {
    profile: null,
    overview: null,
    hostels: [],
    loading: {
      profile: false,
      overview: false,
      hostels: false,
    },
    error: {
      profile: "",
      overview: "",
      hostels: "",
    },
  },
  reducers: {
    clearWarden(state) {
      state.profile = null;
      state.overview = null;
      state.hostels = [];
      state.loading = { profile: false, overview: false, hostels: false };
      state.error = { profile: "", overview: "", hostels: "" };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWardenProfile.pending, (state) => {
        state.loading.profile = true;
        state.error.profile = "";
      })
      .addCase(fetchWardenProfile.fulfilled, (state, action) => {
        state.loading.profile = false;
        state.profile = action.payload;
      })
      .addCase(fetchWardenProfile.rejected, (state, action) => {
        state.loading.profile = false;
        state.error.profile = String(action.payload || action.error?.message || "");
      })
      .addCase(fetchWardenOverview.pending, (state) => {
        state.loading.overview = true;
        state.error.overview = "";
      })
      .addCase(fetchWardenOverview.fulfilled, (state, action) => {
        state.loading.overview = false;
        state.overview = action.payload;
      })
      .addCase(fetchWardenOverview.rejected, (state, action) => {
        state.loading.overview = false;
        state.error.overview = String(action.payload || action.error?.message || "");
      })
      .addCase(fetchWardenHostels.pending, (state) => {
        state.loading.hostels = true;
        state.error.hostels = "";
      })
      .addCase(fetchWardenHostels.fulfilled, (state, action) => {
        state.loading.hostels = false;
        state.hostels = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchWardenHostels.rejected, (state, action) => {
        state.loading.hostels = false;
        state.error.hostels = String(action.payload || action.error?.message || "");
      });
  },
});

export const { clearWarden } = wardenSlice.actions;
export default wardenSlice.reducer;
