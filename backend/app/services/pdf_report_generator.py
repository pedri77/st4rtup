"""Sprint D — PDF Report Generator.

Genera reportes PDF descargables con branding st4rtup.
Usa reportlab (ya en requirements.txt).
"""
import io
import logging
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

logger = logging.getLogger(__name__)

# Brand colors
BRAND_BLUE = colors.HexColor("#1E6FD9")
BRAND_DARK = colors.HexColor("#0F172A")
BRAND_GRAY = colors.HexColor("#64748B")
BRAND_LIGHT = colors.HexColor("#F8FAFC")


def _get_styles():
    """Custom paragraph styles."""
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "BrandTitle", parent=styles["Title"],
        fontSize=22, textColor=BRAND_DARK, spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        "BrandH2", parent=styles["Heading2"],
        fontSize=14, textColor=BRAND_BLUE, spaceBefore=12, spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        "BrandBody", parent=styles["Normal"],
        fontSize=10, textColor=BRAND_DARK, spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "BrandSmall", parent=styles["Normal"],
        fontSize=8, textColor=BRAND_GRAY,
    ))
    return styles


def generate_pipeline_report(data: dict) -> bytes:
    """Genera PDF del pipeline report."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = _get_styles()
    story = []

    # Header
    story.append(Paragraph("St4rtup CRM — Pipeline Report", styles["BrandTitle"]))
    story.append(Paragraph(f"Generado: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}", styles["BrandSmall"]))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE))
    story.append(Spacer(1, 12))

    # KPIs
    story.append(Paragraph("Resumen del Pipeline", styles["BrandH2"]))
    kpi_data = [
        ["Oportunidades abiertas", str(data.get("open_deals", 0))],
        ["Valor total pipeline", f"{data.get('total_value', 0):,.0f} EUR"],
        ["Valor ponderado", f"{data.get('weighted_value', 0):,.0f} EUR"],
        ["Win rate", f"{data.get('win_rate', 0):.0f}%"],
        ["Ticket medio", f"{data.get('avg_deal_size', 0):,.0f} EUR"],
    ]
    kpi_table = Table(kpi_data, colWidths=[10*cm, 6*cm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
        ("TEXTCOLOR", (0, 0), (0, -1), BRAND_DARK),
        ("TEXTCOLOR", (1, 0), (1, -1), BRAND_BLUE),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 16))

    # Deals by stage
    if data.get("by_stage"):
        story.append(Paragraph("Oportunidades por Stage", styles["BrandH2"]))
        stage_header = ["Stage", "Deals", "Valor (EUR)", "Prob. media"]
        stage_rows = [stage_header]
        for s in data["by_stage"]:
            stage_rows.append([
                s.get("stage", ""),
                str(s.get("count", 0)),
                f"{s.get('value', 0):,.0f}",
                f"{s.get('avg_probability', 0):.0f}%",
            ])
        stage_table = Table(stage_rows, colWidths=[5*cm, 3*cm, 5*cm, 3*cm])
        stage_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
        ]))
        story.append(stage_table)
        story.append(Spacer(1, 16))

    # Top deals
    if data.get("top_deals"):
        story.append(Paragraph("Top Deals", styles["BrandH2"]))
        deal_header = ["Empresa", "Valor", "Stage", "Probabilidad"]
        deal_rows = [deal_header]
        for d in data["top_deals"][:10]:
            deal_rows.append([
                d.get("company", "")[:30],
                f"{d.get('value', 0):,.0f} EUR",
                d.get("stage", ""),
                f"{d.get('probability', 0)}%",
            ])
        deal_table = Table(deal_rows, colWidths=[6*cm, 4*cm, 4*cm, 3*cm])
        deal_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
        ]))
        story.append(deal_table)

    # Footer
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_GRAY))
    story.append(Paragraph(
        "Generado por St4rtup CRM · st4rtup.com · Confidencial",
        styles["BrandSmall"],
    ))

    doc.build(story)
    return buf.getvalue()


def generate_activity_report(data: dict) -> bytes:
    """Genera PDF del reporte de actividad."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = _get_styles()
    story = []

    story.append(Paragraph("St4rtup CRM — Activity Report", styles["BrandTitle"]))
    story.append(Paragraph(
        f"Periodo: {data.get('period', 'Últimos 30 días')} · "
        f"Generado: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
        styles["BrandSmall"],
    ))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE))
    story.append(Spacer(1, 12))

    # Activity KPIs
    story.append(Paragraph("Resumen de Actividad", styles["BrandH2"]))
    kpi_data = [
        ["Leads nuevos", str(data.get("new_leads", 0))],
        ["Visitas realizadas", str(data.get("visits", 0))],
        ["Emails enviados", str(data.get("emails_sent", 0))],
        ["Acciones completadas", str(data.get("actions_completed", 0))],
        ["Deals cerrados (won)", str(data.get("deals_won", 0))],
        ["Revenue generado", f"{data.get('revenue', 0):,.0f} EUR"],
    ]
    kpi_table = Table(kpi_data, colWidths=[10*cm, 6*cm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
        ("TEXTCOLOR", (1, 0), (1, -1), BRAND_BLUE),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
    ]))
    story.append(kpi_table)

    # Footer
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_GRAY))
    story.append(Paragraph("Generado por St4rtup CRM · st4rtup.com · Confidencial", styles["BrandSmall"]))

    doc.build(story)
    return buf.getvalue()
