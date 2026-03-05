/* Middleware: Check if authenticated user is a Warden */
const isWarden = (req, res, next) => {
  if (!req.role || String(req.role).toLowerCase() !== "warden") {
    return res.status(403).json({
      message: "Access denied. Warden privileges required.",
    });
  }
  next();
};

export default isWarden;
