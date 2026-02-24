import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../Admin/constants/loadStates";

const resolveErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

const buildDraftsFromAttempt = (attempt) => {
  const drafts = {};
  (attempt?.answers || []).forEach((item) => {
    const key = String(item?.questionIndex);
    drafts[key] = {
      answerText: String(item?.answerText || ""),
      selectedOption: String(item?.selectedOption || ""),
    };
  });
  return drafts;
};

export const fetchStudentExamList = createAsyncThunk(
  "studentExam/fetchList",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${apiBase}/student/exam`, {
        withCredentials: true,
      });
      return response.data?.exams || [];
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to fetch student exams")
      );
    }
  }
);

export const startStudentExamAttempt = createAsyncThunk(
  "studentExam/startAttempt",
  async ({ apiBase, blueprintId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${apiBase}/student/exam/${blueprintId}/start`,
        {},
        { withCredentials: true }
      );
      return {
        blueprintId,
        attempt: response.data?.attempt || null,
        paper: response.data?.paper || null,
      };
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to start exam attempt")
      );
    }
  }
);

export const saveStudentExamAnswer = createAsyncThunk(
  "studentExam/saveAnswer",
  async (
    { apiBase, attemptId, questionIndex, answerText = "", selectedOption = "" },
    { rejectWithValue }
  ) => {
    try {
      const payload = {
        questionIndex,
        answerText,
        selectedOption,
      };
      const response = await axios.patch(
        `${apiBase}/student/attempt/${attemptId}/answer`,
        payload,
        { withCredentials: true }
      );
      return {
        questionIndex: Number(questionIndex),
        answerText: String(answerText || ""),
        selectedOption: String(selectedOption || ""),
        attempt: response.data?.attempt || null,
      };
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to save answer")
      );
    }
  }
);

export const submitStudentExamAttempt = createAsyncThunk(
  "studentExam/submitAttempt",
  async ({ apiBase, attemptId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${apiBase}/student/attempt/${attemptId}/submit`,
        {},
        { withCredentials: true }
      );
      return {
        attempt: response.data?.attempt || null,
        evaluation: response.data?.evaluation || null,
      };
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to submit attempt")
      );
    }
  }
);

export const fetchStudentExamResult = createAsyncThunk(
  "studentExam/fetchResult",
  async ({ apiBase, attemptId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${apiBase}/student/attempt/${attemptId}/result`,
        { withCredentials: true }
      );
      return {
        attemptId,
        attempt: response.data?.attempt || null,
        evaluation: response.data?.evaluation || null,
      };
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to fetch exam result")
      );
    }
  }
);

const initialState = {
  exams: [],
  examsLoadState: ADMIN_LOAD_STATES.INITIAL,
  examsError: null,

  activeBlueprintId: "",
  activeAttempt: null,
  activePaper: null,
  answerDrafts: {},
  activeQuestionIndex: 0,

  startLoadState: ADMIN_LOAD_STATES.INITIAL,
  startError: null,

  saveLoadState: ADMIN_LOAD_STATES.INITIAL,
  saveError: null,
  savingQuestionIndex: null,

  submitLoadState: ADMIN_LOAD_STATES.INITIAL,
  submitError: null,

  resultLoadState: ADMIN_LOAD_STATES.INITIAL,
  resultError: null,
  activeResultAttemptId: "",
  result: null,
};

