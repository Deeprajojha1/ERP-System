export const normalizeRole = (role) => {
  const raw = String(role || "").trim().toLowerCase();
  if (!raw) return "";
  const compact = raw.replace(/[\s_-]+/g, "");
  if (compact === "gatesecurity") return "gateSecurity";
  if (compact === "warden") return "warden";
  if (compact === "faculty") return "faculty";
  if (compact === "student") return "student";
  if (compact === "parent") return "parent";
  return raw;
};

export const isAdminRole = (role) =>
  ["admin", "accounts", "hod", "exam", "placement", "director", "vc"].includes(
    normalizeRole(role)
  );
