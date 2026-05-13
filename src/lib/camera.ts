const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.6;

export function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export interface FrameAnalysis {
  brightness: number;
  blurScore: number;
  isBlurry: boolean;
  isTooDark: boolean;
}

export function analyzeVideoFrame(video: HTMLVideoElement): FrameAnalysis {
  const sampleSize = 200;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { brightness: 50, blurScore: 100, isBlurry: false, isTooDark: false };

  ctx.drawImage(video, 0, 0, sampleSize, sampleSize);
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const pixels = imageData.data;

  let totalBrightness = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }
  const brightness = totalBrightness / (pixels.length / 4);

  let laplacianSum = 0;
  for (let y = 1; y < sampleSize - 1; y++) {
    for (let x = 1; x < sampleSize - 1; x++) {
      const idx = (y * sampleSize + x) * 4;
      const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      const left = (pixels[idx - 4] + pixels[idx - 3] + pixels[idx - 2]) / 3;
      const right = (pixels[idx + 4] + pixels[idx + 5] + pixels[idx + 6]) / 3;
      const top = (pixels[idx - sampleSize * 4] + pixels[idx - sampleSize * 4 + 1] + pixels[idx - sampleSize * 4 + 2]) / 3;
      const bottom = (pixels[idx + sampleSize * 4] + pixels[idx + sampleSize * 4 + 1] + pixels[idx + sampleSize * 4 + 2]) / 3;
      const laplacian = Math.abs(4 * gray - left - right - top - bottom);
      laplacianSum += laplacian;
    }
  }
  const blurScore = laplacianSum / ((sampleSize - 2) * (sampleSize - 2));

  return {
    brightness,
    blurScore,
    isBlurry: blurScore < 15,
    isTooDark: brightness < 40,
  };
}
