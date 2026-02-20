/* Middleware: Check if authenticated user is Faculty */
const isFaculty = (req, res, next) => {
  if (!req.role || req.role !== "faculty") {
    return res.status(403).json({
      message: "Access denied. Faculty privileges required.",
    });
  }
  next();
};

export default isFaculty;
