import React from "react";

const ClipLoader = ({
  size = 16,
  color = "#0f172a",
  trackColor = "rgba(15, 23, 42, 0.2)",
  className = "",
}) => {
  const border = Math.max(2, Math.round(Number(size) / 8));

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: Number(size),
        height: Number(size),
        borderRadius: "50%",
        border: `${border}px solid ${trackColor}`,
        borderTopColor: color,
        animation: "hu-spin 0.75s linear infinite",
      }}
      aria-label="loading"
      role="status"
    />
  );
};

export default ClipLoader;
