import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../utils/axiosInstance";

const extractDataArray = (responseData) =>
  Array.isArray(responseData?.data) ? responseData.data : [];

const extractDataObject = (responseData) => responseData?.data || null;

export const fetchFeePrograms = createAsyncThunk(
  "fee/fetchPrograms",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/program`, {
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch fee programs"
      );
    }
  }
);

export const fetchFeeDemands = createAsyncThunk(
  "fee/fetchDemands",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/demand`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch fee demands"
      );
    }
  }
);

export const fetchFeePayments = createAsyncThunk(
  "fee/fetchPayments",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/payment`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch fee payments"
      );
    }
  }
);

export const fetchFeeBootstrap = createAsyncThunk(
  "fee/fetchBootstrap",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await Promise.all([
        dispatch(fetchFeePrograms()).unwrap(),
        dispatch(fetchFeeDemands()).unwrap(),
        dispatch(fetchFeePayments()).unwrap(),
      ]);
      return true;
    } catch (error) {
      return rejectWithValue(error || "Failed to load fee data");
    }
  }
);

export const createFeeProgram = createAsyncThunk(
  "fee/createProgram",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/fee/program`, payload, {
        withCredentials: true,
      });
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create fee program"
      );
    }
  }
);

export const createFeeBranch = createAsyncThunk(
  "fee/createBranch",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/fee/branch`, payload, {
        withCredentials: true,
      });
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create fee branch"
      );
    }
  }
);

export const createFeeBatch = createAsyncThunk(
  "fee/createBatch",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/fee/batch`, payload, {
        withCredentials: true,
      });
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create fee batch"
      );
    }
  }
);

export const createStudentFeeDetails = createAsyncThunk(
  "fee/createStudentDetails",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(
        `${apiBase}/admin/fee/student-details`,
        payload,
        { withCredentials: true }
      );
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create student fee details"
      );
    }
  }
);

export const createFeeDemand = createAsyncThunk(
  "fee/createDemand",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/fee/demand`, payload, {
        withCredentials: true,
      });
      await dispatch(fetchFeeDemands()).unwrap();
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create fee demand"
      );
    }
  }
);

const buildIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

export const createFeePayment = createAsyncThunk(
  "fee/createPayment",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const idempotencyKey =
        payload?.idempotencyKey || buildIdempotencyKey();
      const response = await axios.post(`${apiBase}/admin/fee/payment`, payload, {
        headers: { "x-idempotency-key": idempotencyKey },
        withCredentials: true,
      });
      await Promise.all([
        dispatch(fetchFeePayments()).unwrap(),
        dispatch(fetchFeeDemands()).unwrap(),
      ]);
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create payment"
      );
    }
  }
);

export const updateFeePaymentStatus = createAsyncThunk(
  "fee/updatePaymentStatus",
  async ({ paymentId, status }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.patch(
        `${apiBase}/admin/fee/payment/${paymentId}/status`,
        { status },
        { withCredentials: true }
      );
      await Promise.all([
        dispatch(fetchFeePayments()).unwrap(),
        dispatch(fetchFeeDemands()).unwrap(),
      ]);
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update payment status"
      );
    }
  }
);

/* ─── NEW THUNKS ─── */

export const fetchFeeBatches = createAsyncThunk(
  "fee/fetchBatches",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/batch`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch batches"
      );
    }
  }
);

export const fetchStudentFeeDetails = createAsyncThunk(
  "fee/fetchStudentFeeDetails",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/student-details`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch student fee details"
      );
    }
  }
);

export const updateStudentBenefits = createAsyncThunk(
  "fee/updateStudentBenefits",
  async ({ id, scholarship, discount }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const body = {};
      if (scholarship) body.scholarship = scholarship;
      if (discount) body.discount = discount;
      const response = await axios.patch(
        `${apiBase}/admin/fee/student-details/${id}/benefits`,
        body,
        { withCredentials: true }
      );
      await dispatch(fetchStudentFeeDetails()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update student benefits"
      );
    }
  }
);

export const generateFeeDemandFromProfile = createAsyncThunk(
  "fee/generateDemandFromProfile",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(
        `${apiBase}/admin/fee/demand/generate`,
        payload,
        { withCredentials: true }
      );
      await dispatch(fetchFeeDemands()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to generate fee demand"
      );
    }
  }
);

export const fetchDemandRequests = createAsyncThunk(
  "fee/fetchDemandRequests",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/demand-request`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch demand requests"
      );
    }
  }
);

