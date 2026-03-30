"""
pipeline.py
-----------
End-to-end receipt extraction pipeline.

Usage (CLI)
-----------
    python pipeline.py path/to/receipt.jpg
    python pipeline.py path/to/receipt.jpg --out result.json
    python pipeline.py path/to/receipt.jpg --pretty

Usage (Python)
--------------
    from ml_model.pipeline import extract_receipt

    payload = extract_receipt("receipt.jpg")
    # payload is a dict ready to be stored as a Bill document.
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

# ── configure root logger so callers see INFO by default ──────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)

# ── relative imports work whether run as a script or imported as a module ──
try:
    from preprocess import load_and_preprocess
    from model import load_model, run_inference
    from postprocess import build_bill_payload
except ImportError:
    # when imported from the repo root as ml_model.pipeline
    from ml_model.preprocess import load_and_preprocess
    from ml_model.model import load_model, run_inference
    from ml_model.postprocess import build_bill_payload


def extract_receipt(
    image_path: str | Path,
    model_cache_dir: str | Path | None = None,
) -> dict[str, Any]:
    """
    Full pipeline:  image file  →  Bill-schema dict.

    Parameters
    ----------
    image_path : str | Path
        Path to the receipt image (JPG, PNG, etc.).
    model_cache_dir : str | Path | None
        Optional Hugging Face cache directory for model weights.

    Returns
    -------
    dict
        {
            "vendor"   : str,
            "date"     : "YYYY-MM-DD",
            "items"    : [{"name": str, "price": float}, ...],
            "total"    : float,
            "category" : "Groceries",
            "_raw"     : { ... }   # original model output, for debugging
        }
    """
    image_path = Path(image_path)

    # ── 1. Pre-process ────────────────────────────────────────────────────
    logger.info("Step 1/3 – Pre-processing image …")
    image = load_and_preprocess(image_path)

    # ── 2. Model inference ────────────────────────────────────────────────
    logger.info("Step 2/3 – Running Donut inference …")
    load_model(cache_dir=model_cache_dir)
    raw_output = run_inference(image)

    # ── 3. Post-process ───────────────────────────────────────────────────
    logger.info("Step 3/3 – Post-processing model output …")
    payload = build_bill_payload(raw_output)

    # Attach raw output under a private key for debugging / logging
    payload["_raw"] = raw_output

    return payload


# ── CLI entry point ───────────────────────────────────────────────────────────

def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract structured data from a grocery receipt image."
    )
    parser.add_argument("image", help="Path to receipt image file.")
    parser.add_argument(
        "--out", "-o",
        metavar="FILE",
        help="Write JSON output to FILE instead of stdout.",
    )
    parser.add_argument(
        "--pretty", "-p",
        action="store_true",
        help="Pretty-print JSON output.",
    )
    parser.add_argument(
        "--cache-dir",
        metavar="DIR",
        default=None,
        help="Hugging Face model cache directory.",
    )
    parser.add_argument(
        "--no-raw",
        action="store_true",
        help="Exclude the '_raw' model output from the result.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    try:
        result = extract_receipt(
            image_path=args.image,
            model_cache_dir=args.cache_dir,
        )
    except FileNotFoundError as exc:
        logger.error("%s", exc)
        return 1
    except ValueError as exc:
        logger.error("Invalid image: %s", exc)
        return 1

    if args.no_raw:
        result.pop("_raw", None)

    indent = 2 if args.pretty else None
    json_str = json.dumps(result, indent=indent, default=str)

    if args.out:
        Path(args.out).write_text(json_str, encoding="utf-8")
        logger.info("Result written to %s", args.out)
    else:
        print(json_str)

    return 0


if __name__ == "__main__":
    sys.exit(main())
