#!/usr/bin/env python3
"""Generate the downloadable Cashgo help guides and narrated tutorial videos."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT / "src/modules/help/data/help-guides.json"
GUIDES_DIR = ROOT / "public/help/guides"
VIDEOS_DIR = ROOT / "public/help/videos"
WORK_DIR = ROOT / "tmp/help-video"
VIDEO_DEPS = WORK_DIR / "deps"

INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#5F6E82")
BLUE = colors.HexColor("#1457D9")
INDIGO = colors.HexColor("#4F46E5")
SOFT_BLUE = colors.HexColor("#EDF4FF")
SOFT_GREEN = colors.HexColor("#EAF9F1")
GREEN = colors.HexColor("#159957")
LINE = colors.HexColor("#DCE4EE")

FONT_REGULAR_PATH = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
FONT_BOLD_PATH = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
PDF_FONT = "Helvetica"
PDF_FONT_BOLD = "Helvetica-Bold"


def register_fonts() -> None:
    global PDF_FONT, PDF_FONT_BOLD
    if FONT_REGULAR_PATH.exists() and FONT_BOLD_PATH.exists():
        pdfmetrics.registerFont(TTFont("CashgoSans", str(FONT_REGULAR_PATH)))
        pdfmetrics.registerFont(TTFont("CashgoSans-Bold", str(FONT_BOLD_PATH)))
        PDF_FONT = "CashgoSans"
        PDF_FONT_BOLD = "CashgoSans-Bold"


def draw_pdf_header(canvas, doc) -> None:
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(BLUE)
    canvas.roundRect(18 * mm, height - 22 * mm, 10 * mm, 10 * mm, 3 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont(PDF_FONT_BOLD, 14)
    canvas.drawCentredString(23 * mm, height - 18.8 * mm, "C")
    canvas.setFillColor(INK)
    canvas.setFont(PDF_FONT_BOLD, 14)
    canvas.drawString(32 * mm, height - 16.5 * mm, "Cashgo")
    canvas.setFillColor(MUTED)
    canvas.setFont(PDF_FONT, 8.5)
    canvas.drawString(32 * mm, height - 21 * mm, "Centro de ayuda")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, height - 27 * mm, width - 18 * mm, height - 27 * mm)

    canvas.setFillColor(MUTED)
    canvas.setFont(PDF_FONT, 8)
    canvas.drawString(18 * mm, 12 * mm, "Guía oficial de uso y configuración")
    canvas.drawRightString(width - 18 * mm, 12 * mm, f"Página {doc.page}")
    canvas.restoreState()


def build_pdf(guide: dict) -> None:
    output = GUIDES_DIR / f"{guide['id']}.pdf"
    doc = BaseDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=31 * mm,
        bottomMargin=16 * mm,
        title=f"Cashgo - {guide['title']}",
        author="Cashgo",
        subject="Guía de uso y configuración",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="guide")
    doc.addPageTemplates(PageTemplate(id="cashgo", frames=[frame], onPage=draw_pdf_header))

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName=PDF_FONT_BOLD,
        fontSize=23,
        leading=26,
        textColor=INK,
        spaceAfter=10,
    )
    eyebrow = ParagraphStyle(
        "Eyebrow",
        parent=styles["Normal"],
        fontName=PDF_FONT_BOLD,
        fontSize=9,
        leading=12,
        tracking=1.4,
        textColor=INDIGO,
        spaceAfter=7,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName=PDF_FONT,
        fontSize=10.5,
        leading=14,
        textColor=MUTED,
    )
    section = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName=PDF_FONT_BOLD,
        fontSize=15,
        leading=18,
        textColor=INK,
        spaceBefore=8,
        spaceAfter=5,
    )
    item_title = ParagraphStyle(
        "ItemTitle",
        parent=styles["Heading3"],
        fontName=PDF_FONT_BOLD,
        fontSize=10.5,
        leading=13,
        textColor=INK,
        spaceAfter=3,
    )
    small = ParagraphStyle(
        "Small",
        parent=body,
        fontSize=9,
        leading=13,
    )
    center = ParagraphStyle(
        "Center",
        parent=small,
        alignment=TA_CENTER,
        textColor=MUTED,
    )

    story = [
        Paragraph(guide["category"].upper(), eyebrow),
        Paragraph(guide["title"], title),
        Paragraph(guide["description"], body),
        Spacer(1, 4 * mm),
    ]

    info_table = Table(
        [
            [Paragraph("RUTA EN CASHGO", eyebrow), Paragraph("PARA QUIÉN ES", eyebrow)],
            [Paragraph(guide["route"], item_title), Paragraph(guide["audience"], small)],
        ],
        colWidths=[45 * mm, 120 * mm],
    )
    info_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT_BLUE),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([info_table, Paragraph("Lo que aprenderás", section)])

    goal_cells = []
    for index, goal in enumerate(guide["goals"], start=1):
        goal_cells.append(
            Table(
                [[Paragraph(str(index), center), Paragraph(goal, item_title)]],
                colWidths=[9 * mm, 43 * mm],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#DFE9FF")),
                        ("BACKGROUND", (1, 0), (1, 0), colors.white),
                        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]
                ),
            )
        )
    goals_table = Table([goal_cells], colWidths=[55 * mm] * 3, hAlign="LEFT")
    goals_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]))
    story.extend([goals_table, Paragraph("Paso a paso", section)])

    for index, step in enumerate(guide["steps"], start=1):
        step_number = Table(
            [[Paragraph(str(index), center)]],
            colWidths=[10 * mm],
            rowHeights=[10 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), BLUE),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ]
            ),
        )
        step_copy = [Paragraph(step["title"], item_title), Paragraph(step["body"], body)]
        block = Table([[step_number, step_copy]], colWidths=[13 * mm, 150 * mm])
        block.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.extend([KeepTogether(block), Spacer(1, 2 * mm)])

    story.append(Paragraph("Buenas prácticas", section))
    for tip in guide["tips"]:
        tip_table = Table(
            [[Paragraph("TIP", eyebrow), Paragraph(tip, body)]],
            colWidths=[13 * mm, 150 * mm],
        )
        tip_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), SOFT_GREEN),
                    ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#BDE8D0")),
                    ("TEXTCOLOR", (0, 0), (0, 0), GREEN),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.extend([tip_table, Spacer(1, 1.5 * mm)])

    doc.build(story)


def load_video_font(size: int, bold: bool = False):
    path = FONT_BOLD_PATH if bold else FONT_REGULAR_PATH
    if path.exists():
        return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def wrap_for_pixels(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_multiline(draw, text, xy, font, fill, max_width, line_gap=12):
    x, y = xy
    for line in wrap_for_pixels(draw, text, font, max_width):
        draw.text((x, y), line, font=font, fill=fill)
        bbox = draw.textbbox((x, y), line, font=font)
        y = bbox[3] + line_gap
    return y


def build_video_slide(guide: dict, scene: dict, output: Path, scene_index: int) -> None:
    width, height = 1280, 720
    image = Image.new("RGB", (width, height), "#F6F8FC")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((38, 38, width - 38, height - 38), radius=34, fill="#FFFFFF", outline="#DCE4EE", width=2)
    draw.rounded_rectangle((72, 68, 126, 122), radius=16, fill="#1457D9")
    draw.text((89, 75), "C", font=load_video_font(34, True), fill="#FFFFFF")
    draw.text((146, 68), "Cashgo", font=load_video_font(31, True), fill="#172033")
    draw.text((146, 103), "Aprende a usar Cashgo", font=load_video_font(18), fill="#68778D")
    draw.rounded_rectangle((1020, 72, 1188, 112), radius=20, fill="#EDF4FF")
    draw.text((1050, 81), f"{scene_index + 1} de 5", font=load_video_font(17, True), fill="#1457D9")

    draw.text((76, 160), scene["eyebrow"].upper(), font=load_video_font(18, True), fill="#4F46E5")
    title_y = draw_multiline(draw, scene["title"], (76, 198), load_video_font(40, True), "#172033", 1120, 10)
    y = title_y + 28

    for item in scene["items"]:
        if y > 610:
            break
        draw.rounded_rectangle((76, y, 1188, y + 82), radius=18, fill="#F8FAFC", outline="#E1E8F0", width=2)
        draw.rounded_rectangle((96, y + 20, 138, y + 62), radius=13, fill="#DFE9FF")
        draw.text((111, y + 26), item["marker"], font=load_video_font(19, True), fill="#1457D9", anchor="ma")
        draw.text((158, y + 15), item["title"], font=load_video_font(21, True), fill="#172033")
        draw_multiline(draw, item["body"], (158, y + 45), load_video_font(16), "#5F6E82", 980, 6)
        y += 96

    draw.text((76, 670), guide["shortTitle"], font=load_video_font(15, True), fill="#68778D")
    draw.text((1188, 670), "cashgo", font=load_video_font(15, True), fill="#68778D", anchor="ra")
    image.save(output, quality=92)


def get_video_scenes(guide: dict) -> list[dict]:
    return [
        {
            "eyebrow": guide["category"],
            "title": guide["title"],
            "items": [{"marker": "▶", "title": "Qué vas a aprender", "body": guide["description"]}],
            "narration": f"Bienvenido a Cashgo. En esta guía aprenderás sobre {guide['title']}. {guide['description']}",
        },
        {
            "eyebrow": "Objetivos",
            "title": "Al terminar podrás",
            "items": [
                {"marker": str(index), "title": goal, "body": "Resultado clave de este recorrido."}
                for index, goal in enumerate(guide["goals"], start=1)
            ],
            "narration": "Al finalizar podrás: " + ". ".join(guide["goals"]) + ".",
        },
        {
            "eyebrow": "Paso a paso",
            "title": "Prepara y ejecuta el flujo",
            "items": [
                {"marker": str(index), "title": step["title"], "body": step["body"]}
                for index, step in enumerate(guide["steps"][:2], start=1)
            ],
            "narration": "Primero. " + guide["steps"][0]["title"] + ". " + guide["steps"][0]["body"] + " Luego. " + guide["steps"][1]["title"] + ". " + guide["steps"][1]["body"],
        },
        {
            "eyebrow": "Paso a paso",
            "title": "Comprueba y termina",
            "items": [
                {"marker": str(index), "title": step["title"], "body": step["body"]}
                for index, step in enumerate(guide["steps"][2:], start=3)
            ],
            "narration": "Después. " + guide["steps"][2]["title"] + ". " + guide["steps"][2]["body"] + " Para terminar. " + guide["steps"][3]["title"] + ". " + guide["steps"][3]["body"],
        },
        {
            "eyebrow": "Buenas prácticas",
            "title": "Antes de continuar",
            "items": [
                {"marker": "✓", "title": "Recomendación", "body": tip}
                for tip in guide["tips"]
            ],
            "narration": "Recuerda estas recomendaciones. " + ". ".join(guide["tips"]) + ". Ya puedes aplicar este flujo en Cashgo.",
        },
    ]


def build_video(guide: dict, ffmpeg: str) -> None:
    guide_work = WORK_DIR / guide["id"]
    guide_work.mkdir(parents=True, exist_ok=True)
    segment_paths = []
    for index, scene in enumerate(get_video_scenes(guide)):
        slide = guide_work / f"slide-{index}.png"
        audio = guide_work / f"audio-{index}.aiff"
        segment = guide_work / f"segment-{index}.mp4"
        build_video_slide(guide, scene, slide, index)
        subprocess.run(
            ["/usr/bin/say", "-v", "Monica", "-r", "190", "-o", str(audio), scene["narration"]],
            check=True,
        )
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-loglevel",
                "error",
                "-loop",
                "1",
                "-framerate",
                "25",
                "-i",
                str(slide),
                "-i",
                str(audio),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "29",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "96k",
                "-shortest",
                "-movflags",
                "+faststart",
                str(segment),
            ],
            check=True,
        )
        segment_paths.append(segment)

    concat_file = guide_work / "segments.txt"
    concat_file.write_text("".join(f"file '{path}'\n" for path in segment_paths), encoding="utf-8")
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(VIDEOS_DIR / f"{guide['id']}.mp4"),
        ],
        check=True,
    )


def main() -> None:
    register_fonts()
    GUIDES_DIR.mkdir(parents=True, exist_ok=True)
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    guides = json.loads(CONTENT_PATH.read_text(encoding="utf-8"))

    if "--pdf-only" in sys.argv:
        for guide in guides:
            print(f"Generating PDF {guide['id']}...")
            build_pdf(guide)
        print(f"Generated {len(guides)} PDF guides.")
        return

    try:
        sys.path.insert(0, str(VIDEO_DEPS))
        import imageio_ffmpeg  # type: ignore
    except ImportError as exc:
        raise SystemExit(
            f"Missing imageio-ffmpeg in {VIDEO_DEPS}. Install it before generating videos."
        ) from exc

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    for guide in guides:
        print(f"Generating {guide['id']}...")
        build_pdf(guide)
        build_video(guide, ffmpeg)
    print(f"Generated {len(guides)} PDF guides and {len(guides)} tutorial videos.")


if __name__ == "__main__":
    main()
