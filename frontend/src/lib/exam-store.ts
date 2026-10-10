import type {
  Answer,
  Attempt,
  Exam,
  ExamSecurityPolicy,
  ExamStatus,
  McqQuestion,
  Question,
  ShortAnswerQuestion,
  WrittenQuestion,
  WebcamPolicy,
  WrittenSubmission,
} from "@exam/shared";
import { MOCK_USERS } from "@/lib/session";

export const STORE_KEY = "exam_platform_v1";

export type ExamStoreData = {
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
  answers: Answer[];
  submissions: WrittenSubmission[];
};

export const DEFAULT_WEBCAM_POLICY: WebcamPolicy = {
  required: true,
  awaySeconds: 5,
  detectSecondPerson: true,
  detectDevices: true,
  periodicSnapshotSeconds: 60,
};

export const DEFAULT_POLICY: ExamSecurityPolicy = {
  fullscreen: "allow_but_log",
  tabSwitch: "enforce",
  clipboard: "enforce",
  externalApp: "enforce",
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

const ALL_STUDENT_IDS = MOCK_USERS.filter((u) => u.role === "student").map((u) => u.userId);

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
    assignedStudentIds: ALL_STUDENT_IDS,
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
    assignedStudentIds: ALL_STUDENT_IDS,
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
    assignedStudentIds: ALL_STUDENT_IDS,
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
    assignedStudentIds: ALL_STUDENT_IDS,
    policy: camAgent(demoPolicy),
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
  const assigned = ALL_STUDENT_IDS;
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
    policy: camAgent(demoPolicy),
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
    policy: camAgent(demoPolicy),
    questionIds: [...dsMcq.map((q) => q.id), dsWritten.id],
    createdAt,
  };
  const extra = extraDemoExams(demoStart, assigned, demoPolicy, createdAt);
  return {
    exams: [
      demoExam,
      agentExam,
      osExam,
      networksExam,
      discreteExam,
      dsExam,
      ...extra.exams,
      exam,
      writtenExam,
    ],
    questions: [
      ...extra.questions,
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

/** Agent required + webcam on, all camera rules enforced. */
function camAgent(base: ExamSecurityPolicy): ExamSecurityPolicy {
  return {
    ...base,
    requireEndpointAgent: true,
    webcam: { ...DEFAULT_WEBCAM_POLICY },
    cameraPresence: "enforce",
    cameraPeople: "enforce",
    cameraDevice: "enforce",
    weights: { externalApp: 5 },
  };
}

function short(
  id: string,
  prompt: string,
  acceptedAnswers: string[],
  numeric?: { tolerance?: number },
): ShortAnswerQuestion {
  return {
    id,
    kind: "short",
    prompt,
    acceptedAnswers,
    numeric: Boolean(numeric),
    tolerance: numeric?.tolerance ?? 0,
  };
}

function mcq(id: string, prompt: string, options: string[], correctIndex: number): McqQuestion {
  const opts = options.map((text, i) => ({ id: `o${i + 1}`, text }));
  return { id, kind: "mcq", prompt, options: opts, correctOptionId: opts[correctIndex].id };
}

function trueFalse(id: string, prompt: string, answer: boolean): McqQuestion {
  return mcq(id, prompt, ["True", "False"], answer ? 0 : 1);
}

/** Additional mock exam formats: short answer, numeric, true/false, practice, scheduled, closed. */
function extraDemoExams(
  demoStart: string,
  assigned: string[],
  demoPolicy: ExamSecurityPolicy,
  createdAt: string,
): { exams: Exam[]; questions: Question[] } {
  const dbms: Question[] = [
    mcq(
      "q-demo-db-1",
      "Which normal form removes transitive dependencies?",
      ["1NF", "2NF", "3NF", "No normal form does"],
      2,
    ),
    mcq(
      "q-demo-db-2",
      "Which SQL clause filters groups after aggregation?",
      ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
      1,
    ),
    short("q-demo-db-3", "Name the SQL keyword that removes duplicate rows from a result.", [
      "distinct",
      "select distinct",
    ]),
    short("q-demo-db-4", "What does the A in ACID stand for?", ["atomicity"]),
  ];
  const aptitude: Question[] = [
    short("q-demo-apt-1", "A train covers 180 km in 3 hours. What is its speed in km/h?", ["60"], {}),
    short("q-demo-apt-2", "What is 15% of 240?", ["36"], {}),
    short(
      "q-demo-apt-3",
      "Simple interest on ₹5,000 at 8% per year for 2 years, in rupees?",
      ["800"],
      {},
    ),
    short("q-demo-apt-4", "Give √2 to two decimal places.", ["1.41"], { tolerance: 0.01 }),
  ];
  const ethics: Question[] = [
    trueFalse("q-demo-tf-1", "Sharing your login with a friend during an exam is allowed.", false),
    trueFalse("q-demo-tf-2", "A High integrity score is reviewed by a person before any decision.", true),
    trueFalse("q-demo-tf-3", "This platform records the text you copy to the clipboard.", false),
    trueFalse("q-demo-tf-4", "Every photo you save for a written answer is kept, not overwritten.", true),
    trueFalse("q-demo-tf-5", "The endpoint agent can run hidden in the background.", false),
  ];
  const python: Question[] = [
    mcq("q-demo-py-1", "What does len([1, [2, 3], 4]) return?", ["2", "3", "4", "Error"], 1),
    mcq(
      "q-demo-py-2",
      "Which of these is immutable?",
      ["list", "dict", "set", "tuple"],
      3,
    ),
    short("q-demo-py-3", "What is printed by print(7 // 2)?", ["3"], {}),
    {
      id: "q-demo-py-w1",
      kind: "written",
      prompt:
        "On paper, write a function that returns the second-largest number in a list. Photograph it.",
      attachmentUrl: null,
      ocrText: null,
    },
  ];
  const practice: Question[] = [
    mcq("q-demo-pr-1", "Practice: 2 + 2 × 2 = ?", ["8", "6", "4", "2"], 1),
    short("q-demo-pr-2", "Practice: type the word 'ready' to finish.", ["ready"]),
  ];
  const archFinal: Question[] = [
    mcq(
      "q-demo-arch-1",
      "Pipelining mainly improves:",
      ["Latency of one instruction", "Instruction throughput", "Disk capacity", "Cache size"],
      1,
    ),
  ];
  const closed: Question[] = [
    mcq("q-demo-intro-1", "Which keyword defines a function in Python?", ["func", "def", "lambda only", "fn"], 1),
  ];
  const webcamQuiz: Question[] = [
    mcq("q-demo-cam-1", "Which layer of the OSI model handles routing?", ["Data link", "Network", "Transport", "Session"], 1),
    mcq("q-demo-cam-2", "HTTP status 404 means:", ["Server error", "Moved permanently", "Not found", "Unauthorized"], 2),
    short("q-demo-cam-3", "What port does HTTPS use by default?", ["443"], {}),
  ];
  const cyber: Question[] = [
    mcq("q-cw-sec-1", "Which attack tricks a user into revealing credentials on a fake site?", ["Phishing", "SQL injection", "Buffer overflow", "DDoS"], 0),
    mcq("q-cw-sec-2", "HTTPS protects data in transit mainly with:", ["TLS encryption", "Base64 encoding", "A firewall", "Two monitors"], 0),
    mcq("q-cw-sec-3", "A salted hash defends best against:", ["Rainbow-table attacks", "Phishing", "Shoulder surfing", "Power outages"], 0),
    short("q-cw-sec-4", "What does the 'A' in the CIA triad stand for?", ["availability"]),
  ];
  const ml: Question[] = [
    mcq("q-cw-ml-1", "Overfitting means the model:", ["Fits training data but generalises poorly", "Is too simple", "Has no parameters", "Uses only test data"], 0),
    mcq("q-cw-ml-2", "Which metric suits an imbalanced binary classifier best?", ["F1 score", "Accuracy only", "Mean squared error", "R squared"], 0),
    short("q-cw-ml-3", "A model gets 45 of 50 correct. Accuracy in percent?", ["90"], {}),
    short("q-cw-ml-4", "k-fold cross-validation with k = 5 trains how many models?", ["5"], {}),
  ];
  const compiler: Question[] = [
    mcq("q-cw-cd-1", "Which phase turns characters into tokens?", ["Lexical analysis", "Parsing", "Code generation", "Linking"], 0),
    mcq("q-cw-cd-2", "An LL(1) parser is:", ["Top-down", "Bottom-up", "Not a parser", "A linker"], 0),
    short("q-cw-cd-3", "Name the data structure a compiler uses to store identifiers.", ["symbol table"]),
    {
      id: "q-cw-cd-w1",
      kind: "written",
      prompt: "On paper, draw the parse tree for a + b * c with usual precedence. Photograph it.",
      attachmentUrl: null,
      ocrText: null,
    },
  ];
  const strictCamAgent: ExamSecurityPolicy = {
    ...demoPolicy,
    fullscreen: "enforce",
    tabSwitch: "enforce",
    clipboard: "enforce",
    externalApp: "enforce",
    externalSearch: "enforce",
    multiWindow: "enforce",
    requireEndpointAgent: true,
    webcam: { ...DEFAULT_WEBCAM_POLICY },
    cameraPresence: "enforce",
    cameraPeople: "enforce",
    cameraDevice: "enforce",
    weights: { externalApp: 5 },
  };
  const tomorrow = new Date(Date.now() + 24 * 60 * 60_000);
  tomorrow.setMinutes(0, 0, 0);
  const lastWeek = new Date(Date.now() - 6 * 24 * 60 * 60_000).toISOString();
  const allowAll: ExamSecurityPolicy = {
    ...demoPolicy,
    fullscreen: "allow_but_log",
    tabSwitch: "allow_but_log",
    clipboard: "allow_but_log",
    externalApp: "allow_but_log",
    externalSearch: "allow_but_log",
    multiWindow: "allow_but_log",
  };
  const make = (
    id: string,
    title: string,
    type: Exam["type"],
    questions: Question[],
    extra: Partial<Exam> = {},
  ): Exam => ({
    id,
    title,
    type,
    startsAt: demoStart,
    durationMinutes: 30,
    assignedStudentIds: assigned,
    policy: { ...demoPolicy },
    questionIds: questions.map((q) => q.id),
    createdAt,
    ...extra,
  });
  return {
    exams: [
      make("ex-demo-dbms", "Database systems (MCQ + short answer)", "mcq", dbms, { durationMinutes: 30 }),
      make("ex-demo-aptitude", "Quantitative aptitude (numeric answers)", "mcq", aptitude, {
        durationMinutes: 20,
      }),
      make("ex-demo-truefalse", "Academic integrity (true / false)", "mcq", ethics, {
        durationMinutes: 10,
      }),
      make("ex-demo-python", "Python programming (MCQ + short + scan)", "mixed", python, {
        durationMinutes: 45,
      }),
      make("ex-demo-practice", "Practice quiz (log only, not scored)", "mcq", practice, {
        durationMinutes: 15,
        policy: allowAll,
      }),
      make("ex-demo-webcam", "Webcam-proctored quiz (camera required)", "mcq", webcamQuiz, {
        durationMinutes: 20,
        policy: {
          ...demoPolicy,
          webcam: { ...DEFAULT_WEBCAM_POLICY },
          cameraPresence: "enforce",
          cameraPeople: "enforce",
          cameraDevice: "enforce",
        },
      }),
      make("ex-cw-cyber", "Cybersecurity final (webcam + agent)", "mcq", cyber, {
        durationMinutes: 25,
        policy: strictCamAgent,
      }),
      make("ex-cw-ml", "Machine learning quiz (webcam + agent)", "mcq", ml, {
        durationMinutes: 20,
        policy: { ...strictCamAgent, fullscreen: "allow_but_log" },
      }),
      make("ex-cw-compiler", "Compiler design lab (webcam + agent, strict)", "mixed", compiler, {
        durationMinutes: 35,
        policy: { ...strictCamAgent, allowedApps: [] },
      }),
      make("ex-cw-dbms", "Database systems final (webcam + agent)", "mcq", dbms, {
        durationMinutes: 30,
        policy: strictCamAgent,
      }),
      make("ex-cw-aptitude", "Placement aptitude test (webcam + agent)", "mcq", aptitude, {
        durationMinutes: 20,
        policy: strictCamAgent,
      }),
      make("ex-cw-python", "Python practical (webcam + agent)", "mixed", python, {
        durationMinutes: 40,
        policy: { ...strictCamAgent, allowedApps: [] },
      }),
      make("ex-demo-arch-final", "Computer architecture final (opens tomorrow)", "mcq", archFinal, {
        startsAt: tomorrow.toISOString(),
        durationMinutes: 120,
      }),
      make("ex-demo-intro-closed", "Intro to programming (closed last week)", "mcq", closed, {
        startsAt: lastWeek,
        durationMinutes: 60,
      }),
    ],
    questions: [
      ...dbms,
      ...aptitude,
      ...ethics,
      ...python,
      ...practice,
      ...webcamQuiz,
      ...cyber,
      ...ml,
      ...compiler,
      ...archFinal,
      ...closed,
    ],
  };
}

const DEMO_EXAM_IDS = new Set([
  "ex-demo-integrity",
  "ex-demo-integrity-agent",
  "ex-demo-os",
  "ex-demo-networks",
  "ex-demo-discrete-agent",
  "ex-demo-ds-agent",
  "ex-demo-dbms",
  "ex-demo-aptitude",
  "ex-demo-truefalse",
  "ex-demo-python",
  "ex-demo-practice",
  "ex-demo-webcam",
  "ex-cw-cyber",
  "ex-cw-ml",
  "ex-cw-compiler",
  "ex-cw-dbms",
  "ex-cw-aptitude",
  "ex-cw-python",
]);

/** Demo exams that should always look scheduled (not yet open). */
const SCHEDULED_DEMO_IDS = new Set(["ex-demo-arch-final"]);

function ensureDemoLive(data: ExamStoreData): boolean {
  const now = Date.now();
  let changed = false;
  for (const exam of data.exams) {
    if (SCHEDULED_DEMO_IDS.has(exam.id) && examStatus(exam, now) !== "scheduled") {
      exam.startsAt = new Date(now + 24 * 60 * 60_000).toISOString();
      changed = true;
      continue;
    }
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
    else if (DEMO_EXAM_IDS.has(exam.id) || exam.id.startsWith("ex-seed-")) {
      existing.durationMinutes = exam.durationMinutes;
      // Demo exams follow the current seeded rules (e.g. other apps now count).
      if (DEMO_EXAM_IDS.has(exam.id)) existing.policy = exam.policy;
      // New demo accounts should see the demo exams too.
      existing.assignedStudentIds = [
        ...new Set([...existing.assignedStudentIds, ...exam.assignedStudentIds]),
      ];
    }
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

export function saveTextAnswer(attemptId: string, questionId: string, text: string): void {
  const data = loadStore();
  const idx = data.answers.findIndex(
    (a) => a.attemptId === attemptId && a.questionId === questionId,
  );
  const row: Answer = { attemptId, questionId, selectedOptionId: "", text };
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
  return MOCK_USERS.filter((u) => u.role === "student").map((u) => ({
    userId: u.userId,
    displayName: u.displayName,
    institutionalId: u.institutionalId,
    email: u.email,
  }));
}

/** Human label for the mix of question kinds in an exam. */
export function examFormatLabel(exam: Exam): string {
  const kinds = new Set(questionsForExam(exam).map((q) => q.kind));
  const parts: string[] = [];
  if (kinds.has("mcq")) parts.push("Multiple choice");
  if (kinds.has("short")) parts.push("Short answer");
  if (kinds.has("written")) parts.push("Scan answers");
  return parts.join(" + ") || "No questions yet";
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isShortAnswerCorrect(question: ShortAnswerQuestion, given: string): boolean {
  if (!given.trim()) return false;
  if (question.numeric) {
    const value = Number(given.replace(/[,₹\s]/g, ""));
    if (Number.isNaN(value)) return false;
    return question.acceptedAnswers.some(
      (a) => Math.abs(Number(a) - value) <= (question.tolerance ?? 0) + 1e-9,
    );
  }
  const norm = normalizeAnswer(given);
  return question.acceptedAnswers.some((a) => normalizeAnswer(a) === norm);
}

export type GradedItem = {
  question: Question;
  /** null for written answers, which need a person to grade them. */
  correct: boolean | null;
  given: string;
  expected: string;
};

export type AttemptResult = {
  items: GradedItem[];
  correct: number;
  gradable: number;
  percent: number;
  pendingManual: number;
};

/** Auto-grades MCQ and short answers for an attempt; written scans are left for manual review. */
export function gradeAttempt(exam: Exam, attemptId: string): AttemptResult {
  const answers = answersForAttempt(attemptId);
  const items: GradedItem[] = questionsForExam(exam).map((question) => {
    const answer = answers.find((a) => a.questionId === question.id);
    if (question.kind === "mcq") {
      const chosen = question.options.find((o) => o.id === answer?.selectedOptionId);
      const right = question.options.find((o) => o.id === question.correctOptionId);
      return {
        question,
        correct: answer ? answer.selectedOptionId === question.correctOptionId : false,
        given: chosen?.text ?? "",
        expected: right?.text ?? "",
      };
    }
    if (question.kind === "short") {
      const given = answer?.text ?? "";
      return {
        question,
        correct: isShortAnswerCorrect(question, given),
        given,
        expected: question.acceptedAnswers[0] ?? "",
      };
    }
    return { question, correct: null, given: "", expected: "" };
  });
  const gradable = items.filter((i) => i.correct !== null).length;
  const correct = items.filter((i) => i.correct === true).length;
  return {
    items,
    correct,
    gradable,
    percent: gradable ? Math.round((correct / gradable) * 100) : 0,
    pendingManual: items.length - gradable,
  };
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
