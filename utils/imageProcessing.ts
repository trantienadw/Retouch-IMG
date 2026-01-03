
import { Adjustments } from '../types';

export function applyAdjustments(
  originalData: ImageData,
  adjustments: Adjustments,
  filterId: string | null
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = originalData.width;
  canvas.height = originalData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(originalData, 0, 0);

  const data = new Uint8ClampedArray(originalData.data);
  const { exposure, contrast, saturation, brightness, temperature, tint, vignette } = adjustments;

  const exposureFactor = Math.pow(2, exposure / 100);
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const satFactor = 1 + (saturation / 100);
  const brightAdd = (brightness / 100) * 255;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Exposure & Brightness
    r = r * exposureFactor + brightAdd;
    g = g * exposureFactor + brightAdd;
    b = b * exposureFactor + brightAdd;

    // Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * satFactor;
    g = gray + (g - gray) * satFactor;
    b = gray + (b - gray) * satFactor;

    // Temperature & Tint
    r += (temperature / 100) * 40;
    b -= (temperature / 100) * 40;
    g += (tint / 100) * 30;

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  // Vignette
  if (vignette > 0) {
    const width = originalData.width;
    const height = originalData.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    const strength = vignette / 100;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = 1 - Math.pow(dist / maxDist, 2) * strength;

        data[i] *= factor;
        data[i + 1] *= factor;
        data[i + 2] *= factor;
      }
    }
  }

  return new ImageData(data, originalData.width, originalData.height);
}

export function getFilterCSS(filterId: string | null): string {
  switch (filterId) {
    case 'vintage': return 'sepia(0.5) contrast(1.1) brightness(0.9) saturate(0.8)';
    case 'bw': return 'grayscale(1) contrast(1.2)';
    case 'cinematic': return 'contrast(1.2) saturate(1.1) hue-rotate(-10deg) brightness(0.9)';
    case 'vivid': return 'saturate(1.8) contrast(1.1)';
    case 'matte': return 'contrast(0.8) brightness(1.1) saturate(0.9)';
    case 'sepia': return 'sepia(1) brightness(0.9)';
    case 'cool': return 'hue-rotate(180deg) saturate(0.8)';
    case 'warm': return 'sepia(0.3) saturate(1.2) brightness(1.05)';
    case 'cyberpunk': return 'hue-rotate(-30deg) saturate(2) contrast(1.3) brightness(0.8) drop-shadow(0 0 5px rgba(255,0,255,0.2))';
    default: return 'none';
  }
}
