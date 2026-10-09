import type {
  Answer,
  Attempt,
  Exam,
  ExamSecurityPolicy,
  ExamStatus,
  McqQuestion,
  Question,
  WrittenQuestion,
  WrittenSubmission,
} from "@exam/shared";

export const STORE_KEY = "exam_platform_v1";

export type ExamStoreData = {
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
  answers: Answer[];
  submissions: WrittenSubmission[];
};

export const DEFAULT_POLICY: ExamSecurityPolicy = {
  fullscreen: "allow_but_log",
  tabSwitch: "enforce",
  clipboard: "enforce",
  externalApp: "allow_but_log",
  externalSearch: "enforce",
  multiWindow: "allow_but_log",
  requireEndpointAgent: false,
  cameraOptional: true,
  randomizeQuestionOrder: true,
  randomizeOptionOrder: true,
};

export function examStatus(exam: Exam, now = Date.now()): ExamStatus {
  if (!exam.startsAt) return "draft";
  const start = Date.parse(exam.startsAt);
  const end = start + exam.durationMinutes * 60_000;
  if (now < start) return "scheduled";
  if (now < end) return "live";
  return "completed";
}

export function isAssigned(exam: Exam, userId: string): boolean {
  return exam.assignedStudentIds.includes(userId);
}

export function canEditExam(exam: Exam, now = Date.now()): boolean {
  const status = examStatus(exam, now);
  return status === "draft" || status === "scheduled";
}

