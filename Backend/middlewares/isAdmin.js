import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { getPermissionsByRole, hasPermission, resolvePermissionsForUser } from "../utils/rolePermissions.js";

const isAdmin = async (req, res, next) => {
  try {
    console.log("[isAdmin] Incoming admin request", {
      origin: req.headers.origin,
      hasCookieToken: Boolean(req.cookies?.token),
      hasAuthHeader: Boolean(req.headers.authorization),
    });

    // 1) Prefer cookie token (web browsers with cookie support)
    let token = req.cookies?.token;

    // 2) Fallback to Authorization header (mobile / third-party cookie blocked)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      console.warn("[isAdmin] No auth token found in cookie or Authorization header");
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.masterAdmin) {
        const permissions = getPermissionsByRole("admin");
        req.userId = decoded.userId;
        req.role = "admin";
        req.permissions = permissions;

        console.log("[isAdmin] Master admin authorized", {
          userId: req.userId,
          role: req.role,
        });

        return next();
      }
      const currentUser = await User.findById(decoded.userId).select(
        "role permissions"
      );
      const resolvedRole = currentUser?.role || decoded.role;

      console.log("[isAdmin] Decoded token", decoded);

      const permissions = resolvePermissionsForUser({
        role: resolvedRole,
        permissions: currentUser?.permissions,
      });
      if (!hasPermission(permissions, "portal.admin")) {
        console.warn("[isAdmin] Non-admin-panel role attempted access", resolvedRole);
        return res.status(403).json({
          message: "Access denied. Admin panel privileges required.",
        });
      }

      req.userId = decoded.userId;
      req.role = resolvedRole;
      req.permissions = permissions;

      console.log("[isAdmin] Admin authorized", {
        userId: req.userId,
        role: req.role,
      });

      next();
    } catch (err) {
      console.error("[isAdmin] Error verifying admin token", err.message);

      // Clear invalid/expired cookie so the client can log in again cleanly
      res.clearCookie("token");

      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("[isAdmin] Unexpected error", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export default isAdmin;
