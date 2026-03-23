import React, { useEffect, useState } from 'react';

/**
 * BidScoreGauge
 * Animated circular SVG gauge that counts from 0 to the score value.
 *
 * Props:
 *   score       {number}  0–100
 *   size        {number}  diameter in px (default 160)
 *   strokeWidth {number}  ring thickness (default 12)
 *   animate     {boolean} animate on mount (default true)
 *   showLabel   {boolean} show "Bid Score" label below number (default true)
 */
export default function BidScoreGauge({
  score = 0,
  size = 160,
  strokeWidth = 12,
  animate = true,
  showLabel = true,
}) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score);

  // Count-up animation
  useEffect(() => {
    if (!animate) {
      setDisplayed(score);
      return;
    }
    setDisplayed(0);
    const duration = 900; // ms
    const steps = 40;
    const increment = score / steps;
    let current = 0;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      current = Math.min(Math.round(increment * count), score);
      setDisplayed(current);
      if (count >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [score, animate]);

  // Geometry
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // We use a 270° arc (starts at 135°, ends at 405° = 45°)
  const startAngle = 135; // degrees
  const totalAngle = 270;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;

  // Convert percentage to stroke-dashoffset
  const pct = displayed / 100;
  const fillLength = pct * arcLength;
  const dashOffset = arcLength - fillLength;

  // Colour based on score value (not displayed, so it snaps at the end)
  const getColor = (s) => {
    if (s >= 70) return { stroke: '#22c55e', text: 'text-green-600', bg: 'text-green-500' };
    if (s >= 45) return { stroke: '#eab308', text: 'text-yellow-600', bg: 'text-yellow-500' };
    return { stroke: '#ef4444', text: 'text-red-600', bg: 'text-red-500' };
  };
  const colors = getColor(score);

  // Helper: polar → cartesian
  const polar = (angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  // Build SVG arc path for the track (grey full 270°)
  const buildArc = (from, to) => {
    const start = polar(from);
    const end = polar(to);
    const largeArc = to - from > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const trackPath = buildArc(startAngle, startAngle + totalAngle);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Bid score: ${score} out of 100`}>
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc via stroke-dasharray trick */}
        <path
          d={trackPath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength}`}
          strokeDashoffset={dashOffset}
          style={{ transition: animate ? 'stroke-dashoffset 0.05s linear' : 'none' }}
        />

        {/* Score number */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fontWeight="700"
          fill={colors.stroke}
          fontFamily="inherit"
        >
          {displayed}
        </text>

        {/* /100 label */}
        <text
          x={cx}
          y={cy + size * 0.14}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.09}
          fill="#9ca3af"
          fontFamily="inherit"
        >
          / 100
        </text>
      </svg>

      {showLabel && (
        <p className="text-xs font-medium text-gray-500 tracking-wide uppercase">Bid Score</p>
      )}
    </div>
  );
}
