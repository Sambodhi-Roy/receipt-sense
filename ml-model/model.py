"""
model.py — Donut model wrapper
Loads naver-clova-ix/donut-base-finetuned-cord-v2 and runs inference.
Returns RAW JSON output unchanged.
"""

import re
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

MODEL_NAME = "naver-clova-ix/donut-base-finetuned-cord-v2"
TASK_PROMPT = "<s_cord-v2>"


class DonutModel:
    """
    Thin wrapper around the Donut OCR model.
    Responsibility: load, infer, return raw output — nothing else.
    """

    def __init__(self):
        self._processor = None
        self._model = None
        self.is_loaded = False

    def load(self):
        """Load processor and model from HuggingFace hub (cached after first download)."""
        try:
            # Import lazily so the service starts fast even before GPU is ready
            from transformers import DonutProcessor, VisionEncoderDecoderModel
            import torch

            self._processor = DonutProcessor.from_pretrained(MODEL_NAME)
            self._model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            self._model.to(self._device)
            self._model.eval()
            self.is_loaded = True
            logger.info("Donut loaded on %s", self._device)
        except Exception as exc:
            logger.error("Model load failed: %s", exc)
            raise

    def predict(self, image) -> dict[str, Any]:
        """
        Run Donut inference on a preprocessed PIL image.
        Returns the RAW parsed JSON dict — format is NOT modified here.
        """
        import torch

        # Tokenise the task prompt
        decoder_input_ids = self._processor.tokenizer(
            TASK_PROMPT,
            add_special_tokens=False,
            return_tensors="pt",
        ).input_ids.to(self._device)

        # Encode image
        pixel_values = self._processor(
            image,
            return_tensors="pt",
        ).pixel_values.to(self._device)

        # Decode
        with torch.no_grad():
            outputs = self._model.generate(
                pixel_values,
                decoder_input_ids=decoder_input_ids,
                max_length=self._model.decoder.config.max_position_embeddings,
                early_stopping=True,
                pad_token_id=self._processor.tokenizer.pad_token_id,
                eos_token_id=self._processor.tokenizer.eos_token_id,
                use_cache=True,
                num_beams=1,
                bad_words_ids=[[self._processor.tokenizer.unk_token_id]],
                return_dict_in_generate=True,
            )

        # Decode token sequence → XML-like string → dict
        sequence = self._processor.batch_decode(outputs.sequences)[0]
        sequence = sequence.replace(self._processor.tokenizer.eos_token, "")
        sequence = sequence.replace(self._processor.tokenizer.pad_token, "")
        # Strip task prompt prefix
        sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()

        raw_dict = self._processor.token2json(sequence)
        logger.info("Inference complete, raw keys: %s", list(raw_dict.keys()))
        return raw_dict
