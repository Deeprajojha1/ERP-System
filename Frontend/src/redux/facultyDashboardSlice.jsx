import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../Admin/constants/loadStates";

const resolveErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

// Fetch faculty profile data
export const fetchFacultyProfile = createAsyncThunk(
  "facultyDashboard/fetchProfile",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${apiBase}/faculty/me`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to load faculty profile"));
    }
  }
);

// Fetch faculty alerts
export const fetchFacultyAlerts = createAsyncThunk(
  "facultyDashboard/fetchAlerts",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${apiBase}/faculty/alerts`, {
        withCredentials: true,
      });
      return response.data?.alerts || [];
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to load alerts"));
    }
  }
);

// Fetch faculty leaves
export const fetchFacultyLeaves = createAsyncThunk(
  "facultyDashboard/fetchLeaves",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${apiBase}/faculty/leave`, {
        withCredentials: true,
      });
      return response.data?.leaves || response.data || [];
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to load leaves"));
    }
  }
);

// Apply for leave
export const applyFacultyLeave = createAsyncThunk(
  "facultyDashboard/applyLeave",
  async ({ apiBase, payload }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${apiBase}/faculty/leave`, payload, {
        withCredentials: true,
      });
      return response.data?.leave || response.data;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to apply leave"));
    }
  }
);

// Fetch students by group
export const fetchStudentsByGroup = createAsyncThunk(
  "facultyDashboard/fetchStudentsByGroup",
  async ({ apiBase, groupId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${apiBase}/faculty/attendance/group/${groupId}/students`,
        { withCredentials: true }
      );
      return { groupId, students: response.data?.students || [] };
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch students"));
    }
  }
);

// Fetch attendance page with existing session (if already marked)
export const fetchFacultyAttendancePage = createAsyncThunk(
  "facultyDashboard/fetchAttendancePage",
  async ({ apiBase, groupId, courseId, date, lectureNumber }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${apiBase}/faculty/attendance/${groupId}`, {
        withCredentials: true,
        params: { courseId, date, lectureNumber },
      });
      return response.data || {};
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch attendance page"));
    }
  }
);

// Mark attendance
export const markAttendance = createAsyncThunk(
  "facultyDashboard/markAttendance",
  async ({ apiBase, groupId, payload }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${apiBase}/faculty/attendance/${groupId}`,
        payload,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to mark attendance"));
    }
  }
);

// Update attendance session
export const updateFacultyAttendanceSession = createAsyncThunk(
  "facultyDashboard/updateAttendanceSession",
  async ({ apiBase, sessionId, payload }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${apiBase}/faculty/attendance/session/${sessionId}`,
        payload,
        { withCredentials: true }
      );
      return response.data?.session || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to update attendance"));
    }
  }
);

// Fetch attendance by group and course
export const fetchAttendanceByGroupCourse = createAsyncThunk(
  "facultyDashboard/fetchAttendanceByGroupCourse",
  async ({ apiBase, groupId, courseId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${apiBase}/faculty/attendance/group/${groupId}/course/${courseId}`,
        { withCredentials: true, params }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch attendance"));
    }
  }
);

// Fetch exam blueprints for faculty
export const fetchFacultyExamBlueprints = createAsyncThunk(
  "facultyDashboard/fetchExamBlueprints",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${apiBase}/faculty/exam-blueprint`, {
        withCredentials: true,
      });
      return response.data?.blueprints || response.data || [];
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch exam blueprints"));
    }
  }
);

// Fetch a single exam blueprint by id
export const fetchFacultyExamBlueprintById = createAsyncThunk(
  "facultyDashboard/fetchExamBlueprintById",
  async ({ apiBase, blueprintId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${apiBase}/faculty/exam-blueprint/${blueprintId}`, {
        withCredentials: true,
      });
      return response.data?.blueprint || response.data || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch blueprint details"));
    }
  }
);

// Upsert exam syllabus
export const upsertFacultyExamSyllabus = createAsyncThunk(
  "facultyDashboard/upsertExamSyllabus",
  async ({ apiBase, blueprintId, payload }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${apiBase}/faculty/exam-blueprint/${blueprintId}/syllabus`,
        payload,
        { withCredentials: true }
      );
      return response.data?.blueprint || response.data || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to save syllabus"));
    }
  }
);

