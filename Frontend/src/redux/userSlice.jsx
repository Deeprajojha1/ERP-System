import { createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    loading: false,
    error: null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearUserData: (state) => {
      state.userData = null;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setUserData, clearUserData, setLoading, setError } = userSlice.actions;

// Async action to get user data
export const getUser = () => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    dispatch(setError(null));

    const apiBase = getState().config.apiBase;
    const response = await axios.get(`${apiBase}/user/me`, {
      withCredentials: true,
    });
    
    if (response.data && response.data.user) {
      dispatch(setUserData(response.data));
    }
    
    dispatch(setLoading(false));
  } catch (error) {
    console.error('getUser error:', error);
    dispatch(setError(error.message || 'Failed to get user data'));
    dispatch(setLoading(false));
  }
};

export default userSlice.reducer;
