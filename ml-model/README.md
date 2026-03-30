# ml-model

Python pipeline that extracts structured data from a grocery receipt image using the
[Donut](https://huggingface.co/naver-clova-ix/donut-base-finetuned-cord-v2) model.

```
image → preprocess.py → model.py → postprocess.py → Bill-schema dict
```

---

## Files

| File | Purpose |
|---|---|
| `preprocess.py` | Load + validate image, auto-orient, resize, sharpen |
| `model.py` | Load Donut model once, run inference, return raw JSON |
| `postprocess.py` | Map CORD-v2 JSON → Bill schema (`vendor`, `date`, `items`, `total`) |
| `pipeline.py` | Orchestrates the three steps; CLI entry point |
| `requirements.txt` | Python dependencies |

---

## Quick start

```bash
# 1. Install dependencies
pip install -r ml-model/requirements.txt

# 2. Run on a receipt image (pretty-printed output)
python ml-model/pipeline.py receipt.jpg --pretty

# 3. Save output to a file
python ml-model/pipeline.py receipt.jpg --out result.json --no-raw
```

---

## Output format

The pipeline returns a dict that matches `server/models/Bill.js` exactly
(without `userId` / `_id`, which the server attaches):

```json
{
  "vendor":   "SuperMart",
  "date":     "2024-03-15",
  "items":    [
    { "name": "Milk",   "price": 2.50 },
    { "name": "Bread",  "price": 1.50 }
  ],
  "total":    4.00,
  "category": "Groceries",
  "_raw":     { ... }
}
```

`_raw` contains the unmodified Donut output and is useful for debugging.
Pass `--no-raw` (CLI) or strip `payload.pop("_raw")` (Python) before storing.

---

## Python API

```python
from ml_model.pipeline import extract_receipt

payload = extract_receipt("path/to/receipt.jpg")
payload.pop("_raw", None)          # remove debug key before DB insert
# hand payload to your DB layer
```

---

## Integration with the Node server

The `POST /api/bills/upload` route currently uses a mock generator.
To wire in the real model, replace `generateMockBill()` in
`server/routes/bills.js` with a call to this pipeline (e.g. via a
Python subprocess, a FastAPI micro-service, or a job queue).