function seed(): ExamStoreData {
  const q1: McqQuestion = {
    id: "q-seed-1",
    kind: "mcq",
    prompt: "Which complexity class contains sorting comparison lower bounds of Ω(n log n)?",
    options: [
      { id: "o1", text: "O(1) extra space only" },
      { id: "o2", text: "Comparison-based sorting" },
      { id: "o3", text: "Counting sort family" },
      { id: "o4", text: "NP-complete problems" },
    ],
    correctOptionId: "o2",
  };
  const q2: McqQuestion = {
    id: "q-seed-2",
    kind: "mcq",
    prompt: "A stable sort preserves the relative order of equal keys. Which is stable?",
    options: [
      { id: "o1", text: "Heapsort" },
      { id: "o2", text: "Quicksort (typical in-place)" },
      { id: "o3", text: "Mergesort" },
      { id: "o4", text: "Selection sort" },
    ],
    correctOptionId: "o3",
  };
  const startsAt = new Date(Date.now() - 10 * 60_000).toISOString();
  const exam: Exam = {
    id: "ex-seed-101",
    title: "Algorithms midterm (seed)",
    type: "mcq",
    startsAt,
    durationMinutes: 90,
    assignedStudentIds: ["u-stu-1", "u-stu-2"],
    policy: { ...DEFAULT_POLICY },
    questionIds: [q1.id, q2.id],
    createdAt: new Date().toISOString(),
  };
  const written: WrittenQuestion = {
    id: "q-seed-w1",
    kind: "written",
    prompt: "Photograph one worked example of mergesort on the array [4, 1, 3, 2]. Show merge steps.",
    attachmentUrl: null,
    ocrText: null,
  };
  const writtenExam: Exam = {
    id: "ex-seed-201",
    title: "Algorithms written (seed)",
    type: "written",
    startsAt,
    durationMinutes: 90,
    assignedStudentIds: ["u-stu-1", "u-stu-2"],
    policy: { ...DEFAULT_POLICY, cameraOptional: true },
    questionIds: [written.id],
    createdAt: new Date().toISOString(),
  };
  const demoQuestions: McqQuestion[] = [
    {
      id: "q-demo-1",
      kind: "mcq",
      prompt: "What does a High score mean in this platform?",
      options: [
        { id: "o1", text: "The student has automatically failed" },
        { id: "o2", text: "Evidence for a person to review, not a verdict" },
        { id: "o3", text: "The webcam confirmed identity" },
        { id: "o4", text: "The exam file was deleted" },
      ],
      correctOptionId: "o2",
    },
    {
      id: "q-demo-2",
      kind: "mcq",
      prompt: "Which signal can the browser record when you leave the exam tab?",
      options: [
        { id: "o1", text: "The other app’s window title" },
        { id: "o2", text: "That the exam page was hidden" },
        { id: "o3", text: "A photo of the desk" },
        { id: "o4", text: "Every key you typed" },
      ],
      correctOptionId: "o2",
    },
    {
      id: "q-demo-3",
      kind: "mcq",
      prompt: "What does the visible endpoint agent report?",
      options: [
        { id: "o1", text: "Foreground executable name, display count, and network state" },
        { id: "o2", text: "The full URL of every site" },
        { id: "o3", text: "Keystrokes and clipboard text" },
        { id: "o4", text: "A screenshot of the desktop" },
      ],
      correctOptionId: "o1",
    },
    {
      id: "q-demo-4",
      kind: "mcq",
      prompt: "A second phone during the exam is:",
      options: [
        { id: "o1", text: "Detected by the webcam by default" },
        { id: "o2", text: "Outside this threat model and not claimed" },
        { id: "o3", text: "Blocked by renaming chrome.exe" },
        { id: "o4", text: "Stored as a window title" },
      ],
      correctOptionId: "o2",
    },
    {
      id: "q-demo-5",
      kind: "mcq",
      prompt: "Who chooses Flagged or Cleared?",
      options: [
        { id: "o1", text: "The score, automatically" },
        { id: "o2", text: "A person reviewing the event log" },
        { id: "o3", text: "The student’s browser alone" },
        { id: "o4", text: "A lockdown browser vendor" },
      ],
      correctOptionId: "o2",
    },
  ];
  const demoStart = new Date(Date.now() - 2 * 60_000).toISOString();
  const demoPolicy = {
    ...DEFAULT_POLICY,
    randomizeQuestionOrder: false,
    randomizeOptionOrder: false,
    requireEndpointAgent: false,
  };
  const demoExam: Exam = {
    id: "ex-demo-integrity",
    title: "Integrity demo (5 questions)",
    type: "mcq",
    startsAt: demoStart,
    durationMinutes: 30,
    assignedStudentIds: ["u-stu-1", "u-stu-2"],
    policy: demoPolicy,
    questionIds: demoQuestions.map((q) => q.id),
    createdAt: new Date().toISOString(),
  };
  const agentExam: Exam = {
    id: "ex-demo-integrity-agent",
    title: "Integrity demo (agent required)",
    type: "mcq",
    startsAt: demoStart,
    durationMinutes: 30,
    assignedStudentIds: ["u-stu-1", "u-stu-2"],
    policy: { ...demoPolicy, requireEndpointAgent: true },
    questionIds: demoQuestions.map((q) => q.id),
    createdAt: new Date().toISOString(),
  };
  const osQuestions: McqQuestion[] = [
    {
      id: "q-demo-os-1",
      kind: "mcq",
      prompt: "Which scheduler picks the process that has been waiting the longest?",
      options: [
        { id: "o1", text: "Round robin" },
        { id: "o2", text: "First-come, first-served" },
        { id: "o3", text: "Shortest remaining time" },
        { id: "o4", text: "Multilevel feedback is never fair" },
      ],
      correctOptionId: "o2",
    },
    {
      id: "q-demo-os-2",
      kind: "mcq",
      prompt: "A context switch saves and restores:",
      options: [
        { id: "o1", text: "Only the process name" },
        { id: "o2", text: "CPU registers and program counter for the process" },
        { id: "o3", text: "The entire disk" },
        { id: "o4", text: "Another student’s answers" },
      ],
      correctOptionId: "o2",
    },
    {
      id: "q-demo-os-3",
      kind: "mcq",
      prompt: "Deadlock needs mutual exclusion, hold and wait, no preemption, and:",
      options: [
        { id: "o1", text: "Circular wait" },
        { id: "o2", text: "A webcam" },
        { id: "o3", text: "Two monitors" },
        { id: "o4", text: "Clipboard text" },
      ],
      correctOptionId: "o1",
    },
  ];
  const netMcq: McqQuestion[] = [
    {
      id: "q-demo-net-1",
      kind: "mcq",
      prompt: "TCP provides:",
      options: [
        { id: "o1", text: "Best-effort delivery with no connection" },
        { id: "o2", text: "A connection with retransmission and ordering" },
        { id: "o3", text: "Only MAC addresses" },
        { id: "o4", text: "Window titles from other apps" },
      ],
      correctOptionId: "o2",
    },
    {
      id: "q-demo-net-2",
      kind: "mcq",
      prompt: "DNS primarily maps:",
      options: [
        { id: "o1", text: "Host names to IP addresses" },
        { id: "o2", text: "Exam scores to Flagged" },
        { id: "o3", text: "Keystrokes to files" },
        { id: "o4", text: "Photos of the room to the proctor" },
      ],
      correctOptionId: "o1",
    },
  ];
  const netWritten: WrittenQuestion = {
    id: "q-demo-net-w1",
    kind: "written",
    prompt:
      "On paper, draw a three-way TCP handshake between a client and a server. Photograph the page. Label SYN, SYN-ACK, and ACK.",
    attachmentUrl: null,
    ocrText: null,
  };
  const discreteWritten: WrittenQuestion[] = [
    {
      id: "q-demo-dm-w1",
      kind: "written",
      prompt:
        "Prove that the sum of the first n odd numbers is n². Photograph your written proof.",
      attachmentUrl: null,
      ocrText: null,
    },
    {
      id: "q-demo-dm-w2",
      kind: "written",
      prompt:
        "Draw a truth table for (p → q) ∧ ¬q and state whether it is a contradiction. Photograph the table.",
      attachmentUrl: null,
      ocrText: null,
    },
  ];
  const dsMcq: McqQuestion[] = [
    {
      id: "q-demo-ds-1",
      kind: "mcq",
      prompt: "A binary search on a sorted array of n items is:",
      options: [
        { id: "o1", text: "O(n)" },
        { id: "o2", text: "O(log n)" },
        { id: "o3", text: "O(n²)" },
        { id: "o4", text: "O(1) always, including unsorted data" },
      ],
      correctOptionId: "o2",
    },
    {
      id: "q-demo-ds-2",
      kind: "mcq",
      prompt: "A stack removes items with:",
      options: [
        { id: "o1", text: "FIFO" },
        { id: "o2", text: "LIFO" },
        { id: "o3", text: "Random access by hash" },
        { id: "o4", text: "In-order traversal only" },
      ],
      correctOptionId: "o2",
    },
  ];
  const dsWritten: WrittenQuestion = {
    id: "q-demo-ds-w1",
    kind: "written",
    prompt:
      "Insert 8, 3, 10, 1, 6 into an empty binary search tree. Photograph the tree after each insert, or one final labeled sketch.",
    attachmentUrl: null,
    ocrText: null,
  };
  const assigned = ["u-stu-1", "u-stu-2"];
  const createdAt = new Date().toISOString();
  const osExam: Exam = {
    id: "ex-demo-os",
    title: "Operating systems quiz (browser only)",
    type: "mcq",
    startsAt: demoStart,
    durationMinutes: 25,
    assignedStudentIds: assigned,
    policy: { ...demoPolicy, requireEndpointAgent: false },
    questionIds: osQuestions.map((q) => q.id),
    createdAt,
  };
  const networksExam: Exam = {
    id: "ex-demo-networks",
    title: "Computer networks (MCQ + scan)",
    type: "mixed",
    startsAt: demoStart,
    durationMinutes: 40,
    assignedStudentIds: assigned,
    policy: { ...demoPolicy, requireEndpointAgent: false },
    questionIds: [...netMcq.map((q) => q.id), netWritten.id],
    createdAt,
  };
  const discreteExam: Exam = {
    id: "ex-demo-discrete-agent",
    title: "Discrete math scans (agent required)",
    type: "written",
    startsAt: demoStart,
    durationMinutes: 35,
    assignedStudentIds: assigned,
    policy: { ...demoPolicy, requireEndpointAgent: true },
    questionIds: discreteWritten.map((q) => q.id),
    createdAt,
  };
  const dsExam: Exam = {
    id: "ex-demo-ds-agent",
    title: "Data structures (MCQ + scan, agent required)",
    type: "mixed",
    startsAt: demoStart,
    durationMinutes: 40,
    assignedStudentIds: assigned,
    policy: { ...demoPolicy, requireEndpointAgent: true },
    questionIds: [...dsMcq.map((q) => q.id), dsWritten.id],
    createdAt,
  };
  return {
    exams: [demoExam, agentExam, osExam, networksExam, discreteExam, dsExam, exam, writtenExam],
    questions: [
      ...demoQuestions,
      ...osQuestions,
      ...netMcq,
      netWritten,
      ...discreteWritten,
      ...dsMcq,
      dsWritten,
      q1,
      q2,
      written,
    ],
    attempts: [],
    answers: [],
    submissions: [],
  };
}

