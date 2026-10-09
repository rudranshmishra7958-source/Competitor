import {
  FaceDetector,
  FilesetResolver,
  ObjectDetector,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

/** On-device models. Everything is served from this app's origin (see scripts/setup-vision.mjs). */
export type VisionModels = {
  face: FaceDetector;
  pose: PoseLandmarker;
  objects: ObjectDetector | null;
};

let loading: Promise<VisionModels> | null = null;

export function loadVision(): Promise<VisionModels> {
  if (!loading) {
    loading = (async () => {
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const [face, pose, objects] = await Promise.all([
        FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/blaze_face_short_range.tflite", delegate: "CPU" },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        }),
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/pose_landmarker_lite.task", delegate: "CPU" },
          runningMode: "VIDEO",
          numPoses: 2,
        }),
        ObjectDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/efficientdet_lite0.tflite", delegate: "CPU" },
          runningMode: "VIDEO",
          scoreThreshold: 0.45,
          categoryAllowlist: ["person", "cell phone", "laptop", "tv", "book"],
          maxResults: 8,
        }).catch(() => null),
      ]);
      return { face, pose, objects };
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/** Monotonic timestamps per model, as MediaPipe VIDEO mode requires strictly increasing values. */
const lastStamp = new WeakMap<object, number>();
function stamp(model: object): number {
  const now = Math.max(performance.now(), (lastStamp.get(model) ?? 0) + 1);
  lastStamp.set(model, now);
  return now;
}

export type FaceResult = { count: number; confidence: number };

export function detectFaces(models: VisionModels, video: HTMLVideoElement): FaceResult {
  const result = models.face.detectForVideo(video, stamp(models.face));
  const scores = result.detections.map((d) => d.categories[0]?.score ?? 0);
  return { count: scores.length, confidence: scores.length ? Math.max(...scores) : 0 };
}

/**
 * "Face to desk" framing: shoulders visible and sitting high enough in the frame that the
 * lower part of the picture shows the desk surface in front of the student.
 */
export type FramingResult = { framed: boolean; people: number; hint: string };

export function detectFraming(models: VisionModels, video: HTMLVideoElement): FramingResult {
  const result = models.pose.detectForVideo(video, stamp(models.pose));
  const people = result.landmarks.length;
  const pose = result.landmarks[0];
  if (!pose) return { framed: false, people, hint: "Sit in front of the camera." };
  const nose = pose[0];
  const left = pose[11];
  const right = pose[12];
  const visible = (p: { visibility?: number } | undefined) => (p?.visibility ?? 0) > 0.5;
  if (!visible(left) || !visible(right)) {
    return { framed: false, people, hint: "Move back so both shoulders are visible." };
  }
  const shoulderY = Math.max(left.y, right.y);
  if (nose && nose.y < 0.08) return { framed: false, people, hint: "Lower the camera slightly; your head is cut off." };
  if (shoulderY > 0.78) {
    return { framed: false, people, hint: "Tilt the camera down so your desk surface is visible." };
  }
  return { framed: true, people, hint: "Framing looks good: face to desk is visible." };
}

export type ObjectResult = { persons: number; devices: { label: string; score: number }[] };

const DEVICE_LABELS = new Set(["cell phone", "laptop", "tv"]);

export function detectObjects(models: VisionModels, video: HTMLVideoElement): ObjectResult | null {
  if (!models.objects) return null;
  const result = models.objects.detectForVideo(video, stamp(models.objects));
  let persons = 0;
  const devices: { label: string; score: number }[] = [];
  for (const detection of result.detections) {
    const top = detection.categories[0];
    if (!top) continue;
    if (top.categoryName === "person" && top.score >= 0.5) persons += 1;
    if (DEVICE_LABELS.has(top.categoryName)) devices.push({ label: top.categoryName, score: top.score });
  }
  return { persons, devices };
}
