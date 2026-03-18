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

export const updateFeeBranchAddons = createAsyncThunk(
  "fee/updateBranchAddons",
  async ({ branchId, hostelYearlyFee, transportYearlyFee, programId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.patch(
        `${apiBase}/admin/fee/branch/${branchId}/addons`,
        { hostelYearlyFee, transportYearlyFee },
        { withCredentials: true }
      );
      await dispatch(fetchFeeBranches(programId ? { programId } : {})).unwrap();
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update branch fees"
      );
    }
  }
);

export const fetchFeeBranches = createAsyncThunk(
  "fee/fetchBranches",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/branch`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch fee branches"
      );
    }
  }
);

export const fetchHostelYearlyFees = createAsyncThunk(
  "fee/fetchHostelYearlyFees",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/hostel-yearly`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch hostel fees"
      );
    }
  }
);

export const fetchTransportYearlyFees = createAsyncThunk(
  "fee/fetchTransportYearlyFees",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/transport-yearly`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch transport fees"
      );
    }
  }
);

export const upsertHostelYearlyFee = createAsyncThunk(
  "fee/upsertHostelYearlyFee",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/fee/hostel-yearly`, payload, {
        withCredentials: true,
      });
      await dispatch(fetchHostelYearlyFees()).unwrap();
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save hostel fee"
      );
    }
  }
);

export const upsertTransportYearlyFee = createAsyncThunk(
  "fee/upsertTransportYearlyFee",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/fee/transport-yearly`, payload, {
        withCredentials: true,
      });
      await dispatch(fetchTransportYearlyFees()).unwrap();
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save transport fee"
      );
    }
  }
);

export const updateStudentOptions = createAsyncThunk(
  "fee/updateStudentOptions",
  async ({ id, hostelOpted, transportOpted }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const body = {};
      if (hostelOpted != null) body.hostelOpted = hostelOpted;
      if (transportOpted != null) body.transportOpted = transportOpted;
      const response = await axios.patch(
        `${apiBase}/admin/fee/student-details/${id}/options`,
        body,
        { withCredentials: true }
      );
      await dispatch(fetchStudentFeeDetails()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update student options"
      );
    }
  }
);

export const fetchFeeBulkJobs = createAsyncThunk(
  "fee/fetchBulkJobs",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/bulk/jobs`, {
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch bulk jobs"
      );
    }
  }
);

export const retryFeeBulkJob = createAsyncThunk(
  "fee/retryBulkJob",
  async (jobId, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(
        `${apiBase}/admin/fee/bulk/jobs/${jobId}/retry`,
        {},
        { withCredentials: true }
      );
      await dispatch(fetchFeeBulkJobs()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to retry bulk job"
      );
    }
  }
);

export const fetchFeeReportExports = createAsyncThunk(
  "fee/fetchReportExports",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/reports/export`, {
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch report exports"
      );
    }
  }
);

export const createFeeReportExport = createAsyncThunk(
  "fee/createReportExport",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(
        `${apiBase}/admin/fee/reports/export`,
        payload,
        { withCredentials: true }
      );
      await dispatch(fetchFeeReportExports()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create report export"
      );
    }
  }
);

export const shareFeeReportExport = createAsyncThunk(
  "fee/shareReportExport",
  async ({ exportId, recipients }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(
        `${apiBase}/admin/fee/reports/export/${exportId}/share`,
        { recipients },
        { withCredentials: true }
      );
      await dispatch(fetchFeeReportExports()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to share report export"
      );
    }
  }
);

export const fetchFinancialSummary = createAsyncThunk(
  "fee/fetchFinancialSummary",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/analytics/financial/summary`, {
        params: query,
        withCredentials: true,
      });
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch financial summary"
      );
    }
  }
);

export const fetchFinancialProgramBreakup = createAsyncThunk(
  "fee/fetchFinancialProgramBreakup",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(
        `${apiBase}/admin/fee/analytics/financial/program-breakup`,
        { params: query, withCredentials: true }
      );
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch program breakup"
      );
    }
  }
);

export const fetchFinancialCashflow = createAsyncThunk(
  "fee/fetchFinancialCashflow",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(
        `${apiBase}/admin/fee/analytics/financial/cashflow`,
        { params: query, withCredentials: true }
      );
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch cashflow"
      );
    }
  }
);

export const fetchStudentAnalyticsOverview = createAsyncThunk(
  "fee/fetchStudentAnalyticsOverview",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(
        `${apiBase}/admin/fee/analytics/students/overview`,
        { withCredentials: true }
      );
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch student analytics overview"
      );
    }
  }
);

