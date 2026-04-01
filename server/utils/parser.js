/**
 * server/utils/parser.js
 *
 * Post-processing layer: transforms Donut RAW JSON → clean Bill object.
 * All business logic lives here; the ML service returns raw output unchanged.
 *
 * Input (Donut CORD-v2 format):
 *   { menu: [...], sub_total: {...}, total: {...} }
 *
 * Output:
 *   {
 *     store_name: string,
 *     date: string,
 *     total_amount: number,
 *     items: [{ name, quantity, price, category }]
 *   }
 */

// ─── Category classification (rule-based) ────────────────────────────────────

const CATEGORY_RULES = [
  // Dairy
  { keywords: ['milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'ghee', 'paneer'], category: 'dairy' },
  // Grains / Staples
  { keywords: ['rice', 'wheat', 'flour', 'bread', 'pasta', 'noodle', 'oat', 'cereal', 'roti', 'chapati', 'atta'], category: 'grains' },
  // Beverages
  { keywords: ['tea', 'coffee', 'juice', 'water', 'soda', 'drink', 'cola', 'beverage', 'milk shake', 'smoothie'], category: 'beverages' },
  // Fruits & Vegetables
  { keywords: ['apple', 'banana', 'orange', 'mango', 'tomato', 'onion', 'potato', 'carrot', 'spinach', 'vegetable', 'fruit', 'lemon', 'grapes'], category: 'fruits & vegetables' },
  // Meat & Protein
  { keywords: ['chicken', 'meat', 'beef', 'mutton', 'fish', 'egg', 'prawn', 'shrimp', 'lamb', 'pork'], category: 'meat & protein' },
  // Snacks
  { keywords: ['biscuit', 'cookie', 'chips', 'snack', 'chocolate', 'candy', 'wafer', 'cracker', 'popcorn'], category: 'snacks' },
  // Household
  { keywords: ['soap', 'shampoo', 'detergent', 'cleaning', 'tissue', 'paper', 'toothpaste', 'brush'], category: 'household' },
  // Oil & Spices
  { keywords: ['oil', 'salt', 'sugar', 'spice', 'masala', 'pepper', 'cumin', 'turmeric', 'chili'], category: 'oil & spices' },
];

/**
 * Classify an item name into a category using keyword matching.
 * @param {string} name
 * @returns {string}
 */
function classifyCategory(name) {
  const lower = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return 'others';
}

// ─── Numeric cleaning ─────────────────────────────────────────────────────────

/**
 * Strip currency symbols, commas, whitespace, and trailing non-numeric chars.
 * Returns a float, or null if the string cannot be parsed.
 * @param {string|number|undefined} raw
 * @returns {number|null}
 */
function parseNumeric(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;

  // Remove known noise: SR, $, £, ₹, ¥, €, x, commas, whitespace
  const cleaned = String(raw)
    .replace(/[sS][rR]/g, '')       // Saudi Riyal text
    .replace(/[^\d.,-]/g, '')       // keep only digits, dot, comma, hyphen
    .replace(/,(?=\d{3})/g, '')     // remove thousands separators (1,234 → 1234)
    .replace(/,/g, '.')             // European decimal comma → dot
    .trim();

  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

// ─── Item validation ─────────────────────────────────────────────────────────

/**
 * Returns true if a menu entry looks like a real item (not a header / noise row).
 * @param {object} entry
 * @returns {boolean}
 */
function isValidMenuItem(entry) {
  if (!entry || typeof entry !== 'object') return false;

  const name = entry.nm || entry.name || '';
  if (!name || typeof name !== 'string') return false;

  // Skip likely metadata rows (e.g. column headers, dividers)
  const NOISE_PATTERNS = [/^-+$/, /^=+$/, /subtotal/i, /sub total/i, /total/i, /discount/i, /tax/i, /vat/i];
  if (NOISE_PATTERNS.some((re) => re.test(name.trim()))) return false;

  // Must have at least one of: price or discountprice
  const hasPrice = entry.price !== undefined || entry.unitprice !== undefined || entry.discountprice !== undefined;
  return hasPrice;
}

// ─── Item extraction ─────────────────────────────────────────────────────────

/**
 * Parse a single menu entry into a clean item object.
 * @param {object} entry
 * @returns {{ name, quantity, price, category }}
 */
function parseMenuItem(entry) {
  const rawName = entry.nm || entry.name || 'Unknown Item';
  const name = rawName.trim().toLowerCase();

  // Quantity: prefer cnt, fall back to num, else 1
  const quantity = parseNumeric(entry.cnt ?? entry.num ?? entry.qty) ?? 1;

  // Price: prefer unitprice, then discountprice, then price
  const price =
    parseNumeric(entry.unitprice) ??
    parseNumeric(entry.discountprice) ??
    parseNumeric(entry.price) ??
    0;

  return {
    name,
    quantity,
    price,
    category: classifyCategory(name),
  };
}

// ─── Total extraction ─────────────────────────────────────────────────────────

/**
 * Extract the authoritative total amount from the raw Donut output.
 * @param {object} rawJson
 * @returns {number}
 */
function extractTotal(rawJson) {
  // Donut CORD-v2 nests total under rawJson.total.total_price
  const nested = rawJson?.total?.total_price ?? rawJson?.total?.totalPrice;
  if (nested !== undefined) {
    const v = parseNumeric(nested);
    if (v !== null) return v;
  }

  // Flat key fallback
  const flat = parseNumeric(rawJson?.total_price ?? rawJson?.totalPrice ?? rawJson?.total);
  if (flat !== null) return flat;

  return 0;
}

// ─── Main transform function ──────────────────────────────────────────────────

/**
 * Transform Donut RAW JSON into a clean Bill-ready object.
 *
 * @param {object} rawJson   - Output from the Donut ML service (untouched)
 * @returns {{
 *   store_name: string,
 *   date: string,
 *   total_amount: number,
 *   items: Array<{ name: string, quantity: number, price: number, category: string }>
 * }}
 */
function parseReceiptRaw(rawJson) {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('parseReceiptRaw: rawJson must be a non-null object');
  }

  // ── Items ──────────────────────────────────────────────────────────────────
  const menuEntries = Array.isArray(rawJson.menu) ? rawJson.menu : [];
  const items = menuEntries
    .filter(isValidMenuItem)
    .map(parseMenuItem)
    .filter((item) => item.price > 0 || item.name !== 'unknown item');

  // ── Total ──────────────────────────────────────────────────────────────────
  const total_amount = extractTotal(rawJson);

  // ── Store name ─────────────────────────────────────────────────────────────
  // Donut CORD-v2 doesn't always output store name; default gracefully
  const store_name = rawJson?.store?.name ?? rawJson?.store_name ?? '';

  // ── Date ───────────────────────────────────────────────────────────────────
  const date = rawJson?.date ?? rawJson?.store?.date ?? new Date().toISOString().split('T')[0];

  return {
    store_name,
    date,
    total_amount,
    items,
  };
}

module.exports = { parseReceiptRaw, classifyCategory, parseNumeric };
