/**
 * client/src/components/ReceiptResult.jsx
 * Displays the ML-extracted receipt items and total after a successful upload.
 */

const CATEGORY_EMOJI = {
  dairy: '🥛',
  grains: '🌾',
  beverages: '🥤',
  'fruits & vegetables': '🥦',
  'meat & protein': '🍗',
  snacks: '🍪',
  household: '🧴',
  'oil & spices': '🌶️',
  others: '🛒',
};

export default function ReceiptResult({ bill, onClose }) {
  if (!bill) return null;

  const items = bill.items || [];
  const total = bill.total_amount ?? bill.total ?? 0;
  const vendor = bill.store_name || bill.vendor || 'Store';
  const date = bill.parsed_date || (bill.date ? new Date(bill.date).toLocaleDateString() : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Receipt Analysed ✅</h2>
          <p className="text-emerald-100 text-sm">
            {vendor} {date && `· ${date}`}
          </p>
        </div>

        {/* Items list */}
        <div className="overflow-y-auto flex-1 p-6 space-y-2">
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No items could be extracted</p>
          ) : (
            items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">
                    {CATEGORY_EMOJI[item.category] || '🛒'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 capitalize truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{item.category}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-semibold text-gray-900">₹{item.price.toFixed(2)}</p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-gray-400">×{item.quantity}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total + close */}
        <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-emerald-600">₹{total.toFixed(2)}</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
