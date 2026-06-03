export interface QualityResult {
  score: number;
  blur: number;
  exposure: number;
  resolution: number;
  width: number;
  height: number;
  issues: string[];
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const BLUR_THRESHOLD = 15;
const LOW_LIGHT_THRESHOLD = 40;
const OVEREXPOSED_THRESHOLD = 230;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

function computeLaplacianVariance(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const gray = ctx.getImageData(0, 0, w, h);
  const pixels = new Uint8Array(gray.data.buffer);
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const tl = pixels[((y - 1) * w + (x - 1)) * 4];
      const t = pixels[((y - 1) * w + x) * 4];
      const tr = pixels[((y - 1) * w + (x + 1)) * 4];
      const l = pixels[(y * w + (x - 1)) * 4];
      const c = pixels[(y * w + x) * 4];
      const r = pixels[(y * w + (x + 1)) * 4];
      const bl = pixels[((y + 1) * w + (x - 1)) * 4];
      const b = pixels[((y + 1) * w + x) * 4];
      const br = pixels[((y + 1) * w + (x + 1)) * 4];

      const laplacian = tl + t + tr + l - 8 * c + r + bl + b + br;
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return Math.sqrt(Math.max(0, variance));
}

function computeExposure(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h);
  const pixels = new Uint8Array(data.data.buffer);
  let darkPixels = 0;
  let brightPixels = 0;
  const total = w * h;

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance < LOW_LIGHT_THRESHOLD) darkPixels++;
    if (luminance > OVEREXPOSED_THRESHOLD) brightPixels++;
  }

  const darkRatio = darkPixels / total;
  const brightRatio = brightPixels / total;
  const darkPenalty = Math.max(0, darkRatio - 0.3) * 100;
  const brightPenalty = Math.max(0, brightRatio - 0.3) * 100;
  return Math.max(0, 100 - darkPenalty - brightPenalty);
}

export async function assessImageQuality(dataUrl: string): Promise<QualityResult> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const blurVal = computeLaplacianVariance(ctx, w, h);
  const exposureVal = computeExposure(ctx, w, h);

  const blurScore = Math.min(100, (blurVal / BLUR_THRESHOLD) * 100);
  const resolutionScore = w >= MIN_WIDTH && h >= MIN_HEIGHT ? 100 : Math.max(0, ((w * h) / (MIN_WIDTH * MIN_HEIGHT)) * 100);

  const score = Math.round(blurScore * 0.4 + exposureVal * 0.3 + resolutionScore * 0.3);

  const issues: string[] = [];
  if (blurVal < BLUR_THRESHOLD) issues.push("Too blurry");
  if (exposureVal < 60) issues.push(exposureVal < 40 ? "Too dark" : "Poor lighting");
  if (w < MIN_WIDTH || h < MIN_HEIGHT) issues.push("Too far away");

  return {
    score: Math.max(0, Math.min(100, score)),
    blur: Math.round(blurVal),
    exposure: Math.round(exposureVal),
    resolution: Math.round(resolutionScore),
    width: w,
    height: h,
    issues,
  };
}

export function getQualityLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
}
