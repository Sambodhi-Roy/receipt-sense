"""
model.py
--------
Loads the Donut model and runs inference on a pre-processed image.

Input  : PIL.Image (from preprocess.py)
Output : raw dict decoded from the model's JSON token sequence
"""

import json
import logging
import re
from pathlib import Path
from typing import Any

import torch
from PIL import Image
from transformers import DonutProcessor, VisionEncoderDecoderModel

logger = logging.getLogger(__name__)

MODEL_NAME = "naver-clova-ix/donut-base-finetuned-cord-v2"

# Singleton – model is expensive to load; keep it in memory across calls
_processor: DonutProcessor | None = None
_model: VisionEncoderDecoderModel | None = None


def _get_device() -> torch.device:
    """Return the best available device (CUDA → MPS → CPU)."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():          # Apple Silicon
        return torch.device("mps")
    return torch.device("cpu")


def load_model(cache_dir: str | Path | None = None) -> None:
    """
    Download (first run) and load the Donut model + processor into memory.

    Parameters
    ----------
    cache_dir : str | Path | None
        Optional directory to cache Hugging Face model weights.
        Defaults to ~/.cache/huggingface/hub.
    """
    global _processor, _model

    if _processor is not None and _model is not None:
        logger.info("Model already loaded – skipping.")
        return

    cache_dir = str(cache_dir) if cache_dir else None
    logger.info("Loading model '%s' …", MODEL_NAME)

    _processor = DonutProcessor.from_pretrained(MODEL_NAME, cache_dir=cache_dir)
    _model = VisionEncoderDecoderModel.from_pretrained(
        MODEL_NAME, cache_dir=cache_dir
    )

    device = _get_device()
    _model.to(device)
    _model.eval()

    logger.info("Model loaded on %s.", device)


def run_inference(image: Image.Image) -> dict[str, Any]:
    """
    Run Donut inference on a single receipt image.

    Parameters
    ----------
    image : PIL.Image.Image
        RGB image returned by preprocess.load_and_preprocess().

    Returns
    -------
    dict
        Raw JSON payload decoded from the model output.
        Example structure (CORD v2 task):
        {
            "gt_parse": {
                "menu": [
                    {"nm": "Milk", "unitprice": "2.50", "cnt": "1", "price": "2.50"},
                    ...
                ],
                "sub_total": {"subtotal_price": "11.75"},
                "total": {
                    "total_price": "11.75",
                    "cashprice":   "15.00",
                    "changeprice": "3.25"
                }
            }
        }

    Raises
    ------
    RuntimeError : model has not been loaded via load_model() first.
    """
    if _processor is None or _model is None:
        raise RuntimeError("Model not loaded. Call load_model() before run_inference().")

    device = next(_model.parameters()).device

    # --- Tokenise the task prompt ---
    task_prompt = "<s_cord-v2>"
    decoder_input_ids = _processor.tokenizer(
        task_prompt,
        add_special_tokens=False,
        return_tensors="pt",
    ).input_ids.to(device)

    # --- Encode the image ---
    pixel_values = _processor(
        image, return_tensors="pt"
    ).pixel_values.to(device)

    # --- Generate token sequence ---
    with torch.no_grad():
        output_ids = _model.generate(
            pixel_values,
            decoder_input_ids=decoder_input_ids,
            max_length=_model.decoder.config.max_position_embeddings,
            pad_token_id=_processor.tokenizer.pad_token_id,
            eos_token_id=_processor.tokenizer.eos_token_id,
            use_cache=True,
            bad_words_ids=[[_processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )

    # --- Decode tokens → string ---
    sequence: str = _processor.batch_decode(output_ids.sequences)[0]
    sequence = sequence.replace(_processor.tokenizer.eos_token, "")
    sequence = sequence.replace(_processor.tokenizer.pad_token, "")

    # Strip the task prompt prefix if present
    sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()

    # --- Convert Donut XML-like token string to Python dict ---
    raw_output: dict[str, Any] = _processor.token2json(sequence)

    logger.info("Inference complete. Raw keys: %s", list(raw_output.keys()))
    return raw_output
