import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

// ─── Exam Thunks ───
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

// ─── Exam Registration Thunks ───
export const fetchExamRegistrations = createAsyncThunk(
  "exam/fetchExamRegistrations",
  async ({ apiBase, query = {} }, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${apiBase}/admin/exam-registration`, {
        withCredentials: true,
        params: query,
      });
      return res.data?.registrations || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch registrations");
    }
  }
);

export const updateExamRegistration = createAsyncThunk(
  "exam/updateExamRegistration",
  async ({ apiBase, id, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${apiBase}/admin/exam-registration/${id}`, payload, {
        withCredentials: true,
      });
      return { id, data: res.data?.registration || res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update registration");
    }
  }
);

export const deleteExamRegistration = createAsyncThunk(
  "exam/deleteExamRegistration",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      await axios.delete(`${apiBase}/admin/exam-registration/${id}`, {
        withCredentials: true,
      });
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete registration");
    }
  }
);

// ─── Admit Card Thunks ───
export const fetchAdmitCards = createAsyncThunk(
  "exam/fetchAdmitCards",
  async ({ apiBase, query = {} }, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${apiBase}/admin/admit-card`, {
        withCredentials: true,
        params: query,
      });
      return res.data?.admitCards || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch admit cards");
    }
  }
);

export const issueAdmitCard = createAsyncThunk(
  "exam/issueAdmitCard",
  async ({ apiBase, registrationId, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${apiBase}/admin/admit-card/${registrationId}/issue`,
        payload,
        { withCredentials: true }
      );
      return res.data?.admitCard || res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to issue admit card");
    }
  }
);

export const holdAdmitCard = createAsyncThunk(
  "exam/holdAdmitCard",
  async ({ apiBase, id, holdReason = "" }, { rejectWithValue }) => {
    try {
      const res = await axios.patch(
        `${apiBase}/admin/admit-card/${id}/hold`,
        { holdReason },
        { withCredentials: true }
      );
      return { id, data: res.data?.admitCard || res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to hold admit card");
    }
  }
);

export const cancelAdmitCard = createAsyncThunk(
  "exam/cancelAdmitCard",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      const res = await axios.patch(
        `${apiBase}/admin/admit-card/${id}/cancel`,
        {},
        { withCredentials: true }
      );
      return { id, data: res.data?.admitCard || res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to cancel admit card");
    }
  }
);

export const deleteAdmitCard = createAsyncThunk(
  "exam/deleteAdmitCard",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      await axios.delete(`${apiBase}/admin/admit-card/${id}`, {
        withCredentials: true,
      });
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete admit card");
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
    // Exam registrations
    registrations: [],
    registrationsLoading: false,
    registrationActionLoading: false,
    // Admit cards
    admitCards: [],
    admitCardsLoading: false,
    admitCardActionLoading: false,
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
      })
      // ─── Exam Registrations ───
      .addCase(fetchExamRegistrations.pending, (state) => {
        state.registrationsLoading = true;
      })
      .addCase(fetchExamRegistrations.fulfilled, (state, action) => {
        state.registrationsLoading = false;
        state.registrations = action.payload;
      })
      .addCase(fetchExamRegistrations.rejected, (state, action) => {
        state.registrationsLoading = false;
        state.error = action.payload;
      })
      .addCase(updateExamRegistration.pending, (state) => {
        state.registrationActionLoading = true;
      })
      .addCase(updateExamRegistration.fulfilled, (state, action) => {
        state.registrationActionLoading = false;
        const idx = state.registrations.findIndex((r) => r._id === action.payload.id);
        if (idx !== -1 && action.payload.data) {
          state.registrations[idx] = { ...state.registrations[idx], ...action.payload.data };
        }
      })
      .addCase(updateExamRegistration.rejected, (state, action) => {
        state.registrationActionLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteExamRegistration.pending, (state) => {
        state.registrationActionLoading = true;
      })
      .addCase(deleteExamRegistration.fulfilled, (state, action) => {
        state.registrationActionLoading = false;
        state.registrations = state.registrations.filter((r) => r._id !== action.payload);
      })
      .addCase(deleteExamRegistration.rejected, (state, action) => {
        state.registrationActionLoading = false;
        state.error = action.payload;
      })
      // ─── Admit Cards ───
      .addCase(fetchAdmitCards.pending, (state) => {
        state.admitCardsLoading = true;
      })
      .addCase(fetchAdmitCards.fulfilled, (state, action) => {
        state.admitCardsLoading = false;
        state.admitCards = action.payload;
      })
      .addCase(fetchAdmitCards.rejected, (state, action) => {
        state.admitCardsLoading = false;
        state.error = action.payload;
      })
      .addCase(issueAdmitCard.pending, (state) => {
        state.admitCardActionLoading = true;
      })
      .addCase(issueAdmitCard.fulfilled, (state, action) => {
        state.admitCardActionLoading = false;
        if (action.payload) {
          const idx = state.admitCards.findIndex((c) => c._id === action.payload._id);
          if (idx !== -1) {
            state.admitCards[idx] = action.payload;
          } else {
            state.admitCards.unshift(action.payload);
          }
        }
      })
      .addCase(issueAdmitCard.rejected, (state, action) => {
        state.admitCardActionLoading = false;
        state.error = action.payload;
      })
      .addCase(holdAdmitCard.pending, (state) => {
        state.admitCardActionLoading = true;
      })
      .addCase(holdAdmitCard.fulfilled, (state, action) => {
        state.admitCardActionLoading = false;
        const idx = state.admitCards.findIndex((c) => c._id === action.payload.id);
        if (idx !== -1 && action.payload.data) {
          state.admitCards[idx] = { ...state.admitCards[idx], ...action.payload.data };
        }
      })
      .addCase(holdAdmitCard.rejected, (state, action) => {
        state.admitCardActionLoading = false;
        state.error = action.payload;
      })
      .addCase(cancelAdmitCard.pending, (state) => {
        state.admitCardActionLoading = true;
      })
      .addCase(cancelAdmitCard.fulfilled, (state, action) => {
        state.admitCardActionLoading = false;
        const idx = state.admitCards.findIndex((c) => c._id === action.payload.id);
        if (idx !== -1 && action.payload.data) {
          state.admitCards[idx] = { ...state.admitCards[idx], ...action.payload.data };
        }
      })
      .addCase(cancelAdmitCard.rejected, (state, action) => {
        state.admitCardActionLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteAdmitCard.pending, (state) => {
        state.admitCardActionLoading = true;
      })
      .addCase(deleteAdmitCard.fulfilled, (state, action) => {
        state.admitCardActionLoading = false;
        state.admitCards = state.admitCards.filter((c) => c._id !== action.payload);
      })
      .addCase(deleteAdmitCard.rejected, (state, action) => {
        state.admitCardActionLoading = false;
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
// Registration selectors
export const selectExamRegistrations = (state) => state.exam?.registrations ?? [];
export const selectRegistrationsLoading = (state) => state.exam?.registrationsLoading ?? false;
export const selectRegistrationActionLoading = (state) => state.exam?.registrationActionLoading ?? false;
// Admit card selectors
export const selectAdmitCards = (state) => state.exam?.admitCards ?? [];
export const selectAdmitCardsLoading = (state) => state.exam?.admitCardsLoading ?? false;
export const selectAdmitCardActionLoading = (state) => state.exam?.admitCardActionLoading ?? false;

export default examSlice.reducer;