const DEMO_EXAM_IDS = new Set([
  "ex-demo-integrity",
  "ex-demo-integrity-agent",
  "ex-demo-os",
  "ex-demo-networks",
  "ex-demo-discrete-agent",
  "ex-demo-ds-agent",
]);

function ensureDemoLive(data: ExamStoreData): boolean {
  const now = Date.now();
  let changed = false;
  for (const exam of data.exams) {
    if (!DEMO_EXAM_IDS.has(exam.id)) continue;
    if (examStatus(exam, now) === "live") continue;
    exam.startsAt = new Date(now - 2 * 60_000).toISOString();
    changed = true;
  }
  return changed;
}

function emptyStore(): ExamStoreData {
  return { exams: [], questions: [], attempts: [], answers: [], submissions: [] };
}

function migrate(data: Partial<ExamStoreData>): ExamStoreData {
  const next: ExamStoreData = {
    exams: data.exams ?? [],
    questions: data.questions ?? [],
    attempts: data.attempts ?? [],
    answers: data.answers ?? [],
    submissions: data.submissions ?? [],
  };
  const seeded = seed();
  for (const exam of seeded.exams) {
    const existing = next.exams.find((e) => e.id === exam.id);
    if (!existing) next.exams.push(exam);
    else if (DEMO_EXAM_IDS.has(exam.id)) existing.durationMinutes = exam.durationMinutes;
  }
  for (const q of seeded.questions) {
    if (!next.questions.some((x) => x.id === q.id)) next.questions.push(q);
  }
  return next;
}

