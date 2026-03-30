"""
postprocess.py
--------------
Maps raw Donut CORD-v2 output to the Bill schema used by the Node/MongoDB server.

Input  : raw dict from model.run_inference()
Output : a clean dict that matches server/models/Bill.js exactly, ready for
         a POST to /api/bills/upload  (or direct MongoDB insertion).

Bill schema (from server/models/Bill.js)
-----------------------------------------
{
    userId   : ObjectId            # injected by the server – NOT produced here
    vendor   : String  (required)
    date     : Date    (required)
    items    : [{ name: String, price: Number }]
    total    : Number  (required)
    category : String  (default "Groceries")
}
"""

import logging
import re
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)

# ── constants ─────────────────────────────────────────────────────────────────

# Item names that are clearly header/footer noise, not real products
_JUNK_NAMES: set[str] = {
    "qty rm tax", "qty", "rm tax", "tax", "subtotal", "sub total",
    "total", "grand total", "amount", "price", "item", "description",
    "no.", "no", "tax invoice", "invoice", "receipt", "change",
    "@", "sr", "gst", "unknown item",
}

# Maximum plausible price for a single line item (RM / USD / INR etc.)
# Anything above this is almost certainly a misread (invoice no., timestamp…)
_MAX_SANE_PRICE = 9_999.0

# Date patterns to try when parsing receipt dates
_DATE_FORMATS = (
    "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y",
    "%d-%m-%Y", "%Y-%m-%d", "%m-%d-%Y",
    "%d/%m/%y", "%y/%m/%d",
    "%b %d %Y", "%B %d %Y",
    "%d %b %Y", "%d %B %Y",
)

