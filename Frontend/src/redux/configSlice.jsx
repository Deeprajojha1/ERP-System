import { createSlice } from "@reduxjs/toolkit";

const configSlice = createSlice({
  name: "config",
  initialState: {
    apiBase: "http://localhost:3000/api",
  },
  reducers: {
    setApiBase: (state, action) => {
      state.apiBase = action.payload;
    },
  },
});

export const { setApiBase } = configSlice.actions;

export default configSlice.reducer;