export const fetchStudentStatusDistribution = createAsyncThunk(
  "fee/fetchStudentStatusDistribution",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(
        `${apiBase}/admin/fee/analytics/students/status-distribution`,
        { withCredentials: true }
      );
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch status distribution"
      );
    }
  }
);

export const fetchStudentSegments = createAsyncThunk(
  "fee/fetchStudentSegments",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(
        `${apiBase}/admin/fee/analytics/students/segments`,
        { withCredentials: true }
      );
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch student segments"
      );
    }
  }
);

export const fetchFeeCalendarEvents = createAsyncThunk(
  "fee/fetchCalendarEvents",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/admin/fee/calendar`, {
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch calendar events"
      );
    }
  }
);

export const createFeeCalendarEvent = createAsyncThunk(
  "fee/createCalendarEvent",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(`${apiBase}/admin/fee/calendar`, payload, {
        withCredentials: true,
      });
      await dispatch(fetchFeeCalendarEvents()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create calendar event"
      );
    }
  }
);

export const updateFeeCalendarEvent = createAsyncThunk(
  "fee/updateCalendarEvent",
  async ({ id, payload }, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.put(`${apiBase}/admin/fee/calendar/${id}`, payload, {
        withCredentials: true,
      });
      await dispatch(fetchFeeCalendarEvents()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update calendar event"
      );
    }
  }
);

export const deleteFeeCalendarEvent = createAsyncThunk(
  "fee/deleteCalendarEvent",
  async (id, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.patch(
        `${apiBase}/admin/fee/calendar/${id}/delete`,
        {},
        { withCredentials: true }
      );
      await dispatch(fetchFeeCalendarEvents()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete calendar event"
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

export const fetchMyFeeProfile = createAsyncThunk(
  "fee/fetchMyFeeProfile",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/student/fee/me/profile`, {
        withCredentials: true,
      });
      return {
        profile: extractDataObject(response.data),
        yearlyBreakdown: response.data?.yearlyBreakdown || [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch fee profile"
      );
    }
  }
);

export const fetchMyFeeDemands = createAsyncThunk(
  "fee/fetchMyFeeDemands",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/student/fee/me/demand`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch my fee demands"
      );
    }
  }
);

export const fetchMyPayments = createAsyncThunk(
  "fee/fetchMyPayments",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/student/fee/me/payment`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch my payment history"
      );
    }
  }
);

export const createMyRazorpayOrder = createAsyncThunk(
  "fee/createMyRazorpayOrder",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const idempotencyKey = payload?.idempotencyKey || buildIdempotencyKey();
      const response = await axios.post(
        `${apiBase}/student/fee/me/payment/razorpay/order`,
        payload,
        {
          headers: { "x-idempotency-key": idempotencyKey },
          withCredentials: true,
        }
      );
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create Razorpay order"
      );
    }
  }
);

export const verifyMyRazorpayPayment = createAsyncThunk(
  "fee/verifyMyRazorpayPayment",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const idempotencyKey = payload?.idempotencyKey || buildIdempotencyKey();
      const response = await axios.post(
        `${apiBase}/student/fee/me/payment/razorpay/verify`,
        payload,
        {
          headers: { "x-idempotency-key": idempotencyKey },
          withCredentials: true,
        }
      );
      await Promise.all([
        dispatch(fetchMyFeeProfile()).unwrap(),
        dispatch(fetchMyFeeDemands()).unwrap(),
        dispatch(fetchMyPayments()).unwrap(),
      ]);
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to verify Razorpay payment"
      );
    }
  }
);

export const createMyRazorpayOrderForYear = createAsyncThunk(
  "fee/createMyRazorpayOrderForYear",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const idempotencyKey = payload?.idempotencyKey || buildIdempotencyKey();
      const response = await axios.post(
        `${apiBase}/student/fee/me/payment/razorpay/order-year`,
        payload,
        {
          headers: { "x-idempotency-key": idempotencyKey },
          withCredentials: true,
        }
      );
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create yearly Razorpay order"
      );
    }
  }
);

export const verifyMyRazorpayPaymentForYear = createAsyncThunk(
  "fee/verifyMyRazorpayPaymentForYear",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const idempotencyKey = payload?.idempotencyKey || buildIdempotencyKey();
      const response = await axios.post(
        `${apiBase}/student/fee/me/payment/razorpay/verify-year`,
        payload,
        {
          headers: { "x-idempotency-key": idempotencyKey },
          withCredentials: true,
        }
      );
      await Promise.all([
        dispatch(fetchMyFeeProfile()).unwrap(),
        dispatch(fetchMyFeeDemands()).unwrap(),
        dispatch(fetchMyPayments()).unwrap(),
      ]);
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to verify yearly Razorpay payment"
      );
    }
  }
);

