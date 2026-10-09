/**
 * Recorded demo data. Entirely fictional and static: nothing here touches the API,
 * the demo accounts, or browser storage, so every replay is identical.
 */

export type DemoSource = "browser" | "camera" | "agent";
export type SceneKind = "normal" | "away" | "phone" | "two_people" | "covered" | "looking_down";

export type EventSpec = {
  label: string;
  source: DemoSource;
  points: number;
  confidence: number;
  /** Camera still kept with this event. */
  scene?: SceneKind;
  /** Durational events (e.g. away from camera) report how long they lasted. */
  durationSec?: number;
};

/** Event catalog; weights mirror backend/app/risk.py. */
export const EVENTS = {
  tab_hidden: { label: "Left the exam tab", source: "browser", points: 1, confidence: 1 },
  window_blur: { label: "Exam window lost focus", source: "browser", points: 1, confidence: 1 },
  copy: { label: "Copied from the exam", source: "browser", points: 1, confidence: 1 },
  paste: { label: "Pasted into the exam", source: "browser", points: 2, confidence: 1 },
  devtools: { label: "Opened developer tools", source: "browser", points: 3, confidence: 1 },
  fullscreen_exit: { label: "Left fullscreen (log only)", source: "browser", points: 0, confidence: 1 },
  face_absent: { label: "Left the camera view", source: "camera", points: 2, confidence: 0.9, scene: "away" },
  multiple_people: { label: "Another person in view", source: "camera", points: 4, confidence: 0.88, scene: "two_people" },
  phone: { label: "Phone visible on camera", source: "camera", points: 3, confidence: 0.84, scene: "phone" },
  camera_blocked: { label: "Camera covered", source: "camera", points: 4, confidence: 0.86, scene: "covered" },
  virtual_camera: { label: "Virtual camera detected", source: "camera", points: 4, confidence: 0.95, scene: "normal" },
  looking_down: { label: "Looking away from screen (log only)", source: "camera", points: 0, confidence: 0.7, scene: "looking_down" },
  prohibited_app: { label: "Prohibited app in focus", source: "agent", points: 3, confidence: 1 },
  second_display: { label: "Second display connected", source: "agent", points: 2, confidence: 1 },
  agent_lost: { label: "Endpoint agent disconnected", source: "agent", points: 4, confidence: 1 },
} satisfies Record<string, EventSpec>;

export type EventKey = keyof typeof EVENTS;

export type ScriptedEvent = {
  t: number;
  key: EventKey;
  detail?: string;
  durationSec?: number;
};

export type DemoStudent = {
  id: string;
  name: string;
  roll: string;
  webcam: boolean;
  agent: boolean;
  /** Seconds at which the student has answered 1..N questions. */
  answers: number[];
  submitAt: number | null;
  events: ScriptedEvent[];
  /** What a reviewer would conclude; shown only after the exam ends. */
  verdictHint: string;
};

export type DemoScenario = {
  id: string;
  title: string;
  summary: string;
  exam: string;
  questions: number;
  durationSec: number;
  policy: string[];
  students: DemoStudent[];
};

const DURATION = 120;

