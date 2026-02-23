export const ADMIN_LOAD_STATES = Object.freeze({
  INITIAL: "initial",
  SUCCESS: "success",
  PENDING: "pending",
  FAILURE: "failure",
});

export const ADMIN_LOAD_STATE_OPTIONS = Object.freeze([
  { id: ADMIN_LOAD_STATES.INITIAL, text: "Pending" },
  { id: ADMIN_LOAD_STATES.SUCCESS, text: "Success" },
  { id: ADMIN_LOAD_STATES.PENDING, text: "Pending" },
  { id: ADMIN_LOAD_STATES.FAILURE, text: "Failure" },
]);
