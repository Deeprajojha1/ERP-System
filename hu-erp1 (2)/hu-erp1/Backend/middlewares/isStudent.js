/* Middleware: Check if authenticated user is a Student */
const isStudent = (req, res, next) => {
  if (!req.role || req.role !== "student") {
    return res.status(403).json({
      message: "Access denied. Student privileges required.",
    });
  }
  next();
};

export default isStudent;