export const approveDemandRequest = createAsyncThunk(
  "fee/approveDemandRequest",
  async ({ id, dueDate }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const body = dueDate ? { dueDate } : {};
      const response = await axios.patch(
        `${apiBase}/admin/fee/demand-request/${id}/approve`,
        body,
        { withCredentials: true }
      );
      await dispatch(fetchDemandRequests()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to approve demand request"
      );
    }
  }
);

export const rejectDemandRequest = createAsyncThunk(
  "fee/rejectDemandRequest",
  async ({ id }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.patch(
        `${apiBase}/admin/fee/demand-request/${id}/reject`,
        {},
        { withCredentials: true }
      );
      await dispatch(fetchDemandRequests()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to reject demand request"
      );
    }
  }
);

const feeSlice = createSlice({
  name: "fee",
  initialState: {
    programs: [],
    batches: [],
    demands: [],
    payments: [],
    studentDetails: [],
    demandRequests: [],
    loading: false,
    actionLoading: false,
    error: null,
    actionError: null,
  },
  reducers: {
    clearFeeError: (state) => {
      state.error = null;
      state.actionError = null;
    },
    clearFeeState: (state) => {
      state.programs = [];
      state.batches = [];
      state.demands = [];
      state.payments = [];
      state.studentDetails = [];
      state.demandRequests = [];
      state.loading = false;
      state.actionLoading = false;
      state.error = null;
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeePrograms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeePrograms.fulfilled, (state, action) => {
        state.loading = false;
        state.programs = action.payload || [];
      })
      .addCase(fetchFeePrograms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch fee programs";
      })
      .addCase(fetchFeeDemands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeeDemands.fulfilled, (state, action) => {
        state.loading = false;
        state.demands = action.payload || [];
      })
      .addCase(fetchFeeDemands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch fee demands";
      })
      .addCase(fetchFeePayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeePayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload || [];
      })
      .addCase(fetchFeePayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch fee payments";
      })
      .addCase(fetchFeeBootstrap.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeeBootstrap.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchFeeBootstrap.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load fee data";
      })
      .addCase(createFeeProgram.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createFeeProgram.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.programs = [action.payload, ...state.programs];
        }
      })
      .addCase(createFeeProgram.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to create fee program";
      })
      .addCase(createFeeBranch.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createFeeBranch.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createFeeBranch.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to create fee branch";
      })
      .addCase(createFeeBatch.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createFeeBatch.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createFeeBatch.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to create fee batch";
      })
      .addCase(createStudentFeeDetails.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createStudentFeeDetails.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createStudentFeeDetails.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError =
          action.payload || "Failed to create student fee details";
      })
      .addCase(createFeeDemand.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createFeeDemand.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createFeeDemand.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to create fee demand";
      })
      .addCase(createFeePayment.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createFeePayment.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createFeePayment.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to create payment";
      })
      .addCase(updateFeePaymentStatus.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateFeePaymentStatus.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateFeePaymentStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError =
          action.payload || "Failed to update payment status";
      })
      /* ─── NEW REDUCERS ─── */
      .addCase(fetchFeeBatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeeBatches.fulfilled, (state, action) => {
        state.loading = false;
        state.batches = action.payload || [];
      })
      .addCase(fetchFeeBatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch batches";
      })
      .addCase(fetchStudentFeeDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentFeeDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.studentDetails = action.payload || [];
      })
      .addCase(fetchStudentFeeDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch student fee details";
      })
      .addCase(updateStudentBenefits.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateStudentBenefits.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateStudentBenefits.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to update benefits";
      })
      .addCase(generateFeeDemandFromProfile.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(generateFeeDemandFromProfile.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(generateFeeDemandFromProfile.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to generate demand";
      })
      .addCase(fetchDemandRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDemandRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.demandRequests = action.payload || [];
      })
      .addCase(fetchDemandRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch demand requests";
      })
      .addCase(approveDemandRequest.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(approveDemandRequest.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(approveDemandRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to approve request";
      })
      .addCase(rejectDemandRequest.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(rejectDemandRequest.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(rejectDemandRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to reject request";
      });
  },
});

export const { clearFeeError, clearFeeState } = feeSlice.actions;

export const selectFeePrograms = (state) => state.fee.programs;
export const selectFeeBatches = (state) => state.fee.batches;
export const selectFeeDemands = (state) => state.fee.demands;
export const selectFeePayments = (state) => state.fee.payments;
export const selectStudentFeeDetails = (state) => state.fee.studentDetails;
export const selectDemandRequests = (state) => state.fee.demandRequests;
export const selectFeeLoading = (state) => state.fee.loading;
export const selectFeeActionLoading = (state) => state.fee.actionLoading;
export const selectFeeError = (state) => state.fee.error;
export const selectFeeActionError = (state) => state.fee.actionError;

export default feeSlice.reducer;
