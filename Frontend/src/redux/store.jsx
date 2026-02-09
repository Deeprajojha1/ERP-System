import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userSlice from "./userSlice";
import studentSlice from "./studentSlice";
import facultySlice from "./facultySlice";
import configSlice from "./configSlice";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["user", "student", "faculty", "config"],
};

const rootReducer = combineReducers({
  user: userSlice,
  student: studentSlice,
  faculty: facultySlice,
  config: configSlice,
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
