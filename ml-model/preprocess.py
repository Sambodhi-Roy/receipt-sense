"""
preprocess.py
-------------
Validates and prepares a receipt image for the Donut model.

Input  : path to a local image file  (str | Path)
Output : a PIL.Image ready to be passed to the Donut processor
"""

from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
import logging

logger = logging.getLogger(__name__)

# Donut was trained on 960×1280 (H×W); keep within reason
MAX_SIDE = 1920
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif"}


def load_and_preprocess(image_path: str | Path) -> Image.Image:
    """
    Load an image from disk and apply lightweight pre-processing
    to improve OCR accuracy from the Donut model.

    Steps
    -----
    1. Validate the file exists and is a supported format.
    2. Convert to RGB (drop alpha, handle palette modes).
    3. Auto-orient according to EXIF data (fix phone photos).
    4. Downscale very large images while keeping aspect ratio.
    5. Lightly sharpen to help with blurry receipt photos.

    Parameters
    ----------
    image_path : str | Path
        Absolute or relative path to the receipt image.

    Returns
    -------
    PIL.Image.Image
        RGB image ready for the Donut feature extractor.

    Raises
    ------
    FileNotFoundError  : image_path does not exist.
    ValueError         : unsupported file format.
    """
    image_path = Path(image_path)

    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    if image_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported format '{image_path.suffix}'. "
            f"Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    logger.info("Loading image: %s", image_path)
    img = Image.open(image_path)

    # 1. Auto-orient from EXIF (handles portrait phone shots)
    img = ImageOps.exif_transpose(img)

    # 2. Ensure RGB (handles RGBA, palette, greyscale, etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 3. Downscale if either dimension exceeds MAX_SIDE
    w, h = img.size
    if max(w, h) > MAX_SIDE:
        scale = MAX_SIDE / max(w, h)
        new_size = (int(w * scale), int(h * scale))
        img = img.resize(new_size, Image.LANCZOS)
        logger.info("Resized from %s to %s", (w, h), new_size)

    # 4. Light sharpening – helps with slightly out-of-focus receipts
    img = img.filter(ImageFilter.SHARPEN)

    logger.info("Preprocessing complete. Final size: %s", img.size)
    return img
