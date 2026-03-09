import { getPermissionsByRole, hasPermission } from "../utils/rolePermissions.js";

const hasModuleAccess = (modulePermission, exemptRoles = []) => (req, res, next) => {
  if (Array.isArray(exemptRoles) && exemptRoles.includes(req.role)) {
    return next();
  }

  const rolePermissions =
    Array.isArray(req.permissions) && req.permissions.length
      ? req.permissions
      : getPermissionsByRole(req.role);

  if (!hasPermission(rolePermissions, modulePermission)) {
    return res.status(403).json({
      message: "Access denied for this module.",
    });
  }

  req.permissions = rolePermissions;
  return next();
};

export default hasModuleAccess;
