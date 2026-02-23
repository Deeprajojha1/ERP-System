import { createSlice } from "@reduxjs/toolkit";

const facultySlice = createSlice({
  name: "faculty",
  initialState: {
    faculty: [],
    loading: false,
    error: null,
  },
  reducers: {
    setFacultyLoading: (state, action) => {
      state.loading = action.payload;
    },
    setFaculty: (state, action) => {
      state.faculty = action.payload || [];
      state.error = null;
    },
    setFacultyError: (state, action) => {
      state.error = action.payload || "Failed to load faculty";
    },
    clearFaculty: (state) => {
      state.faculty = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setFacultyLoading,
  setFaculty,
  setFacultyError,
  clearFaculty,
} = facultySlice.actions;

export default facultySlice.reducer;
