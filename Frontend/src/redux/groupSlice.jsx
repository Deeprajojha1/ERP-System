import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../Admin/constants/loadStates";

const resolveErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

export const fetchAdminGroups = createAsyncThunk(
  "group/fetchAdminGroups",
  async ({ apiBase, noCache = false }, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${apiBase}/admin/group`, {
        withCredentials: true,
        skipNetworkRedirect: true,
        params: noCache ? { noCache: "true" } : undefined,
      });
      return res.data?.groups || [];
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to load groups"));
    }
  }
);

export const fetchGroupModalDependencies = createAsyncThunk(
  "group/fetchGroupModalDependencies",
  async ({ apiBase }, { rejectWithValue }) => {
    try {
      const [deptRes, facRes, batchRes] = await Promise.all([
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
          skipNetworkRedirect: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/group/batches`, {
          withCredentials: true,
          skipNetworkRedirect: true,
        }),
      ]);

      return {
        departments: deptRes.data?.departments || [],
        faculty: facRes.data?.faculty || [],
        batches: batchRes.data?.data || [],
      };
    } catch (error) {
      return rejectWithValue(
        resolveErrorMessage(error, "Failed to load form dependencies")
      );
    }
  }
);

export const createAdminGroup = createAsyncThunk(
  "group/createAdminGroup",
  async ({ apiBase, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${apiBase}/admin/group`, payload, {
        withCredentials: true,
        skipNetworkRedirect: true,
      });
      return res.data?.group || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to add group"));
    }
  }
);

export const updateAdminGroup = createAsyncThunk(
  "group/updateAdminGroup",
  async ({ apiBase, id, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${apiBase}/admin/group/${id}`, payload, {
        withCredentials: true,
        skipNetworkRedirect: true,
      });
      return res.data?.group || null;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to update group"));
    }
  }
);

export const deleteAdminGroup = createAsyncThunk(
  "group/deleteAdminGroup",
  async ({ apiBase, id }, { rejectWithValue }) => {
    try {
      await axios.patch(
        `${apiBase}/admin/group/${id}/delete`,
        {},
        {
          withCredentials: true,
          skipNetworkRedirect: true,
        }
      );
      return id;
    } catch (error) {
      return rejectWithValue(resolveErrorMessage(error, "Failed to delete group"));
    }
  }
);

const initialState = {
  groups: [],
  departments: [],
  faculty: [],
  batches: [],
  listLoadState: ADMIN_LOAD_STATES.INITIAL,
  modalLoadState: ADMIN_LOAD_STATES.INITIAL,
  submitLoadState: ADMIN_LOAD_STATES.INITIAL,
  deleteLoadState: ADMIN_LOAD_STATES.INITIAL,
  deletingGroupId: null,
  error: null,
};

const groupSlice = createSlice({
  name: "group",
  initialState,
  reducers: {
    clearGroupError: (state) => {
      state.error = null;
    },
    resetGroupSlice: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminGroups.pending, (state) => {
        state.listLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(fetchAdminGroups.fulfilled, (state, action) => {
        state.listLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.groups = action.payload || [];
      })
      .addCase(fetchAdminGroups.rejected, (state, action) => {
        state.listLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || "Failed to load groups";
      })
      .addCase(fetchGroupModalDependencies.pending, (state) => {
        state.modalLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(fetchGroupModalDependencies.fulfilled, (state, action) => {
        state.modalLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.departments = action.payload?.departments || [];
        state.faculty = action.payload?.faculty || [];
        state.batches = action.payload?.batches || [];
      })
      .addCase(fetchGroupModalDependencies.rejected, (state, action) => {
        state.modalLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || "Failed to load form dependencies";
      })
      .addCase(createAdminGroup.pending, (state) => {
        state.submitLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(createAdminGroup.fulfilled, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.SUCCESS;
        if (action.payload?._id) {
          state.groups = [action.payload, ...state.groups];
        }
      })
      .addCase(createAdminGroup.rejected, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || "Failed to add group";
      })
      .addCase(updateAdminGroup.pending, (state) => {
        state.submitLoadState = ADMIN_LOAD_STATES.PENDING;
        state.error = null;
      })
      .addCase(updateAdminGroup.fulfilled, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.SUCCESS;
        if (!action.payload?._id) return;
        state.groups = state.groups.map((group) =>
          group._id === action.payload._id ? action.payload : group
        );
      })
      .addCase(updateAdminGroup.rejected, (state, action) => {
        state.submitLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.error = action.payload || "Failed to update group";
      })
      .addCase(deleteAdminGroup.pending, (state, action) => {
        state.deleteLoadState = ADMIN_LOAD_STATES.PENDING;
        state.deletingGroupId = action.meta?.arg?.id || null;
        state.error = null;
      })
      .addCase(deleteAdminGroup.fulfilled, (state, action) => {
        state.deleteLoadState = ADMIN_LOAD_STATES.SUCCESS;
        state.deletingGroupId = null;
        state.groups = state.groups.filter((group) => group._id !== action.payload);
      })
      .addCase(deleteAdminGroup.rejected, (state, action) => {
        state.deleteLoadState = ADMIN_LOAD_STATES.FAILURE;
        state.deletingGroupId = null;
        state.error = action.payload || "Failed to delete group";
      });
  },
});

export const { clearGroupError, resetGroupSlice } = groupSlice.actions;

export const selectAdminGroups = (state) => state.group?.groups || [];
export const selectAdminGroupDepartments = (state) =>
  state.group?.departments || [];
export const selectAdminGroupFaculty = (state) => state.group?.faculty || [];
export const selectAdminGroupBatches = (state) => state.group?.batches || [];
export const selectAdminGroupListLoadState = (state) =>
  state.group?.listLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectAdminGroupModalLoadState = (state) =>
  state.group?.modalLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectAdminGroupSubmitLoadState = (state) =>
  state.group?.submitLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectAdminGroupDeleteLoadState = (state) =>
  state.group?.deleteLoadState || ADMIN_LOAD_STATES.INITIAL;
export const selectAdminGroupDeletingId = (state) =>
  state.group?.deletingGroupId || null;
export const selectAdminGroupError = (state) => state.group?.error || null;

export default groupSlice.reducer;
