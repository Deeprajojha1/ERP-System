import jwt from "jsonwebtoken";

/**
 * Middleware that allows both admin and faculty roles.
 * Sets req.userId and req.role from the JWT.
 */
const isFacultyOrAdmin = async (req, res, next) => {
  try {
    // 1) Cookie token (desktop browsers)
    let token = req.cookies?.token;

    // 2) Fallback Authorization header (mobile / blocked third-party cookies)
    if (!token) {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader && /^Bearer\s+/i.test(authHeader)) {
        token = authHeader.split(/\s+/)[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin" && decoded.role !== "faculty") {
      return res.status(403).json({ message: "Access denied. Faculty or Admin privileges required." });
    }

    req.userId = decoded.userId;
    req.role = decoded.role;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default isFacultyOrAdmin;
