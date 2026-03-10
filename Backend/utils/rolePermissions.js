const LEGACY_PERMISSION_FALLBACKS = {
  "module.department": ["module.management"],
  "module.faculty": ["module.management"],
  "module.student_id_cards": ["module.idcards", "module.IdCards"],
  "module.courses": ["module.academics"],
  "module.groups": ["module.academics"],
  "module.classrooms": ["module.academics"],
  "module.assignment": ["module.academics", "module.operations"],
  "module.timetable": ["module.academics"],
  "module.exams": ["module.academics"],
  "module.exam_blueprint": ["module.academics"],
  "module.results": ["module.academics"],
  "module.attendance": ["module.operations"],
  "module.leaves": ["module.operations"],
  "module.placement_jobs": ["module.operations"],
  "module.placement_applications": ["module.operations"],
  "module.general_reports": ["module.reports"],
  "module.faculty_lecture_report": ["module.reports"],
  "module.student_attendance": ["module.reports"],
  "module.teaching_load": ["module.reports"],
  "module.settings.profile": ["module.settings"],
  "module.settings.security": ["module.settings"],
};

const ROLE_PERMISSIONS = {
  admin: ["*"],
  accounts: [
    "portal.admin",
    "module.dashboard",
    "module.students",
    "module.students_write",
    "module.student_discipline",
    "module.student_id_cards",
    "module.hostel",
    "module.fees",
    "module.settings",
    "module.settings.profile",
    "module.settings.security",
  ],
  hod: [
    "portal.admin",
    "module.dashboard",
    "module.department",
    "module.faculty",
    "module.students",
    "module.students_write",
    "module.student_discipline",
    "module.student_id_cards",
    "module.courses",
    "module.groups",
    "module.classrooms",
    "module.assignment",
    "module.timetable",
    "module.exams",
    "module.exam_blueprint",
    "module.results",
    "module.attendance",
    "module.alerts",
    "module.general_reports",
    "module.faculty_lecture_report",
    "module.student_attendance",
    "module.teaching_load",
    "module.settings",
    "module.settings.profile",
    "module.settings.security",
  ],
  exam: [
    "portal.admin",
    "module.dashboard",
    "module.students",
    "module.students_write",
    "module.student_discipline",
    "module.student_id_cards",
    "module.courses",
    "module.groups",
    "module.classrooms",
    "module.assignment",
    "module.timetable",
    "module.exams",
    "module.exam_blueprint",
    "module.results",
    "module.attendance",
    "module.alerts",
    "module.general_reports",
    "module.student_attendance",
    "module.settings",
    "module.settings.profile",
    "module.settings.security",
  ],
  placement: [
    "portal.admin",
    "module.students",
    "module.placement_jobs",
    "module.placement_applications",
    "module.alerts",
    "module.settings",
    "module.settings.profile",
    "module.settings.security",
  ],
  director: [
    "portal.admin",
    "module.dashboard",
    "module.department",
    "module.faculty",
    "module.students",
    "module.students_write",
    "module.student_discipline",
    "module.student_id_cards",
    "module.courses",
    "module.groups",
    "module.classrooms",
    "module.assignment",
    "module.timetable",
    "module.exams",
    "module.exam_blueprint",
    "module.results",
    "module.attendance",
    "module.leaves",
    "module.hostel",
    "module.fees",
    "module.alerts",
    "module.general_reports",
    "module.faculty_lecture_report",
    "module.student_attendance",
    "module.teaching_load",
    "module.placement_jobs",
    "module.placement_applications",
    "module.warden_support",
    "module.library",
    "module.settings",
    "module.settings.profile",
    "module.settings.security",
  ],
  vc: [
    "portal.admin",
    "module.dashboard",
    "module.department",
    "module.faculty",
    "module.students",
    "module.students_write",
    "module.student_discipline",
    "module.student_id_cards",
    "module.courses",
    "module.groups",
    "module.classrooms",
    "module.assignment",
    "module.timetable",
    "module.exams",
    "module.exam_blueprint",
    "module.results",
    "module.attendance",
    "module.leaves",
    "module.hostel",
    "module.fees",
    "module.alerts",
    "module.general_reports",
    "module.faculty_lecture_report",
    "module.student_attendance",
    "module.teaching_load",
    "module.placement_jobs",
    "module.placement_applications",
    "module.warden_support",
    "module.library",
    "module.settings",
    "module.settings.profile",
    "module.settings.security",
  ],
  faculty: [],
  student: [],
  warden: [],
  librarian: [],
  parent: [],
};

const PERMISSION_ROLE_ALIASES = {
  exam_department: "exam",
  placement_officer: "placement",
};

const PERMISSION_KEY_ALIASES = {
  "module.studentDicipline": "module.student_discipline",
  "module.studentDiscipline": "module.student_discipline",
  "module.IdCards": "module.student_id_cards",
  "module.idCards": "module.student_id_cards",
};

const normalizePermissionRole = (role = "") =>
  PERMISSION_ROLE_ALIASES[String(role || "").trim().toLowerCase()] ||
  String(role || "").trim().toLowerCase();

const normalizePermissionKey = (permission = "") =>
  PERMISSION_KEY_ALIASES[String(permission || "").trim()] ||
  String(permission || "").trim();

export const getPermissionsByRole = (role = "") => {
  const normalizedRole = normalizePermissionRole(role);
  const list = ROLE_PERMISSIONS[normalizedRole];
  return Array.isArray(list) ? [...list] : [];
};

export const hasPermission = (permissions = [], permission = "") => {
  const required = normalizePermissionKey(permission);
  if (!required) return true;

  const granted = Array.isArray(permissions)
    ? permissions.map((item) => normalizePermissionKey(item))
    : [];
  if (granted.includes("*")) return true;
  if (granted.includes(required)) return true;

  const fallbackGrants = LEGACY_PERMISSION_FALLBACKS[required];
  if (Array.isArray(fallbackGrants) && fallbackGrants.some((fallback) => granted.includes(fallback))) {
    return true;
  }

  return false;
};

export const hasPermissionByRole = (role = "", permission = "") =>
  hasPermission(getPermissionsByRole(role), permission);

export const getPermissionsFromPermissionRoles = (permissionRoles = []) => {
  const uniquePermissions = new Set();
  const selectedRoles = Array.isArray(permissionRoles) ? permissionRoles : [];

  selectedRoles
    .map((role) => normalizePermissionRole(role))
    .forEach((role) => {
      getPermissionsByRole(role).forEach((permission) => uniquePermissions.add(permission));
    });

  return [...uniquePermissions];
};

export const resolvePermissionsForUser = (user = {}) => {
  const explicitPermissions = Array.isArray(user?.permissions)
    ? user.permissions
        .map((permission) => normalizePermissionKey(permission))
        .filter(Boolean)
    : [];

  if (explicitPermissions.length) {
    return [...new Set(explicitPermissions)];
  }

  return getPermissionsByRole(user?.role);
};
