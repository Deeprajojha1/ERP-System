export const FACULTY_LOAD_STATES = Object.freeze({
  INITIAL: "initial",
  SUCCESS: "success",
  PENDING: "pending",
  FAILURE: "failure",
});

export const FACULTY_LOAD_STATE_OPTIONS = Object.freeze([
  { id: FACULTY_LOAD_STATES.INITIAL, text: "Initial" },
  { id: FACULTY_LOAD_STATES.SUCCESS, text: "Success" },
  { id: FACULTY_LOAD_STATES.PENDING, text: "Pending" },
  { id: FACULTY_LOAD_STATES.FAILURE, text: "Failure" },
]);

// Re-export ADMIN_LOAD_STATES for backward compatibility
export { ADMIN_LOAD_STATES } from "../../../Admin/constants/loadStates";
