"""Review I decks for BACSE291. Spoken argument plus the 52-paper appendix."""

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

INK = RGBColor(0x12, 0x26, 0x3A)
IVORY = RGBColor(0xF4, 0xF0, 0xE6)
CARD = RGBColor(0xFF, 0xFC, 0xF7)
GOLD = RGBColor(0xB0, 0x89, 0x68)
TEAL = RGBColor(0x0F, 0x6E, 0x6B)
CLAY = RGBColor(0xC4, 0x5C, 0x26)
BODY = RGBColor(0x1C, 0x19, 0x17)
MUTED = RGBColor(0x5C, 0x56, 0x4E)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

W, H = Inches(13.333), Inches(7.5)


def rgb_hex(color):
    return f"{color[0]:02X}{color[1]:02X}{color[2]:02X}"


def set_run(run, text, font, size, color, bold=False):
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run._r.get_or_add_rPr().set(qn("a:latin"), font)


# Papers: author, year, title, venue, identifier, cluster, method, testbed, params, limit
# Foundational means year < 2021. Identifier is a DOI or a stable URL when no DOI was found.
PAPERS = [
    ("Alessio and Messinger", 2021,
     "Faculty and student perceptions of academic integrity in technology-assisted learning and testing",
     "Frontiers in Education, 6, 629220", "10.3389/feduc.2021.629220", 5,
     "Faculty and student survey on proctoring",
     "University respondents; mixed views",
     "Privacy invasion: 53% faculty, 70% students",
     "Documents the objection; does not design a non-biometric monitor"),
    ("Arnò, Galassi, Tommasi, Saggino and Vittorini", 2021,
     "State-of-the-art of commercial proctoring systems and their use in academic online exams",
     "International Journal of Distance Education Technologies, 19(2), 41–62",
     "10.4018/IJDET.20210401.oa3", 1,
     "Feature review of commercial systems plus two case studies",
     "29 commercial proctoring systems; automated and live exams",
     "LMS fit, lockdown, monitoring, GDPR flag, live versus automated",
     "Automated detection was unreliable; still recommends webcam support for a human"),
    ("Atoum, Chen, Liu, Hsu and Liu", 2017,
     "Automated online exam proctoring",
     "IEEE Transactions on Multimedia, 19(7), 1609–1624",
     "10.1109/TMM.2017.2656064", 4,
     "Multimodal biometric proctor: webcam, wearcam, microphone",
     "24 subjects",
     "Six visual and audio components",
     "Requires biometrics and a second camera"),
    ("Balash, Kim, Shaibekova, Fainchtein, Sherr and Aviv", 2021,
     "Examining the examiners: Students' privacy and security perceptions of online proctoring services",
     "USENIX SOUPS 2021, pp. 633–652",
     "https://www.usenix.org/conference/soups2021/presentation/balash", 5,
     "Review analysis plus student survey",
     "Browser-extension reviews and n = 102 students",
     "Identity checks, webcam, screen, browser history",
     "Students feel compelled by the institution; no alternative design"),
    ("Bergmans, Bouali, Luttikhuis and Rensink", 2021,
     "On the efficacy of online proctoring using Proctorio",
     "CSEDU 2021, pp. 279–290",
     "10.5220/0010399602790290", 4,
     "Controlled experiment with an AI proctor",
     "30 computer-science students; 6 asked to cheat",
     "Automatic flags versus a later human check",
     "The model flagged none of the six cheaters"),
    ("Burgess, Ginsberg, Felten and Cohney", 2022,
     "Watching the watchers: Bias and vulnerability in remote proctoring software",
     "USENIX Security 2022",
     "https://www.usenix.org/conference/usenixsecurity22/presentation/burgess", 2,
     "Reverse engineering of four exam suites",
     "Examplify, Exam360, Exam4, Electronic Blue Book",
     "Process allow-lists and facial checks",
     "Renaming a process bypasses the allow-list"),
    ("Butler-Henderson and Crawford", 2020,
     "A systematic review of online examinations",
     "Computers & Education, 159, 104024",
     "10.1016/j.compedu.2020.104024", 1,
     "Systematic review",
     "36 papers, 2009–2018",
     "Exam design, security, student experience",
     "Stops at 2018 and is thin on privacy"),
    ("Coghlan, Miller and Paterson", 2021,
     "Good proctor or 'Big Brother'? Ethics of online exam supervision technologies",
     "Philosophy & Technology, 34(4), 1581–1606",
     "10.1007/s13347-021-00476-1", 5,
     "Ethical analysis of supervision technologies",
     "Published systems and policy arguments",
     "Consent, proportionality, surveillance",
     "No system design follows the critique"),
    ("Conijn, Kleingeld, Matzat and Snijders", 2022,
     "The fear of big brother: The potential negative side-effects of proctored exams",
     "Journal of Computer Assisted Learning, 38(6), 1521–1534",
     "10.1111/jcal.12651", 5,
     "Four-wave multilevel survey",
     "1,760 students in 105 courses at one Dutch faculty",
     "Temptation to cheat, anxiety, difficulty, grade",
     "Proctoring raised anxiety and did not reduce temptation to cheat"),
    ("Dendir and Maxwell", 2020,
     "Cheating in online courses: Evidence from online proctoring",
     "Computers in Human Behavior Reports, 2, 100033",
     "10.1016/j.chbr.2020.100033", 6,
     "Score comparison under proctoring",
     "Online course exams before and after proctoring",
     "Score change when a proctor is added",
     "Does not open the scoring black box"),
    ("Diedenhofen and Musch", 2016,
     "PageFocus: Using paradata to detect and prevent cheating on online achievement tests",
     "Behavior Research Methods",
     "10.3758/s13428-016-0800-7", 3,
     "JavaScript page-focus detection",
     "Lab plus online samples (115 lab, 186 online; 510 online)",
     "Tab and window leave; sensitivity and specificity",
     "Knows the page was left, not which application opened"),
    ("Draaijer, Jefferies and Somers", 2018,
     "Online proctoring for remote examination: A state of play in higher education in the EU",
     "Communications in Computer and Information Science, 829, 96–108",
     "10.1007/978-3-319-97807-9_8", 1,
     "Survey of EU practice",
     "Higher-education providers in the EU",
     "Live, recorded, and automated proctoring",
     "A state-of-play survey, not a privacy-bounded design"),
    ("Erdem and Karabatak", 2025,
     "Cheating detection in online exams using deep learning and machine learning",
     "Applied Sciences, 15, 400",
     "Appl. Sci. 2025, 15, 400", 4,
     "Deep-learning and machine-learning classifiers",
     "Visual behaviour in online exams",
     "XGBoost with SHAP and LIME explanations",
     "The explanation is added after the decision, and the cues are visual"),
    ("Fidas, Belk, Constantinides, Portugal, Martins, Pietron, Pitsillides and Avouris", 2023,
     "Ensuring academic integrity and trust in online learning environments",
     "Education Sciences, 13(6), 566",
     "10.3390/educsci13060566", 4,
     "Longitudinal study of continuous identity checks",
     "TRUSTID proof of concept in tertiary settings",
     "Face embedding and voice identification",
     "Still depends on face and voice, which this project will not collect"),
    ("Golden and Kohlbeck", 2020,
     "Addressing cheating when using test bank questions in online classes",
     "Journal of Accounting Education, 52",
     "10.1016/j.jaccedu.2020.100671", 6,
     "Study of test-bank item leakage",
     "Online accounting classes",
     "Item exposure and score patterns",
     "About reused items, not about what the endpoint is doing"),
    ("Gudiño Paredes, Jasso Peña and de la Fuente Alcázar", 2021,
     "Remote proctored exams: Integrity assurance in online education?",
     "Distance Education, 42, 200–218",
     "Distance Education, 42, 200–218 (2021)", 5,
     "Mixed-methods study of remote proctoring",
     "Online graduate students",
     "Honesty, privacy, anxiety, technology",
     "Students felt watched; privacy and anxiety remained the concern"),
    ("Han, Nikou and Ayele", 2023,
     "Digital proctoring in higher education: A systematic literature review",
     "International Journal of Educational Management",
     "10.1108/ijem-12-2022-0522", 1,
     "Systematic literature review",
     "Digital-proctoring studies through 2022",
     "Privacy, ethics, bias, effectiveness",
     "Reviews the field; does not specify an open scoring rule"),
    ("Heinrich", 2025,
     "A systematic-narrative review of online proctoring systems and a case for open standards",
     "Open Praxis",
     "10.55982/openpraxis.17.3.836", 1,
     "Systematic-narrative review",
     "33 commercial online proctoring systems",
     "Biometric capture, flag types, published rules",
     "Biometrics dominate, and flags lack an open standard"),
    ("Henderson, Chung, Awdry, Mundy, Bryant, Ashford and Ryan", 2023,
     "Factors associated with online examination cheating",
     "Assessment & Evaluation in Higher Education, 48(7), 980–994",
     "10.1080/02602938.2022.2144802", 6,
     "Large post-exam self-report survey",
     "7,839 students; 216 reported cheating; one Australian university, 2021",
     "Security measure, design, conditions, demographics",
     "Cheating occurred across security measures; proctoring was incomplete"),
    ("Holden, Norris and Kuhlmeier", 2021,
     "Academic integrity in online assessment: A research review",
     "Frontiers in Education, 6, 639814",
     "10.3389/feduc.2021.639814", 1,
     "Narrative review of integrity research",
     "Studies of online higher-education assessment",
     "Causes of dishonesty; prevention and detection methods",
     "Recommends a mix of measures; privacy is named, not engineered"),
    ("Hussein, Yusuf, Deb, Fong and Naidu", 2020,
     "An evaluation of online proctoring tools",
     "Open Praxis, 12(4), 509–525",
     "10.5944/openpraxis.12.4.1113", 1,
     "Tool evaluation",
     "Commercial proctoring products",
     "Feature lists: webcam, lockdown, identity",
     "Feature lists, not a privacy-bounded design"),
    ("Hylton, Levy and Dringus", 2016,
     "Utilizing webcam-based proctoring to deter misconduct in online exams",
     "Computers & Education, 92–93, 53–63",
     "10.1016/j.compedu.2015.10.002", 4,
     "Webcam as a deterrent",
     "Online exam with and without a webcam",
     "Misconduct and the feeling of being watched",
     "Surveillance, not an explainable score"),
    ("Ibrahim, Liu, Asim, Battu, Benabderrahmane, Alhafni, Adnan et al.", 2023,
     "Perception, performance, and detectability of conversational artificial intelligence across 32 university courses",
     "Scientific Reports",
     "10.1038/s41598-023-38964-3", 6,
     "ChatGPT answers compared with student work, then run through detectors",
     "32 courses, 8 disciplines",
     "Detector accuracy; obfuscation",
     "Detectors fail, and light editing evades them"),
    ("Ilgaz and Afacan Adanır", 2020,
     "Providing online exams for online learners: Does it really matter for them?",
     "Education and Information Technologies, 25(2), 1255–1269",
     "10.1007/s10639-019-10020-6", 6,
     "Learner survey on online exams",
     "Online learners",
     "Preference for online exams and perceived fairness",
     "About whether exams matter to learners, not how to score an event"),
    ("Kharbat and Abu Daabes", 2021,
     "E-proctored exams during the COVID-19 pandemic: A close understanding",
     "Education and Information Technologies",
     "10.1007/s10639-021-10458-7", 5,
     "Mixed-methods student study",
     "About 92–106 students, June 2020",
     "Webcam practicality and privacy concern",
     "Most students called the webcam a privacy breach"),
    ("Kirsanov, Kushwah and Selvaretnam", 2025,
     "Beyond detection: How students use and hide AI in online assessments and what authentic tasks can do about it",
     "Journal of Academic Ethics",
     "10.1007/s10805-025-09691-3", 6,
     "Student survey on generative-AI use",
     "31 of 174 economics undergraduates",
     "Concealment of AI use; views on detection",
     "Students hide AI use; detection is the wrong lever"),
    ("Kofinas, Tsay and Pike", 2025,
     "The impact of generative AI on academic integrity of authentic assessments",
     "British Journal of Educational Technology, 56(6), 2522–2549",
     "10.1111/bjet.13585", 6,
     "Exploratory experiment on authentic assessment",
     "Higher-education written tasks",
     "What generative AI can reproduce",
     "Small sample; explicit written knowledge is easy for the model to redo"),
    ("Labayen, Vea, Flórez, Aginako and Sierra", 2021,
     "Online student authentication and proctoring system based on multimodal biometrics technology",
     "IEEE Access",
     "10.1109/ACCESS.2021.3079375", 4,
     "System paper: continuous multimodal biometrics",
     "SMOWL deployment; usability and privacy survey",
     "Face, voice, typing, lockdown, human review of uncertain cases",
     "Identity is biometric, and the paper is from the vendor's authors"),
    ("Lee and Fanguy", 2022,
     "Online exam proctoring technologies: Educational innovation or deterioration?",
     "British Journal of Educational Technology, 53(3), 475–490",
     "10.1111/bjet.13182", 5,
     "Qualitative case study using Foucault",
     "Large South Korean university, Safe Exam Browser and Zoom, autumn 2020",
     "Student subjectivity, trust, pedagogical relationship",
     "Shows the harm of surveillance; does not specify a bounded monitor"),
    ("Lee and Vispoel", 2025,
     "A real-time biclustering method for detecting cheating in mixed-format tests",
     "Educational and Psychological Measurement, 85(5), 956–982",
     "10.1177/00131644251333143", 6,
     "Answer-pattern biclustering",
     "Simulation on mixed-format tests",
     "Response similarity, not behaviour",
     "Detects answer copying, not the other application"),
    ("Li, Chang, Yuan and Hauptmann", 2015,
     "Massive open online proctor: Toward automating the detection of suspicious behaviors",
     "ACM CSCW, pp. 1129–1137",
     "10.1145/2675133.2675245", 4,
     "Early automated MOOC proctor",
     "Video of exam behaviour",
     "Visual cues of suspicious behaviour",
     "An early biometric line, with no published non-visual rule"),
    ("Meulmeester, Dubois, Krommenhoek-van Es et al.", 2021,
     "Medical students' perspectives on online proctoring during remote digital progress test",
     "Medical Science Educator, 31, 1773–1777",
     "10.1007/s40670-021-01420-w", 5,
     "Post-test questionnaire",
     "Medical students at one Dutch school, September 2020",
     "Invalidation from network, noise, webcam; privacy",
     "Worry about a false flag can itself change the sitting"),
    ("Milone, Cortese, Balestrieri and Pittenger", 2017,
     "The impact of proctored online exams on the educational experience",
     "Currents in Pharmacy Teaching and Learning, 9(1), 108–114",
     "10.1016/j.cptl.2016.08.037", 5,
     "Student-experience study",
     "Pharmacy students in proctored online exams",
     "Stress, fairness, technical failure",
     "Experience of surveillance, not an explainable rule"),
    ("Mohammed and Ali", 2022,
     "Cheating prevention in e-proctoring systems using secure exam browsers: A case study",
     "JITEKI, 8(4), 634–648",
     "10.26555/jiteki.v8i4.25094", 2,
     "Case study of Safe Exam Browser with Moodle",
     "One e-exam, with and without SEB; Wireshark and Registry Changes View",
     "Local programs, Windows tools, network use",
     "Lockdown reduces local access and remains bypassable"),
    ("Mutimukwe, Viberg, McGrath and Cerratto-Pargman", 2025,
     "Privacy in online proctoring systems in higher education: Stakeholders' perceptions, awareness and responsibility",
     "Journal of Computing in Higher Education",
     "10.1007/s12528-025-09461-5", 5,
     "Stakeholder interviews",
     "10 interviews, Scandinavia",
     "What is collected, who sees it, and for how long",
     "Privacy is negotiated in talk; the systems still default to biometrics"),
    ("Newton and Essex", 2024,
     "How common is cheating in online exams and did it increase during the COVID-19 pandemic? A systematic review",
     "Journal of Academic Ethics, 22, 323–343",
     "10.1007/s10805-023-09485-5", 6,
     "Systematic review of self-reported cheating",
     "Studies of online-exam cheating",
     "Prevalence; proctored versus unproctored comparisons",
     "About 44.7% admitted cheating; the effect of proctoring is not settled"),
    ("Nigam, Pasricha, Singh and Churi", 2021,
     "A systematic review on AI-based proctoring systems: Past, present and future",
     "Education and Information Technologies, 26, 6421–6445",
     "10.1007/s10639-021-10597-x", 1,
     "Review of AI and non-AI systems",
     "43 systems",
     "Webcam, voice, lockdown, identity",
     "Privacy is named, not designed"),
    ("Noorbehbahani, Mohammadi and Aminazadeh", 2022,
     "A systematic review of research on cheating in online exams from 2010 to 2021",
     "Education and Information Technologies, 27(6), 8413–8460",
     "10.1007/s10639-022-10927-7", 1,
     "Systematic mapping review",
     "58 publications, January 2010 to February 2021",
     "Motivation, type, detection, prevention",
     "Maps the field through early 2021; does not test a bounded monitor"),
    ("Nurpeisova, Shaushenova, Mutalova, Zulpykhar, Ongarbayeva, Niyazbekova, Semenov and Maisigova", 2022,
     "The study of mathematical models and algorithms for face recognition in images using Python in a proctoring system",
     "Computation, 10, 136",
     "10.3390/computation10080136", 4,
     "Comparison of face-recognition models",
     "Proctoring prototypes for online exams",
     "Face-recognition accuracy",
     "The detector is the face"),
    ("Nurpeisova, Shaushenova, Mutalova, Ongarbayeva, Niyazbekova, Bekenova, Zhumaliyeva and Zhumasseitova", 2023,
     "Research on the development of a proctoring system for conducting online exams in Kazakhstan",
     "Computation, 11(6), 120",
     "10.3390/computation11060120", 4,
     "System build: Proctor SU",
     "Django and Python exam setting",
     "YOLO face, voice, keyboard, browser lockdown",
     "Collects face, voice, and keystrokes"),
    ("Özseven and Esin Özseven", 2026,
     "An explainable neuro-symbolic approach for cheating detection in online exams",
     "Applied Sciences, 16(6), 2884",
     "10.3390/app16062884", 4,
     "Explainable neuro-symbolic detector",
     "Exam video of gaze, head, and hands",
     "Gaze, head pose, hand-object interaction, device",
     "Explainable, but the cues are still the body"),
    ("Potluri, Sistla and Kolli", 2023,
     "An automated online proctoring system using attentive-net",
     "Multimedia Tools and Applications, 82, 30375–30404",
     "10.1007/s11042-023-14604-w", 4,
     "Attentive-net on video",
     "Clips labelled as mischievous behaviour",
     "Visual attention features",
     "Still a visual detector"),
    ("Ravesloot, Donkers, Meiboom, Langers, Jacobs, Tio, van der Vleuten and Bremers", 2026,
     "Computer testing, formative or summative, and proctoring: Does it matter?",
     "Perspectives on Medical Education, 15(1), 122–133",
     "10.5334/pme.1771", 6,
     "Score comparison across test formats",
     "Dutch progress test; more than 10,000 sittings, five schools",
     "Paper versus computer; remote proctor versus live supervision",
     "Authors cite Bergmans: remote proctoring may deter rather than detect"),
    ("Rios and Liu", 2017,
     "Online proctored versus unproctored low-stakes internet test administration",
     "American Journal of Distance Education, 31(4), 226–241",
     "10.1080/08923647.2017.1258628", 6,
     "Score comparison",
     "Low-stakes internet tests",
     "Proctored versus unproctored scores",
     "Low-stakes only, and the mechanism is not opened"),
    ("Scarfe, Watcham, Clarke and Roesch", 2024,
     "A real-world test of artificial intelligence infiltration of a university examinations system: A Turing Test case study",
     "PLOS ONE",
     "10.1371/journal.pone.0305354", 6,
     "100% AI exam scripts submitted into real modules",
     "University of Reading psychology examinations",
     "Detection rate and grade boundary",
     "94% of AI scripts were undetected"),
    ("Selwyn, O'Neill, Smith, Andrejevic and Gu", 2023,
     "A necessary evil? The rise of online exam proctoring in Australian universities",
     "Media International Australia, 186(1), 149–164",
     "10.1177/1329878X211005862", 5,
     "Domestication study of adoption",
     "Interviews, documents, news, and marketing, first pandemic year",
     "Who controls the system; hidden labour; student vulnerability",
     "Universities surrendered control to vendors; automation still needs people"),
    ("Slusky", 2020,
     "Cybersecurity of online proctoring systems",
     "Journal of International Technology and Information Management, 29",
     "Journal of International Technology and Information Management, 29 (2020)", 2,
     "Cybersecurity review of proctoring systems",
     "Commercial platforms including lockdown browsers",
     "Authentication, process control, recording",
     "Names the attack surface; does not publish a bypass-resistant rule"),
    ("Stanoyevitch", 2024,
     "Online assessment in the age of artificial intelligence",
     "Discover Education",
     "10.1007/s44217-024-00212-9", 6,
     "Observational score comparison",
     "Introductory statistics, in person, online, and after ChatGPT",
     "Mean score shift",
     "A score jump is not evidence of who cheated"),
    ("Topuz, Saka, Fatsa and Kurşun", 2022,
     "Emerging trends of online assessment systems in the emergency remote teaching period",
     "Smart Learning Environments, 9, 17",
     "10.1186/s40561-022-00199-6", 1,
     "Systematic feature analysis",
     "Academic studies of online assessment systems published in 2020",
     "Platforms, security features, common features",
     "Security is described as a feature list, not as a minimised event log"),
    ("Vazquez, Chiang and Sarmiento-Barbieri", 2021,
     "Can we stay one step ahead of cheaters? A field experiment in proctoring online open book exams",
     "Journal of Behavioral and Experimental Economics, 90, 101653",
     "10.1016/j.socec.2020.101653", 6,
     "Two randomized field experiments",
     "One face-to-face class and one online class",
     "Live proctor versus web proctor; score gap",
     "Unproctored scores were about 11% higher; the online web proctor had the smaller effect"),
    ("Weiner and Hurtz", 2017,
     "A comparative study of online remote proctored versus onsite proctored high-stakes exams",
     "Journal of Applied Testing Technology, 18(1), 13–20",
     "https://jattjournal.net/index.php/atp/article/view/113061", 6,
     "Quasi-experiment on score equivalence",
     "Three professional licensing exams; kiosk video versus test centre",
     "Reliability and measurement equivalence",
     "Equivalence of video kiosks, not a reason to record the face by default"),
    ("Khalil, Prinsloo and Slade", 2022,
     "In the nexus of integrity and surveillance: Proctoring (re)considered",
     "Journal of Computer Assisted Learning, 38(6), 1589–1602",
     "10.1111/jcal.12713", 1,
     "PRISMA-informed systematic review",
     "27 peer-reviewed articles and papers",
     "Cost, usability, integrity, privacy",
     "Institutions chose on cost and ease; student privacy was often absent"),
]