export function loadStore(): ExamStoreData {
  if (typeof window === "undefined") return emptyStore();
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    const seeded = seed();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const migrated = migrate(JSON.parse(raw) as Partial<ExamStoreData>);
    ensureDemoLive(migrated);
    localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    const seeded = seed();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveStore(data: ExamStoreData): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("exam-store-changed"));
}

export function upsertExam(exam: Exam, questions: Question[]): void {
  const data = loadStore();
  const existing = data.exams.findIndex((e) => e.id === exam.id);
  const previousIds = existing >= 0 ? data.exams[existing].questionIds : [];
  if (existing >= 0) data.exams[existing] = exam;
  else data.exams.push(exam);
  data.questions = data.questions.filter((q) => !previousIds.includes(q.id));
  data.questions.push(...questions);
  saveStore(data);
}

export function getExam(id: string): Exam | undefined {
  return loadStore().exams.find((e) => e.id === id);
}

export function questionsForExam(exam: Exam): Question[] {
  const data = loadStore();
  return exam.questionIds
    .map((id) => data.questions.find((q) => q.id === id))
    .filter((q): q is Question => Boolean(q));
}

export function getAttempt(examId: string, studentId: string): Attempt | undefined {
  return loadStore().attempts.find((a) => a.examId === examId && a.studentId === studentId);
}

export function startAttempt(exam: Exam, studentId: string): Attempt {
  const data = loadStore();
  const existing = data.attempts.find((a) => a.examId === exam.id && a.studentId === studentId);
  if (existing) return existing;
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + exam.durationMinutes * 60_000);
  const attempt: Attempt = {
    id: crypto.randomUUID(),
    examId: exam.id,
    studentId,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    submittedAt: null,
  };
  data.attempts.push(attempt);
  saveStore(data);
  return attempt;
}

export function saveAnswer(attemptId: string, questionId: string, selectedOptionId: string): void {
  const data = loadStore();
  const idx = data.answers.findIndex(
    (a) => a.attemptId === attemptId && a.questionId === questionId,
  );
  const row: Answer = { attemptId, questionId, selectedOptionId };
  if (idx >= 0) data.answers[idx] = row;
  else data.answers.push(row);
  saveStore(data);
}

export function answersForAttempt(attemptId: string): Answer[] {
  return loadStore().answers.filter((a) => a.attemptId === attemptId);
}

export function submitAttempt(attemptId: string): void {
  const data = loadStore();
  const attempt = data.attempts.find((a) => a.id === attemptId);
  if (!attempt || attempt.submittedAt) return;
  attempt.submittedAt = new Date().toISOString();
  saveStore(data);
}

export function addWrittenSubmission(
  examId: string,
  studentId: string,
  questionId: string,
  imageUrl: string,
): WrittenSubmission {
  const data = loadStore();
  const row: WrittenSubmission = {
    id: crypto.randomUUID(),
    examId,
    studentId,
    questionId,
    imageUrl,
    createdAt: new Date().toISOString(),
    ocrText: null,
  };
  data.submissions.push(row);
  saveStore(data);
  return row;
}

export function submissionsForStudent(examId: string, studentId: string): WrittenSubmission[] {
  return loadStore()
    .submissions.filter((s) => s.examId === examId && s.studentId === studentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function studentRoster(): {
  userId: string;
  displayName: string;
  institutionalId: string;
  email: string;
}[] {
  return [
    {
      userId: "u-stu-1",
      displayName: "Asha Rao",
      institutionalId: "STU001",
      email: "student@college.edu",
    },
    {
      userId: "u-stu-2",
      displayName: "Kabir Singh",
      institutionalId: "STU002",
      email: "kabir@college.edu",
    },
  ];
}

/** Stable shuffle from examId+studentId so refresh does not reorder. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = copy.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    const j = (h >>> 0) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
