/**
 * client/src/components/MonthlyTrendChart.jsx
 * SVG bar chart for monthly spending — no external library needed.
 * Props: data = [{ month: "YYYY-MM", amount: number }]
 */

const BAR_COLOR = '#10b981';
const BAR_HOVER = '#059669';

import { useState } from 'react';

function shortMonth(yyyyMM) {
  const [year, month] = yyyyMM.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('default', { month: 'short' });
}

export default function MonthlyTrendChart({ data }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No monthly data yet
      </div>
    );
  }

  const W = 320, H = 160;
  const PADDING = { top: 20, right: 16, bottom: 36, left: 48 };
  const chartW = W - PADDING.left - PADDING.right;
  const chartH = H - PADDING.top - PADDING.bottom;

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const barWidth = Math.min(chartW / data.length - 8, 36);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: maxAmount * t,
    y: PADDING.top + chartH - t * chartH,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-sm"
      style={{ overflow: 'visible' }}
    >
      {/* Y-axis grid + labels */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PADDING.left}
            x2={PADDING.left + chartW}
            y1={tick.y}
            y2={tick.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <text
            x={PADDING.left - 6}
            y={tick.y + 4}
            textAnchor="end"
            fontSize="9"
            fill="#9ca3af"
          >
            ₹{tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}k` : tick.value.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.amount / maxAmount) * chartH;
        const x = PADDING.left + (i / data.length) * chartW + (chartW / data.length - barWidth) / 2;
        const y = PADDING.top + chartH - barH;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              fill={hovered === i ? BAR_HOVER : BAR_COLOR}
              className="transition-colors cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            {/* Amount tooltip on hover */}
            {hovered === i && (
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="#065f46"
              >
                ₹{d.amount.toFixed(0)}
              </text>
            )}
            {/* Month label */}
            <text
              x={x + barWidth / 2}
              y={PADDING.top + chartH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {shortMonth(d.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
