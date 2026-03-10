const isWardenOrGateSecurity = (req, res, next) => {
  const normalizedRole = String(req.role || "").toLowerCase().trim();
  if (!["warden", "gatesecurity"].includes(normalizedRole)) {
    return res.status(403).json({
      message: "Access denied. Warden or Gate Security privileges required.",
    });
  }
  next();
};

export default isWardenOrGateSecurity;
