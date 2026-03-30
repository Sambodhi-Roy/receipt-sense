/**
 * client/src/components/InsightsSection.jsx
 * Displays AI-generated spending insights from the analytics/extended endpoint.
 */

const INSIGHT_ICONS = ['💡', '📈', '📊', '🎯', '🛒'];

export default function InsightsSection({ insights = [] }) {
  if (!insights || insights.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Insights</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((text, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3"
          >
            <span className="text-2xl flex-shrink-0">{INSIGHT_ICONS[i % INSIGHT_ICONS.length]}</span>
            <p className="text-sm text-gray-700 leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
