import { createSlice } from "@reduxjs/toolkit";

const studentSlice = createSlice({
  name: "student",
  initialState: {
    students: [],
    loading: false,
    error: null,
  },
  reducers: {
    setStudentsLoading: (state, action) => {
      state.loading = action.payload;
    },
    setStudents: (state, action) => {
      state.students = action.payload || [];
      state.error = null;
    },
    setStudentsError: (state, action) => {
      state.error = action.payload || "Failed to load students";
    },
    clearStudents: (state) => {
      state.students = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setStudentsLoading,
  setStudents,
  setStudentsError,
  clearStudents,
} = studentSlice.actions;

export default studentSlice.reducer;
