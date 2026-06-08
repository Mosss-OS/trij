"""
Wrapper for Gemma 4 inference that matches Trij's triage pipeline.
"""

import torch
import logging
from PIL import Image
from typing import Optional

logger = logging.getLogger(__name__)

class GemmaInferenceWrapper:
    """
    Wraps Gemma 4 model inference to match Trij's production triage pipeline.
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
    
    def infer(self, image_path: str, prompt: Optional[str] = None) -> dict:
        """
        Run inference on a single image.
        
        Args:
            image_path: Path to the image file.
            prompt: Optional custom prompt (uses Trij's default if None).
            
        Returns:
            dict with keys: 'diagnosis', 'urgency', 'confidence', 'top_differentials'
        """
        if not self._loaded:
            self.load()
        
        default_prompt = (
            "Analyze this clinical image and provide:\n"
            "1. Primary diagnosis\n"
            "2. Urgency level (RED/YELLOW/GREEN)\n"
            "3. Confidence (0-100%)\n"
            "4. Top 3 differential diagnoses\n"
            "Format your response as JSON."
        )
        prompt = prompt or default_prompt
        
        try:
            image = Image.open(image_path).convert("RGB")
            inputs = self.processor(
                text=prompt,
                images=image,
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
            
            # Parse the response to extract structured data
            result = self._parse_response(response)
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
        
        # Try to parse as JSON first
        try:
            # Find JSON block in response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
        
        # Fallback: extract fields using regex
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

# Singleton instance for reuse
_inference_instance = None

def get_inference_engine(**kwargs) -> GemmaInferenceWrapper:
    global _inference_instance
    if _inference_instance is None:
        _inference_instance = GemmaInferenceWrapper(**kwargs)
    return _inference_instance