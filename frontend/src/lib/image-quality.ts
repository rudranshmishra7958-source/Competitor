export type ImageQuality = {
  tooDark: boolean;
  blurry: boolean;
  warnings: string[];
};

/** Downscale and JPEG-compress so localStorage stays small. */
export async function fileToDataUrl(file: File, maxEdge = 1200, quality = 0.72): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.72): string {
  return canvas.toDataURL("image/jpeg", quality);
}

export async function assessImageDataUrl(dataUrl: string): Promise<ImageQuality> {
  const img = await loadImage(dataUrl);
  const w = Math.min(160, img.width);
  const h = Math.max(1, Math.round((img.height / img.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { tooDark: false, blurry: false, warnings: [] };
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let lumSum = 0;
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.push(y);
    lumSum += y;
  }
  const mean = lumSum / gray.length;
  let lap = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lap += v * v;
      n += 1;
    }
  }
  const variance = n ? lap / n : 0;
  const tooDark = mean < 45;
  const blurry = variance < 80;
  const warnings: string[] = [];
  if (tooDark) warnings.push("This scan looks too dark. Try brighter light.");
  if (blurry) warnings.push("This scan looks blurry. Hold the page steady and retake.");
  return { tooDark, blurry, warnings };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}
