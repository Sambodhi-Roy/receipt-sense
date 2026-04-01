/**
 * client/src/components/BudgetAlert.jsx
 * Shows a dismissible alert banner when any budget category hits ≥80%.
 */

import { useState } from 'react';

export default function BudgetAlert({ alerts }) {
    const [dismissed, setDismissed] = useState(false);

    if (!alerts || alerts.length === 0 || dismissed) return null;

    const overBudget  = alerts.filter((a) => a.pct >= 100);
    const nearBudget  = alerts.filter((a) => a.pct >= 80 && a.pct < 100);

    return (
        <div className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${
            overBudget.length > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
        }`}>
            <span className="text-2xl flex-shrink-0 mt-0.5">
                {overBudget.length > 0 ? '🚨' : '⚠️'}
            </span>
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${overBudget.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                    {overBudget.length > 0
                        ? `Budget exceeded in ${overBudget.length} categor${overBudget.length > 1 ? 'ies' : 'y'}!`
                        : `Approaching budget limit`}
                </p>
                <ul className="mt-1 space-y-0.5">
                    {alerts.map((a) => (
                        <li key={a.category} className="text-xs text-gray-600 capitalize">
                            <span className="font-medium">{a.category}</span>
                            {' — '}₹{a.spent.toFixed(0)} of ₹{a.limit.toFixed(0)} ({a.pct}%)
                            {a.pct >= 100 && <span className="ml-1 text-red-600 font-semibold">OVER</span>}
                        </li>
                    ))}
                </ul>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
                aria-label="Dismiss"
            >
                ×
            </button>
        </div>
    );
}
