"""
Wrapper for Gemma 4 inference that matches Trij's triage pipeline.
Includes CLAHE-based image preprocessing for skin tone fairness,
an improved production-aligned prompt, and confidence calibration.
"""

import torch
import logging
import numpy as np
from PIL import Image, ImageOps
from typing import Optional

logger = logging.getLogger(__name__)


def _apply_clahe(image: Image.Image) -> Image.Image:
    """
    Apply Contrast Limited Adaptive Histogram Equalization (CLAHE)
    on the luminance channel to reduce skin-tone bias.
    """
    img_array = np.array(image.convert("RGB"), dtype=np.uint8)

    if img_array.shape[-1] != 3:
        return image

    # Convert RGB to YUV (YCbCr)
    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    y = y.astype(np.uint8)

    # Adaptive histogram equalization using local tiles
    tile_size = 64
    clip_limit = 2.0
    h, w = y.shape

    y_eq = np.zeros_like(y)
    for i in range(0, h, tile_size):
        for j in range(0, w, tile_size):
            tile = y[i:min(i + tile_size, h), j:min(j + tile_size, w)]
            hist, _ = np.histogram(tile, bins=256, range=(0, 256))

            # Clip histogram
            clipped = np.clip(hist, 0, int(clip_limit * tile.size / 256))
            excess = np.sum(hist) - np.sum(clipped)
            spread = excess // 256
            clipped += spread

            # CDF mapping
            cdf = clipped.cumsum()
            cdf = (cdf - cdf.min()) * 255 / (cdf.max() - cdf.min() + 1e-6)
            tile_eq = np.interp(tile.flatten(), np.arange(256), cdf).astype(np.uint8)
            y_eq[i:min(i + tile_size, h), j:min(j + tile_size, w)] = tile_eq.reshape(tile.shape)

    # Bilateral-like blending at tile boundaries via simple averaging
    y_eq = ImageOps.equalize(Image.fromarray(y_eq))
    y_eq = np.array(y_eq, dtype=np.uint8)

    # Merge back
    yuv = np.stack([y_eq, img_array[:, :, 1], img_array[:, :, 2]], axis=-1)
    r2 = yuv[:, :, 0] + 1.402 * (yuv[:, :, 2] - 128)
    g2 = yuv[:, :, 0] - 0.344 * (yuv[:, :, 1] - 128) - 0.714 * (yuv[:, :, 2] - 128)
    b2 = yuv[:, :, 0] + 1.772 * (yuv[:, :, 1] - 128)

    result = np.stack(
        [np.clip(r2, 0, 255), np.clip(g2, 0, 255), np.clip(b2, 0, 255)],
        axis=-1
    ).astype(np.uint8)

    return Image.fromarray(result)


def _calibrate_confidence(confidence: float, fitzpatrick_type: Optional[int]) -> float:
    """
    Adjust confidence scores to reduce bias across skin tones.
    Boosts confidence for darker skin types (V-VI) which tend to be under-estimated.
    """
    if fitzpatrick_type is None:
        return confidence
    boost = 0.0
    if fitzpatrick_type in (5, 6):
        boost = 0.05
    elif fitzpatrick_type == 4:
        boost = 0.02
    return min(max(confidence + boost, 0.0), 1.0)