def live_papers():
    return [p for p in PAPERS if p[1] >= 2015]


def new_presentation():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    prs.slide_width = W
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


def textbox(slide, x, y, w, h, text, font, size, color, bold=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(x, y, w, h)
    frame = box.text_frame
    frame.word_wrap = True
    frame.auto_size = None
    p = frame.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    set_run(run, text, font, size, color, bold)
    return box


TITLE_FONT = "Palatino Linotype"
BODY_FONT = "Segoe UI"


def bullets(slide, x, y, w, h, lines, size=18, color=BODY, font=BODY_FONT, spacing=6):
    box = slide.shapes.add_textbox(x, y, w, h)
    frame = box.text_frame
    frame.word_wrap = True
    for i, line in enumerate(lines):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.space_after = Pt(spacing)
        run = p.add_run()
        set_run(run, line, font, size, color, False)
    return box


def content_chrome(slide, number, total, kicker):
    fill_bg = rect(slide, 0, 0, W, H, IVORY)
    # send background to back by construction order
    rect(slide, 0, 0, Inches(0.12), H, INK)
    rect(slide, Inches(0.55), Inches(0.38), Inches(12.2), Emu(9525), GOLD)
    rect(slide, Inches(0.55), Inches(0.46), Inches(12.2), Emu(6350), GOLD)
    textbox(slide, Inches(0.55), Inches(7.12), Inches(9.2), Inches(0.28),
            f"Review I   ·   BACSE291   ·   {number}", BODY_FONT, 12, MUTED)
    textbox(slide, Inches(9.4), Inches(7.12), Inches(3.4), Inches(0.28),
            kicker, BODY_FONT, 12, MUTED, align=PP_ALIGN.RIGHT)
    return fill_bg


def title_block(slide, title, y=Inches(0.58)):
    textbox(slide, Inches(0.55), y, Inches(12.2), Inches(0.52), title, TITLE_FONT, 32, INK, True)


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def ink_slide(prs, title, subtitle, number, total):
    slide = blank(prs)
    rect(slide, 0, 0, W, H, INK)
    rect(slide, Inches(0.7), Inches(3.15), Inches(2.4), Emu(12700), GOLD)
    textbox(slide, Inches(0.7), Inches(2.15), Inches(11.5), Inches(0.9), title, "Georgia", 40, WHITE, True)
    textbox(slide, Inches(0.7), Inches(3.4), Inches(11), Inches(1.2), subtitle, "Calibri", 22, RGBColor(0xF4, 0xF0, 0xE6))
    textbox(slide, Inches(0.7), Inches(6.9), Inches(8), Inches(0.3),
            f"Review I   ·   BACSE291   ·   {number}", "Calibri", 12, GOLD)
    return slide


def style_cell(cell, text, size, bold, color, fill_color):
    cell.text = ""
    cell.fill.solid()
    cell.fill.fore_color.rgb = fill_color
    cell.vertical_anchor = MSO_ANCHOR.TOP
    cell.margin_left = Inches(0.06)
    cell.margin_right = Inches(0.06)
    cell.margin_top = Inches(0.04)
    frame = cell.text_frame
    frame.word_wrap = True
    p = frame.paragraphs[0]
    run = p.add_run()
    set_run(run, text, BODY_FONT, size, color, bold)


def add_table(slide, rows, x, y, w, h, font=11, widths=None):
    table_shape = slide.shapes.add_table(len(rows), len(rows[0]), x, y, w, h)
    table = table_shape.table
    if widths:
        for i, width in enumerate(widths):
            table.columns[i].width = width
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            bold = r == 0
            color = WHITE if r == 0 else BODY
            bg = INK if r == 0 else (CARD if r % 2 else IVORY)
            style_cell(table.cell(r, c), value, font, bold, color, bg)
    return table


def build_spoken(prs):
    # 1 Title
    s = blank(prs)
    rect(s, 0, 0, W, H, IVORY)
    rect(s, 0, 0, Inches(0.22), H, INK)
    rect(s, Inches(0.7), Inches(1.35), Inches(2.6), Emu(12700), GOLD)
    textbox(s, Inches(0.7), Inches(0.95), Inches(11), Inches(0.32),
            "BACSE291    ·    INNOVATIVE DESIGN PROJECT    ·    REVIEW I", BODY_FONT, 13, GOLD, True)
    textbox(s, Inches(0.7), Inches(1.6), Inches(11.8), Inches(1.45),
            "Privacy-bounded integrity\nfor online examinations", TITLE_FONT, 36, INK, True)
    textbox(s, Inches(0.7), Inches(3.2), Inches(11), Inches(0.36),
            "Review I  —  literature and gap analysis", BODY_FONT, 18, TEAL)
    textbox(s, Inches(0.7), Inches(3.65), Inches(11), Inches(0.36),
            "A full examination website and a visible endpoint monitor.", BODY_FONT, 18, BODY)
    textbox(s, Inches(0.7), Inches(4.4), Inches(6), Inches(1.05),
            "Team\nGuide\nCollege", BODY_FONT, 16, MUTED)
    textbox(s, Inches(0.7), Inches(6.9), Inches(8), Inches(0.3),
            "Review I   ·   BACSE291   ·   1", BODY_FONT, 12, MUTED)

    # 2 Decision
    s = blank(prs)
    content_chrome(s, 2, 14, "The decision")
    title_block(s, "The decision this review supports")
    textbox(s, Inches(0.55), Inches(1.25), Inches(12), Inches(0.45),
            "Colleges need integrity without turning the webcam into the default.",
            TITLE_FONT, 20, INK)
    bullets(s, Inches(0.55), Inches(1.9), Inches(12), Inches(2.2), [
        "One shared website. Faculty publish an exam. Students on other devices sit it.",
        "Events are scored by a written policy. The same log always yields the same score.",
        "A person chooses Flagged or Cleared. The system does not accuse.",
    ], size=18, spacing=10)

    # 3 Domain
    s = blank(prs)
    content_chrome(s, 3, 14, "Domain")
    title_block(s, "Domain map")
    textbox(s, Inches(0.55), Inches(1.22), Inches(12), Inches(0.32),
            "Three approaches. This project is the third.", BODY_FONT, 16, TEAL, True)
    cards = [
        ("01   Lockdown browser", "Safe Exam Browser, Respondus. The software locks the machine. It is privileged, and a renamed process can walk around the list."),
        ("02   Automated proctor", "Webcam, gaze, voice, and screen. The body is the evidence. The flag is often a score without a published rule."),
        ("03   Integrity monitor", "This project. A shared exam website, browser events, and a visible agent that reports an executable name. A reviewer decides."),
    ]
    for i, (head, body) in enumerate(cards):
        x = Inches(0.55 + i * 4.15)
        rect(s, x, Inches(1.7), Inches(3.95), Inches(2.55), CARD)
        rect(s, x, Inches(1.7), Inches(3.95), Inches(0.06), TEAL if i == 2 else GOLD)
        textbox(s, x + Inches(0.18), Inches(1.88), Inches(3.6), Inches(0.55), head, TITLE_FONT, 18, INK, True)
        textbox(s, x + Inches(0.18), Inches(2.5), Inches(3.6), Inches(1.55), body, BODY_FONT, 14, BODY)
    notes(s, "We sit in the third column: an integrity monitor, not a lockdown browser and not an automated proctor. The website is the shared exam; the agent only names the foreground program, and a person still decides.")

    # 4 Terms
    s = blank(prs)
    content_chrome(s, 4, 14, "Terms")
    title_block(s, "Terms you will use out loud")
    terms = [
        ("Credential is not identity.", "A login proves an account. It does not prove a face."),
        ("Enforce versus allow-but-log.", "We record the event. We do not kill the other program."),
        ("Browser signal versus endpoint signal.", "The page can see focus. Only the agent can name the executable."),
        ("Risk score versus reviewer decision.", "Low, Medium, or High is a rule. Flagged or Cleared is a person."),
        ("Data minimization.", "If the review does not need it, the system does not collect it."),
    ]
    for i, (head, body) in enumerate(terms):
        y = Inches(1.28 + i * 0.78)
        rect(s, Inches(0.55), y, Inches(12.2), Inches(0.7), CARD)
        textbox(s, Inches(0.72), y + Inches(0.04), Inches(11.8), Inches(0.32), head, TITLE_FONT, 16, INK, True)
        textbox(s, Inches(0.72), y + Inches(0.34), Inches(11.8), Inches(0.32), body, BODY_FONT, 14, BODY)

    # 5 Threat
    s = blank(prs)
    content_chrome(s, 5, 14, "Threat model")
    title_block(s, "Threat model")
    rect(s, Inches(0.55), Inches(1.28), Inches(6.0), Inches(3.15), CARD)
    rect(s, Inches(6.75), Inches(1.28), Inches(6.0), Inches(3.15), CARD)
    rect(s, Inches(0.55), Inches(1.28), Inches(6.0), Inches(0.06), TEAL)
    rect(s, Inches(6.75), Inches(1.28), Inches(6.0), Inches(0.06), CLAY)
    textbox(s, Inches(0.75), Inches(1.42), Inches(5.6), Inches(0.36), "Will record", TITLE_FONT, 20, TEAL, True)
    textbox(s, Inches(6.95), Inches(1.42), Inches(5.6), Inches(0.36), "Will not record", TITLE_FONT, 20, CLAY, True)
    bullets(s, Inches(0.75), Inches(1.88), Inches(5.6), Inches(2.4), [
        "Tab hide, focus, fullscreen",
        "Clipboard",
        "DevTools heuristic",
        "Foreground executable name",
        "Display count",
        "Network up or down",
    ], size=15, spacing=2)
    bullets(s, Inches(6.95), Inches(1.88), Inches(5.6), Inches(2.4), [
        "Face, voice, keystrokes",
        "Window titles",
        "URLs",
        "Screenshots",
        "File contents",
        "A second phone — out of scope",
    ], size=15, spacing=2)
    notes(s, "We record page and process events that a reviewer can read. We do not record face, voice, keystrokes, titles, URLs, screenshots, or file contents, and a second phone is outside this threat model.")

    # 6 Literature method
    s = blank(prs)
    content_chrome(s, 6, 14, "Method")
    title_block(s, "How the literature was read")
    bullets(s, Inches(0.55), Inches(1.28), Inches(12.2), Inches(3.6), [
        "Inclusion: peer-reviewed journal or full conference paper; English; online exams, proctoring, lockdown browsers, or generative-AI cheating.",
        "52 papers. 38 are from 2021–2026, which is 73 percent. The bar in the brief is 70 percent.",
        "14 papers from before 2021 are labeled foundational. The cap is 15.",
        "Each row has five columns: author and year, method, dataset or testbed, key parameters, limitation.",
        "Theses, arXiv-only preprints, blogs, and vendor pages are not in the 52.",
    ], size=18, spacing=8)

    # 7 Clusters
    s = blank(prs)
    content_chrome(s, 7, 14, "Clusters")
    title_block(s, "Six clusters, not 52 summaries")
    clusters = [
        "1   Surveys of proctoring. They map tools. They do not publish a scoring rule.",
        "2   Lockdown browsers. They restrict the machine. A renamed process walks around the list.",
        "3   Browser-only signals. They know the page was left. They do not know which program opened.",
        "4   Webcam and AI proctors. The cue is the body. The flag is often unexplained.",
        "5   Privacy and ethics. Students treat the webcam as a breach. The papers stop at the critique.",
        "6   Generative AI and answer patterns. Detectors miss scripts. A score jump is not a person.",
    ]
    bullets(s, Inches(0.55), Inches(1.28), Inches(12.2), Inches(4.2), clusters, size=18, spacing=8)

    # 8 Spoken comparison
    s = blank(prs)
    content_chrome(s, 8, 14, "Comparison")
    title_block(s, "Comparison, spoken version")
    textbox(s, Inches(0.55), Inches(1.22), Inches(12), Inches(0.3),
            "One row from each of clusters 3 to 6. The full table is in the appendix.",
            BODY_FONT, 14, MUTED)
    rows = [
        ["Author, year", "Method", "Testbed", "Limitation"],
        ["Diedenhofen and Musch, 2016", "Page-focus script", "Lab and online samples", "Knows you left, not where you went"],
        ["Özseven and Esin Özseven, 2026", "Explainable detector", "Gaze, head, hands", "Still a camera"],
        ["Kharbat and Abu Daabes, 2021", "Student study", "About 100 students", "Webcam called a privacy breach"],
        ["Scarfe et al., 2024", "AI scripts in real exams", "Psychology modules", "94% undetected"],
    ]
    add_table(s, rows, Inches(0.5), Inches(1.65), Inches(12.3), Inches(2.35), font=13)

    # 9 Dominant systems
    s = blank(prs)
    content_chrome(s, 9, 14, "What they collect")
    title_block(s, "What the dominant systems collect")
    bullets(s, Inches(0.55), Inches(1.28), Inches(12.2), Inches(4.2), [
        "Heinrich (2025) reviewed 33 commercial systems. Image, video, and audio dominate. A flag often has no published rule.",
        "Burgess, Ginsberg, Felten and Cohney (2022) broke four suites. Process allow-lists fail when the program is renamed.",
        "Room scans and a second camera sit on the same biometric line (Atoum et al., 2017).",
        "Mohammed and Ali (2022) show Safe Exam Browser reduces local access and can still be bypassed.",
        "Our payload is the event plus an executable name. No title, no URL, no image.",
    ], size=18, spacing=8)

    # 10 Gaps
    s = blank(prs)
    content_chrome(s, 10, 14, "Gaps")
    title_block(s, "Five gaps")
    gaps = [
        "1    Biometric monitoring is the default, and students treat the webcam as a breach.  Coghlan, Miller and Paterson, 2021; Kharbat and Abu Daabes, 2021; Mutimukwe et al., 2025.",
        "2    Browser focus detects leaving the page, not the other app or a chatbot.  Diedenhofen and Musch, 2016; Ibrahim et al., 2023; Scarfe et al., 2024.",
        "3    Commercial flags are opaque. New explainable detectors still depend on gaze and pose.  Heinrich, 2025; Özseven and Esin Özseven, 2026.",
        "4    Lockdown browsers are privileged and bypassable.  Burgess, Ginsberg, Felten and Cohney, 2022; Mohammed and Ali, 2022.",
        "5    Proctoring’s effect on cheating is not settled, so an automatic fail is not justified.  Newton and Essex, 2024.",
    ]
    box = s.shapes.add_textbox(Inches(0.55), Inches(1.28), Inches(12.2), Inches(5.2))
    frame = box.text_frame
    frame.word_wrap = True
    for i, line in enumerate(gaps):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.space_after = Pt(8)
        run = p.add_run()
        set_run(run, line, BODY_FONT, 16, BODY)
    notes(s, "Each gap is a paper result. Students reject the webcam, the browser cannot see the other app, commercial flags hide the rule, lockdown can be renamed around, and proctoring has not been shown to stop cheating.")

    # 11 What we fill
    s = blank(prs)
    content_chrome(s, 11, 14, "The system")
    title_block(s, "What the website and the agent fill")
    labels = [("Browser", "The student sits the exam. The page reports focus, fullscreen, clipboard, and a DevTools heuristic."),
              ("Server", "One server holds the exam, the attempt, the events, the review, and the PDF or CSV."),
              ("Agent", "A visible window. Executable name only. Correlated with a browser event. Policy scores it.")]
    for i, (head, body) in enumerate(labels):
        x = Inches(0.55 + i * 4.15)
        rect(s, x, Inches(1.28), Inches(3.95), Inches(1.85), CARD)
        rect(s, x, Inches(1.28), Inches(3.95), Inches(0.06), TEAL)
        textbox(s, x + Inches(0.16), Inches(1.42), Inches(3.6), Inches(0.36), head, TITLE_FONT, 20, INK, True)
        textbox(s, x + Inches(0.16), Inches(1.82), Inches(3.6), Inches(1.15), body, BODY_FONT, 14, BODY)
    textbox(s, Inches(0.55), Inches(3.35), Inches(12.2), Inches(1.35),
            "The reviewer still chooses Flagged or Cleared.\nThe score is evidence for that person. It is not a verdict.\nFaculty and students are not stuck on one browser: two student devices and one faculty device share the published exam.",
            BODY_FONT, 16, BODY)

    # 12 Objectives
    s = blank(prs)
    content_chrome(s, 12, 14, "Objectives")
    title_block(s, "Four objectives")
    textbox(s, Inches(0.55), Inches(1.2), Inches(12), Inches(0.3),
            "Outcomes we will measure. Not a list of activities.", BODY_FONT, 15, TEAL, True)
    objs = [
        "1    On a scripted testbed of at least 10 honest and cheating actions, the browser monitor records the matching event in at least 90 percent of trials.",
        "2    The same event log always yields the same Low, Medium, or High score, and the same written breakdown, under a published rule version.",
        "3    With the agent connected, “exam hidden while a named prohibited app is in front” scores higher than the browser-only case. The payload has no title, URL, keystroke, or image.",
        "4    Two student devices and one faculty device share one published exam. A high-risk session can be flagged or cleared and exported, and the file matches the on-screen score.",
    ]
    box = s.shapes.add_textbox(Inches(0.55), Inches(1.6), Inches(12.2), Inches(4.6))
    frame = box.text_frame
    frame.word_wrap = True
    for i, line in enumerate(objs):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.space_after = Pt(8)
        run = p.add_run()
        set_run(run, line, BODY_FONT, 16, BODY)
    notes(s, "These are pass conditions for the build. Detection rate, a reproducible score, a higher score only when the agent adds a name, and one exam shared by two students and one faculty device.")

    # 13 Measurement
    s = blank(prs)
    content_chrome(s, 13, 14, "Measurement")
    title_block(s, "How you will measure it")
    bullets(s, Inches(0.55), Inches(1.28), Inches(12.2), Inches(3.4), [
        "A lab script, not a secret recording of classmates.",
        "Detection rate: matching event present, over the scripted trials.",
        "False flags on honest actions: a paste inside the exam, a brief blur.",
        "A second person reproduces the score from the log and the published rule version.",
        "The export is checked against the score on screen.",
    ], size=18, spacing=8)

    # 14 Close
    s = blank(prs)
    rect(s, 0, 0, W, H, INK)
    textbox(s, Inches(0.7), Inches(2.15), Inches(11.8), Inches(1.5),
            "Evidence for a human,\nnot a verdict from a camera.", TITLE_FONT, 36, WHITE, True)
    rect(s, Inches(0.7), Inches(3.85), Inches(2.2), Emu(12700), GOLD)
    textbox(s, Inches(0.7), Inches(4.1), Inches(11), Inches(0.5), "Questions.", BODY_FONT, 24, IVORY)
    textbox(s, Inches(0.7), Inches(6.9), Inches(8), Inches(0.3),
            "Review I   ·   BACSE291   ·   14", BODY_FONT, 12, GOLD)
    return prs


def cluster_name(n):
    return {
        1: "Surveys of proctoring",
        2: "Lockdown browsers",
        3: "Browser-only signals",
        4: "Webcam and AI proctors",
        5: "Privacy and ethics",
        6: "Generative AI and answer-pattern cheating",
    }[n]


HEADERS = ["Author and year", "Method", "Dataset or testbed", "Key parameters", "Limitation"]
COL_WIDTHS = [Inches(2.7), Inches(2.35), Inches(2.45), Inches(2.45), Inches(2.55)]


def paper_table(part):
    data = [HEADERS]
    for p in part:
        tag = f"{p[0]}, {p[1]}"
        if p[1] < 2021:
            tag += "  ·  foundational"
        data.append([tag, p[6], p[7], p[8], p[9]])
    return data


def table_height(n_data, row=0.52, header=0.32):
    return Inches(header + n_data * row)


def cluster_slide(prs, number, title, part, kicker):
    s = blank(prs)
    content_chrome(s, number, 0, kicker)
    title_block(s, title)
    data = paper_table(part)
    add_table(
        s, data, Inches(0.4), Inches(1.22), Inches(12.5),
        table_height(len(part)), font=10, widths=COL_WIDTHS,
    )
    return s


def append_appendix(prs, papers):
    recent = sum(1 for p in papers if p[1] >= 2021)
    found = sum(1 for p in papers if p[1] < 2021)
    number = 15

    s = blank(prs)
    rect(s, 0, 0, W, H, INK)
    textbox(s, Inches(0.7), Inches(2.35), Inches(11), Inches(0.7), "Appendix", TITLE_FONT, 40, WHITE, True)
    rect(s, Inches(0.7), Inches(3.2), Inches(2.1), Emu(12700), GOLD)
    textbox(
        s, Inches(0.7), Inches(3.5), Inches(11), Inches(1.3),
        f"Six comparison tables.\n{len(papers)} references.  {recent} from 2021–2026.  {found} foundational.\nBackup answers at the end.",
        BODY_FONT, 18, IVORY,
    )
    textbox(s, Inches(0.7), Inches(6.9), Inches(8), Inches(0.3),
            f"Review I   ·   BACSE291   ·   {number}", BODY_FONT, 12, GOLD)

    by_cluster = {n: [p for p in papers if p[5] == n] for n in range(1, 7)}
    # 8 cluster slides: surveys split 8+3, the tail shares a slide with lockdown and browser signals.
    number += 1
    cluster_slide(prs, number, "A1   Surveys of proctoring  (1/2)", by_cluster[1][:8], "A1")
    number += 1
    s = blank(prs)
    content_chrome(s, number, 0, "A1–A3")
    title_block(s, "A1 continued  ·  A2 lockdown  ·  A3 browser signals")
    blocks = [
        ("Surveys, continued", by_cluster[1][8:]),
        ("Lockdown browsers", by_cluster[2]),
        ("Browser-only signals", by_cluster[3]),
    ]
    y = 1.2
    for label, part in blocks:
        textbox(s, Inches(0.45), Inches(y), Inches(12), Inches(0.26), label, BODY_FONT, 12, TEAL, True)
        h = table_height(len(part), row=0.46, header=0.28)
        add_table(
            s, paper_table(part), Inches(0.4), Inches(y + 0.26), Inches(12.5), h,
            font=10, widths=COL_WIDTHS,
        )
        y += 0.26 + (0.28 + len(part) * 0.46) + 0.12

    chunks = [
        (4, "A4   Webcam and AI proctors"),
        (5, "A5   Privacy and ethics"),
        (6, "A6   Generative AI and answer patterns"),
    ]
    for cluster, label in chunks:
        rows_src = by_cluster[cluster]
        parts = [rows_src[i:i + 8] for i in range(0, len(rows_src), 8)]
        for i, part in enumerate(parts):
            number += 1
            suffix = f"  ({i + 1}/{len(parts)})" if len(parts) > 1 else ""
            cluster_slide(prs, number, label + suffix, part, f"A{cluster}")

    ordered = sorted(papers, key=lambda p: p[0].lower())
    ref_parts = [ordered[i:i + 12] for i in range(0, len(ordered), 12)]
    for i, part in enumerate(ref_parts):
        number += 1
        s = blank(prs)
        content_chrome(s, number, 0, "A7")
        title_block(s, f"A7   References  ({i + 1}/{len(ref_parts)})")
        lines = []
        for p in part:
            mark = "  [foundational]" if p[1] < 2021 else ""
            ident = p[4]
            if ident.startswith("http"):
                ident_text = ident
            elif ident.startswith("10."):
                ident_text = "https://doi.org/" + ident
            else:
                ident_text = ident
            lines.append(f"{p[0]} ({p[1]}). {p[2]}. {p[3]}. {ident_text}{mark}")
        half = (len(lines) + 1) // 2
        bullets(s, Inches(0.42), Inches(1.2), Inches(6.2), Inches(5.7), lines[:half], size=11, spacing=4)
        if lines[half:]:
            bullets(s, Inches(6.7), Inches(1.2), Inches(6.15), Inches(5.7), lines[half:], size=11, spacing=4)

    number += 1
    s = blank(prs)
    content_chrome(s, number, 0, "A8")
    title_block(s, "A8   Backup answers")
    pairs = [
        ("Can you catch a second phone?", "No. A second phone is outside the threat model. Say so before anyone asks."),
        ("Is a high score guilt?", "No. The score is a reproducible reading of the log. Flagged or Cleared is a person’s decision."),
        ("What already runs?", "The prototype already ingests browser and agent events and writes a report. It is the backup, not the claim."),
        ("What does objective 4 measure?", "Exam publishing across devices. Two student devices and one faculty device share one exam, then a review is exported."),
    ]
    for i, (q, a) in enumerate(pairs):
        y = Inches(1.25 + i * 1.05)
        rect(s, Inches(0.55), y, Inches(12.2), Inches(0.95), CARD)
        textbox(s, Inches(0.72), y + Inches(0.06), Inches(11.8), Inches(0.32), q, TITLE_FONT, 16, INK, True)
        textbox(s, Inches(0.72), y + Inches(0.42), Inches(11.8), Inches(0.42), a, BODY_FONT, 14, BODY)
    return number


def main():
    papers = live_papers()
    assert len(papers) == 52, len(papers)
    recent = [p for p in papers if p[1] >= 2021]
    found = [p for p in papers if p[1] < 2021]
    assert len(recent) >= 37, len(recent)
    assert len(found) <= 15, len(found)
    assert all(p[5] in range(1, 7) for p in papers)
    prs = new_presentation()
    build_spoken(prs)
    last = append_appendix(prs, papers)
    # 14 spoken + 1 divider + 8 cluster tables + 5 reference slides + 1 backup.
    assert len(prs.slides) == 29, len(prs.slides)
    assert last == 29, last
    path = r"c:\Users\rudra\OneDrive\Desktop\Competitor\presentations\Review-I.pptx"
    prs.save(path)
    print(f"papers={len(papers)} recent={len(recent)} foundational={len(found)}")
    print("slides", len(prs.slides), path)


if __name__ == "__main__":
    main()
