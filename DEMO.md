# Judge demo

The exam questions live in the browser. Sessions, events, risk, and review live on the API. Say that out loud if a judge asks about two laptops.

## Start

In two terminals, from the repo root:

```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm run dev
```

Open http://localhost:3000 for the Vigil landing page (light by default; the moon button switches to dark).

Demo password for every account: `password`

| Role | Login |
| --- | --- |
| Students | `STU001` – `STU008` (or emails such as `student@college.edu`, `meera@college.edu`) |
| Proctors | `FAC001` (`faculty@college.edu`), `FAC002` (`proctor@college.edu`) |

`STU003`–`STU008` are also used by the proctor's **Simulate student** tool, so keep `STU001`/`STU002` for live demos.

The API's `/auth/login` is required to sign in. For an offline-only demo, start the frontend with `NEXT_PUBLIC_DEMO_MODE=1`.

## What judges should notice

The score is evidence, not an automatic fail. There is no webcam. The agent, if you start it, is a visible window and reports only the program name, display count, and network state.

## Walkthrough

1. Proctor window: log in as `FAC001`. Open **Live Monitoring** and leave it open.
2. Student window (a second browser or a private window): log in as `STU001`. Open **Upcoming Exams**.
3. Choose **Integrity demo (5 questions)**. Read the before-you-start checklist. Click **Start exam**.
4. For about a minute, do a few of these:
   - Switch to another tab, then come back.
   - Select some answer text and copy it.
   - Alt+Tab away from the exam, then return.
   - Optional: press F12.
5. Leave the attempt open, or submit it.
6. Proctor window: the student row should appear within a few seconds. **Last event** is plain language. Click **Open**.
7. On the timeline, browser events are badged **Browser**. Choose **Flagged** or **Cleared**, add a note, and save.
8. Open **Reports**, open that session, and export PDF or CSV. The file should match the score on the screen.

**Integrity demo (agent required)** is the same five questions, but answers stay locked until the agent connects.

Other live mocks on Upcoming exams:

| Exam | Format | Agent |
| --- | --- | --- |
| Operating systems quiz (browser only) | Multiple choice | Optional |
| Computer networks (MCQ + scan) | Two MCQs, then photograph a TCP handshake | Optional |
| Discrete math scans (agent required) | Two photographed proofs | Required before the page opens fully |
| Data structures (MCQ + scan, agent required) | Two MCQs, then photograph a BST | Required before answers unlock |

## No-hands demo: Simulate student

On **Live Monitoring**, the **Demo tools** bar creates scripted sessions without a second browser:

| Scenario | What it shows |
| --- | --- |
| Tab hopper | Leaving the exam tab and navigating away, scored under Enforce |
| Copy / paste | Clipboard activity (never the text itself) |
| Prohibited apps + second display | Agent reports `discord.exe`, `chatgpt.exe`, two displays, plus DevTools: lands on High |
| Clean session | Low risk baseline |

A toast appears when a session reaches High. Switch between **Grid** and **Table**, filter by risk, then open a card to review. **Clear simulated** removes all simulated sessions. The API only exposes this when `DEMO_MODE` is on (the default for development).

## Results and exam formats

After submitting, students see a score ring and per-question review. Multiple-choice and short answers are graded automatically. Scans stay "awaiting faculty grading". **Past exams** shows each score.

| Exam | Format |
| --- | --- |
| Database systems | Multiple choice + typed short answers |
| Quantitative aptitude | Numeric answers (with tolerance, e.g. √2 ≈ 1.41) |
| Academic integrity | True / false |
| Python programming | Multiple choice + short answer + photographed code |
| Practice quiz | Everything Allow-but-log, so nothing is scored |
| Computer architecture final | Always opens tomorrow (shows the scheduled state) |
| Intro to programming | Closed last week (shows in Past exams) |

Faculty can add short-answer questions (text or numeric with a tolerance) in the exam builder.

## Webcam proctoring (faculty opt-in)

Faculty turn it on per exam in the exam builder (**Webcam proctoring → Require webcam**), with the away threshold (default 5 s), routine snapshot interval, and second-person / device detection. The demo exam **Webcam-proctored quiz** has it on.

Use Chrome or Edge at `http://localhost:3000` (the in-app browser pane blocks cameras).

1. Student opens the exam: consent, then a framing check that needs face + shoulders + desk surface in view for 3 seconds. A reference photo is kept.
2. During the exam a self-view sits in the top-right corner. Everything is analysed on the device (MediaPipe models served from this app).
3. Leaving the seat for more than 5 s, another person, a phone/laptop, or a covered camera shows the student a **"You are being monitored"** dialog and records an event plus a snapshot.
4. On submit or timeout the camera turns off. No video is ever stored; snapshots stay for review and are deleted after `SNAPSHOT_RETENTION_DAYS` (180).

For proctors, every report starts with a **Review priority** (0-100, Critical/High/Medium/Low) and the reasons behind it, trust signals (evidence strength, corroboration, camera uptime), a **Check these first** list with snapshots, and a snapshot timeline with a viewer that compares each frame to the reference photo. The PDF export includes the same, with images.

No webcam handy? On Live Monitoring choose **Webcam: away, phone, second person** in Demo tools.

`npm run dev` / `npm run build` download the three models once into `frontend/public/models` (`npm run setup:vision` does it manually).

## Python agent (optional)

One-time setup:

```powershell
cd C:\Users\rudra\OneDrive\Desktop\Competitor\agent
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

During the attempt, click **Connect agent**, then **Copy PowerShell launch command**, and paste it into PowerShell. A status window opens. Closing that window stops the agent.

The student id in the command is `u-stu-1` (the server id), not `STU001`. The integrity bar changes to **Agent connected**. Timeline rows from the agent are badged **Agent**.

To show an app-name event, hide the exam and bring Notepad (or another program) to the front. Names such as `discord.exe` score higher under the published rule.

## If the demo exam is missing

The exam is stored in this browser under `exam_platform_v1`. A new browser profile creates it on first load. If an old profile never picked it up, reload the student upcoming page once; missing demo exams are added automatically, and a finished 30-minute window is reopened.