// Generate exam paper
export const generateFacultyExamPaper = createAsyncThunk(
  "facultyDashboard/generateExamPaper",
  async ({ apiBase, blueprintId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${apiBase}/faculty/exam-blueprint/${blueprintId}/generate-paper`,
        {},
        { withCredentials: true }
      );
      return response.data?.paper || response.data || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to generate exam paper"));
    }
  }
);

// Fetch latest exam paper
export const fetchFacultyExamPaper = createAsyncThunk(
  "facultyDashboard/fetchExamPaper",
  async ({ apiBase, blueprintId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${apiBase}/faculty/exam-blueprint/${blueprintId}/paper`,
        { withCredentials: true }
      );
      return response.data?.paper || response.data || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch exam paper"));
    }
  }
);

// Review exam paper
export const reviewFacultyExamPaper = createAsyncThunk(
  "facultyDashboard/reviewExamPaper",
  async ({ apiBase, paperId, payload }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${apiBase}/faculty/exam-paper/${paperId}/review`,
        payload,
        { withCredentials: true }
      );
      return response.data?.paper || response.data || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to review exam paper"));
    }
  }
);

// Fetch exam student scores
export const fetchFacultyExamStudentScores = createAsyncThunk(
  "facultyDashboard/fetchExamStudentScores",
  async ({ apiBase, blueprintId, studentId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${apiBase}/faculty/exam-blueprint/${blueprintId}/scores`,
        {
          withCredentials: true,
          params: studentId ? { studentId } : undefined,
        }
      );
      return response.data?.scores || [];
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch student scores"));
    }
  }
);

// Fetch admit cards for invigilator
export const fetchInvigilatorAdmitCards = createAsyncThunk(
  "facultyDashboard/fetchAdmitCards",
  async ({ apiBase, params }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${apiBase}/faculty/admit-card`,
        {
          withCredentials: true,
          params,
        }
      );
      return response.data?.admitCards || response.data || [];
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to fetch admit cards"));
    }
  }
);

// Verify student admit card
export const verifyAdmitCard = createAsyncThunk(
  "facultyDashboard/verifyAdmitCard",
  async ({ apiBase, admitCardId, remark }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${apiBase}/faculty/admit-card/${admitCardId}/verify`,
        { remark },
        { withCredentials: true }
      );
      return { admitCardId, data: response.data?.admitCard || response.data };
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to verify admit card"));
    }
  }
);

