#!/usr/bin/env python3
"""Generate the downloadable Cashgo help guides and narrated tutorial videos."""

from __future__ import annotations

import asyncio
import json
import math
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
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
FLOW_SCREENS_DIR = WORK_DIR / "flow-screens"
BRAND_SYMBOL_SVG = ROOT / "src/shared/assets/brand/cashgo-symbol.svg"
BRAND_SYMBOL_PNG = WORK_DIR / "cashgo-symbol.png"
NEURAL_VOICE = "es-CO-SalomeNeural"
VIDEO_WIDTH = 1280
VIDEO_HEIGHT = 720
VIDEO_FPS = 20

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
    image.thumbnail((VIDEO_WIDTH, VIDEO_HEIGHT), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), "#EEF2F7")
    canvas.paste(
        image,
        ((VIDEO_WIDTH - image.width) // 2, (VIDEO_HEIGHT - image.height) // 2),
    )
    return canvas


def draw_source_backed_module_screen(guide: dict, base: Image.Image) -> Image.Image:
    """Render modules that are hidden for the active business from their real source UI."""
    image = fit_screen_image(base)
    draw = ImageDraw.Draw(image)
    draw.rectangle((250, 38, 1280, 682), fill="#F8FAFC")

    if guide["id"] == "domicilios":
        draw.rectangle((250, 38, 1280, 104), fill="#FFFFFF")
        draw.text((282, 58), "Domicilios", font=load_video_font(28, True), fill="#172033")
        draw.rounded_rectangle((1050, 51, 1242, 92), radius=9, fill="#172536")
        draw.text((1146, 71), "Crear nuevo domicilio", font=load_video_font(14, True), fill="#FFFFFF", anchor="mm")
        columns = [
            ("En preparacion", "Aqui se listaran los pedidos en preparacion"),
            ("Ordenes en reparto", "Aqui se listaran las ordenes en reparto"),
        ]
        for index, (title, empty_copy) in enumerate(columns):
            x1 = 282 + index * 476
            x2 = x1 + 476
            draw.rectangle((x1, 126, x2, 628), fill="#FFFFFF", outline="#E3E8F0", width=2)
            draw.rectangle((x1, 126, x2, 172), fill="#F8FAFC")
            draw.text((x1 + 20, 141), title, font=load_video_font(15, True), fill="#344054")
            draw.rounded_rectangle((x2 - 46, 136, x2 - 18, 164), radius=5, fill="#34495F")
            draw.text((x2 - 32, 150), "0", font=load_video_font(12, True), fill="#FFFFFF", anchor="mm")
            draw.text((x1 + 238, 350), "Sin pedidos", font=load_video_font(20, True), fill="#263244", anchor="mm")
            draw.text((x1 + 238, 382), empty_copy, font=load_video_font(14), fill="#667085", anchor="mm")
    else:
        draw.rounded_rectangle((420, 150, 1110, 585), radius=22, fill="#FFFFFF", outline="#DCE4EE", width=2)
        draw.rounded_rectangle((690, 195, 840, 345), radius=42, fill="#34A853")
        draw.text((765, 270), "$", font=load_video_font(70, True), fill="#FFFFFF", anchor="mm")
        draw.text((765, 382), "Mi dinero", font=load_video_font(30, True), fill="#1F2A37", anchor="mm")
        copy = "Adquiere tu datáfono Cashgo y recibe el dinero de tus ventas de forma segura, práctica y alineada a la operación de tu negocio."
        lines = wrap_for_pixels(draw, copy, load_video_font(16), 545)
        for index, line in enumerate(lines):
            draw.text((765, 426 + index * 23), line, font=load_video_font(16), fill="#5F6D80", anchor="mm")
        draw.rounded_rectangle((556, 508, 742, 552), radius=10, fill="#FFFFFF", outline="#172536", width=2)
        draw.text((649, 530), "Hablar con un asesor", font=load_video_font(14, True), fill="#172536", anchor="mm")
        draw.rounded_rectangle((758, 508, 974, 552), radius=10, fill="#172536")
        draw.text((866, 530), "Quiero mi datáfono", font=load_video_font(14, True), fill="#FFFFFF", anchor="mm")
    return image


def load_module_screen(guide: dict, screen_name: str = "lista") -> Image.Image:
    screen_path = FLOW_SCREENS_DIR / f"{guide['id']}-{screen_name}.png"
    if not screen_path.exists():
        screen_path = REAL_SCREENS_DIR / f"{guide['id']}.png"
    fallback_path = REAL_SCREENS_DIR / "inicio.png"
    source_path = screen_path if screen_path.exists() else fallback_path
    if not source_path.exists():
        raise FileNotFoundError(f"Missing real screen capture for {guide['id']}")
    image = Image.open(source_path)
    if guide["id"] in {"domicilios", "dinero"}:
        return draw_source_backed_module_screen(guide, image)
    image = fit_screen_image(image)
    if guide["id"] in {"clientes", "empleados", "proveedores", "cotizaciones"}:
        if screen_name == "lista":
            private_background = image.crop((250, 245, 1270, 680)).filter(
                ImageFilter.GaussianBlur(radius=8)
            )
            image.paste(private_background, (250, 245))
        elif screen_name == "formulario":
            private_background = image.crop((250, 120, 960, 680)).filter(
                ImageFilter.GaussianBlur(radius=8)
            )
            image.paste(private_background, (250, 120))
    return image


def draw_cursor(draw: ImageDraw.ImageDraw, x: int, y: int, click_progress: float = 0) -> None:
    if click_progress > 0:
        ring_radius = 24 + int(28 * click_progress)
        ring_alpha = max(40, int(210 * (1 - click_progress)))
        ring_color = (37, 99, 235, ring_alpha)
        draw.ellipse(
            (x - ring_radius, y - ring_radius, x + ring_radius, y + ring_radius),
            outline=ring_color,
            width=5,
        )
    shadow = [(x - 13, y - 17), (x + 13, y + 1), (x + 3, y + 5), (x + 11, y + 19), (x + 3, y + 23), (x - 5, y + 9), (x - 14, y + 17)]
    pointer = [(x - 15, y - 20), (x + 15, y), (x + 4, y + 5), (x + 13, y + 21), (x + 4, y + 26), (x - 6, y + 10), (x - 17, y + 19)]
    draw.polygon(shadow, fill=(15, 23, 42, 95))
    draw.polygon(pointer, fill="#FFFFFF", outline="#1457D9")


FLOW_ACTIONS = {
    "inicio": [
        ("lista", (12, 105, 238, 162), (205, 133), None),
        ("lista", (265, 492, 1015, 607), (640, 550), None),
        ("lista", (1020, 492, 1268, 607), (1144, 550), None),
        ("lista", (286, 360, 700, 414), (493, 387), None),
    ],
    "ventas": [
        ("lista", (265, 205, 875, 575), (480, 300), None),
        ("carrito", (950, 140, 1260, 310), (1055, 240), None),
        ("cobro", (950, 195, 1260, 325), (1105, 260), None),
        ("cobro", (950, 325, 1260, 675), (1105, 520), None),
    ],
    "domicilios": [
        ("lista", (1045, 48, 1248, 99), (1146, 72), None),
        ("lista", (282, 126, 758, 628), (520, 300), None),
        ("lista", (758, 126, 1234, 628), (995, 300), None),
        ("lista", (758, 470, 1234, 628), (995, 545), None),
    ],
    "movimientos": [
        ("lista", (1018, 65, 1125, 108), (1070, 86), None),
        ("formulario", (962, 142, 1268, 380), (1115, 255), ((982, 254, 1245, 292), "Ajuste de caja")),
        ("lista", (278, 145, 940, 340), (610, 250), None),
        ("lista", (490, 145, 650, 185), (570, 165), None),
    ],
    "facturacion": [
        ("lista", (990, 66, 1100, 108), (1045, 87), None),
        ("formulario", (960, 135, 1268, 255), (1115, 195), None),
        ("formulario", (960, 250, 1268, 505), (1115, 375), None),
        ("formulario", (960, 602, 1268, 678), (1115, 640), None),
    ],
    "cotizaciones": [
        ("lista", (1110, 65, 1252, 108), (1180, 86), None),
        ("formulario", (270, 140, 1010, 280), (640, 210), None),
        ("lista", (275, 200, 1260, 420), (760, 315), None),
        ("lista", (1120, 250, 1260, 520), (1190, 375), None),
    ],
    "estadisticas": [
        ("lista", (280, 105, 570, 155), (425, 130), None),
        ("lista", (280, 165, 850, 285), (565, 225), None),
        ("lista", (280, 305, 1260, 565), (770, 430), None),
        ("lista", (282, 565, 930, 675), (605, 620), None),
    ],
    "inventario": [
        ("lista", (285, 300, 800, 345), (545, 322), None),
        ("lista", (1110, 65, 1252, 108), (1180, 86), None),
        ("formulario", (962, 205, 1268, 500), (1115, 350), ((980, 435, 1245, 478), "Conteo físico")),
        ("lista", (280, 350, 1260, 650), (760, 500), None),
    ],
    "productos": [
        ("lista", (1110, 65, 1255, 110), (1182, 88), None),
        ("formulario", (275, 285, 775, 425), (520, 395), ((285, 378, 758, 414), "Producto de ejemplo")),
        ("variantes", (272, 96, 1260, 136), (760, 116), None),
        ("medidas", (1125, 610, 1265, 682), (1195, 646), None),
    ],
    "gastos": [
        ("lista", (1080, 138, 1255, 250), (1168, 194), None),
        ("formulario", (962, 130, 1268, 360), (1115, 235), ((985, 145, 1245, 196), "45000")),
        ("formulario", (962, 455, 1268, 570), (1115, 512), None),
        ("lista", (280, 255, 1260, 340), (770, 298), None),
    ],
    "empleados": [
        ("lista", (1110, 65, 1255, 110), (1182, 88), None),
        ("formulario", (962, 280, 1268, 390), (1115, 335), None),
        ("formulario", (962, 130, 1268, 280), (1115, 205), ((985, 165, 1245, 205), "Camila Pérez")),
        ("lista", (280, 205, 1260, 430), (760, 315), None),
    ],
    "dinero": [
        ("lista", (420, 150, 1110, 585), (765, 310), None),
        ("lista", (556, 508, 742, 552), (649, 530), None),
        ("lista", (758, 508, 974, 552), (866, 530), None),
        ("lista", (650, 350, 880, 470), (765, 410), None),
    ],
    "clientes": [
        ("lista", (1110, 65, 1255, 110), (1182, 88), None),
        ("lista", (285, 180, 700, 225), (490, 202), None),
        ("lista", (275, 245, 1260, 520), (760, 380), None),
        ("formulario", (962, 130, 1268, 420), (1115, 260), ((985, 165, 1245, 205), "Cliente de ejemplo")),
    ],
    "proveedores": [
        ("lista", (1110, 65, 1255, 110), (1182, 88), None),
        ("lista", (285, 185, 700, 230), (490, 207), None),
        ("lista", (275, 245, 1260, 520), (760, 380), None),
        ("formulario", (962, 130, 1268, 390), (1115, 250), ((985, 165, 1245, 205), "Proveedor demo")),
    ],
    "configuracion": [
        ("lista", (280, 115, 1260, 210), (770, 162), None),
        ("lista", (280, 210, 1260, 325), (770, 267), None),
        ("catalogo", (280, 285, 1260, 565), (770, 420), None),
        ("catalogo", (280, 565, 1260, 675), (770, 620), None),
    ],
}


def ensure_brand_symbol() -> Image.Image:
    if not BRAND_SYMBOL_PNG.exists():
        subprocess.run(
            ["sips", "-s", "format", "png", str(BRAND_SYMBOL_SVG), "--out", str(BRAND_SYMBOL_PNG)],
            check=True,
            stdout=subprocess.DEVNULL,
        )
    return Image.open(BRAND_SYMBOL_PNG).convert("RGBA")


def paste_brand_mark(image: Image.Image, compact: bool = True) -> None:
    icon = ensure_brand_symbol().resize((34, 34), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(image)
    x1, y1, x2, y2 = (535, 10, 745, 50) if compact else (95, 70, 350, 130)
    draw.rounded_rectangle((x1, y1, x2, y2), radius=20, fill=(255, 255, 255, 240), outline=(216, 226, 239, 255), width=1)
    image.alpha_composite(icon, (x1 + 6, y1 + 3))
    draw.text((x1 + 49, (y1 + y2) // 2), "CashGo", font=load_video_font(17, True), fill="#172033", anchor="lm")
    if compact:
        draw.text((x2 - 14, (y1 + y2) // 2), "GUÍA OFICIAL", font=load_video_font(10, True), fill="#2563EB", anchor="rm")


def make_gradient_background() -> Image.Image:
    top = np.array([238, 246, 255], dtype=np.float32)
    bottom = np.array([247, 242, 255], dtype=np.float32)
    gradient = np.zeros((VIDEO_HEIGHT, VIDEO_WIDTH, 3), dtype=np.uint8)
    for y in range(VIDEO_HEIGHT):
        ratio = y / (VIDEO_HEIGHT - 1)
        gradient[y, :, :] = (top * (1 - ratio) + bottom * ratio).astype(np.uint8)
    image = Image.fromarray(gradient, "RGB").convert("RGBA")
    draw = ImageDraw.Draw(image, "RGBA")
    draw.ellipse((-180, -240, 420, 360), fill=(20, 184, 166, 34))
    draw.ellipse((930, -170, 1450, 350), fill=(37, 99, 235, 42))
    draw.ellipse((820, 480, 1380, 980), fill=(249, 115, 22, 28))
    for x, y, color in [(104, 565, "#14B8A6"), (1125, 150, "#F97316"), (1170, 575, "#2563EB")]:
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=color)
    return image


def draw_intro_frame(guide: dict, progress: float, outro: bool = False) -> Image.Image:
    image = make_gradient_background()
    draw = ImageDraw.Draw(image, "RGBA")
    icon_size = int(92 + 8 * math.sin(min(progress, 1) * math.pi))
    icon = ensure_brand_symbol().resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon_x = (VIDEO_WIDTH - icon_size) // 2
    image.alpha_composite(icon, (icon_x, 112 if not outro else 132))
    if outro:
        draw.text((640, 276), "CashGo", font=load_video_font(52, True), fill="#172033", anchor="mm")
        draw.text((640, 346), "Tu negocio, más fácil.", font=load_video_font(31, True), fill="#2563EB", anchor="mm")
        draw.text((640, 410), "Fácil  •  Moderna  •  Rápida  •  Amigable", font=load_video_font(18, True), fill="#5F6E82", anchor="mm")
    else:
        draw.text((640, 250), "APRENDE A USAR CASHGO", font=load_video_font(18, True), fill="#2563EB", anchor="mm")
        title_y = 298
        for line in wrap_for_pixels(draw, guide["title"], load_video_font(45, True), 970):
            draw.text((640, title_y), line, font=load_video_font(45, True), fill="#172033", anchor="ma")
            title_y += 54
        draw.rounded_rectangle((490, title_y + 18, 790, title_y + 62), radius=22, fill=(255, 255, 255, 220))
        draw.text((640, title_y + 40), "Tutorial oficial paso a paso", font=load_video_font(16, True), fill="#5F6E82", anchor="mm")
    return image


def draw_objective_frame(guide: dict) -> Image.Image:
    source = load_module_screen(guide, FLOW_ACTIONS[guide["id"]][0][0]).convert("RGBA")
    source = ImageEnhance.Brightness(source).enhance(0.48)
    overlay = Image.new("RGBA", source.size, (12, 22, 42, 75))
    image = Image.alpha_composite(source, overlay)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((100, 125, 1180, 590), radius=34, fill=(255, 255, 255, 247), outline=(211, 223, 239, 255), width=2)
    draw.rounded_rectangle((145, 170, 315, 210), radius=20, fill="#E8F0FF")
    draw.text((230, 190), "TU OBJETIVO", font=load_video_font(14, True), fill="#2563EB", anchor="mm")
    draw.text((145, 250), "En menos de un minuto aprenderás a:", font=load_video_font(27, True), fill="#172033")
    y = 315
    for goal in guide["goals"]:
        draw.ellipse((150, y + 3, 170, y + 23), fill="#14B8A6")
        draw.text((160, y + 13), "✓", font=load_video_font(13, True), fill="#FFFFFF", anchor="mm")
        draw.text((190, y), goal, font=load_video_font(20, True), fill="#344054")
        y += 61
    paste_brand_mark(image)
    return image


def draw_step_base(guide: dict, scene: dict) -> Image.Image:
    source = load_module_screen(guide, scene["screen"]).convert("RGBA")
    box = scene["highlight"]
    dimmed = ImageEnhance.Brightness(source).enhance(0.72).convert("RGBA")
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=16, fill=255)
    clear_region = ImageEnhance.Contrast(source).enhance(1.035).convert("RGBA")
    dimmed.paste(clear_region, (0, 0), mask)
    image = dimmed
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle(box, radius=16, outline=(37, 99, 235, 255), width=6)
    chip_x = 270
    draw.rounded_rectangle((chip_x, 58, chip_x + 170, 98), radius=20, fill=(255, 255, 255, 245), outline=(218, 227, 240, 255), width=1)
    draw.text((chip_x + 85, 78), f"PASO {scene['step']} DE 4", font=load_video_font(14, True), fill="#2563EB", anchor="mm")
    callout = (48, 552, 775, 690) if box[0] > 760 or box[1] < 330 else (485, 72, 1232, 210)
    draw.rounded_rectangle(callout, radius=24, fill=(255, 255, 255, 248), outline=(211, 223, 239, 255), width=2)
    badge = (callout[0] + 24, callout[1] + 25, callout[0] + 76, callout[1] + 77)
    draw.rounded_rectangle(badge, radius=15, fill="#2563EB")
    draw.text(((badge[0] + badge[2]) // 2, (badge[1] + badge[3]) // 2), str(scene["step"]), font=load_video_font(23, True), fill="#FFFFFF", anchor="mm")
    draw.text((callout[0] + 96, callout[1] + 20), scene["title"], font=load_video_font(25, True), fill="#172033")
    draw_multiline(draw, scene["body"], (callout[0] + 96, callout[1] + 58), load_video_font(16), "#5F6E82", callout[2] - callout[0] - 122, 5)
    paste_brand_mark(image)
    return image


def draw_result_frame(guide: dict) -> Image.Image:
    screen_name = FLOW_ACTIONS[guide["id"]][-1][0]
    source = load_module_screen(guide, screen_name).convert("RGBA")
    blurred = source.filter(ImageFilter.GaussianBlur(radius=2))
    image = ImageEnhance.Brightness(blurred).enhance(0.52).convert("RGBA")
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((275, 165, 1005, 555), radius=34, fill=(255, 255, 255, 248), outline=(184, 232, 208, 255), width=2)
    draw.ellipse((578, 205, 702, 329), fill="#EAF9F1")
    draw.ellipse((600, 227, 680, 307), fill="#14A66A")
    draw.line((620, 267, 635, 283), fill="#FFFFFF", width=8)
    draw.line((635, 283, 664, 249), fill="#FFFFFF", width=8)
    draw.text((640, 367), "¡Recorrido completado!", font=load_video_font(35, True), fill="#172033", anchor="mm")
    draw.text((640, 421), f"Ya conoces el flujo de {guide['shortTitle']}.", font=load_video_font(21), fill="#5F6E82", anchor="mm")
    draw.rounded_rectangle((470, 467, 810, 513), radius=23, fill="#E8F0FF")
    draw.text((640, 490), "Practícalo ahora en CashGo", font=load_video_font(16, True), fill="#2563EB", anchor="mm")
    paste_brand_mark(image)
    return image


def get_video_scenes(guide: dict) -> list[dict]:
    scenes = [
        {"kind": "intro", "narration": "Aprende a usar CashGo."},
        {
            "kind": "objective",
            "narration": f"En menos de un minuto aprenderás lo esencial de {guide['shortTitle']}. {guide['description']}",
        },
    ]
    previous_target = (640, 650)
    for index, (step, action) in enumerate(zip(guide["steps"], FLOW_ACTIONS[guide["id"]]), start=1):
        screen, highlight, target, typing = action
        scenes.append(
            {
                "kind": "step",
                "step": index,
                "title": step["title"],
                "body": step["body"],
                "screen": screen,
                "highlight": highlight,
                "cursor_start": previous_target,
                "target": target,
                "typing": typing,
                "narration": f"Paso {index}. {step['title']}. {step['body']}",
            }
        )
        previous_target = target
    scenes.extend(
        [
            {
                "kind": "result",
                "narration": f"¡Listo! Ya conoces el flujo de {guide['shortTitle']} en CashGo.",
            },
            {"kind": "outro", "narration": "CashGo. Tu negocio, más fácil."},
        ]
    )
    return scenes


async def synthesize_neural_audio(edge_tts, scenes: list[dict], guide_work: Path) -> list[Path]:
    audio_paths = [guide_work / f"audio-v3-{index}.mp3" for index in range(len(scenes))]

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


def write_wave(path: Path, samples: np.ndarray, sample_rate: int = 44100) -> None:
    samples = np.clip(samples, -1, 1)
    pcm = (samples * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as audio_file:
        audio_file.setnchannels(1)
        audio_file.setsampwidth(2)
        audio_file.setframerate(sample_rate)
        audio_file.writeframes(pcm.tobytes())


def ensure_audio_assets() -> tuple[Path, Path, Path]:
    music_path = WORK_DIR / "cashgo-background-music.wav"
    click_path = WORK_DIR / "cashgo-click.wav"
    success_path = WORK_DIR / "cashgo-success.wav"
    sample_rate = 44100

    if not music_path.exists():
        duration = 12
        time = np.arange(int(sample_rate * duration)) / sample_rate
        music = np.zeros_like(time)
        chords = [
            (261.63, 329.63, 392.00),
            (220.00, 261.63, 329.63),
            (174.61, 220.00, 261.63),
            (196.00, 246.94, 293.66),
        ]
        for chord_index, chord in enumerate(chords):
            start = chord_index * 3
            region = (time >= start) & (time < start + 3)
            local_time = time[region] - start
            envelope = np.minimum(local_time / 0.35, 1) * np.minimum((3 - local_time) / 0.45, 1)
            chord_wave = sum(np.sin(2 * np.pi * frequency * local_time) for frequency in chord) / len(chord)
            bass_wave = np.sin(2 * np.pi * chord[0] / 2 * local_time)
            music[region] += envelope * (0.24 * chord_wave + 0.08 * bass_wave)
            for beat in np.arange(0.25, 3, 0.75):
                note_region = (local_time >= beat) & (local_time < beat + 0.28)
                note_time = local_time[note_region] - beat
                sparkle = np.sin(2 * np.pi * chord[2] * 2 * note_time) * np.exp(-10 * note_time)
                music[np.where(region)[0][note_region]] += 0.11 * sparkle
        write_wave(music_path, music)

    if not click_path.exists():
        time = np.arange(int(sample_rate * 0.24)) / sample_rate
        click = (np.sin(2 * np.pi * 720 * time) + 0.45 * np.sin(2 * np.pi * 1080 * time)) * np.exp(-22 * time)
        write_wave(click_path, 0.24 * click)

    if not success_path.exists():
        time = np.arange(int(sample_rate * 0.75)) / sample_rate
        first = np.sin(2 * np.pi * 659.25 * time) * np.exp(-7 * time)
        delayed_time = np.maximum(time - 0.18, 0)
        second = np.sin(2 * np.pi * 880 * delayed_time) * np.exp(-6 * delayed_time) * (time >= 0.18)
        write_wave(success_path, 0.22 * (first + second))

    return music_path, click_path, success_path


def get_media_duration(path: Path, ffmpeg: str) -> float:
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", result.stderr)
    if not match:
        raise RuntimeError(f"Could not read media duration for {path}")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def ease_in_out(progress: float) -> float:
    progress = min(max(progress, 0), 1)
    return progress * progress * (3 - 2 * progress)


def soft_zoom(image: Image.Image, amount: float) -> Image.Image:
    if amount <= 1:
        return image
    crop_width = int(VIDEO_WIDTH / amount)
    crop_height = int(VIDEO_HEIGHT / amount)
    left = (VIDEO_WIDTH - crop_width) // 2
    top = (VIDEO_HEIGHT - crop_height) // 2
    return image.crop((left, top, left + crop_width, top + crop_height)).resize(
        (VIDEO_WIDTH, VIDEO_HEIGHT), Image.Resampling.LANCZOS
    )


def draw_typing(frame: Image.Image, typing: tuple, progress: float) -> None:
    rect, text = typing
    typed = text[: max(0, math.ceil(len(text) * min(progress, 1)))]
    draw = ImageDraw.Draw(frame, "RGBA")
    draw.rounded_rectangle(rect, radius=8, fill=(255, 255, 255, 252), outline=(37, 99, 235, 255), width=3)
    draw.text((rect[0] + 14, (rect[1] + rect[3]) // 2), typed, font=load_video_font(15, True), fill="#172033", anchor="lm")
    if progress < 1 and int(progress * 12) % 2 == 0:
        text_width = draw.textbbox((0, 0), typed, font=load_video_font(15, True))[2]
        caret_x = min(rect[0] + 16 + text_width, rect[2] - 12)
        draw.line((caret_x, rect[1] + 9, caret_x, rect[3] - 9), fill="#2563EB", width=2)


def render_scene_frame(guide: dict, scene: dict, time_value: float, duration: float, base: Image.Image | None) -> Image.Image:
    kind = scene["kind"]
    progress = min(time_value / max(duration, 0.01), 1)
    if kind == "intro":
        frame = draw_intro_frame(guide, progress)
    elif kind == "outro":
        frame = draw_intro_frame(guide, progress, outro=True)
    elif base is not None:
        frame = base.copy()
    else:
        raise RuntimeError(f"Missing base frame for scene {kind}")

    if kind == "step":
        move_start, move_end = 0.45, 2.05
        move_progress = ease_in_out((time_value - move_start) / (move_end - move_start))
        start_x, start_y = scene["cursor_start"]
        target_x, target_y = scene["target"]
        arc = math.sin(move_progress * math.pi)
        cursor_x = int(start_x + (target_x - start_x) * move_progress + 18 * arc)
        cursor_y = int(start_y + (target_y - start_y) * move_progress - 24 * arc)
        click_start, click_end = 2.48, 2.98
        click_progress = 0.0
        if click_start <= time_value <= click_end:
            click_progress = (time_value - click_start) / (click_end - click_start)
        typing = scene.get("typing")
        if typing and time_value >= 3.05:
            typing_progress = (time_value - 3.05) / max(min(duration - 1.1, 5.4) - 3.05, 0.5)
            draw_typing(frame, typing, typing_progress)
        draw_cursor(ImageDraw.Draw(frame, "RGBA"), cursor_x, cursor_y, click_progress)
        if time_value >= click_start:
            zoom_progress = ease_in_out((time_value - click_start) / 1.4)
            frame = soft_zoom(frame, 1 + 0.016 * zoom_progress)

    fade_duration = 0.24
    fade = min(time_value / fade_duration, (duration - time_value) / fade_duration, 1)
    if fade < 1:
        frame = Image.blend(Image.new("RGBA", frame.size, "#F8FAFC"), frame, max(fade, 0))
    return frame.convert("RGB")


def render_scene_segment(
    guide: dict,
    scene: dict,
    audio: Path,
    output: Path,
    ffmpeg: str,
    click_path: Path,
    success_path: Path,
) -> float:
    audio_duration = get_media_duration(audio, ffmpeg)
    minimums = {"intro": 3.2, "objective": 5.0, "step": 7.3, "result": 4.2, "outro": 3.6}
    duration = max(minimums[scene["kind"]], audio_duration + 0.9)
    frame_count = math.ceil(duration * VIDEO_FPS)
    duration = frame_count / VIDEO_FPS

    base = None
    if scene["kind"] == "objective":
        base = draw_objective_frame(guide)
    elif scene["kind"] == "step":
        base = draw_step_base(guide, scene)
    elif scene["kind"] == "result":
        base = draw_result_frame(guide)

    sfx_path = click_path if scene["kind"] == "step" else success_path
    sfx_delay = 2480 if scene["kind"] == "step" else 420
    command = [
        ffmpeg,
        "-y",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{VIDEO_WIDTH}x{VIDEO_HEIGHT}",
        "-r",
        str(VIDEO_FPS),
        "-i",
        "pipe:0",
        "-i",
        str(audio),
        "-i",
        str(sfx_path),
        "-filter_complex",
        f"[1:a]adelay=250|250,volume=1.0,apad=pad_dur=2[narration];[2:a]adelay={sfx_delay}|{sfx_delay},volume=0.5,apad=pad_dur=2[sfx];[narration][sfx]amix=inputs=2:duration=longest:dropout_transition=0,atrim=0:{duration}[audio]",
        "-map",
        "0:v",
        "-map",
        "[audio]",
        "-t",
        f"{duration:.3f}",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "25",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    if process.stdin is None:
        raise RuntimeError("Could not open ffmpeg input stream")
    for frame_index in range(frame_count):
        time_value = frame_index / VIDEO_FPS
        frame = render_scene_frame(guide, scene, time_value, duration, base)
        process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError(f"ffmpeg failed while rendering {output}")
    return duration


def build_video(guide: dict, ffmpeg: str, edge_tts) -> float:
    guide_work = WORK_DIR / guide["id"]
    guide_work.mkdir(parents=True, exist_ok=True)
    segment_paths = []
    scenes = get_video_scenes(guide)
    audio_paths = asyncio.run(synthesize_neural_audio(edge_tts, scenes, guide_work))
    music_path, click_path, success_path = ensure_audio_assets()
    for index, (scene, audio) in enumerate(zip(scenes, audio_paths)):
        segment = guide_work / f"segment-v3-{index}.mp4"
        render_scene_segment(guide, scene, audio, segment, ffmpeg, click_path, success_path)
        segment_paths.append(segment)

    concat_file = guide_work / "segments-v3.txt"
    concat_file.write_text("".join(f"file '{path}'\n" for path in segment_paths), encoding="utf-8")
    silent_music_video = guide_work / "tutorial-v3-voice.mp4"
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
            str(silent_music_video),
        ],
        check=True,
    )
    output = VIDEOS_DIR / f"{guide['id']}.mp4"
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(silent_music_video),
            "-stream_loop",
            "-1",
            "-i",
            str(music_path),
            "-filter_complex",
            "[0:a]volume=1.0[voice];[1:a]volume=0.055[background];[voice][background]amix=inputs=2:duration=first:dropout_transition=2[audio]",
            "-map",
            "0:v",
            "-map",
            "[audio]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )
    return get_media_duration(output, ffmpeg)


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
