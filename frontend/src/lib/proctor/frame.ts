/** Captures one JPEG still from the live video. Only these stills ever leave the device. */
export function captureJpeg(video: HTMLVideoElement, maxWidth = 640, quality = 0.7): Promise<Blob | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return Promise.resolve(null);
  const scale = Math.min(1, maxWidth / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));
}

/** Tiny luma fingerprint used to spot a covered (dark) or frozen camera. */
export class FrameProbe {
  private canvas = document.createElement("canvas");
  private previous: Uint8ClampedArray | null = null;

  constructor(private size = 16) {
    this.canvas.width = size;
    this.canvas.height = size;
  }

  sample(video: HTMLVideoElement): { dark: boolean; frozen: boolean } {
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !video.videoWidth) return { dark: false, frozen: false };
    ctx.drawImage(video, 0, 0, this.size, this.size);
    const { data } = ctx.getImageData(0, 0, this.size, this.size);
    let total = 0;
    let diff = 0;
    for (let i = 0; i < data.length; i += 4) {
      const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      total += luma;
      if (this.previous) diff += Math.abs(luma - this.previous[i]);
    }
    const pixels = data.length / 4;
    const lumaOnly = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      lumaOnly[i] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    const frozen = this.previous !== null && diff / pixels < 0.15;
    this.previous = lumaOnly;
    return { dark: total / pixels < 18, frozen };
  }
}

const VIRTUAL_CAMERA = /obs|virtual|manycam|snap camera|xsplit|droidcam|epoccam|ndi|camtwist|splitcam/i;

export function looksVirtual(label: string): boolean {
  return VIRTUAL_CAMERA.test(label);
}
