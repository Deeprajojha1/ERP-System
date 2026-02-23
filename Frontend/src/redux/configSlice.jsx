import { createSlice } from "@reduxjs/toolkit";

const resolveApiBase = () => {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // In DEV mode, use relative URL so Vite proxy can intercept the requests
  if (import.meta.env.DEV) {
    return "/api";
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api`;
  }

  return "/api";
};

const configSlice = createSlice({
  name: "config",
  initialState: {
    apiBase: resolveApiBase(),
  },
  reducers: {
    setApiBase: (state, action) => {
      const next = String(action.payload || "").trim();
      state.apiBase = (next || resolveApiBase()).replace(/\/+$/, "");
    },
  },
});

export const { setApiBase } = configSlice.actions;

export default configSlice.reducer;
