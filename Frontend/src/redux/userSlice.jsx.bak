import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    clearUserData: (state) => {
      state.userData = null;
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
