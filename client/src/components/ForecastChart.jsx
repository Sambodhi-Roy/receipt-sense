/**
 * client/src/components/ForecastChart.jsx
 * SVG line chart showing historical monthly spending + a forecast point.
 * No external chart library required.
 */

import { useState } from 'react';

const TREND_COLOR  = { up: '#ef4444', down: '#10b981', stable: '#6366f1' };
const TREND_LABEL  = { up: '↑ Rising', down: '↓ Falling', stable: '→ Stable' };
const CONFIDENCE_COLOR = { high: 'emerald', medium: 'amber', low: 'red' };

export default function ForecastChart({ data }) {
    const [hovered, setHovered] = useState(null);

    if (!data?.hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <span className="text-4xl mb-3">📊</span>
                <p className="text-gray-500 text-sm">{data?.message || 'No forecast data yet.'}</p>
            </div>
        );
    }

    const { historical, predicted, nextMonth, confidence, trend, categoryForecasts } = data;

    // Build chart points: historical + forecast
    const allPoints = [
        ...historical.map((d) => ({ month: d.month, amount: d.amount, isForecast: false })),
        { month: nextMonth, amount: predicted, isForecast: true },
    ];

    const W = 340, H = 180;
    const PAD = { top: 24, right: 24, bottom: 40, left: 52 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    const amounts = allPoints.map((p) => p.amount);
    const maxAmt  = Math.max(...amounts, 1);
    const minAmt  = Math.min(...amounts, 0);
    const range   = maxAmt - minAmt || 1;

    const toX = (i) => PAD.left + (i / (allPoints.length - 1)) * cW;
    const toY = (v) => PAD.top + cH - ((v - minAmt) / range) * cH;

    // Build SVG polyline path
    const histPoints = allPoints.slice(0, historical.length);
    const histPath = histPoints.map((p, i) => `${toX(i)},${toY(p.amount)}`).join(' ');

    const lastHistX = toX(historical.length - 1);
    const lastHistY = toY(historical[historical.length - 1].amount);
    const forecastX = toX(allPoints.length - 1);
    const forecastY = toY(predicted);

    function shortMonth(yyyyMM) {
        const [yr, mo] = yyyyMM.split('-').map(Number);
        return new Date(yr, mo - 1, 1).toLocaleString('default', { month: 'short' });
    }

    const confClass = CONFIDENCE_COLOR[confidence] || 'gray';

    return (
        <div className="space-y-5">
            {/* Forecast headline */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">Predicted spend for {shortMonth(nextMonth)}</p>
                    <p className="text-3xl font-bold text-gray-900">₹{predicted.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span
                        className="text-sm font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: TREND_COLOR[trend], background: TREND_COLOR[trend] + '18' }}
                    >
                        {TREND_LABEL[trend]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${confClass}-100 text-${confClass}-700 font-medium`}>
                        {confidence} confidence
                    </span>
                </div>
            </div>

            {/* Line chart */}
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
                {/* Y-axis grid */}
                {[0, 0.5, 1].map((t, i) => {
                    const y = PAD.top + cH - t * cH;
                    const val = minAmt + t * range;
                    return (
                        <g key={i}>
                            <line x1={PAD.left} x2={PAD.left + cW} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                            <text x={PAD.left - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
                                ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                            </text>
                        </g>
                    );
                })}

                {/* Historical line */}
                <polyline points={histPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />

                {/* Dashed line to forecast */}
                <line
                    x1={lastHistX} y1={lastHistY}
                    x2={forecastX} y2={forecastY}
                    stroke="#6366f1" strokeWidth="2" strokeDasharray="5,4"
                />

                {/* Data point dots — historical */}
                {histPoints.map((p, i) => (
                    <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                        <circle cx={toX(i)} cy={toY(p.amount)} r={5} fill="#10b981" stroke="white" strokeWidth="2" className="cursor-pointer" />
                        {hovered === i && (
                            <g>
                                <rect x={toX(i) - 28} y={toY(p.amount) - 24} width="56" height="18" rx="4" fill="#1f2937" />
                                <text x={toX(i)} y={toY(p.amount) - 12} textAnchor="middle" fontSize="9" fill="white">
                                    ₹{p.amount.toFixed(0)}
                                </text>
                            </g>
                        )}
                    </g>
                ))}

                {/* Forecast dot */}
                <g onMouseEnter={() => setHovered('f')} onMouseLeave={() => setHovered(null)}>
                    <circle cx={forecastX} cy={forecastY} r={7} fill="#6366f1" stroke="white" strokeWidth="2.5" className="cursor-pointer" />
                    {hovered === 'f' && (
                        <g>
                            <rect x={forecastX - 32} y={forecastY - 24} width="64" height="18" rx="4" fill="#4f46e5" />
                            <text x={forecastX} y={forecastY - 12} textAnchor="middle" fontSize="9" fill="white">
                                Forecast ₹{predicted.toFixed(0)}
                            </text>
                        </g>
                    )}
                </g>

                {/* X-axis month labels */}
                {allPoints.map((p, i) => (
                    <text
                        key={i}
                        x={toX(i)} y={PAD.top + cH + 16}
                        textAnchor="middle" fontSize="9"
                        fill={p.isForecast ? '#6366f1' : '#6b7280'}
                        fontWeight={p.isForecast ? '700' : '400'}
                    >
                        {shortMonth(p.month)}{p.isForecast ? '*' : ''}
                    </text>
                ))}
            </svg>

            {/* Category forecasts */}
            {categoryForecasts?.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Category Breakdown</p>
                    <div className="grid grid-cols-2 gap-2">
                        {categoryForecasts.map((cf) => (
                            <div key={cf.category} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                                <span className="text-sm text-gray-700 capitalize truncate">{cf.category}</span>
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                    <span className="text-sm font-semibold text-gray-900">₹{cf.predicted.toFixed(0)}</span>
                                    <span style={{ color: TREND_COLOR[cf.trend] }} className="text-xs font-bold">
                                        {cf.trend === 'up' ? '↑' : cf.trend === 'down' ? '↓' : '→'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">* Forecast based on linear regression. Actual spending may vary.</p>
                </div>
            )}
        </div>
    );
}
