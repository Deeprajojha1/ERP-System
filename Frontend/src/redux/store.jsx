import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userSlice from "./userSlice";
import studentSlice from "./studentSlice";
import facultySlice from "./facultySlice";
import departmentSlice from "./departmentSlice";
import configSlice from "./configSlice";
import leavesSlice from "./leavesSlice";
import timetableSlice from "./timetableSlice";
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