export const fetchMyDemandRequests = createAsyncThunk(
  "fee/fetchMyDemandRequests",
  async (query = {}, { getState, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.get(`${apiBase}/student/fee/me/demand-request`, {
        params: query,
        withCredentials: true,
      });
      return extractDataArray(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch my demand requests"
      );
    }
  }
);

export const createMyDemandRequest = createAsyncThunk(
  "fee/createMyDemandRequest",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const apiBase = getState().config.apiBase;
      const response = await axios.post(
        `${apiBase}/student/fee/me/demand-request`,
        payload,
        { withCredentials: true }
      );
      await dispatch(fetchMyDemandRequests()).unwrap();
      return extractDataObject(response.data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit demand request"
      );
    }
  }
);

const feeSlice = createSlice({
  name: "fee",
  initialState: {
    programs: [],
    branches: [],
    hostelYearlyFees: [],
    transportYearlyFees: [],
    batches: [],
    demands: [],
    payments: [],
    studentDetails: [],
    bulkJobs: [],
    reportExports: [],
    financialSummary: null,
    programBreakup: [],
    cashflow: [],
    studentAnalyticsOverview: null,
    studentStatusDistribution: [],
    studentSegments: [],
    calendarEvents: [],
    demandRequests: [],
    myDemandRequests: [],
    myFeeProfile: null,
    myYearlyBreakdown: [],
    myDemands: [],
    myPayments: [],
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
      state.branches = [];
      state.hostelYearlyFees = [];
      state.transportYearlyFees = [];
      state.batches = [];
      state.demands = [];
      state.payments = [];
      state.studentDetails = [];
      state.bulkJobs = [];
      state.reportExports = [];
      state.financialSummary = null;
      state.programBreakup = [];
      state.cashflow = [];
      state.studentAnalyticsOverview = null;
      state.studentStatusDistribution = [];
      state.studentSegments = [];
      state.calendarEvents = [];
      state.demandRequests = [];
      state.myDemandRequests = [];
      state.myFeeProfile = null;
      state.myYearlyBreakdown = [];
      state.myDemands = [];
      state.myPayments = [];
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
      .addCase(fetchFeeBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeeBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload || [];
      })
      .addCase(fetchFeeBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch fee branches";
      })
      .addCase(fetchHostelYearlyFees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHostelYearlyFees.fulfilled, (state, action) => {
        state.loading = false;
        state.hostelYearlyFees = action.payload || [];
      })
      .addCase(fetchHostelYearlyFees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch hostel fees";
      })
      .addCase(fetchTransportYearlyFees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransportYearlyFees.fulfilled, (state, action) => {
        state.loading = false;
        state.transportYearlyFees = action.payload || [];
      })
      .addCase(fetchTransportYearlyFees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch transport fees";
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
      .addCase(updateFeeBranchAddons.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateFeeBranchAddons.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateFeeBranchAddons.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to update branch fees";
      })
      .addCase(upsertHostelYearlyFee.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(upsertHostelYearlyFee.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(upsertHostelYearlyFee.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to save hostel fee";
      })
      .addCase(upsertTransportYearlyFee.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(upsertTransportYearlyFee.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(upsertTransportYearlyFee.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to save transport fee";
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
      })
      .addCase(fetchMyDemandRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyDemandRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.myDemandRequests = action.payload || [];
      })
      .addCase(fetchMyDemandRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch my demand requests";
      })
      .addCase(createMyDemandRequest.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createMyDemandRequest.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createMyDemandRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to submit demand request";
      })
      .addCase(fetchMyFeeProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyFeeProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myFeeProfile = action.payload?.profile || null;
        state.myYearlyBreakdown = action.payload?.yearlyBreakdown || [];
      })
      .addCase(fetchMyFeeProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch fee profile";
      })
      .addCase(fetchMyFeeDemands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyFeeDemands.fulfilled, (state, action) => {
        state.loading = false;
        state.myDemands = action.payload || [];
      })
      .addCase(fetchMyFeeDemands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch my demands";
      })
      .addCase(fetchMyPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.myPayments = action.payload || [];
      })
      .addCase(fetchMyPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch my payments";
      })
      .addCase(createMyRazorpayOrder.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createMyRazorpayOrder.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createMyRazorpayOrder.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to create Razorpay order";
      })
      .addCase(verifyMyRazorpayPayment.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(verifyMyRazorpayPayment.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(verifyMyRazorpayPayment.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to verify Razorpay payment";
      })
      .addCase(createMyRazorpayOrderForYear.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createMyRazorpayOrderForYear.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(createMyRazorpayOrderForYear.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to create yearly Razorpay order";
      })
      .addCase(verifyMyRazorpayPaymentForYear.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(verifyMyRazorpayPaymentForYear.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(verifyMyRazorpayPaymentForYear.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || "Failed to verify yearly Razorpay payment";
      })
      .addCase(fetchFeeBulkJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.bulkJobs = action.payload || [];
      })
      .addCase(fetchFeeBulkJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch bulk jobs";
      })
      .addCase(fetchFeeReportExports.fulfilled, (state, action) => {
        state.loading = false;
        state.reportExports = action.payload || [];
      })
      .addCase(fetchFeeReportExports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch report exports";
      })
      .addCase(fetchFinancialSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.financialSummary = action.payload || null;
      })
      .addCase(fetchFinancialSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch financial summary";
      })
      .addCase(fetchFinancialProgramBreakup.fulfilled, (state, action) => {
        state.loading = false;
        state.programBreakup = action.payload || [];
      })
      .addCase(fetchFinancialProgramBreakup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch program breakup";
      })
      .addCase(fetchFinancialCashflow.fulfilled, (state, action) => {
        state.loading = false;
        state.cashflow = action.payload || [];
      })
      .addCase(fetchFinancialCashflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch cashflow";
      })
      .addCase(fetchStudentAnalyticsOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.studentAnalyticsOverview = action.payload || null;
      })
      .addCase(fetchStudentAnalyticsOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch student analytics overview";
      })
      .addCase(fetchStudentStatusDistribution.fulfilled, (state, action) => {
        state.loading = false;
        state.studentStatusDistribution = action.payload || [];
      })
      .addCase(fetchStudentStatusDistribution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch status distribution";
      })
      .addCase(fetchStudentSegments.fulfilled, (state, action) => {
        state.loading = false;
        state.studentSegments = action.payload || [];
      })
      .addCase(fetchStudentSegments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch student segments";
      })
      .addCase(fetchFeeCalendarEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.calendarEvents = action.payload || [];
      })
      .addCase(fetchFeeCalendarEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch calendar events";
      });
  },
});