const facultyDashboardSlice = createSlice({
  name: "facultyDashboard",
  initialState: {
    // Profile
    facultyProfile: null,
    profileLoadState: ADMIN_LOAD_STATES.INITIAL,
    profileError: null,

    // Alerts
    alerts: [],
    alertsLoadState: ADMIN_LOAD_STATES.INITIAL,
    alertsError: null,

    // Leaves
    leaves: [],
    leavesLoadState: ADMIN_LOAD_STATES.INITIAL,
    leavesError: null,
    applyLeaveState: ADMIN_LOAD_STATES.INITIAL,

    // Attendance
    students: [],
    studentsLoadState: ADMIN_LOAD_STATES.INITIAL,
    studentsError: null,
    attendancePage: null,
    attendancePageLoadState: ADMIN_LOAD_STATES.INITIAL,
    attendancePageError: null,
    activeAttendanceSessionId: null,
    markAttendanceState: ADMIN_LOAD_STATES.INITIAL,
    updateAttendanceState: ADMIN_LOAD_STATES.INITIAL,
    attendanceRecords: [],
    attendanceLoadState: ADMIN_LOAD_STATES.INITIAL,

    // Exam Blueprints
    examBlueprints: [],
    blueprintsLoadState: ADMIN_LOAD_STATES.INITIAL,
    blueprintsError: null,
    activeBlueprint: null,
    activeBlueprintLoadState: ADMIN_LOAD_STATES.INITIAL,
    activeBlueprintError: null,
    syllabusSaveState: ADMIN_LOAD_STATES.INITIAL,
    activePaper: null,
    paperLoadState: ADMIN_LOAD_STATES.INITIAL,
    paperError: null,
    generatePaperState: ADMIN_LOAD_STATES.INITIAL,
    reviewPaperState: ADMIN_LOAD_STATES.INITIAL,
    activeScores: [],
    scoresLoadState: ADMIN_LOAD_STATES.INITIAL,
    scoresError: null,

    // Admit Cards
    admitCards: [],
    admitCardsLoadState: ADMIN_LOAD_STATES.INITIAL,
    admitCardsError: null,
    verifyAdmitCardState: ADMIN_LOAD_STATES.INITIAL,

    // UI State
    activeSection: typeof window !== "undefined" ? (localStorage.getItem("facultyActiveSection") || "dashboard") : "dashboard",
    isSidebarOpen: typeof window !== "undefined" ? window.innerWidth >= 769 : true,
  },
  reducers: {
    setActiveSection: (state, action) => {
      state.activeSection = action.payload;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("facultyActiveSection", action.payload);
        }
      } catch (e) {
        // ignore storage errors
      }
    },
    setSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    clearFacultyDashboard: (state) => {
      state.facultyProfile = null;
      state.profileLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.alerts = [];
      state.alertsLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.leaves = [];
      state.students = [];
      state.attendancePage = null;
      state.activeAttendanceSessionId = null;
      state.examBlueprints = [];
      state.activeBlueprint = null;
      state.activePaper = null;
      state.activeScores = [];
      state.admitCards = [];
      state.activeSection = "dashboard";
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("facultyActiveSection");
        }
      } catch (e) {
        // ignore
      }
    },
    resetApplyLeaveState: (state) => {
      state.applyLeaveState = ADMIN_LOAD_STATES.INITIAL;
    },
    resetMarkAttendanceState: (state) => {
      state.markAttendanceState = ADMIN_LOAD_STATES.INITIAL;
    },
    resetUpdateAttendanceState: (state) => {
      state.updateAttendanceState = ADMIN_LOAD_STATES.INITIAL;
    },
    resetVerifyAdmitCardState: (state) => {
      state.verifyAdmitCardState = ADMIN_LOAD_STATES.INITIAL;
    },
    resetExamWorkflowState: (state) => {
      state.syllabusSaveState = ADMIN_LOAD_STATES.INITIAL;
      state.generatePaperState = ADMIN_LOAD_STATES.INITIAL;
      state.reviewPaperState = ADMIN_LOAD_STATES.INITIAL;
      state.paperLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.scoresLoadState = ADMIN_LOAD_STATES.INITIAL;
      state.paperError = null;
      state.scoresError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchFacultyProfile.pending, (state) => {
        state.profileLoadState = ADMIN_LOAD_STATES.PENDING;
        state.profileError = null;
      })
      .addCase(fetchFacultyProfile.fulfilled, (state, action) => {
        state.profileLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.facultyProfile = action.payload;
      })
      .addCase(fetchFacultyProfile.rejected, (state, action) => {
        state.profileLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.profileError = action.payload;
      })

      // Fetch Alerts
      .addCase(fetchFacultyAlerts.pending, (state) => {
        state.alertsLoadState = ADMIN_LOAD_STATES.PENDING;
        state.alertsError = null;
      })
      .addCase(fetchFacultyAlerts.fulfilled, (state, action) => {
        state.alertsLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.alerts = action.payload || [];
      })
      .addCase(fetchFacultyAlerts.rejected, (state, action) => {
        state.alertsLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.alertsError = action.payload;
      })

      // Fetch Leaves
      .addCase(fetchFacultyLeaves.pending, (state) => {
        state.leavesLoadState = ADMIN_LOAD_STATES.PENDING;
        state.leavesError = null;
      })
      .addCase(fetchFacultyLeaves.fulfilled, (state, action) => {
        state.leavesLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.leaves = action.payload;
      })
      .addCase(fetchFacultyLeaves.rejected, (state, action) => {
        state.leavesLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.leavesError = action.payload;
      })

      // Apply Leave
      .addCase(applyFacultyLeave.pending, (state) => {
        state.applyLeaveState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(applyFacultyLeave.fulfilled, (state, action) => {
        state.applyLeaveState = ADMIN_LOAD_STATES.SUCCESS;
        state.leaves = [action.payload, ...state.leaves];
      })
      .addCase(applyFacultyLeave.rejected, (state) => {
        state.applyLeaveState = ADMIN_LOAD_STATES.FAILURE;
      })

      // Fetch Students by Group
      .addCase(fetchStudentsByGroup.pending, (state) => {
        state.studentsLoadState = ADMIN_LOAD_STATES.PENDING;
        state.studentsError = null;
      })
      .addCase(fetchStudentsByGroup.fulfilled, (state, action) => {
        state.studentsLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.students = action.payload.students;
      })
      .addCase(fetchStudentsByGroup.rejected, (state, action) => {
        state.studentsLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.studentsError = action.payload;
      })

      // Fetch Attendance Page
      .addCase(fetchFacultyAttendancePage.pending, (state) => {
        state.attendancePageLoadState = ADMIN_LOAD_STATES.PENDING;
        state.attendancePageError = null;
      })
      .addCase(fetchFacultyAttendancePage.fulfilled, (state, action) => {
        state.attendancePageLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.attendancePage = action.payload;
        state.activeAttendanceSessionId = action.payload?.sessionId || null;
        state.students = action.payload?.students || [];
      })
      .addCase(fetchFacultyAttendancePage.rejected, (state, action) => {
        state.attendancePageLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.attendancePageError = action.payload;
      })

      // Mark Attendance
      .addCase(markAttendance.pending, (state) => {
        state.markAttendanceState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(markAttendance.fulfilled, (state, action) => {
        state.markAttendanceState = ADMIN_LOAD_STATES.SUCCESS;
        state.activeAttendanceSessionId = action.payload?.session?._id || state.activeAttendanceSessionId;
      })
      .addCase(markAttendance.rejected, (state) => {
        state.markAttendanceState = ADMIN_LOAD_STATES.FAILURE;
      })

      // Update Attendance
      .addCase(updateFacultyAttendanceSession.pending, (state) => {
        state.updateAttendanceState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(updateFacultyAttendanceSession.fulfilled, (state, action) => {
        state.updateAttendanceState = ADMIN_LOAD_STATES.SUCCESS;
        state.activeAttendanceSessionId = action.payload?._id || state.activeAttendanceSessionId;
      })
      .addCase(updateFacultyAttendanceSession.rejected, (state) => {
        state.updateAttendanceState = ADMIN_LOAD_STATES.FAILURE;
      })

      // Fetch Attendance by Group & Course
      .addCase(fetchAttendanceByGroupCourse.pending, (state) => {
        state.attendanceLoadState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(fetchAttendanceByGroupCourse.fulfilled, (state, action) => {
        state.attendanceLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.attendanceRecords = action.payload;
      })
      .addCase(fetchAttendanceByGroupCourse.rejected, (state) => {
        state.attendanceLoadState = ADMIN_LOAD_STATES.FAILURE;
      })

      // Fetch Exam Blueprints
      .addCase(fetchFacultyExamBlueprints.pending, (state) => {
        state.blueprintsLoadState = ADMIN_LOAD_STATES.PENDING;
        state.blueprintsError = null;
      })
      .addCase(fetchFacultyExamBlueprints.fulfilled, (state, action) => {
        state.blueprintsLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.examBlueprints = action.payload;
      })
      .addCase(fetchFacultyExamBlueprints.rejected, (state, action) => {
        state.blueprintsLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.blueprintsError = action.payload;
      })

      // Fetch Blueprint By Id
      .addCase(fetchFacultyExamBlueprintById.pending, (state) => {
        state.activeBlueprintLoadState = ADMIN_LOAD_STATES.PENDING;
        state.activeBlueprintError = null;
      })
      .addCase(fetchFacultyExamBlueprintById.fulfilled, (state, action) => {
        state.activeBlueprintLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.activeBlueprint = action.payload || null;
      })
      .addCase(fetchFacultyExamBlueprintById.rejected, (state, action) => {
        state.activeBlueprintLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.activeBlueprintError = action.payload;
      })

      // Upsert Syllabus
      .addCase(upsertFacultyExamSyllabus.pending, (state) => {
        state.syllabusSaveState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(upsertFacultyExamSyllabus.fulfilled, (state, action) => {
        state.syllabusSaveState = ADMIN_LOAD_STATES.SUCCESS;
        state.activeBlueprint = action.payload || state.activeBlueprint;
        state.examBlueprints = state.examBlueprints.map((item) =>
          item._id === action.payload?._id ? action.payload : item
        );
      })
      .addCase(upsertFacultyExamSyllabus.rejected, (state) => {
        state.syllabusSaveState = ADMIN_LOAD_STATES.FAILURE;
      })

      // Generate Paper
      .addCase(generateFacultyExamPaper.pending, (state) => {
        state.generatePaperState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(generateFacultyExamPaper.fulfilled, (state, action) => {
        state.generatePaperState = ADMIN_LOAD_STATES.SUCCESS;
        state.activePaper = action.payload || null;
      })
      .addCase(generateFacultyExamPaper.rejected, (state) => {
        state.generatePaperState = ADMIN_LOAD_STATES.FAILURE;
      })

      // Fetch Paper
      .addCase(fetchFacultyExamPaper.pending, (state) => {
        state.paperLoadState = ADMIN_LOAD_STATES.PENDING;
        state.paperError = null;
      })
      .addCase(fetchFacultyExamPaper.fulfilled, (state, action) => {
        state.paperLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.activePaper = action.payload || null;
      })
      .addCase(fetchFacultyExamPaper.rejected, (state, action) => {
        state.paperLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.paperError = action.payload;
      })

      // Review Paper
      .addCase(reviewFacultyExamPaper.pending, (state) => {
        state.reviewPaperState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(reviewFacultyExamPaper.fulfilled, (state, action) => {
        state.reviewPaperState = ADMIN_LOAD_STATES.SUCCESS;
        state.activePaper = action.payload || state.activePaper;
      })
      .addCase(reviewFacultyExamPaper.rejected, (state) => {
        state.reviewPaperState = ADMIN_LOAD_STATES.FAILURE;
      })

      // Fetch Scores
      .addCase(fetchFacultyExamStudentScores.pending, (state) => {
        state.scoresLoadState = ADMIN_LOAD_STATES.PENDING;
        state.scoresError = null;
      })
      .addCase(fetchFacultyExamStudentScores.fulfilled, (state, action) => {
        state.scoresLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.activeScores = action.payload || [];
      })
      .addCase(fetchFacultyExamStudentScores.rejected, (state, action) => {
        state.scoresLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.scoresError = action.payload;
      })

      // Fetch Admit Cards
      .addCase(fetchInvigilatorAdmitCards.pending, (state) => {
        state.admitCardsLoadState = ADMIN_LOAD_STATES.PENDING;
        state.admitCardsError = null;
      })
      .addCase(fetchInvigilatorAdmitCards.fulfilled, (state, action) => {
        state.admitCardsLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.admitCards = action.payload;
      })
      .addCase(fetchInvigilatorAdmitCards.rejected, (state, action) => {
        state.admitCardsLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.admitCardsError = action.payload;
      })

      // Verify Admit Card
      .addCase(verifyAdmitCard.pending, (state) => {
        state.verifyAdmitCardState = ADMIN_LOAD_STATES.PENDING;
      })
      .addCase(verifyAdmitCard.fulfilled, (state, action) => {
        state.verifyAdmitCardState = ADMIN_LOAD_STATES.SUCCESS;
        const idx = state.admitCards.findIndex(
          (ac) => ac._id === action.payload.admitCardId
        );
        if (idx !== -1) {
          state.admitCards[idx] = {
            ...state.admitCards[idx],
            ...action.payload.data,
          };
        }
      })
      .addCase(verifyAdmitCard.rejected, (state) => {
        state.verifyAdmitCardState = ADMIN_LOAD_STATES.FAILURE;
      });
  },
});

export const {
  setActiveSection,
  setSidebarOpen,
  toggleSidebar,
  clearFacultyDashboard,
  resetApplyLeaveState,
  resetMarkAttendanceState,
  resetUpdateAttendanceState,
  resetVerifyAdmitCardState,
  resetExamWorkflowState,
} = facultyDashboardSlice.actions;

// Selectors
export const selectFacultyProfile = (state) => state.facultyDashboard.facultyProfile;
export const selectProfileLoadState = (state) => state.facultyDashboard.profileLoadState;
export const selectFacultyAlerts = (state) => state.facultyDashboard.alerts;
export const selectFacultyAlertsLoadState = (state) => state.facultyDashboard.alertsLoadState;
export const selectFacultyLeaves = (state) => state.facultyDashboard.leaves;
export const selectLeavesLoadState = (state) => state.facultyDashboard.leavesLoadState;
export const selectApplyLeaveState = (state) => state.facultyDashboard.applyLeaveState;
export const selectStudents = (state) => state.facultyDashboard.students;
export const selectStudentsLoadState = (state) => state.facultyDashboard.studentsLoadState;
export const selectMarkAttendanceState = (state) => state.facultyDashboard.markAttendanceState;
export const selectAttendancePage = (state) => state.facultyDashboard.attendancePage;
export const selectAttendancePageLoadState = (state) => state.facultyDashboard.attendancePageLoadState;
export const selectActiveAttendanceSessionId = (state) => state.facultyDashboard.activeAttendanceSessionId;
export const selectUpdateAttendanceState = (state) => state.facultyDashboard.updateAttendanceState;
export const selectActiveSection = (state) => state.facultyDashboard.activeSection;
export const selectIsSidebarOpen = (state) => state.facultyDashboard.isSidebarOpen;
export const selectExamBlueprints = (state) => state.facultyDashboard.examBlueprints;
export const selectBlueprintsLoadState = (state) => state.facultyDashboard.blueprintsLoadState;
export const selectActiveBlueprint = (state) => state.facultyDashboard.activeBlueprint;
export const selectActiveBlueprintLoadState = (state) => state.facultyDashboard.activeBlueprintLoadState;
export const selectSyllabusSaveState = (state) => state.facultyDashboard.syllabusSaveState;
export const selectActivePaper = (state) => state.facultyDashboard.activePaper;
export const selectPaperLoadState = (state) => state.facultyDashboard.paperLoadState;
export const selectGeneratePaperState = (state) => state.facultyDashboard.generatePaperState;
export const selectReviewPaperState = (state) => state.facultyDashboard.reviewPaperState;
export const selectActiveScores = (state) => state.facultyDashboard.activeScores;
export const selectScoresLoadState = (state) => state.facultyDashboard.scoresLoadState;
export const selectAdmitCards = (state) => state.facultyDashboard.admitCards;
export const selectAdmitCardsLoadState = (state) => state.facultyDashboard.admitCardsLoadState;
export const selectVerifyAdmitCardState = (state) => state.facultyDashboard.verifyAdmitCardState;

export default facultyDashboardSlice.reducer;