# Regex to find a date-like string anywhere in a text blob
_DATE_RE = re.compile(
    r"\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|\d{4}[/\-]\d{1,2}[/\-]\d{1,2})\b"
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _safe_float(value: Any, fallback: float = 0.0) -> float:
    """Convert a value (str / int / float / None) to float safely."""
    if value is None:
        return fallback
    try:
        # Strip currency symbols, trailing alpha tags like "SR", spaces
        cleaned = re.sub(r"[^\d.]", "", str(value).split()[0])
        result = float(cleaned) if cleaned else fallback
        return result if result < _MAX_SANE_PRICE else fallback
    except (ValueError, TypeError, IndexError):
        return fallback


def _is_junk_name(name: str) -> bool:
    """Return True if the item name looks like a header, footer, or noise."""
    n = name.strip().lower()
    if n in _JUNK_NAMES:
        return True
    # Pure number strings (invoice numbers, reference codes)
    if re.fullmatch(r"[\d\s\-/:.]+", n):
        return True
    # Very short meaningless tokens
    if len(n) <= 1:
        return True
    return False


def _parse_date_string(raw: str) -> str | None:
    """Try to parse a date string into ISO-8601 format. Returns None if it fails."""
    raw = raw.strip()
    # Extract first date-like token from a longer string (e.g. "31/12/2017 10:33:59 AM")
    match = _DATE_RE.search(raw)
    candidate = match.group(0) if match else raw

    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(candidate, fmt).date().isoformat()
        except ValueError:
            continue
    return None


# ── field extractors ──────────────────────────────────────────────────────────

def _extract_vendor(raw: dict) -> str:
    """
    Pull the store / vendor name from the CORD parse tree.

    Strategy:
    1. Look for a dedicated store/nm key.
    2. Fall back to the first menu entry whose name looks like a business
       (contains common suffixes like SDN, LTD, MART…).
    3. Default to "Unknown Vendor".
    """
    parse = raw.get("gt_parse", raw)
    store = parse.get("store", {})

    if isinstance(store, dict):
        name = store.get("nm") or store.get("name") or ""
    elif isinstance(store, str):
        name = store
    else:
        name = ""

    name = name.strip()
    if name:
        return name

    # Fallback: scan menu entries for a business-name-looking string
    menu = parse.get("menu", [])
    if not isinstance(menu, list):
        menu = [menu]

    business_keywords = re.compile(
        r"\b(sdn|bhd|ltd|llc|inc|corp|mart|store|shop|market|grocer|supermarket)\b",
        re.IGNORECASE,
    )
    for entry in menu:
        if not isinstance(entry, dict):
            continue
        nm = str(entry.get("nm") or "").strip()
        has_price = _safe_float(entry.get("price")) > 0
        if not has_price and nm and business_keywords.search(nm):
            return nm

    return "Unknown Vendor"


def _extract_items(raw: dict) -> list[dict]:
    """
    Pull line items from CORD's 'menu' list, filtering out header/noise rows.
    Each entry typically has: nm (name), unitprice, cnt, price.
    """
    parse = raw.get("gt_parse", raw)
    menu = parse.get("menu", [])

    if not isinstance(menu, list):
        menu = [menu]

    items = []
    for entry in menu:
        if not isinstance(entry, dict):
            continue

        name = (
            entry.get("nm")
            or entry.get("name")
            or entry.get("item_nm")
            or ""
        )
        name = str(name).strip()

        # Skip junk rows (headers, totals, empty names)
        if _is_junk_name(name):
            continue

        # Skip rows that are store header info (have address "num" but no price)
        raw_price = entry.get("price") or entry.get("unitprice") or entry.get("unit_price")
        price = _safe_float(raw_price)

        if entry.get("num") and not raw_price:
            continue

        # Skip items with price that parsed to 0 due to noise (e.g. "SR", "N/A")
        if price == 0.0 and raw_price is not None:
            continue

        items.append({"name": name, "price": round(price, 2)})

    return items


def _extract_total(raw: dict, items: list[dict]) -> float:
    """
    Pull the grand total with sanity checks.

    Priority:
    1. sub_total.subtotal_price  (most reliable in CORD v2)
    2. total.total_price         (only if it parses as a sane number)
    3. Sum of cleaned line items (last resort)
    """
    parse = raw.get("gt_parse", raw)

    # 1. subtotal block — most reliably filled by Donut on receipts
    sub_block = parse.get("sub_total", {})
    if isinstance(sub_block, dict):
        candidate = _safe_float(
            sub_block.get("subtotal_price") or sub_block.get("price")
        )
        if candidate > 0:
            return round(candidate, 2)

    # 2. total block — guard against timestamps / invoice numbers
    total_block = parse.get("total", {})
    if isinstance(total_block, dict):
        for key in ("total_price", "total_etc", "price"):
            raw_val = total_block.get(key)
            if raw_val:
                candidate = _safe_float(raw_val)
                if candidate > 0:
                    return round(candidate, 2)
    elif isinstance(total_block, (str, int, float)):
        candidate = _safe_float(total_block)
        if candidate > 0:
            return round(candidate, 2)

    # 3. Sum item prices (items already had noise filtered out)
    if items:
        return round(sum(i["price"] for i in items), 2)

    return 0.0


def _extract_date(raw: dict) -> str:
    """
    Return an ISO-8601 date string (YYYY-MM-DD).
    Searches multiple fields including free-text 'etc' blobs.
    Defaults to today if nothing parseable is found.
    """
    parse = raw.get("gt_parse", raw)

    candidates = [
        parse.get("date"),
        parse.get("receipt_date"),
        (parse.get("store") or {}).get("date"),
    ]

    # Also mine 'etc' strings inside sub_total / total blocks for a date
    for block_key in ("sub_total", "total"):
        block = parse.get(block_key, {})
        if isinstance(block, dict):
            candidates.append(block.get("etc"))
            candidates.append(block.get("date"))

    # Sometimes date is misclassified as a menu item name
    for entry in parse.get("menu", []):
        if isinstance(entry, dict):
            candidates.append(entry.get("nm"))

    for raw_date in candidates:
        if not raw_date:
            continue
        parsed = _parse_date_string(str(raw_date))
        if parsed:
            return parsed

    return date.today().isoformat()


# ── public API ────────────────────────────────────────────────────────────────

def build_bill_payload(raw_model_output: dict[str, Any]) -> dict[str, Any]:
    """
    Convert the raw Donut CORD-v2 dict into a Bill-schema-compatible payload.

    Parameters
    ----------
    raw_model_output : dict
        The dict returned by model.run_inference().

    Returns
    -------
    dict
        A payload matching server/models/Bill.js (without userId, without _id).
        Example:
        {
            "vendor"   : "SuperMart",
            "date"     : "2024-03-15",
            "items"    : [{"name": "Milk", "price": 2.5}, ...],
            "total"    : 11.75,
            "category" : "Groceries"
        }
    """
    if not isinstance(raw_model_output, dict):
        logger.warning("raw_model_output is not a dict (%s); returning empty bill.",
                       type(raw_model_output))
        raw_model_output = {}

    vendor    = _extract_vendor(raw_model_output)
    items     = _extract_items(raw_model_output)
    total     = _extract_total(raw_model_output, items)
    bill_date = _extract_date(raw_model_output)

    payload = {
        "vendor":   vendor,
        "date":     bill_date,
        "items":    items,
        "total":    total,
        "category": "Groceries",
    }

    logger.info(
        "Post-processing done. vendor=%s  items=%d  total=%.2f",
        vendor, len(items), total,
    )
    return payload
