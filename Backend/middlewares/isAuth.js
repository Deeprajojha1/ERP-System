import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    // console.log("isAuth middleware called");

    const { token } = req.cookies;

    if (!token) {
      return res.status(400).json({
        message: "User doesn't have token",
      });
    }

    const verifyToken = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("Decoded Token:", verifyToken);

    /* FIX HERE */
    req.userId = verifyToken.userId;
    req.role = verifyToken.role;

    console.log("req.userId:", req.userId);

    next();
  } catch (error) {
    console.log(
      "JWT verification error:",
      error.message
    );

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export default isAuth;
