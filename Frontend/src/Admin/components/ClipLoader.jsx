const ClipLoader = ({ size = 16, color = "#ffffff", trackColor = "rgba(255, 255, 255, 0.25)" }) => {
  const strokeWidth = Math.max(2, Math.round(size / 8));
  const radius = (size - strokeWidth) / 2;
  const viewBox = `0 0 ${size} ${size}`;
  const startX = size / 2;
  const startY = strokeWidth / 2;
  const endY = size - strokeWidth / 2;

  return (
    <span className="admin-btn-spinner" aria-hidden="true">
      <svg width={size} height={size} viewBox={viewBox} role="presentation">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <line
          x1={startX}
          y1={startY}
          x2={startX}
          y2={endY}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${size / 2} ${size / 2}`}
            to={`360 ${size / 2} ${size / 2}`}
            dur="0.8s"
            repeatCount="indefinite"
          />
        </line>
      </svg>
    </span>
  );
};

export default ClipLoader;
