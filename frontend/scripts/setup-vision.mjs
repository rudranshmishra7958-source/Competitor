// Prepares on-device webcam analysis assets under public/ (gitignored):
//  - MediaPipe WASM runtime copied from node_modules
//  - Three small official MediaPipe models downloaded once from Google's model bucket
// Nothing here runs at exam time against third parties; the browser loads these from our own origin.
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDst = join(root, "public", "mediapipe", "wasm");
const modelDst = join(root, "public", "models");

const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

const BUCKET = "https://storage.googleapis.com/mediapipe-models";
const MODELS = {
  "blaze_face_short_range.tflite": `${BUCKET}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
  "pose_landmarker_lite.task": `${BUCKET}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
  "efficientdet_lite0.tflite": `${BUCKET}/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite`,
};

async function exists(path) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

await mkdir(wasmDst, { recursive: true });
await mkdir(modelDst, { recursive: true });

for (const file of WASM_FILES) {
  const target = join(wasmDst, file);
  if (!(await exists(target))) await copyFile(join(wasmSrc, file), target);
}

for (const [file, url] of Object.entries(MODELS)) {
  const target = join(modelDst, file);
  if (await exists(target)) continue;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    console.log(`[setup-vision] downloaded ${file}`);
  } catch (error) {
    // Webcam exams show a clear "camera analysis unavailable" state if a model is missing.
    console.warn(`[setup-vision] could not download ${file}: ${error.message}`);
  }
}
console.log("[setup-vision] ready");
