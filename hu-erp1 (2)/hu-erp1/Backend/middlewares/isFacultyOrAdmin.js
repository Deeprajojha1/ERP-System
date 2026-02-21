import jwt from "jsonwebtoken";

/**
 * Middleware that allows both admin and faculty roles.
 * Sets req.userId and req.role from the JWT.
 */
const isFacultyOrAdmin = async (req, res, next) => {
  try {
    console.log(`[isFacultyOrAdmin] ${req.method} ${req.originalUrl}`);
    
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
      console.log("[isFacultyOrAdmin] No token found");
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[isFacultyOrAdmin] Token decoded, role:", decoded.role);

    if (decoded.role !== "admin" && decoded.role !== "faculty") {
      console.log("[isFacultyOrAdmin] Access denied, role:", decoded.role);
      return res.status(403).json({ message: "Access denied. Faculty or Admin privileges required." });
    }

    req.userId = decoded.userId;
    req.role = decoded.role;

    console.log("[isFacultyOrAdmin] Access granted, proceeding to controller");
    next();
  } catch (error) {
    console.log("[isFacultyOrAdmin] Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default isFacultyOrAdmin;
