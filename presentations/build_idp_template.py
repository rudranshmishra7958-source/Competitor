"""IDP Review 1 deck.

The deck is a filled copy of IDP Review 1 template.pptx. Existing shapes
keep their positions; only text and colors change. All 52 papers sit in
the template literature table, in this one file.
"""

import copy
import importlib.util
import shutil
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

ROOT = Path(r"c:\Users\rudra\OneDrive\Desktop\Competitor")
TEMPLATE = ROOT / "IDP Review 1 template.pptx"
REVIEW = ROOT / "presentations" / "build_review1.py"

BG = RGBColor(0x0B, 0x0F, 0x14)
PANEL = RGBColor(0x12, 0x18, 0x20)
CYAN = RGBColor(0x00, 0xE5, 0xFF)
MAGENTA = RGBColor(0xFF, 0x2D, 0x95)
LIME = RGBColor(0xB6, 0xFF, 0x00)
TEXT = RGBColor(0xE8, 0xEA, 0xED)
MUTED = RGBColor(0x8B, 0x94, 0x9E)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
HEADER = RGBColor(0x00, 0x3A, 0x44)
ROW_A = RGBColor(0x12, 0x18, 0x20)
ROW_B = RGBColor(0x0E, 0x14, 0x1C)

TITLE = "Bahnschrift"
BODY = "Segoe UI"
MONO = "Cascadia Mono"

W, H = Inches(13.333), Inches(7.5)
FOOT = "BACSE291  ·  Innovative Design Project  |  First Review  |  Fall Semester 2026"


def load_review():
    spec = importlib.util.spec_from_file_location("review1", REVIEW)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def set_run(run, text, font, size, color, bold=False):
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    rpr = run._r.get_or_add_rPr()
    latin = rpr.find(qn("a:latin"))
    if latin is None:
        latin = rpr.makeelement(qn("a:latin"), {})
        rpr.append(latin)
    latin.set("typeface", font)


def new_prs():
    official = Presentation(str(TEMPLATE))
    assert len(official.slides) == 8
    prs = Presentation()
    prs.slide_width = official.slide_width
    prs.slide_height = official.slide_height
    return prs


def blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def fill(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def rect(slide, x, y, w, h, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    fill(shape, color)
    return shape


def panel(slide, x, y, w, h):
    shape = rect(slide, x, y, w, h, PANEL)
    shape.line.color.rgb = CYAN
    shape.line.width = Pt(1)
    return shape


def textbox(slide, x, y, w, h, text, font, size, color, bold=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(x, y, w, h)
    frame = box.text_frame
    frame.word_wrap = True
    p = frame.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    set_run(run, text, font, size, color, bold)
    return box


def chrome(slide, number, tag):
    bg = slide.background
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG
    rect(slide, 0, 0, Inches(0.08), H, CYAN)
    rect(slide, Inches(0.35), Inches(0.28), Inches(2.1), Emu(6350), CYAN)
    textbox(slide, Inches(0.4), Inches(7.08), Inches(9.4), Inches(0.28), FOOT, BODY, 11, MUTED)
    textbox(slide, Inches(10.2), Inches(7.08), Inches(2.7), Inches(0.28),
            f"{tag}   {number}", MONO, 11, CYAN, align=PP_ALIGN.RIGHT)


def heading(slide, kicker, title):
    textbox(slide, Inches(0.4), Inches(0.38), Inches(12), Inches(0.28), kicker, MONO, 12, CYAN, True)
    textbox(slide, Inches(0.4), Inches(0.66), Inches(12.4), Inches(0.5), title, TITLE, 28, TEXT, True)


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def style_cell(cell, text, size, bold, color, bg):
    cell.text = ""
    cell.fill.solid()
    cell.fill.fore_color.rgb = bg
    cell.vertical_anchor = MSO_ANCHOR.TOP
    cell.margin_left = Inches(0.05)
    cell.margin_right = Inches(0.04)
    cell.margin_top = Inches(0.03)
    frame = cell.text_frame
    frame.word_wrap = True
    run = frame.paragraphs[0].add_run()
    set_run(run, text, BODY, size, color, bold)


def add_table(slide, rows, x, y, w, h, font, widths):
    shape = slide.shapes.add_table(len(rows), len(rows[0]), x, y, w, h)
    table = shape.table
    for i, width in enumerate(widths):
        table.columns[i].width = width
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            bold = r == 0
            color = BG if r == 0 else TEXT
            bg = CYAN if r == 0 else (ROW_A if r % 2 else ROW_B)
            style_cell(table.cell(r, c), value, font, bold, color, bg)
    return table


def clip(text, n):
    text = " ".join(str(text).split())
    return text if len(text) <= n else text[: n - 1] + "…"


def short_author(paper):
    name, year = paper[0], paper[1]
    if "," in name:
        return f"{name.split(',')[0]} et al., {year}"
    return f"{name}, {year}"


def apa(paper):
    ident = paper[4]
    if ident.startswith("http"):
        url = ident
    elif ident.startswith("10."):
        url = "https://doi.org/" + ident
    else:
        url = ident
    return f"{paper[0]} ({paper[1]}). {paper[2]}. {paper[3]}. {url}"


def find_paper(papers, needle):
    for paper in papers:
        if paper[0].startswith(needle) or needle in paper[0]:
            return paper
    raise KeyError(needle)


def slide_title(prs, number):
    s = blank(prs)
    chrome(s, number, "TITLE")
    textbox(s, Inches(0.45), Inches(0.42), Inches(12), Inches(0.28),
            "SCHOOL OF COMPUTER SCIENCE AND ENGINEERING", MONO, 13, CYAN, True)
    textbox(s, Inches(0.45), Inches(0.78), Inches(12), Inches(0.55),
            "BACSE291  ·  Innovative Design Project", TITLE, 26, TEXT, True)
    textbox(s, Inches(0.45), Inches(1.35), Inches(12), Inches(0.3),
            "Fall Semester 2026   |   First Review", BODY, 16, MUTED)
    textbox(s, Inches(0.45), Inches(1.9), Inches(12.2), Inches(0.85),
            "Privacy-bounded integrity\nfor online examinations", TITLE, 32, CYAN, True)
    textbox(s, Inches(0.45), Inches(2.9), Inches(12), Inches(0.32),
            "A shared exam website and a visible endpoint monitor.", BODY, 16, TEXT)
    textbox(s, Inches(0.45), Inches(3.35), Inches(8), Inches(0.3),
            "PROJECT ID:  ____________________", MONO, 14, LIME)
    panel(s, Inches(0.4), Inches(3.85), Inches(8.15), Inches(2.95))
    textbox(s, Inches(0.55), Inches(3.95), Inches(4), Inches(0.28), "TEAM DETAILS", MONO, 12, CYAN, True)
    rows = [["S.No", "Name", "Register Number", "School"]]
    rows += [[str(i), "", "", ""] for i in range(1, 6)]
    add_table(
        s, rows, Inches(0.55), Inches(4.3), Inches(7.85), Inches(2.35), 11,
        [Inches(0.7), Inches(2.5), Inches(2.5), Inches(2.15)],
    )
    panel(s, Inches(8.75), Inches(3.85), Inches(4.15), Inches(2.95))
    textbox(s, Inches(8.95), Inches(4.0), Inches(3.8), Inches(0.28), "GUIDE DETAILS", MONO, 12, MAGENTA, True)
    textbox(s, Inches(8.95), Inches(4.45), Inches(3.8), Inches(1.8),
            "Guide name\n\nDesignation\n\nSchool", BODY, 16, MUTED)
    return s


def slide_approval(prs, number):
    s = blank(prs)
    chrome(s, number, "APPROVAL")
    heading(s, "// 02  GUIDE APPROVAL", "Screenshot of guide approval mail")
    panel(s, Inches(0.4), Inches(1.4), Inches(12.5), Inches(2.35))
    textbox(s, Inches(0.6), Inches(2.15), Inches(12.1), Inches(0.8),
            "PASTE THE GUIDE APPROVAL MAIL HERE", MONO, 18, CYAN, True, PP_ALIGN.CENTER)
    panel(s, Inches(0.4), Inches(3.95), Inches(12.5), Inches(2.85))
    textbox(s, Inches(0.6), Inches(4.1), Inches(12), Inches(2.5),
            "Project ID:\nProject title: Privacy-bounded integrity for online examinations\n"
            "Title finalized and updated on VTOP: Yes / No\n"
            "PPT approved: Yes / No\n"
            "Meeting with guide frequently: Satisfied / Not Satisfied\n"
            "Remarks:",
            BODY, 16, TEXT)
    notes(s, "Paste the guide approval mail screenshot into the top panel before you submit. Leave Yes / No and remarks until the guide confirms them.")
    return s


def slide_brief(prs, number):
    s = blank(prs)
    chrome(s, number, "BRIEF")
    heading(s, "// 03  BRIEF DESCRIPTION", "Brief description of the project")
    textbox(s, Inches(0.4), Inches(1.3), Inches(12.4), Inches(0.55),
            "Domain: online examination integrity.     Application area: college exams taken on student devices.",
            BODY, 15, LIME)
    cards = [
        ("01", "Problem statement",
         "Colleges need integrity without making the webcam the default. Students treat biometric proctoring as a privacy breach, and a browser only knows that the exam page was left."),
        ("02", "Proposed solution",
         "One server holds the exam, the attempt, the events, and the review. A visible agent reports the foreground executable name only. A written policy scores it. A person chooses Flagged or Cleared."),
        ("03", "Expected outcome",
         "A scripted testbed, a score that a second person can reproduce, a higher score when a named app is in front, and one exam shared by two student devices and one faculty device."),
    ]
    for i, (num, title, body) in enumerate(cards):
        x = Inches(0.4 + i * 4.25)
        panel(s, x, Inches(2.05), Inches(4.05), Inches(4.6))
        textbox(s, x + Inches(0.18), Inches(2.2), Inches(1), Inches(0.4), num, MONO, 18, CYAN, True)
        textbox(s, x + Inches(0.18), Inches(2.7), Inches(3.7), Inches(0.7), title, TITLE, 18, TEXT, True)
        textbox(s, x + Inches(0.18), Inches(3.5), Inches(3.7), Inches(2.9), body, BODY, 14, TEXT)
    return s


def slide_techniques(prs, number):
    s = blank(prs)
    chrome(s, number, "TECH")
    heading(s, "// 04  KEY TECHNIQUES", "Key techniques in the domain")
    items = [
        ("01", "Lockdown browser", "Safe Exam Browser and Respondus lock the machine. A renamed process can still walk around the allow-list."),
        ("02", "Biometric proctor", "Webcam, gaze, voice, and a room scan. The body is the evidence, and the flag is often unpublished."),
        ("03", "Browser-only signal", "A page script sees tab leave, focus, and fullscreen. It does not see the other application."),
        ("04", "Endpoint telemetry", "A visible agent reports the foreground executable name, display count, and whether the network is up."),
        ("05", "Policy risk score", "The same event log always yields the same Low, Medium, or High score under a published rule version."),
        ("06", "Human decision", "Flagged or Cleared is a person’s choice. The score is evidence. It is not an automatic fail."),
    ]
    for i, (num, title, body) in enumerate(items):
        col, row = i % 3, i // 3
        x = Inches(0.4 + col * 4.25)
        y = Inches(1.4 + row * 2.7)
        panel(s, x, y, Inches(4.05), Inches(2.5))
        textbox(s, x + Inches(0.16), y + Inches(0.12), Inches(0.7), Inches(0.32), num, MONO, 14, CYAN, True)
        textbox(s, x + Inches(0.85), y + Inches(0.1), Inches(3.0), Inches(0.36), title, TITLE, 16, TEXT, True)
        textbox(s, x + Inches(0.16), y + Inches(0.6), Inches(3.75), Inches(1.7), body, BODY, 13, TEXT)
    return s


def slide_literature(prs, number, theme, rows, first=False):
    s = blank(prs)
    chrome(s, number, "LIT")
    heading(s, "// 05  LITERATURE REVIEW", f"Literature review  ·  {theme}")
    headers = ["Ref.", "Author, year", "Theme", "Technique", "Dataset / tools", "Key findings", "Limitation"]
    add_table(
        s, [headers] + rows, Inches(0.28), Inches(1.35), Inches(12.75), Inches(4.85), 10,
        [Inches(0.55), Inches(1.85), Inches(1.7), Inches(2.15), Inches(2.15), Inches(2.15), Inches(2.2)],
    )
    note = "Group papers under three themes. The full 52-paper matrix is in the appendix." if first else theme
    textbox(s, Inches(0.4), Inches(6.4), Inches(12.2), Inches(0.4), note, BODY, 12, MUTED)
    if first:
        notes(s, "These 15 rows are the spoken sample. If the panel asks for the rest, open the appendix. Fifty-two peer-reviewed papers, 38 from 2021 to 2026.")
    return s


def lit_row(ref, paper, theme):
    return [
        ref,
        short_author(paper),
        theme,
        clip(paper[6], 72),
        clip(paper[7], 72),
        clip(paper[8], 72),
        clip(paper[9], 78),
    ]


def slide_gaps(prs, number):
    s = blank(prs)
    chrome(s, number, "GAPS")
    heading(s, "// 06  RESEARCH GAPS", "Research gaps")
    gaps = [
        ("G1", "Biometric monitoring is the default, and students treat the webcam as a privacy breach.",
         "Coghlan, Miller and Paterson, 2021; Kharbat and Abu Daabes, 2021; Mutimukwe et al., 2025."),
        ("G2", "Browser focus detects leaving the page, not the other app or a chatbot.",
         "Diedenhofen and Musch, 2016; Ibrahim et al., 2023; Scarfe et al., 2024."),
        ("G3", "Commercial flags are opaque. New explainable detectors still depend on gaze and pose.",
         "Heinrich, 2025; Özseven and Esin Özseven, 2026."),
        ("G4", "Lockdown browsers are privileged and bypassable.",
         "Burgess, Ginsberg, Felten and Cohney, 2022; Mohammed and Ali, 2022."),
        ("G5", "Proctoring’s effect on cheating is not settled, so an automatic fail is not justified.",
         "Newton and Essex, 2024."),
    ]
    for i, (tag, line, cite) in enumerate(gaps):
        y = Inches(1.32 + i * 1.08)
        panel(s, Inches(0.4), y, Inches(12.5), Inches(0.98))
        textbox(s, Inches(0.55), y + Inches(0.12), Inches(0.7), Inches(0.36), tag, MONO, 16, MAGENTA, True)
        textbox(s, Inches(1.35), y + Inches(0.08), Inches(11.3), Inches(0.4), line, BODY, 14, TEXT, True)
        textbox(s, Inches(1.35), y + Inches(0.48), Inches(11.3), Inches(0.4), cite, BODY, 12, MUTED)
    notes(s, "Each gap names the papers. A second phone is outside the threat model. We do not record face, voice, keystrokes, titles, URLs, screenshots, or file contents.")
    return s


def slide_objectives(prs, number):
    s = blank(prs)
    chrome(s, number, "OBJ")
    heading(s, "// 07  OBJECTIVES", "Objectives")
    panel(s, Inches(0.4), Inches(1.3), Inches(12.5), Inches(1.15))
    textbox(s, Inches(0.55), Inches(1.4), Inches(12.2), Inches(0.28), "MAIN OBJECTIVE", MONO, 12, LIME, True)
    textbox(s, Inches(0.55), Inches(1.72), Inches(12.2), Inches(0.55),
            "Deliver a privacy-bounded integrity platform: one shared exam website and a visible endpoint monitor, scored for a human reviewer.",
            BODY, 15, TEXT)
    objs = [
        ("O1", "On a scripted testbed of at least 10 honest and cheating actions, the browser monitor records the matching event in at least 90 percent of trials."),
        ("O2", "The same event log always yields the same Low, Medium, or High score, and the same written breakdown, under a published rule version."),
        ("O3", "With the agent connected, an exam hidden while a named prohibited app is in front scores higher than the browser-only case. The payload has no title, URL, keystroke, or image."),
        ("O4", "Two student devices and one faculty device share one published exam. A high-risk session can be flagged or cleared and exported, and the file matches the on-screen score."),
    ]
    for i, (tag, line) in enumerate(objs):
        y = Inches(2.6 + i * 1.05)
        panel(s, Inches(0.4), y, Inches(12.5), Inches(0.95))
        textbox(s, Inches(0.55), y + Inches(0.22), Inches(0.7), Inches(0.4), tag, MONO, 16, LIME, True)
        textbox(s, Inches(1.35), y + Inches(0.12), Inches(11.3), Inches(0.72), line, BODY, 13, TEXT)
    notes(s, "These are outcomes, not a task list. The prototype already ingests events and writes reports. Publishing one exam across devices is what objective 4 measures.")
    return s


def slide_refs(prs, number, part, total, lines, appendix_note):
    s = blank(prs)
    chrome(s, number, "REFS")
    heading(s, "// 08  REFERENCES", f"References in APA format  ({part}/{total})")
    textbox(s, Inches(0.4), Inches(1.25), Inches(12.4), Inches(5.5), "\n\n".join(lines), BODY, 12, TEXT)
    if appendix_note:
        textbox(s, Inches(0.4), Inches(6.55), Inches(12.2), Inches(0.35),
                "The other 37 papers, with DOIs, are in the appendix.", BODY, 12, MUTED)
    return s


def build_main(papers):
    prs = new_prs()
    themes = [
        ("Surveys and commercial landscape",
         ["Heinrich", "Nigam", "Han, Nikou", "Arnò", "Khalil"],
         "Surveys"),
        ("Privacy and ethics",
         ["Coghlan", "Kharbat", "Balash", "Conijn", "Mutimukwe, Viberg, McGrath"],
         "Privacy"),
        ("Detection limits",
         ["Burgess", "Diedenhofen", "Ibrahim", "Scarfe", "Newton"],
         "Detection"),
    ]
    chosen = []
    ref = 1
    lit_slides = []
    for theme, needles, short in themes:
        rows = []
        for needle in needles:
            paper = find_paper(papers, needle)
            chosen.append(paper)
            rows.append(lit_row(f"[{ref}]", paper, short))
            ref += 1
        lit_slides.append((theme, rows))
    assert len(chosen) == 15

    slide_title(prs, 1)
    slide_approval(prs, 2)
    slide_brief(prs, 3)
    slide_techniques(prs, 4)
    for i, (theme, rows) in enumerate(lit_slides):
        slide_literature(prs, 5 + i, theme, rows, first=(i == 0))
    slide_gaps(prs, 8)
    slide_objectives(prs, 9)
    ordered = [apa(p) for p in chosen]
    slide_refs(prs, 10, 1, 2, ordered[:8], False)
    slide_refs(prs, 11, 2, 2, ordered[8:], True)
    assert len(prs.slides) == 11
    return prs


def appendix_chrome(slide, number, tag):
    chrome(slide, number, tag)


def appendix_table(slide, rows, x, y, w, h, font, widths):
    return add_table(slide, rows, x, y, w, h, font, widths)


def paper_rows(part):
    rows = [["Author and year", "Method", "Dataset or testbed", "Key parameters", "Limitation"]]
    for paper in part:
        tag = f"{paper[0]}, {paper[1]}"
        if paper[1] < 2021:
            tag += "  ·  foundational"
        rows.append([clip(tag, 80), clip(paper[6], 70), clip(paper[7], 70), clip(paper[8], 70), clip(paper[9], 80)])
    return rows


WIDTHS5 = [Inches(2.55), Inches(2.4), Inches(2.5), Inches(2.5), Inches(2.55)]


def cluster_slide(prs, number, title, part):
    s = blank(prs)
    appendix_chrome(s, number, "APPENDIX")
    heading(s, "// APPENDIX", title)
    n = len(part)
    appendix_table(
        s, paper_rows(part), Inches(0.28), Inches(1.3), Inches(12.75),
        Inches(0.36 + n * 0.62), 10, WIDTHS5,
    )
    return s


def build_appendix(papers, cluster_name):
    prs = new_prs()
    recent = sum(1 for p in papers if p[1] >= 2021)
    found = sum(1 for p in papers if p[1] < 2021)
    number = 1
    s = blank(prs)
    appendix_chrome(s, number, "APPENDIX")
    textbox(s, Inches(0.5), Inches(2.2), Inches(12), Inches(0.3), "// FULL MATRIX", MONO, 14, CYAN, True)
    textbox(s, Inches(0.5), Inches(2.6), Inches(12), Inches(0.8), "Appendix", TITLE, 40, TEXT, True)
    rect(s, Inches(0.5), Inches(3.55), Inches(2.2), Emu(12700), MAGENTA)
    textbox(s, Inches(0.5), Inches(3.8), Inches(11.5), Inches(1.4),
            f"Six comparison tables.\n{len(papers)} references.  {recent} from 2021–2026.  {found} foundational.\nBackup answers at the end.",
            BODY, 18, TEXT)

    by_cluster = {n: [p for p in papers if p[5] == n] for n in range(1, 7)}
    number += 1
    cluster_slide(prs, number, "A1   Surveys of proctoring  (1/2)", by_cluster[1][:8])
    number += 1
    s = blank(prs)
    appendix_chrome(s, number, "APPENDIX")
    heading(s, "// APPENDIX", "A1 continued  ·  A2 lockdown  ·  A3 browser signals")
    blocks = [
        ("Surveys, continued", by_cluster[1][8:]),
        ("Lockdown browsers", by_cluster[2]),
        ("Browser-only signals", by_cluster[3]),
    ]
    y = 1.25
    for label, part in blocks:
        textbox(s, Inches(0.35), Inches(y), Inches(12), Inches(0.26), label, MONO, 12, LIME, True)
        n = len(part)
        h = 0.32 + n * 0.48
        appendix_table(
            s, paper_rows(part), Inches(0.28), Inches(y + 0.28), Inches(12.75), Inches(h),
            10, WIDTHS5,
        )
        y += 0.28 + h + 0.12

    for cluster, label in (
        (4, "A4   Webcam and AI proctors"),
        (5, "A5   Privacy and ethics"),
        (6, "A6   Generative AI and answer patterns"),
    ):
        rows_src = by_cluster[cluster]
        parts = [rows_src[i:i + 8] for i in range(0, len(rows_src), 8)]
        for i, part in enumerate(parts):
            number += 1
            suffix = f"  ({i + 1}/{len(parts)})" if len(parts) > 1 else ""
            cluster_slide(prs, number, label + suffix, part)

    ordered = sorted(papers, key=lambda p: p[0].lower())
    chunks = [ordered[i:i + 12] for i in range(0, len(ordered), 12)]
    for i, part in enumerate(chunks):
        number += 1
        s = blank(prs)
        appendix_chrome(s, number, "APA")
        heading(s, "// A7", f"References  ({i + 1}/{len(chunks)})")
        lines = []
        for paper in part:
            mark = "  [foundational]" if paper[1] < 2021 else ""
            lines.append(apa(paper) + mark)
        half = (len(lines) + 1) // 2
        textbox(s, Inches(0.35), Inches(1.3), Inches(6.3), Inches(5.5), "\n\n".join(lines[:half]), BODY, 11, TEXT)
        textbox(s, Inches(6.75), Inches(1.3), Inches(6.2), Inches(5.5), "\n\n".join(lines[half:]), BODY, 11, TEXT)

    number += 1
    s = blank(prs)
    appendix_chrome(s, number, "BACKUP")
    heading(s, "// A8", "Backup answers")
    pairs = [
        ("Can you catch a second phone?", "No. A second phone is outside the threat model. Say so before anyone asks."),
        ("Is a high score guilt?", "No. The score is a reproducible reading of the log. Flagged or Cleared is a person’s decision."),
        ("What already runs?", "The prototype already ingests browser and agent events and writes a report. It is the backup, not the claim."),
        ("What does objective 4 measure?", "Exam publishing across devices. Two student devices and one faculty device share one exam, then a review is exported."),
    ]
    for i, (q, a) in enumerate(pairs):
        y = Inches(1.35 + i * 1.3)
        panel(s, Inches(0.4), y, Inches(12.5), Inches(1.15))
        textbox(s, Inches(0.6), y + Inches(0.1), Inches(12), Inches(0.35), q, TITLE, 16, CYAN, True)
        textbox(s, Inches(0.6), y + Inches(0.5), Inches(12), Inches(0.5), a, BODY, 14, TEXT)
    assert len(papers) == 52
    return prs


def set_notes(slide, text):
    notes = slide.notes_slide
    frame = notes.notes_text_frame
    if frame is not None:
        frame.text = text
        return
    for shape in notes.shapes:
        if shape.has_text_frame and shape != getattr(notes, "notes_placeholder", None):
            shape.text_frame.text = text
            return


def shape_text(shape):
    if not shape.has_text_frame:
        return ""
    return "\n".join(paragraph.text for paragraph in shape.text_frame.paragraphs)


def set_run_text(paragraph, text):
    for br in list(paragraph._p.findall(qn("a:br"))):
        paragraph._p.remove(br)
    if paragraph.runs:
        paragraph.runs[0].text = text
        for run in paragraph.runs[1:]:
            run.text = ""
        return
    paragraph.text = text


def set_lines(shape, lines):
    frame = shape.text_frame
    paragraphs = list(frame.paragraphs)
    if not paragraphs:
        frame.text = lines[0] if lines else ""
        paragraphs = list(frame.paragraphs)
    for index, line in enumerate(lines):
        if index < len(paragraphs):
            set_run_text(paragraphs[index], line)
        else:
            paragraph = frame.add_paragraph()
            paragraph.text = line
    body = frame._txBody
    for paragraph in list(body.findall(qn("a:p")))[len(lines):]:
        body.remove(paragraph)


def set_cell(cell, text):
    paragraphs = list(cell.text_frame.paragraphs)
    if paragraphs:
        set_run_text(paragraphs[0], text)
        for paragraph in paragraphs[1:]:
            set_run_text(paragraph, "")
    else:
        cell.text = text


def find_shape(slide, needle):
    for shape in slide.shapes:
        if needle in shape_text(shape):
            return shape
    raise KeyError(needle)


def duplicate_slide(prs, index):
    source = prs.slides[index]
    dest = prs.slides.add_slide(prs.slide_layouts[0])
    tree = dest.shapes._spTree
    for child in list(tree):
        if child.tag not in (qn("p:nvGrpSpPr"), qn("p:grpSpPr")):
            tree.remove(child)
    next_id = 2
    for shape in source.shapes:
        element = copy.deepcopy(shape.element)
        for mark in element.iter(qn("p:cNvPr")):
            mark.set("id", str(next_id))
            next_id += 1
        tree.append(element)
    return dest


def reorder_slides(prs, order):
    listing = prs.slides._sldIdLst
    entries = list(listing)
    for entry in entries:
        listing.remove(entry)
    for index in order:
        listing.append(entries[index])


def paint_fill(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color


def recolor_runs(shape, on_badge=None):
    if not shape.has_text_frame:
        return
    label = shape_text(shape).strip()
    for paragraph in shape.text_frame.paragraphs:
        for run in paragraph.runs:
            try:
                current = str(run.font.color.rgb)
            except Exception:
                current = ""
            for highlight in list(run._r.iter(qn("a:highlight"))):
                highlight.getparent().remove(highlight)
            kept = {"00E5FF", "E8EAED", "FFFFFF", "B6FF00", "FF2D95", "8B949E", "F2C46D", "0B0F14"}
            if label in {str(n) for n in range(1, 7)} or label in {f"O{n}" for n in range(1, 9)}:
                run.font.color.rgb = BG
            elif label in {"G1", "G2", "G3", "G4", "G5"}:
                run.font.color.rgb = WHITE
            elif current == "14285E":
                run.font.color.rgb = CYAN
            elif current in {"1F2937", "222222"}:
                run.font.color.rgb = TEXT
            elif current == "5B6472":
                run.font.color.rgb = MUTED
            elif current == "9B1B30":
                run.font.color.rgb = MAGENTA
            elif current in {"FFFF00", "FF0000"}:
                run.font.color.rgb = LIME
            elif current == "FFFFFF" and on_badge == "dark":
                run.font.color.rgb = BG
            elif current not in kept:
                run.font.color.rgb = TEXT


def recolor_shape(shape):
    try:
        current = str(shape.fill.fore_color.rgb)
    except Exception:
        current = ""
    if current == "EEF1F8":
        paint_fill(shape, PANEL)
        shape.line.color.rgb = CYAN
        shape.line.width = Pt(1.25)
    elif current == "14285E":
        paint_fill(shape, PANEL if shape.width > Inches(1.2) else CYAN)
        shape.line.color.rgb = CYAN
        shape.line.width = Pt(1.25)
    elif current == "9B1B30":
        paint_fill(shape, MAGENTA)
        shape.line.fill.background()
    recolor_runs(shape)


def recolor_table(shape):
    table = shape.table
    for row_index, row in enumerate(table.rows):
        for cell in row.cells:
            if row_index == 0:
                cell.fill.solid()
                cell.fill.fore_color.rgb = CYAN
                ink = BG
            else:
                cell.fill.solid()
                cell.fill.fore_color.rgb = ROW_A if row_index % 2 else ROW_B
                ink = TEXT
            for paragraph in cell.text_frame.paragraphs:
                for run in paragraph.runs:
                    run.font.color.rgb = ink
                    run.font.name = BODY


def recolor_slide(slide):
    background = slide.background
    background.fill.solid()
    background.fill.fore_color.rgb = BG
    for shape in slide.shapes:
        if shape.has_table:
            recolor_table(shape)
        else:
            recolor_shape(shape)
    for shape in slide.shapes:
        label = shape_text(shape).strip()
        if label in {f"O{n}" for n in range(1, 9)}:
            for run_paragraph in shape.text_frame.paragraphs:
                for run in run_paragraph.runs:
                    run.font.color.rgb = BG


def add_lower_objective(slide, new_label, new_body):
    originals = [shape for shape in slide.shapes if 4300000 <= shape.top <= 4700000]
    source_body = ""
    for shape in originals:
        text = shape_text(shape).strip()
        if text and text != "O3" and shape.width > Inches(4):
            source_body = text
    shift = 1040000
    tree = slide.shapes._spTree
    next_id = 80
    for shape in originals:
        element = copy.deepcopy(shape.element)
        for mark in element.iter(qn("p:cNvPr")):
            mark.set("id", str(next_id))
            next_id += 1
        for offset in element.iter(qn("a:off")):
            offset.set("y", str(int(offset.get("y")) + shift))
        tree.append(element)
    for shape in slide.shapes:
        if shape.top < 5000000:
            continue
        if shape_text(shape).strip() == "O3":
            set_lines(shape, [new_label])
        elif source_body and source_body in shape_text(shape):
            set_lines(shape, [new_body])


def pack_fifth_objective(slide, label, body):
    """Squeeze the four objective cards and add one more above the footer."""
    banner = find_shape(slide, "OBJECTIVES")
    if banner.height > 700000:
        banner.height = 620000
    cards = [shape for shape in slide.shapes if 2000000 < shape.top < 6300000]
    cards.sort(key=lambda shape: (shape.top, shape.left))
    rows = []
    for shape in cards:
        if not rows or shape.top - rows[-1][0].top > 400000:
            rows.append([shape])
        else:
            rows[-1].append(shape)
    start = 1720000
    pitch = 880000
    for index, row in enumerate(rows):
        base = min(shape.top for shape in row)
        y = start + index * pitch
        for shape in row:
            shape.top = y + int((shape.top - base) * 0.85)
            if shape.width > Inches(4) and shape.height > 700000:
                shape.height = 780000 if not shape_text(shape).strip() else 680000
    last = rows[-1]
    tree = slide.shapes._spTree
    next_id = 200
    for shape in last:
        element = copy.deepcopy(shape.element)
        for mark in element.iter(qn("p:cNvPr")):
            mark.set("id", str(next_id))
            next_id += 1
        for offset in element.iter(qn("a:off")):
            offset.set("y", str(int(offset.get("y")) + pitch))
        tree.append(element)
    floor = start + 4 * pitch - 200000
    ceiling = floor + pitch
    for shape in slide.shapes:
        if not floor <= shape.top <= ceiling:
            continue
        text = shape_text(shape).strip()
        if text == "O4":
            set_lines(shape, [label])
        elif text and shape.width > Inches(4):
            set_lines(shape, [body])


def rename_objective_labels(slide, mapping):
    for shape in slide.shapes:
        if shape.top > 5000000:
            continue
        label = shape_text(shape).strip()
        if label in mapping:
            set_lines(shape, [mapping[label]])


def renumber_corners(prs):
    for index, slide in enumerate(prs.slides, 1):
        for shape in slide.shapes:
            if shape_text(shape).strip().isdigit() and shape.top > 6000000:
                set_lines(shape, [str(index)])


def chunks(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]


def literature_groups(papers):
    by_cluster = {n: [paper for paper in papers if paper[5] == n] for n in range(1, 7)}
    return [
        ("Surveys of proctoring", by_cluster[1]),
        ("Privacy and ethics", by_cluster[5]),
        ("Detection", by_cluster[2] + by_cluster[3] + by_cluster[4] + by_cluster[6]),
    ]


def strip_count_labels(prs):
    needle = "( 2 or 3 slides)"
    for slide in prs.slides:
        for shape in slide.shapes:
            if not shape.has_text_frame or needle not in shape_text(shape):
                continue
            for paragraph in shape.text_frame.paragraphs:
                if needle in paragraph.text:
                    set_run_text(paragraph, paragraph.text.replace(needle, "").strip())


def trim_table_rows(shape, keep_rows):
    tbl = shape.table._tbl
    for row in list(tbl.findall(qn("a:tr")))[keep_rows:]:
        tbl.remove(row)


def fill_literature(slide, theme, rows):
    for shape in slide.shapes:
        text = shape_text(shape)
        if "Add as many" in text or text.startswith(("Theme", "Surveys", "Privacy", "Detection")):
            set_lines(shape, [theme])
        elif "Group papers" in text or "52-paper" in text or "flagship papers" in text:
            set_lines(shape, [""])
        if shape.has_table:
            table = shape.table
            width = len(table.columns)
            for row_index, values in enumerate(rows):
                if row_index >= len(table.rows):
                    break
                for col_index in range(width):
                    set_cell(table.cell(row_index, col_index), values[col_index] if col_index < len(values) else "")
            trim_table_rows(shape, len(rows))


def fill_domain(slide, title, bar_lines, cards):
    set_lines(find_shape(slide, "Brief Description"), [title])
    set_lines(find_shape(slide, "Domain:"), bar_lines)
    for needle, (name, _) in zip(
        ("Problem Statement", "Proposed Solution", "Expected Outcome"),
        cards,
    ):
        set_lines(find_shape(slide, needle), [name])
    for needle, (_, lines) in zip(
        ("What real-world problem", "What are you building", "What will the final system"),
        cards,
    ):
        set_lines(find_shape(slide, needle), lines)


def fill_objective_slide(slide, banner, items, extra):
    set_lines(find_shape(slide, "One sentence stating"), banner)
    set_lines(find_shape(slide, "Objective 1"), [items[0][1]])
    set_lines(find_shape(slide, "Objective 2"), [items[1][1]])
    set_lines(find_shape(slide, "Objective 3"), [items[2][1]])
    add_lower_objective(slide, extra[0], extra[1])
    rename_objective_labels(slide, {f"O{i + 1}": items[i][0] for i in range(3)})


def cited_papers(papers):
    needles = [
        "Coghlan",
        "Kharbat",
        "Mutimukwe",
        "Diedenhofen",
        "Ibrahim",
        "Scarfe",
        "Heinrich",
        "Özseven",
        "Burgess",
        "Mohammed",
        "Newton",
    ]
    return [find_paper(papers, needle) for needle in needles]


def write_apa_references(box, papers):
    set_lines(box, [apa(paper) for paper in papers])
    hang = int(Inches(0.3))
    for paragraph in box.text_frame.paragraphs:
        paragraph.space_before = Pt(4)
        paragraph.space_after = Pt(12)
        paragraph.line_spacing = 1.0
        props = paragraph._p.get_or_add_pPr()
        props.set("marL", str(hang))
        props.set("indent", str(-hang))
        for run in paragraph.runs:
            run.font.size = Pt(14)
            run.font.name = BODY


def fill_official(papers, cluster_name):
    groups = literature_groups(papers)
    lit_parts = [(name, part) for name, group in groups for part in chunks(group, 5)]
    ordered = [paper for _, group in groups for paper in group]
    cited = cited_papers(papers)
    ref_parts = chunks(cited, 6)
    assert len(ordered) == 52
    assert len(cited) == 11
    assert sum(len(part) for _, part in lit_parts) == 52

    dest = ROOT / "presentations" / "IDP-Review-1-Main.pptx"
    shutil.copyfile(TEMPLATE, dest)
    prs = Presentation(str(dest))
    duplicate_slide(prs, 2)
    duplicate_slide(prs, 2)
    brief_copies = [8, 9]
    duplicate_slide(prs, 6)
    duplicate_slide(prs, 6)
    plan_copies = [10, 11]
    for _ in range(len(lit_parts) - 1):
        duplicate_slide(prs, 4)
    lit_copies = list(range(12, 12 + len(lit_parts) - 1))
    for _ in range(len(ref_parts) - 1):
        duplicate_slide(prs, 7)
    ref_copies = list(range(lit_copies[-1] + 1, lit_copies[-1] + len(ref_parts)))
    # title, approval, three domain slides, techniques, literature..., gaps, objectives, two plan slides, references...
    reorder_slides(prs, [0, 1, 2, *brief_copies, 3, 4, *lit_copies, 5, 6, *plan_copies, 7, *ref_copies])
    domain_at = 2
    tech_at = 5
    lit_at = 6
    gap_at = lit_at + len(lit_parts)
    objective_at = gap_at + 1
    plan_at = objective_at + 1
    ref_at = plan_at + 2

    title = prs.slides[0]
    set_lines(find_shape(title, "Project Title"), ["Privacy-bounded integrity for online examinations"])

    approval = prs.slides[1]
    set_lines(find_shape(approval, "Project ID:"), [
        "Project ID:",
        "Project title: Privacy-bounded integrity for online examinations",
        "Title finalized and updated on VTOP: Yes / No",
        "PPT approved: Yes / No",
        "Meeting with guide frequently: Satisfied / Not Satisfied",
        "Remarks:",
    ])
    set_notes(approval, (
        "Paste the guide approval mail into the screenshot area before you submit. "
        "Leave the Yes / No lines until the guide confirms them."
    ))

    domain_slides = [
        (
            "Domain",
            [
                "Domain: online examination integrity",
                "Application area: college exams taken on student devices",
            ],
            [
                ("The setting", [
                    "Faculty publish one exam from their own device.",
                    "Students sit that same exam on their own machines.",
                    "The room is not a locked lab.",
                ]),
                ("Field default", [
                    "Commercial tools start with the webcam, gaze, and a lockdown browser.",
                    "The flag is often a score without a published rule.",
                    "Students treat that monitoring as a breach.",
                ]),
                ("The boundary", [
                    "We do not record face, voice, keystrokes, titles, URLs, screenshots, or files.",
                    "A second phone is outside the threat model.",
                    "The score is not a verdict.",
                ]),
            ],
        ),
        (
            "Proposed solution",
            [
                "One shared website, a visible agent, and a rule a person can read.",
                "Faculty publish once. Students join from other devices.",
            ],
            [
                ("Shared exam server", [
                    "One server holds the exam, the attempt, the events, and the review.",
                    "Faculty publish once. Students join from other devices.",
                    "The website is the exam, not a file on one laptop.",
                ]),
                ("Visible agent", [
                    "The student can see the agent. It does not hide.",
                    "It reports the executable name, display count, and network state.",
                    "It does not read the window title, the URL, or the keys.",
                ]),
                ("Versioned rule", [
                    "The student reads the rule before the exam starts.",
                    "The same log and the same rule version always yield the same score.",
                    "A person chooses Flagged or Cleared. The score is not an automatic fail.",
                ]),
            ],
        ),
        (
            "Expected outcome",
            [
                "A catalog that can be repeated, a score that can be argued, and a review across devices.",
                "The export matches the score on the screen.",
            ],
            [
                ("Scripted catalog", [
                    "A catalog of honest and cheating actions, not a one-off demo.",
                    "Each action has a matching event the monitor must record.",
                    "The trial can be run again and compared.",
                ]),
                ("Arguable score", [
                    "The rule is written down and versioned.",
                    "The same log always produces the same score and the same breakdown.",
                    "A reviewer can see which events fired.",
                ]),
                ("Review across devices", [
                    "Two student devices and one faculty device share one published exam.",
                    "A high-risk session can be flagged or cleared.",
                    "The export matches the score on the screen.",
                ]),
            ],
        ),
    ]
    for offset, (title, bar, cards) in enumerate(domain_slides):
        fill_domain(prs.slides[domain_at + offset], title, bar, cards)

    techniques = [
        ("[Technique 1 Name]", "Lockdown browser", "Safe Exam Browser and Respondus lock the machine. A renamed process can walk around the list."),
        ("[Technique 2 Name]", "Biometric proctor", "Webcam, gaze, and voice. The flag is often a score without a published rule."),
        ("[Technique 3 Name]", "Browser-only signal", "A page script sees tab leave and focus. It does not see the other application."),
        ("[Technique 4 Name]", "Endpoint telemetry", "A visible agent reports the foreground executable name, display count, and network state."),
        ("[Technique 5 Name]", "Policy risk score", "The same event log always yields the same Low, Medium, or High score."),
        ("[Technique 6 Name]", "Human decision", "Flagged or Cleared is a person’s choice. The score is not an automatic fail."),
    ]
    tech = prs.slides[tech_at]
    for needle, name, line in techniques:
        set_lines(find_shape(tech, needle), [name])
        # The explanation sits just under the name; match the still-placeholder line nearest that card by replacing the next unused placeholder.
    explanations = [shape for shape in tech.shapes if "What it is" in shape_text(shape)]
    for shape, (_, _, line) in zip(explanations, techniques):
        set_lines(shape, [line])

    ref = 1
    header = ["Ref.", "Author(s), Year", "Category / Theme", "Proposed Technique", "Dataset / Tools", "Key Findings", "Limitations"]
    for slide_index, (theme, part) in enumerate(lit_parts):
        rows = [header]
        for paper in part:
            rows.append([
                f"[{ref}]",
                short_author(paper),
                clip(cluster_name(paper[5]), 42),
                clip(paper[6], 70),
                clip(paper[7], 70),
                clip(paper[8], 70),
                clip(paper[9], 78),
            ])
            ref += 1
        fill_literature(prs.slides[lit_at + slide_index], theme, rows)
    assert ref == 53

    gaps = [
        ("Research Gap 1", "Biometric monitoring is the default, and students treat the webcam as a breach. Coghlan et al., 2021; Kharbat and Abu Daabes, 2021; Mutimukwe et al., 2025."),
        ("Research Gap 2", "Browser focus detects leaving the page, not the other app or a chatbot. Diedenhofen and Musch, 2016; Ibrahim et al., 2023; Scarfe et al., 2024."),
        ("Research Gap 3", "Commercial flags are opaque. Explainable detectors still depend on gaze and pose. Heinrich, 2025; Özseven and Esin Özseven, 2026."),
        ("Research Gap 4", "Lockdown browsers are privileged and bypassable. Burgess et al., 2022; Mohammed and Ali, 2022."),
        ("Research Gap 5", "Proctoring’s effect on cheating is not settled, so an automatic fail is not justified. Newton and Essex, 2024."),
    ]
    gap_slide = prs.slides[gap_at]
    for needle, line in gaps:
        set_lines(find_shape(gap_slide, needle), [line])
    set_notes(gap_slide, (
        "A second phone is outside the threat model. We do not record face, voice, keystrokes, titles, URLs, screenshots, or file contents."
    ))

    set_lines(find_shape(prs.slides[objective_at], "Objectives"), ["Objectives"])
    fill_objective_slide(
        prs.slides[objective_at],
        [
            "OBJECTIVES",
            "What this project will deliver.",
        ],
        [
            ("O1", "Develop a privacy-bounded online examination integrity platform with a shared exam website and visible endpoint monitor."),
            ("O2", "Ensure transparency by clearly disclosing what information is monitored and what information is not collected."),
            ("O3", "Detect and evaluate common suspicious activities using an adversarial catalog of honest and cheating scenarios."),
        ],
        ("O4", "Provide an auditable scoring system where risk scores are explainable, rule-based, and reviewable by a person."),
    )
    pack_fifth_objective(
        prs.slides[objective_at],
        "O5",
        "Compare and validate browser-only monitoring with agent-based monitoring and provide an auditable export of the results.",
    )
    for plan_slide in (prs.slides[plan_at], prs.slides[plan_at + 1]):
        set_lines(find_shape(plan_slide, "Objectives"), ["Plan"])
    fill_objective_slide(
        prs.slides[plan_at],
        [
            "PLAN",
            "How these objectives will be shown: a scripted catalog, a stable score, a privacy check, and one exam across devices.",
        ],
        [
            ("O1", "On a catalog of 24 scripted actions, the monitor records the matching event in at least 95 percent of trials."),
            ("O2", "Two written scoring rules, applied to the same event log, produce the two scores those rules publish. Running one rule again produces the same score and the same breakdown."),
            ("O3", "The agent’s stored event contains only the foreground executable name, the display count, and whether the network is up. The browser may also store tab leave, focus, fullscreen, clipboard actions, and a DevTools signal. An audit finds no window title, URL, keystroke, screenshot, or image."),
        ],
        ("O4", "Faculty publish one exam. Two student devices sit it. A high-risk session can be marked Flagged or Cleared, and the exported file matches the score on the screen."),
    )
    fill_objective_slide(
        prs.slides[plan_at + 1],
        [
            "PLAN, CONTINUED",
            "Disclosure, an adversarial catalog, an auditable export, and a browser-versus-agent comparison.",
        ],
        [
            ("O5", "The attempt cannot start until the student has seen a screen that states what is recorded and what is refused."),
            ("O6", "A renamed prohibited app, a second display, and the exam hidden while another app is in front each score above an honest session. A second phone is out of scope and is not claimed."),
            ("O7", "Every High score exports three things in one file: the scoring-rule version, the events that fired, and the person’s Flagged or Cleared decision."),
        ],
        ("O8", "The same hidden-exam session is scored once from the browser alone and once with the agent connected. The agent score is higher. Scoring either case again leaves that score unchanged."),
    )
    set_notes(prs.slides[objective_at], (
        "These five lines are the project objectives. The next two slides are the plan for showing them. A second phone is outside the threat model."
    ))
    set_notes(prs.slides[plan_at], (
        "These are the measurements, not the objectives. A second phone is outside the threat model and is not claimed in O6."
    ))

    for offset, group in enumerate(ref_parts):
        box = None
        for shape in prs.slides[ref_at + offset].shapes:
            if shape.has_text_frame and shape.top > 1500000 and shape.top < 2500000 and not shape_text(shape).strip().startswith("BACSE"):
                box = shape
        if box is None:
            raise RuntimeError("reference box missing")
        write_apa_references(box, group)

    strip_count_labels(prs)
    for slide in prs.slides:
        recolor_slide(slide)
    # Objective badges were maroon, so the first paint made them magenta. Turn O badges lime.
    for slide in (prs.slides[objective_at], prs.slides[plan_at], prs.slides[plan_at + 1]):
        for shape in slide.shapes:
            label = shape_text(shape).strip()
            if label not in {f"O{n}" for n in range(1, 9)}:
                continue
            for other in slide.shapes:
                if abs(other.top - shape.top) < 200000 and other.width < Inches(1.2):
                    try:
                        if str(other.fill.fore_color.rgb) in {"FF2D95", "9B1B30"}:
                            paint_fill(other, LIME)
                    except Exception:
                        continue
    renumber_corners(prs)
    prs.save(str(dest))
    return prs


def main():
    mod = load_review()
    papers = mod.live_papers()
    assert len(papers) == 52
    deck = fill_official(papers, mod.cluster_name)
    print("main", len(deck.slides), ROOT / "presentations" / "IDP-Review-1-Main.pptx")


if __name__ == "__main__":
    main()
