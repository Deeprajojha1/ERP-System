import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    // console.log("isAuth middleware called");

    // 1. Try cookie first
    let token = req.cookies?.token;

    // 2. Fallback: check Authorization header (needed for mobile browsers
    //    that block third-party cookies)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    try {
      const verifyToken = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      console.log("Decoded Token:", verifyToken);

      req.userId = verifyToken.userId;
      req.role = verifyToken.role;

      console.log("req.userId:", req.userId);

      next();
    } catch (err) {
      console.log(
        "JWT verification error:",
        err.message
      );

      // Clear any invalid/expired token so client can obtain a fresh one
      res.clearCookie("token");

      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.log("isAuth middleware error:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export default isAuth;
