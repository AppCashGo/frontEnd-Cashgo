#!/usr/bin/env python3
"""Generate the downloadable Cashgo help guides and narrated tutorial videos."""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
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
VOICE_DEPS = WORK_DIR / "edge-deps"
REAL_SCREENS_DIR = WORK_DIR / "real-screens"
NEURAL_VOICE = "es-CO-SalomeNeural"

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


def fit_screen_image(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    image.thumbnail((1280, 720), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1280, 720), "#EEF2F7")
    canvas.paste(image, ((1280 - image.width) // 2, (720 - image.height) // 2))
    return canvas


def draw_simulated_module_screen(guide: dict, base: Image.Image) -> Image.Image:
    image = fit_screen_image(base)
    draw = ImageDraw.Draw(image)
    draw.rectangle((270, 0, 1280, 720), fill="#F8FAFC")
    draw.text((310, 54), guide["shortTitle"], font=load_video_font(34, True), fill="#172033")
    draw.text((310, 100), guide["description"], font=load_video_font(16), fill="#68778D")
    draw.rounded_rectangle((1030, 48, 1228, 98), radius=15, fill="#1457D9")
    draw.text((1129, 73), "+ Nueva operación", font=load_video_font(15, True), fill="#FFFFFF", anchor="mm")

    if guide["id"] == "domicilios":
        metrics = [("Pendientes", "4"), ("En preparación", "2"), ("En camino", "3")]
        for index, (label, value) in enumerate(metrics):
            x = 310 + index * 295
            draw.rounded_rectangle((x, 145, x + 270, 255), radius=18, fill="#FFFFFF", outline="#DCE4EE", width=2)
            draw.text((x + 22, 166), label.upper(), font=load_video_font(13, True), fill="#68778D")
            draw.text((x + 22, 200), value, font=load_video_font(34, True), fill="#172033")
        draw.rounded_rectangle((310, 285, 1198, 650), radius=20, fill="#FFFFFF", outline="#DCE4EE", width=2)
        draw.text((335, 315), "Pedidos para entrega", font=load_video_font(22, True), fill="#172033")
        for index, row in enumerate(["Pedido #1048 · Pendiente", "Pedido #1047 · En preparación", "Pedido #1046 · En camino", "Pedido #1045 · Entregado"]):
            y = 365 + index * 62
            draw.line((335, y + 45, 1170, y + 45), fill="#E4EAF1", width=2)
            draw.text((340, y), row, font=load_video_font(17, True), fill="#253146")
            draw.text((850, y), "Cliente · Dirección · Total", font=load_video_font(15), fill="#68778D")
    else:
        metrics = [("Disponible", "$ 0"), ("En proceso", "0"), ("Completado", "0")]
        for index, (label, value) in enumerate(metrics):
            x = 310 + index * 295
            draw.rounded_rectangle((x, 145, x + 270, 270), radius=18, fill="#FFFFFF", outline="#DCE4EE", width=2)
            draw.text((x + 22, 170), label.upper(), font=load_video_font(13, True), fill="#68778D")
            draw.text((x + 22, 210), value, font=load_video_font(32, True), fill="#172033")
        draw.rounded_rectangle((310, 300, 1198, 625), radius=20, fill="#FFFFFF", outline="#DCE4EE", width=2)
        draw.text((338, 332), "Herramientas financieras", font=load_video_font(22, True), fill="#172033")
        for index, item in enumerate(["Cobros y recaudos", "Datáfono para tu negocio", "Historial de solicitudes"]):
            y = 385 + index * 70
            draw.rounded_rectangle((335, y, 1170, y + 54), radius=14, fill="#F7F9FC", outline="#E4EAF1", width=1)
            draw.text((360, y + 17), item, font=load_video_font(17, True), fill="#253146")
            draw.text((1128, y + 17), "Ver →", font=load_video_font(15, True), fill="#1457D9", anchor="ra")
    return image


def load_module_screen(guide: dict) -> Image.Image:
    screen_path = REAL_SCREENS_DIR / f"{guide['id']}.png"
    fallback_path = REAL_SCREENS_DIR / "inicio.png"
    source_path = screen_path if screen_path.exists() else fallback_path
    if not source_path.exists():
        raise FileNotFoundError(f"Missing real screen capture for {guide['id']}")
    image = Image.open(source_path)
    if guide["id"] in {"domicilios", "dinero"}:
        return draw_simulated_module_screen(guide, image)
    image = fit_screen_image(image)
    if guide["id"] in {"clientes", "empleados", "proveedores"}:
        private_background = image.crop((270, 0, 810, 720)).filter(
            ImageFilter.GaussianBlur(radius=8)
        )
        image.paste(private_background, (270, 0))
    return image


def draw_cursor(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.ellipse((x - 25, y - 25, x + 25, y + 25), fill="#FFFFFF", outline="#1457D9", width=5)
    draw.polygon([(x - 8, y - 13), (x + 12, y), (x, y + 4), (x + 7, y + 17), (x, y + 20), (x - 7, y + 7), (x - 15, y + 15)], fill="#1457D9")


def build_video_slide(guide: dict, scene: dict, output: Path, scene_index: int) -> None:
    source = load_module_screen(guide)
    if scene_index == 0:
        image = ImageEnhance.Brightness(source).enhance(0.45).convert("RGBA")
        overlay = Image.new("RGBA", image.size, (18, 28, 51, 35))
        image = Image.alpha_composite(image, overlay)
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((95, 142, 1185, 575), radius=34, fill=(255, 255, 255, 242), outline=(210, 222, 238, 255), width=2)
        draw.rounded_rectangle((135, 185, 203, 253), radius=20, fill="#1457D9")
        draw.text((169, 219), "C", font=load_video_font(38, True), fill="#FFFFFF", anchor="mm")
        draw.text((228, 187), "APRENDE A USAR CASHGO", font=load_video_font(18, True), fill="#4F46E5")
        title_y = draw_multiline(draw, guide["title"], (135, 285), load_video_font(45, True), "#172033", 970, 9)
        draw_multiline(draw, guide["description"], (135, title_y + 25), load_video_font(21), "#5F6E82", 970, 8)
        draw.rounded_rectangle((135, 505, 340, 545), radius=20, fill="#EDF4FF")
        draw.text((237, 525), "Tutorial guiado", font=load_video_font(16, True), fill="#1457D9", anchor="mm")
    else:
        image = source.convert("RGBA")
        box = scene["highlight"]
        dimmed = ImageEnhance.Brightness(source).enhance(0.62).convert("RGBA")
        mask = Image.new("L", source.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle(box, radius=20, fill=255)
        bright_region = ImageEnhance.Contrast(source).enhance(1.04).convert("RGBA")
        dimmed.paste(bright_region, (0, 0), mask)
        image = dimmed
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle(box, radius=20, outline="#2F74FF", width=7)
        draw.rounded_rectangle((38, 30, 296, 74), radius=22, fill=(255, 255, 255, 245))
        draw.text((61, 43), f"PASO {scene_index} DE 4", font=load_video_font(16, True), fill="#1457D9")
        draw_cursor(draw, box[2] - 5, box[3] - 5)
        draw.rounded_rectangle((52, 525, 1228, 685), radius=24, fill=(255, 255, 255, 247), outline=(220, 228, 238, 255), width=2)
        draw.rounded_rectangle((78, 551, 128, 601), radius=15, fill="#1457D9")
        draw.text((103, 576), str(scene_index), font=load_video_font(24, True), fill="#FFFFFF", anchor="mm")
        draw.text((151, 545), scene["title"], font=load_video_font(27, True), fill="#172033")
        draw_multiline(draw, scene["body"], (151, 585), load_video_font(18), "#5F6E82", 1020, 7)
    image.convert("RGB").save(output, quality=94)


def get_video_scenes(guide: dict) -> list[dict]:
    default_highlights = [
        (292, 86, 675, 285),
        (692, 85, 1000, 300),
        (292, 300, 650, 505),
        (662, 310, 1005, 510),
    ]
    drawer_highlights = [
        (704, 82, 1008, 205),
        (704, 194, 1008, 325),
        (704, 312, 1008, 438),
        (704, 425, 1008, 510),
    ]
    highlights_by_guide = {
        "productos": [
            (292, 84, 648, 232),
            (657, 84, 1008, 286),
            (292, 224, 648, 492),
            (657, 278, 1008, 510),
        ],
        "gastos": drawer_highlights,
        "empleados": drawer_highlights,
        "clientes": drawer_highlights,
        "proveedores": drawer_highlights,
        "facturacion": drawer_highlights,
        "inventario": drawer_highlights,
        "configuracion": [
            (292, 82, 650, 225),
            (658, 82, 1008, 260),
            (292, 252, 650, 505),
            (658, 252, 1008, 505),
        ],
    }
    highlights = highlights_by_guide.get(guide["id"], default_highlights)
    scenes = [
        {
            "title": guide["title"],
            "body": guide["description"],
            "narration": f"Hola. Te doy la bienvenida a Cashgo. En este recorrido aprenderás a usar {guide['title']}. {guide['description']}",
        }
    ]
    for index, step in enumerate(guide["steps"]):
        scenes.append(
            {
                "title": step["title"],
                "body": step["body"],
                "highlight": highlights[index],
                "narration": f"Paso {index + 1}. {step['title']}. {step['body']}",
            }
        )
    return scenes


async def synthesize_neural_audio(edge_tts, scenes: list[dict], guide_work: Path) -> list[Path]:
    audio_paths = [guide_work / f"audio-v2-{index}.mp3" for index in range(len(scenes))]

    async def synthesize(scene: dict, audio_path: Path) -> None:
        communicator = edge_tts.Communicate(
            scene["narration"],
            NEURAL_VOICE,
            rate="+3%",
            pitch="+0Hz",
            volume="+0%",
        )
        await communicator.save(str(audio_path))

    await asyncio.gather(
        *(synthesize(scene, audio_path) for scene, audio_path in zip(scenes, audio_paths))
    )
    return audio_paths


def build_video(guide: dict, ffmpeg: str, edge_tts) -> None:
    guide_work = WORK_DIR / guide["id"]
    guide_work.mkdir(parents=True, exist_ok=True)
    segment_paths = []
    scenes = get_video_scenes(guide)
    audio_paths = asyncio.run(synthesize_neural_audio(edge_tts, scenes, guide_work))
    for index, (scene, audio) in enumerate(zip(scenes, audio_paths)):
        slide = guide_work / f"slide-v2-{index}.png"
        segment = guide_work / f"segment-v2-{index}.mp4"
        build_video_slide(guide, scene, slide, index)
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
                "-vf",
                "scale=1408:792,zoompan=z='min(zoom+0.00035,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1250:s=1280x720:fps=25,format=yuv420p",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "27",
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

    concat_file = guide_work / "segments-v2.txt"
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

    try:
        sys.path.insert(0, str(VOICE_DEPS))
        import edge_tts  # type: ignore
    except ImportError as exc:
        raise SystemExit(
            f"Missing edge-tts in {VOICE_DEPS}. Install it before generating videos."
        ) from exc

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    for guide in guides:
        print(f"Generating {guide['id']}...")
        if "--videos-only" not in sys.argv:
            build_pdf(guide)
        build_video(guide, ffmpeg, edge_tts)
    print(f"Generated {len(guides)} guided tutorial videos.")


if __name__ == "__main__":
    main()
