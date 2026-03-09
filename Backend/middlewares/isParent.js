const isParent = (req, res, next) => {
  if (!req.role || req.role !== "parent") {
    return res.status(403).json({
      message: "Access denied. Parent privileges required.",
    });
  }
  return next();
};

export default isParent;
