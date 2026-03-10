const isGateSecurity = (req, res, next) => {
  if (!req.role || String(req.role).toLowerCase() !== "gatesecurity") {
    return res.status(403).json({
      message: "Access denied. Gate Security privileges required.",
    });
  }
  next();
};

export default isGateSecurity;
