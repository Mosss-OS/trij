export interface EnhancementOptions {
  clipLimit?: number;
  tileGridSize?: number;
  denoiseStrength?: number;
  gamma?: number;
}

export interface EnhancementMetadata {
  applied: boolean;
  originalBrightness: number;
  enhancedBrightness?: number;
  techniques: string[];
}

function computeBrightness(data: Uint8ClampedArray): number {
  let sum = 0;
  const n = data.length / 4;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return sum / n;
}

function applyCLAHE(
  channel: Uint8ClampedArray,
  width: number,
  height: number,
  clipLimit: number,
  tileGridSize: number,
): Uint8ClampedArray {
  const tilesX = Math.ceil(width / tileGridSize);
  const tilesY = Math.ceil(height / tileGridSize);
  const histSize = 256;

  const tileHistograms: number[][][] = [];
  const tileCdfs: number[][][] = [];

  for (let ty = 0; ty < tilesY; ty++) {
    tileHistograms[ty] = [];
    tileCdfs[ty] = [];
    for (let tx = 0; tx < tilesX; tx++) {
      const hist = new Array(histSize).fill(0);
      const xStart = tx * tileGridSize;
      const yStart = ty * tileGridSize;
      const xEnd = Math.min(xStart + tileGridSize, width);
      const yEnd = Math.min(yStart + tileGridSize, height);

      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const idx = y * width + x;
          hist[channel[idx]]++;
        }
      }

      let clip = 0;
      const avg = ((xEnd - xStart) * (yEnd - yStart)) / histSize;
      for (let i = 0; i < histSize; i++) {
        if (hist[i] > avg * clipLimit) {
          clip += hist[i] - avg * clipLimit;
          hist[i] = Math.round(avg * clipLimit);
        }
      }

      const redist = Math.round(clip / histSize);
      for (let i = 0; i < histSize; i++) {
        hist[i] += redist;
      }

      const cdf = new Array(histSize).fill(0);
      cdf[0] = hist[0];
      for (let i = 1; i < histSize; i++) {
        cdf[i] = cdf[i - 1] + hist[i];
      }
      const totalPixels = (xEnd - xStart) * (yEnd - yStart);
      for (let i = 0; i < histSize; i++) {
        cdf[i] = Math.round((cdf[i] * (histSize - 1)) / totalPixels);
      }

      tileHistograms[ty][tx] = hist;
      tileCdfs[ty][tx] = cdf;
    }
  }

  const result = new Uint8ClampedArray(channel.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tx = Math.min(Math.floor(x / tileGridSize), tilesX - 1);
      const ty = Math.min(Math.floor(y / tileGridSize), tilesY - 1);
      const value = channel[y * width + x];

      if (tx === 0 && ty === 0) {
        result[y * width + x] = tileCdfs[0][0][value];
      } else if (tx === 0) {
        const wy = (y - ty * tileGridSize) / tileGridSize;
        const topVal = tileCdfs[ty][0][value];
        const bottomVal = tileCdfs[Math.min(ty + 1, tilesY - 1)][0][value];
        result[y * width + x] = Math.round(topVal * (1 - wy) + bottomVal * wy);
      } else if (ty === 0) {
        const wx = (x - tx * tileGridSize) / tileGridSize;
        const leftVal = tileCdfs[0][tx][value];
        const rightVal = tileCdfs[0][Math.min(tx + 1, tilesX - 1)][value];
        result[y * width + x] = Math.round(leftVal * (1 - wx) + rightVal * wx);
      } else {
        const wx = (x - tx * tileGridSize) / tileGridSize;
        const wy = (y - ty * tileGridSize) / tileGridSize;
        const tl = tileCdfs[ty][tx][value];
        const tr = tileCdfs[ty][Math.min(tx + 1, tilesX - 1)][value];
        const bl = tileCdfs[Math.min(ty + 1, tilesY - 1)][tx][value];
        const br = tileCdfs[Math.min(ty + 1, tilesY - 1)][Math.min(tx + 1, tilesX - 1)][value];
        const top = tl * (1 - wx) + tr * wx;
        const bottom = bl * (1 - wx) + br * wx;
        result[y * width + x] = Math.round(top * (1 - wy) + bottom * wy);
      }
    }
  }

  return result;
}

