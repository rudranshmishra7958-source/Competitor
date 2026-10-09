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

Open http://localhost:3000

Demo password for every account: `password`

| Role | Login |
| --- | --- |
| Student | `STU001` |
| Second student | `STU002` |
| Proctor | `FAC001` |

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
