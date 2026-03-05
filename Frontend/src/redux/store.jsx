import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userSlice from "./userSlice";
import studentSlice from "./studentSlice";
import facultySlice from "./facultySlice";
import departmentSlice from "./departmentSlice";
import configSlice from "./configSlice";
import leavesSlice from "./leavesSlice";
import timetableSlice from "./timetableSlice";
import attendanceSlice from "./attendanceSlice";
import assignmentSlice from "./assignmentSlice";
import examSlice from "./examSlice";
import feeSlice from "./feeSlice";
import alertSlice from "./alertSlice";
import groupSlice from "./groupSlice";
import resultSlice from "./resultSlice";
import facultyDashboardSlice from "./facultyDashboardSlice";
import adminExamBlueprintSlice from "./adminExamBlueprintSlice";
import studentExamSlice from "./studentExamSlice";
import wardenSlice from "./wardenSlice";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const persistConfig = {
  // Bump key to drop any stale persisted state across deployments
  key: "root-v2",
  storage,
  // Only persist authenticated user; other slices are refetched per session
  whitelist: ["user"],
};

const rootReducer = combineReducers({
  user: userSlice,
  student: studentSlice,
  faculty: facultySlice,
  department: departmentSlice,
  config: configSlice,
  leaves: leavesSlice,
  timetable: timetableSlice,
  attendance: attendanceSlice,
  assignment: assignmentSlice,
  exam: examSlice,
  fee: feeSlice,
  alerts: alertSlice,
  group: groupSlice,
  result: resultSlice,
  facultyDashboard: facultyDashboardSlice,
  adminExamBlueprint: adminExamBlueprintSlice,
  studentExam: studentExamSlice,
  warden: wardenSlice,
});

const persistedReducer = persistReducer(
  persistConfig,
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);
