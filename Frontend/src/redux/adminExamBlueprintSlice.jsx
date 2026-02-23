import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../Admin/constants/loadStates";

const resolveErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

export const fetchAdminExamScores = createAsyncThunk(
  "adminExamBlueprint/fetchScores",
  async ({ apiBase, blueprintId, studentId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${apiBase}/admin/exam-blueprint/${blueprintId}/scores`,
        {
          withCredentials: true,
          params: studentId ? { studentId } : undefined,
        }
      );
      return {
        blueprintId,
        scores: response.data?.scores || [],
      };
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to fetch exam scores")
      );
    }
  }
);

export const closeAdminExamBlueprint = createAsyncThunk(
  "adminExamBlueprint/close",
  async ({ apiBase, blueprintId }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${apiBase}/admin/exam-blueprint/${blueprintId}/close`,
        {},
        { withCredentials: true }
      );
      return {
        blueprintId,
        blueprint: response.data?.blueprint || null,
      };
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to close exam blueprint")
      );
    }
  }
);

export const softDeleteAdminExamBlueprint = createAsyncThunk(
  "adminExamBlueprint/delete",
  async ({ apiBase, blueprintId }, { rejectWithValue }) => {
    try {
      await axios.patch(
        `${apiBase}/admin/exam-blueprint/${blueprintId}/delete`,
        {},
        { withCredentials: true }
      );
      return blueprintId;
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to delete exam blueprint")
      );
    }
  }
);

const adminExamBlueprintSlice = createSlice({
  name: "adminExamBlueprint",
  initialState: {
    scoresByBlueprint: {},
    activeScoresBlueprintId: "",
    scoresLoadState: ADMIN_LOAD_STATES.INITIAL,
    scoresError: null,
    closingIds: [],
    deletingIds: [],
  },
  reducers: {
    resetAdminExamScores: (state) => {
      state.activeScoresBlueprintId = "";
      state.scoresLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.scoresError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminExamScores.pending, (state, action) => {
        state.scoresLoadState = ADMIN_LOAD_STATES.PENDING;
        state.scoresError = null;
        state.activeScoresBlueprintId =
          action.meta?.arg?.blueprintId || state.activeScoresBlueprintId;
      })
      .addCase(fetchAdminExamScores.fulfilled, (state, action) => {
        const { blueprintId, scores } = action.payload || {};
        if (blueprintId) {
          state.scoresByBlueprint[blueprintId] = Array.isArray(scores)
            ? scores
            : [];
          state.activeScoresBlueprintId = blueprintId;
        }
        state.scoresLoadState = ADMIN_LOAD_STATES.SUCCESS;
      })
      .addCase(fetchAdminExamScores.rejected, (state, action) => {
        state.scoresLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.scoresError = action.payload || "Failed to fetch exam scores";
      })
      .addCase(closeAdminExamBlueprint.pending, (state, action) => {
        const blueprintId = action.meta?.arg?.blueprintId;
        if (blueprintId && !state.closingIds.includes(blueprintId)) {
          state.closingIds.push(blueprintId);
        }
      })
      .addCase(closeAdminExamBlueprint.fulfilled, (state, action) => {
        const blueprintId = action.payload?.blueprintId;
        state.closingIds = state.closingIds.filter((id) => id !== blueprintId);
      })
      .addCase(closeAdminExamBlueprint.rejected, (state, action) => {
        const blueprintId = action.meta?.arg?.blueprintId;
        state.closingIds = state.closingIds.filter((id) => id !== blueprintId);
      })
      .addCase(softDeleteAdminExamBlueprint.pending, (state, action) => {
        const blueprintId = action.meta?.arg?.blueprintId;
        if (blueprintId && !state.deletingIds.includes(blueprintId)) {
          state.deletingIds.push(blueprintId);
        }
      })
      .addCase(softDeleteAdminExamBlueprint.fulfilled, (state, action) => {
        const blueprintId = action.payload;
        state.deletingIds = state.deletingIds.filter((id) => id !== blueprintId);
        if (blueprintId) {
          delete state.scoresByBlueprint[blueprintId];
          if (state.activeScoresBlueprintId === blueprintId) {
            state.activeScoresBlueprintId = "";
            state.scoresLoadState = ADMIN_LOAD_STATES.INITIAL;
            state.scoresError = null;
          }
        }
      })
      .addCase(softDeleteAdminExamBlueprint.rejected, (state, action) => {
        const blueprintId = action.meta?.arg?.blueprintId;
        state.deletingIds = state.deletingIds.filter((id) => id !== blueprintId);
      });
  },
});

export const { resetAdminExamScores } = adminExamBlueprintSlice.actions;

export const selectAdminExamScoresLoadState = (state) =>
  state.adminExamBlueprint?.scoresLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectAdminExamScoresError = (state) =>
  state.adminExamBlueprint?.scoresError || null;
export const selectAdminExamScoresBlueprintId = (state) =>
  state.adminExamBlueprint?.activeScoresBlueprintId || "";
export const selectAdminExamScores = (state) => {
  const activeId = state.adminExamBlueprint?.activeScoresBlueprintId || "";
  const scoresByBlueprint = state.adminExamBlueprint?.scoresByBlueprint || {};
  return Array.isArray(scoresByBlueprint[activeId]) ? scoresByBlueprint[activeId] : [];
};
export const selectAdminExamClosingIds = (state) =>
  state.adminExamBlueprint?.closingIds || [];
export const selectAdminExamDeletingIds = (state) =>
  state.adminExamBlueprint?.deletingIds || [];

export default adminExamBlueprintSlice.reducer;