export const { clearFeeError, clearFeeState } = feeSlice.actions;

export const selectFeePrograms = (state) => state.fee.programs;
export const selectFeeBranches = (state) => state.fee.branches;
export const selectHostelYearlyFees = (state) => state.fee.hostelYearlyFees;
export const selectTransportYearlyFees = (state) => state.fee.transportYearlyFees;
export const selectFeeBatches = (state) => state.fee.batches;
export const selectFeeDemands = (state) => state.fee.demands;
export const selectFeePayments = (state) => state.fee.payments;
export const selectStudentFeeDetails = (state) => state.fee.studentDetails;
export const selectFeeBulkJobs = (state) => state.fee.bulkJobs;
export const selectFeeReportExports = (state) => state.fee.reportExports;
export const selectFinancialSummary = (state) => state.fee.financialSummary;
export const selectProgramBreakup = (state) => state.fee.programBreakup;
export const selectCashflow = (state) => state.fee.cashflow;
export const selectStudentAnalyticsOverview = (state) => state.fee.studentAnalyticsOverview;
export const selectStudentStatusDistribution = (state) => state.fee.studentStatusDistribution;
export const selectStudentSegments = (state) => state.fee.studentSegments;
export const selectFeeCalendarEvents = (state) => state.fee.calendarEvents;
export const selectDemandRequests = (state) => state.fee.demandRequests;
export const selectMyDemandRequests = (state) => state.fee.myDemandRequests;
export const selectMyFeeProfile = (state) => state.fee.myFeeProfile;
export const selectMyYearlyBreakdown = (state) => state.fee.myYearlyBreakdown;
export const selectMyDemands = (state) => state.fee.myDemands;
export const selectMyPayments = (state) => state.fee.myPayments;
export const selectFeeLoading = (state) => state.fee.loading;
export const selectFeeActionLoading = (state) => state.fee.actionLoading;
export const selectFeeError = (state) => state.fee.error;
export const selectFeeActionError = (state) => state.fee.actionError;

export default feeSlice.reducer;
