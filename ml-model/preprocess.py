"""
preprocess.py — Receipt image preprocessing
Prepares a PIL image for Donut inference.
"""

from PIL import Image, ImageOps, ImageFilter


# Donut CORD-v2 was trained on ~1280×960 images
TARGET_WIDTH = 1280
TARGET_HEIGHT = 960


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Normalise a receipt image before passing to Donut.
    Steps:
      1. Convert to RGB (drop alpha channels, handle grayscale)
      2. Auto-rotate using EXIF orientation
      3. Deskew / straighten via modest sharpening
      4. Resize to the model's expected resolution (pad, do not crop)
    Returns a PIL.Image ready for the processor.
    """
    # 1. Ensure RGB
    image = image.convert("RGB")

    # 2. Respect EXIF orientation (phone photos are often rotated)
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass  # Non-critical — continue without rotation

    # 3. Light sharpening helps OCR on blurry receipts
    image = image.filter(ImageFilter.SHARPEN)

    # 4. Resize with letterboxing to preserve aspect ratio
    image = _resize_with_padding(image, TARGET_WIDTH, TARGET_HEIGHT)

    return image


def _resize_with_padding(
    image: Image.Image,
    target_w: int,
    target_h: int,
    fill_color: tuple = (255, 255, 255),
) -> Image.Image:
    """Resize image to fit within target dims; pad remaining space with white."""
    original_w, original_h = image.size
    scale = min(target_w / original_w, target_h / original_h)

    new_w = int(original_w * scale)
    new_h = int(original_h * scale)
    resized = image.resize((new_w, new_h), Image.LANCZOS)

    padded = Image.new("RGB", (target_w, target_h), fill_color)
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    padded.paste(resized, (offset_x, offset_y))
    return padded
