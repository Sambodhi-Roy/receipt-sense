/**
 * client/src/components/CategoryPieChart.jsx
 * Pure SVG pie chart — no external chart library required.
 * Props: data = [{ category: string, amount: number }]
 */

import { useState } from 'react';

const PALETTE = [
  '#10b981', '#14b8a6', '#06b6d4', '#6366f1',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#84cc16',
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function slicePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

export default function CategoryPieChart({ data }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No category data yet
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.amount, 0);
  const CX = 90, CY = 90, R = 75;

  // Build slices
  let cursor = 0;
  const slices = data.slice(0, 8).map((d, i) => {
    const angle = (d.amount / total) * 360;
    const start = cursor;
    cursor += angle;
    return { ...d, start, end: cursor, color: PALETTE[i % PALETTE.length], index: i };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Donut */}
      <svg width="180" height="180" className="flex-shrink-0">
        {slices.map((s) => (
          <path
            key={s.index}
            d={slicePath(CX, CY, R, s.start, s.end)}
            fill={s.color}
            opacity={hovered === s.index ? 1 : 0.85}
            stroke="white"
            strokeWidth="2"
            className="transition-opacity cursor-pointer"
            onMouseEnter={() => setHovered(s.index)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* Centre hole */}
        <circle cx={CX} cy={CY} r={40} fill="white" />
        {hovered !== null ? (
          <>
            <text x={CX} y={CY - 6} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
              {slices[hovered]?.category}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize="10" fill="#6b7280">
              ₹{slices[hovered]?.amount.toFixed(0)}
            </text>
          </>
        ) : (
          <text x={CX} y={CY + 5} textAnchor="middle" fontSize="11" fill="#6b7280">
            {data.length} categories
          </text>
        )}
      </svg>

      {/* Legend */}
      <ul className="space-y-1.5 text-sm min-w-0">
        {slices.map((s) => (
          <li
            key={s.index}
            className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHovered(s.index)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="truncate capitalize text-gray-700">{s.category}</span>
            <span className="ml-auto pl-2 font-medium text-gray-900 flex-shrink-0">
              ₹{s.amount.toFixed(0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
