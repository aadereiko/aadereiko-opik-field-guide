import pathlib

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

_styles = getSampleStyleSheet()
TITLE = ParagraphStyle("T", parent=_styles["Title"], fontName="Helvetica-Bold", fontSize=17)
HEADING = ParagraphStyle("H", parent=_styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, spaceBefore=12)
BODY = ParagraphStyle("B", parent=_styles["Normal"], fontName="Helvetica", fontSize=10.5, leading=14, spaceAfter=6)

BYLAWS = (
    "league-bylaws.pdf",
    "Frostbite Valley Curling League: Bylaws",
    [
        ("Rule B-2.1 Team roster", [
            "A team fields four players and may register up to two alternates. A team needs at least three "
            "rostered players on the ice to start a game.",
        ]),
        ("Rule B-2.3 Registration fee", [
            "The season registration fee is $240 per team and is due by October 15. A team that pays after "
            "that date owes a late fee of $35.",
        ]),
        ("Rule B-4.2 Forfeit for no-show", [
            "A team with fewer than three players present 15 minutes after the scheduled start forfeits the "
            "game. A forfeit is recorded as a 8-0 win for the opponent.",
        ]),
        ("Rule B-6.1 Broom and equipment", [
            "Only brooms and sliders on the league's approved list may be used. Players supply their own "
            "equipment; the club keeps four loaner brooms at the front desk.",
        ]),
    ],
)

GAME_RULES = (
    "game-rules.pdf",
    "Frostbite Valley Curling League: Rules of Play",
    [
        ("Rule G-3.1 Length of a game", [
            "A regular-season game is played over 8 ends. Each team throws eight stones per end.",
        ]),
        ("Rule G-3.4 Tied games", [
            "If the score is tied after 8 ends, one extra end is played. The team that did not have the last "
            "stone in the eighth end takes the last stone in the extra end. If the score is still tied, the "
            "game is recorded as a tie; the league has no shootout.",
        ]),
        ("Rule G-5.2 Free guard zone", [
            "No stone in the free guard zone may be removed from play by the opposing team until the fourth "
            "stone of the end has been thrown. A stone removed earlier is returned to its original position "
            "and the delivered stone is removed.",
        ]),
        ("Rule G-6.1 Hog line", [
            "A delivered stone must be released before it reaches the near hog line. A stone that is not "
            "released in time is removed from play immediately.",
        ]),
        ("Rule G-7.2 Thinking time", [
            "Each team has 38 minutes of thinking time per game. A team that runs out of thinking time "
            "forfeits any remaining stones of the current end.",
        ]),
    ],
)

OPERATIONS = (
    "operations-and-discipline.pdf",
    "Frostbite Valley Curling League: Scheduling and Conduct",
    [
        ("Rule O-2.2 Ice closures", [
            "A closure for poor ice or weather is announced by 4:00 p.m. on game day. A cancelled game is "
            "rescheduled within 14 days.",
        ]),
        ("Rule O-4.1 Conduct cards", [
            "Unsportsmanlike conduct earns a yellow card as a warning. A player who collects three yellow "
            "cards in one season is suspended for one game.",
        ]),
        ("Rule O-5.3 Protests", [
            "A protest about a game result must be filed with the league secretary within 48 hours of the "
            "final stone and must come with a $50 deposit. The deposit is refunded if the protest is upheld.",
        ]),
    ],
)

DOCUMENTS = [BYLAWS, GAME_RULES, OPERATIONS]


def generate_pdfs(pdf_dir: pathlib.Path) -> list[pathlib.Path]:
    pdf_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for filename, title, sections in DOCUMENTS:
        path = pdf_dir / filename
        doc = SimpleDocTemplate(
            str(path), pagesize=LETTER, title=title, author="Frostbite Valley Curling League",
            leftMargin=inch, rightMargin=inch, topMargin=inch, bottomMargin=inch,
        )
        story = [Paragraph(title, TITLE), Spacer(1, 12)]
        for heading, paragraphs in sections:
            story.append(Paragraph(heading, HEADING))
            story.extend(Paragraph(text, BODY) for text in paragraphs)
        doc.build(story)
        paths.append(path)
    return paths


def corpus_text() -> str:
    return "\n".join(
        heading + " " + " ".join(paragraphs)
        for _, _, sections in DOCUMENTS
        for heading, paragraphs in sections
    )
