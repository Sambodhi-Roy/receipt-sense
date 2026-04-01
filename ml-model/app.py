"""
ReceiptSense — FastAPI ML Microservice
Responsibility: image → Donut inference → RAW JSON
NO business logic lives here.
"""

import io
import logging
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from preprocess import preprocess_image
from model import DonutModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ReceiptSense ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
donut_model = DonutModel()


@app.on_event("startup")
async def startup_event():
    logger.info("Loading Donut model — this may take a moment on first run...")
    donut_model.load()
    logger.info("Model ready.")


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": donut_model.is_loaded}


@app.post("/process")
async def process_receipt(image: UploadFile = File(...)):
    """
    Accept a receipt image, run Donut inference, return RAW JSON.
    Output format is preserved exactly as the model produces it:
      { "menu": [...], "sub_total": {...}, "total": {...} }
    """
    if not donut_model.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    # Validate content type
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        raw_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception as exc:
        logger.error("Failed to open image: %s", exc)
        raise HTTPException(status_code=400, detail=f"Cannot read image: {exc}") from exc

    try:
        processed_image = preprocess_image(pil_image)
        raw_json = donut_model.predict(processed_image)
    except Exception as exc:
        logger.error("Inference failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}") from exc

    return raw_json
