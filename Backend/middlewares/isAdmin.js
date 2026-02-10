import jwt from "jsonwebtoken";

const isAdmin = async (req, res, next) => {
  try {
    console.log("[isAdmin] Incoming admin request", {
      origin: req.headers.origin,
      cookies: req.cookies,
    });

    const { token } = req.cookies;

    if (!token) {
      console.warn("[isAdmin] No token cookie found");
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log("[isAdmin] Decoded token", decoded);

      if (decoded.role !== "admin") {
        console.warn("[isAdmin] Non-admin role attempted access", decoded.role);
        return res.status(403).json({
          message: "Access denied. Admin privileges required.",
        });
      }

      req.userId = decoded.userId;
      req.role = decoded.role;

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
