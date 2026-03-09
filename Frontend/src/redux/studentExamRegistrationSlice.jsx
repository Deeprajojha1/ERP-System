import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

// ─── Thunks ───

export const fetchPublishedExams = createAsyncThunk(
  "studentExamRegistration/fetchPublishedExams",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/student/exam`, {
        withCredentials: true,
      });
      return res.data?.exams || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch exams");
    }
  }
);

export const fetchMyExamRegistrations = createAsyncThunk(
  "studentExamRegistration/fetchMyRegistrations",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/student/exam-registration`, {
        withCredentials: true,
      });
      return res.data?.registrations || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch registrations");
    }
  }
);

export const fetchMyExamRegistrationById = createAsyncThunk(
  "studentExamRegistration/fetchById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.get(`${apiBase}/student/exam-registration/${id}`, {
        withCredentials: true,
      });
      return res.data?.registration || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch registration");
    }
  }
);

export const applyExamRegistration = createAsyncThunk(
  "studentExamRegistration/apply",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.post(`${apiBase}/student/exam-registration/apply`, payload, {
        withCredentials: true,
      });
      return res.data?.registration || res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to submit registration");
    }
  }
);

export const updateMyExamRegistration = createAsyncThunk(
  "studentExamRegistration/update",
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const res = await axios.put(`${apiBase}/student/exam-registration/${id}`, payload, {
        withCredentials: true,
      });
      return res.data?.registration || res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update registration");
    }
  }
);

export const uploadExamRegImage = createAsyncThunk(
  "studentExamRegistration/uploadImage",
  async ({ file, fieldType }, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const formData = new FormData();
      formData.append("image", file);
      formData.append("fieldType", fieldType);
      const res = await axios.post(
        `${apiBase}/student/exam-registration/upload-image`,
        formData,
        { withCredentials: true }
      );
      return { fieldType, imageUrl: res.data?.imageUrl };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to upload image");
    }
  }
);

// ─── Slice ───

const studentExamRegistrationSlice = createSlice({
  name: "studentExamRegistration",
  initialState: {
    publishedExams: [],
    publishedExamsLoading: false,
    registrations: [],
    registrationsLoading: false,
    selectedRegistration: null,
    selectedLoading: false,
    submitLoading: false,
  },
  reducers: {
    clearSelectedRegistration: (state) => {
      state.selectedRegistration = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublishedExams.pending, (state) => {
        state.publishedExamsLoading = true;
      })
      .addCase(fetchPublishedExams.fulfilled, (state, action) => {
        state.publishedExamsLoading = false;
        state.publishedExams = action.payload;
      })
      .addCase(fetchPublishedExams.rejected, (state) => {
        state.publishedExamsLoading = false;
      })

      .addCase(fetchMyExamRegistrations.pending, (state) => {
        state.registrationsLoading = true;
      })
      .addCase(fetchMyExamRegistrations.fulfilled, (state, action) => {
        state.registrationsLoading = false;
        state.registrations = action.payload;
      })
      .addCase(fetchMyExamRegistrations.rejected, (state) => {
        state.registrationsLoading = false;
      })

      .addCase(fetchMyExamRegistrationById.pending, (state) => {
        state.selectedLoading = true;
      })
      .addCase(fetchMyExamRegistrationById.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selectedRegistration = action.payload;
      })
      .addCase(fetchMyExamRegistrationById.rejected, (state) => {
        state.selectedLoading = false;
      })

      .addCase(applyExamRegistration.pending, (state) => {
        state.submitLoading = true;
      })
      .addCase(applyExamRegistration.fulfilled, (state, action) => {
        state.submitLoading = false;
        const idx = state.registrations.findIndex(
          (r) => r._id === action.payload?._id
        );
        if (idx >= 0) {
          state.registrations[idx] = action.payload;
        } else {
          state.registrations.unshift(action.payload);
        }
      })
      .addCase(applyExamRegistration.rejected, (state) => {
        state.submitLoading = false;
      })

      .addCase(updateMyExamRegistration.pending, (state) => {
        state.submitLoading = true;
      })
      .addCase(updateMyExamRegistration.fulfilled, (state, action) => {
        state.submitLoading = false;
        const idx = state.registrations.findIndex(
          (r) => r._id === action.payload?._id
        );
        if (idx >= 0) {
          state.registrations[idx] = action.payload;
        }
      })
      .addCase(updateMyExamRegistration.rejected, (state) => {
        state.submitLoading = false;
      });
  },
});

export const { clearSelectedRegistration } = studentExamRegistrationSlice.actions;
export default studentExamRegistrationSlice.reducer;
