import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    const cookieToken = String(req.cookies?.token || "").trim();
    const authHeader =
      req.headers.authorization ||
      req.headers.Authorization ||
      "";
    const bearerToken = String(authHeader).startsWith("Bearer ")
      ? String(authHeader).split(/\s+/)[1]
      : "";

    const candidates = [cookieToken, bearerToken].filter(Boolean);

    if (!candidates.length) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    for (const token of candidates) {
      try {
        const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = verifyToken.userId;
        req.role = verifyToken.role;
        return next();
      } catch (_) {
        // Try next token candidate.
      }
    }

    // Clear any invalid/expired cookie so client can obtain a fresh one.
    res.clearCookie("token");
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  } catch (error) {
    console.log("isAuth middleware error:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export default isAuth;