const studentExamSlice = createSlice({
  name: "studentExam",
  initialState,
  reducers: {
    setStudentExamQuestionIndex: (state, action) => {
      const questionIndex = Number(action.payload);
      state.activeQuestionIndex = Number.isFinite(questionIndex)
        ? Math.max(questionIndex, 0)
        : 0;
    },
    setStudentExamAnswerDraft: (state, action) => {
      const questionIndex = Number(action.payload?.questionIndex);
      if (!Number.isFinite(questionIndex) || questionIndex < 0) return;
      const key = String(questionIndex);
      state.answerDrafts[key] = {
        answerText: String(action.payload?.answerText || ""),
        selectedOption: String(action.payload?.selectedOption || ""),
      };
    },
    clearStudentExamSession: (state) => {
      state.activeBlueprintId = "";
      state.activeAttempt = null;
      state.activePaper = null;
      state.answerDrafts = {};
      state.activeQuestionIndex = 0;
      state.startLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.startError = null;
      state.saveLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.saveError = null;
      state.savingQuestionIndex = null;
      state.submitLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.submitError = null;
    },
    clearStudentExamResult: (state) => {
      state.result = null;
      state.activeResultAttemptId = "";
      state.resultLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.resultError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentExamList.pending, (state) => {
        state.examsLoadState = ADMIN_LOAD_STATES.PENDING;
        state.examsError = null;
      })
      .addCase(fetchStudentExamList.fulfilled, (state, action) => {
        state.examsLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.exams = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchStudentExamList.rejected, (state, action) => {
        state.examsLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.examsError = action.payload || "Failed to fetch student exams";
      })

      .addCase(startStudentExamAttempt.pending, (state) => {
        state.startLoadState = ADMIN_LOAD_STATES.PENDING;
        state.startError = null;
      })
      .addCase(startStudentExamAttempt.fulfilled, (state, action) => {
        const { blueprintId, attempt, paper } = action.payload || {};
        state.startLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.activeBlueprintId = String(
          blueprintId || attempt?.blueprintId || ""
        );
        state.activeAttempt = attempt || null;
        state.activePaper = paper || null;
        state.answerDrafts = buildDraftsFromAttempt(attempt);
        state.activeQuestionIndex = 0;
        state.submitError = null;
      })
      .addCase(startStudentExamAttempt.rejected, (state, action) => {
        state.startLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.startError = action.payload || "Failed to start exam attempt";
      })

      .addCase(saveStudentExamAnswer.pending, (state, action) => {
        state.saveLoadState = ADMIN_LOAD_STATES.PENDING;
        state.saveError = null;
        state.savingQuestionIndex =
          Number.isFinite(Number(action.meta?.arg?.questionIndex))
            ? Number(action.meta.arg.questionIndex)
            : null;
      })
      .addCase(saveStudentExamAnswer.fulfilled, (state, action) => {
        const { attempt, questionIndex, answerText, selectedOption } =
          action.payload || {};
        const key = String(questionIndex);
        state.saveLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.savingQuestionIndex = null;
        if (attempt) {
          state.activeAttempt = attempt;
        }
        state.answerDrafts[key] = {
          answerText: String(answerText || ""),
          selectedOption: String(selectedOption || ""),
        };
      })
      .addCase(saveStudentExamAnswer.rejected, (state, action) => {
        state.saveLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.saveError = action.payload || "Failed to save answer";
        state.savingQuestionIndex = null;
      })

      .addCase(submitStudentExamAttempt.pending, (state) => {
        state.submitLoadState = ADMIN_LOAD_STATES.PENDING;
        state.submitError = null;
      })
      .addCase(submitStudentExamAttempt.fulfilled, (state, action) => {
        const { attempt, evaluation } = action.payload || {};
        state.submitLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.activeAttempt = attempt || state.activeAttempt;
        if (attempt?._id && evaluation) {
          state.result = {
            attempt,
            evaluation,
          };
          state.activeResultAttemptId = String(attempt._id);
          state.resultLoadState = ADMIN_LOAD_STATES.SUCCESS;
          state.resultError = null;
        }
      })
      .addCase(submitStudentExamAttempt.rejected, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.submitError = action.payload || "Failed to submit attempt";
      })

      .addCase(fetchStudentExamResult.pending, (state, action) => {
        state.resultLoadState = ADMIN_LOAD_STATES.PENDING;
        state.resultError = null;
        state.activeResultAttemptId = String(action.meta?.arg?.attemptId || "");
      })
      .addCase(fetchStudentExamResult.fulfilled, (state, action) => {
        const { attemptId, attempt, evaluation } = action.payload || {};
        state.resultLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.result = {
          attempt: attempt || null,
          evaluation: evaluation || null,
        };
        state.activeResultAttemptId = String(
          attempt?._id || attemptId || state.activeResultAttemptId
        );
        if (
          attempt?._id &&
          String(state.activeAttempt?._id || "") === String(attempt._id)
        ) {
          state.activeAttempt = attempt;
        }
      })
      .addCase(fetchStudentExamResult.rejected, (state, action) => {
        state.resultLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.resultError = action.payload || "Failed to fetch exam result";
      });
  },
});

export const {
  setStudentExamQuestionIndex,
  setStudentExamAnswerDraft,
  clearStudentExamSession,
  clearStudentExamResult,
} = studentExamSlice.actions;

export default studentExamSlice.reducer;