function applyDenoise(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length);
  const half = Math.min(Math.max(Math.round(strength), 1), 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let weightSum = 0;
        const centerVal = data[(y * width + x) * 4 + c];

        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;

            const neighborVal = data[(ny * width + nx) * 4 + c];
            const spatialDist = Math.sqrt(dx * dx + dy * dy);
            const intensityDiff = Math.abs(neighborVal - centerVal);

            const w = Math.exp(-(spatialDist * spatialDist) / (2 * 1.5 * 1.5)) *
              Math.exp(-(intensityDiff * intensityDiff) / (2 * 30 * 30));

            sum += neighborVal * w;
            weightSum += w;
          }
        }

        result[(y * width + x) * 4 + c] = weightSum > 0
          ? Math.round(sum / weightSum)
          : centerVal;
      }
      result[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }

  return result;
}

function applyGamma(data: Uint8ClampedArray, gamma: number): Uint8ClampedArray {
  const inv = 1 / gamma;
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * Math.pow(i / 255, inv));
  }

  const result = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    result[i] = lut[data[i]];
    result[i + 1] = lut[data[i + 1]];
    result[i + 2] = lut[data[i + 2]];
    result[i + 3] = data[i + 3];
  }
  return result;
}

export function enhanceImage(
  dataUrl: string,
  options: EnhancementOptions = {},
): Promise<{ result: string; metadata: EnhancementMetadata }> {
  const { clipLimit = 3, tileGridSize = 8, denoiseStrength = 2, gamma = 1.2 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, w, h);
        const originalBrightness = computeBrightness(imageData.data);

        if (originalBrightness >= 80) {
          resolve({
            result: dataUrl,
            metadata: { applied: false, originalBrightness, techniques: [] },
          });
          return;
        }

        const pixels = new Uint8ClampedArray(imageData.data);

        const rChannel = new Uint8ClampedArray(w * h);
        const gChannel = new Uint8ClampedArray(w * h);
        const bChannel = new Uint8ClampedArray(w * h);
        for (let i = 0; i < w * h; i++) {
          rChannel[i] = pixels[i * 4];
          gChannel[i] = pixels[i * 4 + 1];
          bChannel[i] = pixels[i * 4 + 2];
        }

        const rEq = applyCLAHE(rChannel, w, h, clipLimit, tileGridSize);
        const gEq = applyCLAHE(gChannel, w, h, clipLimit, tileGridSize);
        const bEq = applyCLAHE(bChannel, w, h, clipLimit, tileGridSize);

        const eqData = new Uint8ClampedArray(pixels.length);
        for (let i = 0; i < w * h; i++) {
          eqData[i * 4] = rEq[i];
          eqData[i * 4 + 1] = gEq[i];
          eqData[i * 4 + 2] = bEq[i];
          eqData[i * 4 + 3] = pixels[i * 4 + 3];
        }

        const denoised = applyDenoise(eqData, w, h, denoiseStrength);
        const gammaCorrected = applyGamma(denoised, gamma);

        imageData.data.set(gammaCorrected);
        ctx.putImageData(imageData, 0, 0);

        const enhancedBrightness = computeBrightness(gammaCorrected);
        const enhancedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

        resolve({
          result: enhancedDataUrl,
          metadata: {
            applied: true,
            originalBrightness: Math.round(originalBrightness),
            enhancedBrightness: Math.round(enhancedBrightness),
            techniques: ["clahe", "denoise", "gamma"],
          },
        });
      } catch (err) {
        resolve({
          result: dataUrl,
          metadata: { applied: false, originalBrightness: 0, techniques: [] },
        });
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for enhancement"));
    img.src = dataUrl;
  });
}

export function isLowLight(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      const brightness = computeBrightness(data.data);
      resolve(brightness < 80);
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}
