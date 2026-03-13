export const PARENT_LOAD_STATES = Object.freeze({
  INITIAL: "initial",
  SUCCESS: "success",
  PENDING: "pending",
  FAILURE: "failure",
});

export const PARENT_LOAD_STATE_OPTIONS = Object.freeze([
  { id: PARENT_LOAD_STATES.INITIAL, text: "Initial" },
  { id: PARENT_LOAD_STATES.SUCCESS, text: "Success" },
  { id: PARENT_LOAD_STATES.PENDING, text: "Pending" },
  { id: PARENT_LOAD_STATES.FAILURE, text: "Failure" },
]);

// Re-export admin load states for shared patterns across portals.
export { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "../../../Admin/constants/loadStates";

