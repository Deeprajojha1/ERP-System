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
  } catch (error) {
    console.error("[isAdmin] Error verifying admin token", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export default isAdmin;