class GemmaInferenceWrapper:
    """
    Wraps Gemma 4 model inference to match Trij's production triage pipeline.
    Applies CLAHE preprocessing for skin-tone fairness and confidence calibration.
    """

    def __init__(self, model_name: str = "google/gemma-4-2b", device: Optional[str] = None):
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.processor = None
        self._loaded = False

    def load(self):
        """Load the model and processor (lazy load to save memory)."""
        if self._loaded:
            return
        try:
            from transformers import AutoModelForVision2Seq, AutoProcessor
            logger.info(f"Loading model {self.model_name} on {self.device}...")
            self.processor = AutoProcessor.from_pretrained(self.model_name)
            self.model = AutoModelForVision2Seq.from_pretrained(
                self.model_name,
                torch_dtype=torch.float32 if self.device == "cpu" else torch.bfloat16,
                device_map=self.device,
                low_cpu_mem_usage=True
            )
            self._loaded = True
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            raise

    def _get_default_prompt(self) -> str:
        """
        Returns Trij's production-aligned prompt with skin-tone fairness instructions.
        """
        return (
            "Analyze this clinical image and provide your assessment.\n"
            "1. Primary diagnosis (the most likely condition)\n"
            "2. Urgency level (RED = emergency/immediate referral, "
            "YELLOW = needs attention within 24-48 hours, GREEN = minor treat locally)\n"
            "3. Confidence (0-100%)\n"
            "4. Top 3 differential diagnoses\n\n"
            "SKIN TONE FAIRNESS: Skin conditions present differently across "
            "Fitzpatrick skin types I-VI. Redness and inflammation may appear as "
            "darker, purple, or grey discoloration on darker skin rather than red. "
            "Look for textural changes, warmth, and scaling. Do NOT let skin tone "
            "influence your urgency assessment or confidence. If signs are hard to "
            "see due to pigmentation, note this and err on the side of referral.\n\n"
            "Format your response as JSON."
        )

    def infer(self, image_path: str, prompt: Optional[str] = None,
              fitzpatrick_type: Optional[int] = None) -> dict:
        """
        Run inference on a single image with preprocessing and calibration.

        Args:
            image_path: Path to the image file.
            prompt: Optional custom prompt (uses Trij's default if None).
            fitzpatrick_type: Optional Fitzpatrick skin type (1-6) for confidence calibration.

        Returns:
            dict with keys: 'diagnosis', 'urgency', 'confidence', 'top_differentials'
        """
        if not self._loaded:
            self.load()

        prompt = prompt or self._get_default_prompt()

        try:
            image = Image.open(image_path).convert("RGB")
            preprocessed = _apply_clahe(image)

            inputs = self.processor(
                text=prompt,
                images=preprocessed,
                return_tensors="pt"
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=256,
                    temperature=0.1,
                    do_sample=False
                )

            response = self.processor.decode(outputs[0], skip_special_tokens=True)
            result = self._parse_response(response)

            if "confidence" in result:
                raw = result["confidence"]
                result["confidence"] = _calibrate_confidence(raw, fitzpatrick_type)

            return result

        except Exception as e:
            logger.error(f"Inference failed for {image_path}: {e}")
            return {
                "diagnosis": "Error",
                "urgency": "UNKNOWN",
                "confidence": 0.0,
                "top_differentials": [],
                "error": str(e)
            }

    def _parse_response(self, response: str) -> dict:
        """Parse the model response into structured output."""
        import re
        import json

        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return {
                    "diagnosis": parsed.get("diagnosis", parsed.get("primary_diagnosis", "Unknown")),
                    "urgency": parsed.get("urgency", parsed.get("urgency_level", "UNKNOWN")),
                    "confidence": float(parsed.get("confidence", 0)),
                    "top_differentials": parsed.get("top_differentials",
                                                     parsed.get("differential_diagnosis", [])),
                }
        except json.JSONDecodeError:
            pass

        result = {
            "diagnosis": self._extract_field(response, r"(?:primary )?diagnosis[:\s]+(.+)", "Unknown"),
            "urgency": self._extract_field(response, r"urgency[:\s]+(\w+)", "UNKNOWN"),
            "confidence": self._extract_field(response, r"confidence[:\s]+(\d+)", "0"),
            "top_differentials": self._extract_list(response, r"(?:top\s*3|differential)[:\s]+(.+)", []),
        }
        if isinstance(result["confidence"], str):
            result["confidence"] = float(result["confidence"].replace("%", ""))
        return result

    @staticmethod
    def _extract_field(text: str, pattern: str, default: str) -> str:
        import re
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else default

    @staticmethod
    def _extract_list(text: str, pattern: str, default: list) -> list:
        import re
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            content = match.group(1)
            items = re.split(r'[,;]\s*', content)
            return [item.strip() for item in items if item.strip()]
        return default

    def unload(self):
        """Free model memory."""
        self.model = None
        self.processor = None
        self._loaded = False
        if self.device == "cuda":
            torch.cuda.empty_cache()


_inference_instance = None


def get_inference_engine(**kwargs) -> GemmaInferenceWrapper:
    global _inference_instance
    if _inference_instance is None:
        _inference_instance = GemmaInferenceWrapper(**kwargs)
    return _inference_instance
