import { createSlice } from "@reduxjs/toolkit";

const configSlice = createSlice({
  name: "config",
  initialState: {
    apiBase: import.meta.env.VITE_API_BASE_URL || "https://hu-erp.onrender.com/api",
  },
  reducers: {
    setApiBase: (state, action) => {
      state.apiBase = action.payload;
    },
  },
});

export const { setApiBase } = configSlice.actions;

export default configSlice.reducer;
