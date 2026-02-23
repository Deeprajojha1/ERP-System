import { createSlice } from "@reduxjs/toolkit";

const departmentSlice = createSlice({
  name: "department",
  initialState: {
    departments: [],
    loading: false,
    error: null,
  },
  reducers: {
    setDepartmentsLoading: (state, action) => {
      state.loading = action.payload;
    },
    setDepartments: (state, action) => {
      state.departments = action.payload || [];
      state.error = null;
    },
    setDepartmentsError: (state, action) => {
      state.error = action.payload || "Failed to load departments";
    },
    clearDepartments: (state) => {
      state.departments = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setDepartmentsLoading,
  setDepartments,
  setDepartmentsError,
  clearDepartments,
} = departmentSlice.actions;

export default departmentSlice.reducer;
