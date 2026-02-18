import { createSlice } from "@reduxjs/toolkit";

const resolveApiBase = () => {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (import.meta.env.DEV) {
    return "http://localhost:3000/api";
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api`;
  }

  return "http://localhost:3000/api";
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