export const SCENARIOS: DemoScenario[] = [
  {
    id: "mixed",
    title: "Mixed class",
    summary: "A typical sitting: one clean student, a tab hopper, a phone on camera, a helper in the room and copy-paste.",
    exam: "Computer networks · midterm",
    questions: 10,
    durationSec: DURATION,
    policy: ["Webcam required", "Tab switch: enforce", "Clipboard: enforce", "Fullscreen: log only"],
    students: [
      {
        id: "d1",
        name: "Nisha Verma",
        roll: "CN-2041",
        webcam: true,
        agent: false,
        answers: [8, 17, 28, 37, 49, 58, 70, 81, 92, 103],
        submitAt: 108,
        events: [{ t: 44, key: "fullscreen_exit" }],
        verdictHint: "Clean session. One log-only fullscreen exit, nothing scored.",
      },
      {
        id: "d2",
        name: "Aarav Mehta",
        roll: "CN-2042",
        webcam: true,
        agent: false,
        answers: [11, 24, 33, 47, 61, 74, 90, 104, 113],
        submitAt: null,
        events: [
          { t: 21, key: "tab_hidden" },
          { t: 39, key: "tab_hidden" },
          { t: 41, key: "face_absent", durationSec: 9 },
          { t: 63, key: "tab_hidden" },
          { t: 66, key: "window_blur" },
          { t: 88, key: "tab_hidden" },
        ],
        verdictHint: "Repeated tab leaves, one overlapping a 9 s absence. Worth a conversation.",
      },
      {
        id: "d3",
        name: "Ishaan Kapoor",
        roll: "CN-2043",
        webcam: true,
        agent: false,
        answers: [14, 26, 31, 34, 37, 52, 66, 79, 95, 110],
        submitAt: 115,
        events: [
          { t: 29, key: "phone", detail: "cell phone" },
          { t: 30, key: "tab_hidden" },
          { t: 33, key: "phone", detail: "cell phone" },
          { t: 72, key: "looking_down" },
        ],
        verdictHint: "Phone seen twice while the exam tab was hidden; three answers in 6 s right after. Strong evidence.",
      },
      {
        id: "d4",
        name: "Tanvi Rao",
        roll: "CN-2044",
        webcam: true,
        agent: false,
        answers: [9, 20, 35, 46, 57, 77, 84, 91, 99, 107],
        submitAt: 111,
        events: [
          { t: 52, key: "multiple_people" },
          { t: 56, key: "face_absent", durationSec: 6 },
          { t: 75, key: "multiple_people" },
        ],
        verdictHint: "A second person appeared twice. Snapshots should be checked against the reference photo.",
      },
      {
        id: "d5",
        name: "Dev Malhotra",
        roll: "CN-2045",
        webcam: true,
        agent: false,
        answers: [13, 25, 38, 50, 62, 71, 83, 97],
        submitAt: null,
        events: [
          { t: 34, key: "copy" },
          { t: 46, key: "window_blur" },
          { t: 48, key: "paste" },
          { t: 70, key: "paste" },
          { t: 96, key: "devtools" },
        ],
        verdictHint: "Copy, focus loss, two pastes and developer tools. Clipboard text is never stored, so review answers.",
      },
    ],
  },
  {
    id: "webcam",
    title: "Webcam incidents",
    summary: "A camera-required exam: an absence, a covered camera, a virtual camera and a corroborated phone.",
    exam: "Discrete mathematics · quiz",
    questions: 8,
    durationSec: DURATION,
    policy: ["Webcam required", "Away threshold: 5 s", "Second person + device detection on"],
    students: [
      {
        id: "w1",
        name: "Meghna Pillai",
        roll: "DM-1101",
        webcam: true,
        agent: false,
        answers: [10, 24, 38, 50, 64, 80, 93, 106],
        submitAt: 110,
        events: [{ t: 60, key: "looking_down" }],
        verdictHint: "Clean. A log-only glance down (rough work) does not count.",
      },
      {
        id: "w2",
        name: "Rahul Sen",
        roll: "DM-1102",
        webcam: true,
        agent: false,
        answers: [15, 30, 47, 70, 86, 101],
        submitAt: null,
        events: [
          { t: 36, key: "face_absent", durationSec: 22 },
          { t: 80, key: "face_absent", durationSec: 7 },
        ],
        verdictHint: "Left the seat for 22 s mid-exam, then again for 7 s.",
      },
      {
        id: "w3",
        name: "Zoya Qureshi",
        roll: "DM-1103",
        webcam: true,
        agent: false,
        answers: [12, 26, 41, 53, 67, 82, 96, 109],
        submitAt: 112,
        events: [
          { t: 45, key: "camera_blocked" },
          { t: 47, key: "tab_hidden" },
          { t: 58, key: "tab_hidden" },
        ],
        verdictHint: "Camera covered while the tab was hidden twice. Corroborated.",
      },
      {
        id: "w4",
        name: "Kunal Bose",
        roll: "DM-1104",
        webcam: true,
        agent: false,
        answers: [9, 21, 33, 44, 56, 69, 81, 94],
        submitAt: 99,
        events: [{ t: 2, key: "virtual_camera", detail: "OBS Virtual Camera" }],
        verdictHint: "A virtual camera fed the video from the start. Snapshots cannot be trusted.",
      },
      {
        id: "w5",
        name: "Ananya Iyer",
        roll: "DM-1105",
        webcam: true,
        agent: false,
        answers: [16, 29, 34, 37, 55, 72, 88, 104],
        submitAt: 114,
        events: [
          { t: 30, key: "phone", detail: "cell phone" },
          { t: 31, key: "tab_hidden" },
          { t: 74, key: "multiple_people" },
        ],
        verdictHint: "Phone with a hidden tab, then a second person later.",
      },
    ],
  },
  {
    id: "agent",
    title: "Agent-required exam",
    summary: "The endpoint agent reports prohibited apps, a second display and a disconnect.",
    exam: "Data structures · lab test",
    questions: 6,
    durationSec: DURATION,
    policy: ["Endpoint agent required", "External app: enforce", "Multi-window: enforce"],
    students: [
      {
        id: "a1",
        name: "Sameer Khan",
        roll: "DS-3301",
        webcam: false,
        agent: true,
        answers: [14, 32, 51, 70, 88, 104],
        submitAt: 108,
        events: [],
        verdictHint: "Clean session with the agent connected throughout.",
      },
      {
        id: "a2",
        name: "Pooja Nair",
        roll: "DS-3302",
        webcam: false,
        agent: true,
        answers: [18, 37, 49, 52, 77, 99],
        submitAt: 103,
        events: [
          { t: 42, key: "prohibited_app", detail: "chatgpt.exe" },
          { t: 43, key: "tab_hidden" },
          { t: 60, key: "prohibited_app", detail: "chatgpt.exe" },
        ],
        verdictHint: "An AI chat app in focus twice, corroborated by a hidden exam tab.",
      },
      {
        id: "a3",
        name: "Vivek Rao",
        roll: "DS-3303",
        webcam: false,
        agent: true,
        answers: [20, 41, 63, 84, 102],
        submitAt: null,
        events: [{ t: 5, key: "second_display", detail: "2 displays" }, { t: 70, key: "window_blur" }],
        verdictHint: "A second display was connected from the start.",
      },
      {
        id: "a4",
        name: "Riya Das",
        roll: "DS-3304",
        webcam: false,
        agent: true,
        answers: [16, 35, 58, 79],
        submitAt: null,
        events: [
          { t: 50, key: "agent_lost" },
          { t: 52, key: "tab_hidden" },
          { t: 81, key: "prohibited_app", detail: "discord.exe" },
        ],
        verdictHint: "The agent dropped mid-exam and Discord was in focus later.",
      },
      {
        id: "a5",
        name: "Harsh Patel",
        roll: "DS-3305",
        webcam: false,
        agent: true,
        answers: [13, 30, 45, 66, 83, 100],
        submitAt: 105,
        events: [{ t: 28, key: "copy" }, { t: 90, key: "fullscreen_exit" }],
        verdictHint: "One copy action. Low priority.",
      },
    ],
  },
  {
    id: "clean",
    title: "Clean exam",
    summary: "A well-behaved class. Shows that log-only signals are recorded but never raise priority.",
    exam: "Operating systems · weekly quiz",
    questions: 5,
    durationSec: DURATION,
    policy: ["Webcam required", "Fullscreen: log only", "Looking away: log only"],
    students: [
      { id: "c1", name: "Arjun Menon", roll: "OS-0901", webcam: true, agent: false, answers: [15, 34, 52, 71, 90], submitAt: 95, events: [], verdictHint: "Clean." },
      { id: "c2", name: "Sneha Kulkarni", roll: "OS-0902", webcam: true, agent: false, answers: [18, 40, 61, 82, 101], submitAt: 106, events: [{ t: 48, key: "looking_down" }], verdictHint: "Clean. One log-only glance." },
      { id: "c3", name: "Farhan Ali", roll: "OS-0903", webcam: true, agent: false, answers: [22, 45, 63, 87, 108], submitAt: 112, events: [{ t: 30, key: "fullscreen_exit" }], verdictHint: "Clean. One log-only fullscreen exit." },
      { id: "c4", name: "Leela George", roll: "OS-0904", webcam: true, agent: false, answers: [12, 29, 50, 68, 85], submitAt: 89, events: [], verdictHint: "Clean." },
      { id: "c5", name: "Omkar Joshi", roll: "OS-0905", webcam: true, agent: false, answers: [19, 43, 66, 91, 113], submitAt: 116, events: [{ t: 77, key: "tab_hidden" }], verdictHint: "One tab leave. Low priority; likely nothing." },
    ],
  },
];
