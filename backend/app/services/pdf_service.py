"""PDF generation service — convierte Markdown a PDF corporativo St4rtup."""
import io
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

# St4rtup corporate colors
CYAN = '#0cd5e8'
DARK_CYAN = '#0891b2'
NAVY = '#0a0e1a'
DARK_NAVY = '#164e63'
GRAY = '#64748b'
LIGHT_GRAY = '#f1f5f9'
WHITE = '#ffffff'


def markdown_to_pdf(
    markdown_text: str,
    title: str = "Propuesta Comercial",
    client_name: str = "",
    client_company: str = "",
    date_str: str = "",
) -> bytes:
    """Convierte Markdown a PDF corporativo St4rtup.

    Genera un PDF con portada, header/footer corporativo, tablas y tipografia profesional.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable

    buffer = io.BytesIO()
    if not date_str:
        date_str = datetime.now().strftime("%d/%m/%Y")

    page_count = [0]

    def _header_footer(canvas, doc):
        page_count[0] = doc.page
        canvas.saveState()

        # Skip header/footer on cover page (page 1)
        if doc.page == 1:
            canvas.restoreState()
            return

        # Header — cyan accent line + logo
        canvas.setStrokeColor(HexColor(CYAN))
        canvas.setLineWidth(2.5)
        canvas.line(2 * cm, A4[1] - 1.5 * cm, A4[0] - 2 * cm, A4[1] - 1.5 * cm)

        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(HexColor(DARK_CYAN))
        canvas.drawString(2 * cm, A4[1] - 1.3 * cm, 'ST4RTUP')

        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(HexColor(GRAY))
        canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.3 * cm, title)

        # Footer — line + confidential + page
        canvas.setStrokeColor(HexColor('#e2e8f0'))
        canvas.setLineWidth(0.5)
        canvas.line(2 * cm, 1.5 * cm, A4[0] - 2 * cm, 1.5 * cm)

        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(HexColor(GRAY))
        canvas.drawString(2 * cm, 1.0 * cm, 'St4rtup | CRM para Startups')
        canvas.drawCentredString(A4[0] / 2, 1.0 * cm, 'CONFIDENCIAL')
        canvas.drawRightString(A4[0] - 2 * cm, 1.0 * cm, f'{doc.page}')

        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
        topMargin=2.5 * cm, bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Corporate styles
    styles.add(ParagraphStyle(
        'CoverTitle', parent=styles['Title'],
        fontSize=28, spaceAfter=8, textColor=HexColor(NAVY),
        fontName='Helvetica-Bold', leading=34,
    ))
    styles.add(ParagraphStyle(
        'CoverSubtitle', parent=styles['Normal'],
        fontSize=14, spaceAfter=6, textColor=HexColor(DARK_CYAN),
        fontName='Helvetica',
    ))
    styles.add(ParagraphStyle(
        'CoverMeta', parent=styles['Normal'],
        fontSize=11, spaceAfter=4, textColor=HexColor(GRAY),
        fontName='Helvetica', leading=16,
    ))
    styles.add(ParagraphStyle(
        'RiskH1', parent=styles['Heading1'],
        fontSize=20, spaceAfter=12, spaceBefore=20, textColor=HexColor(DARK_CYAN),
        fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        'RiskH2', parent=styles['Heading2'],
        fontSize=14, spaceAfter=8, spaceBefore=16, textColor=HexColor(DARK_NAVY),
        fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        'RiskH3', parent=styles['Heading3'],
        fontSize=12, spaceAfter=6, spaceBefore=10, textColor=HexColor(DARK_CYAN),
        fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        'RiskBody', parent=styles['Normal'],
        fontSize=10, spaceAfter=6, leading=15, textColor=HexColor('#1e293b'),
    ))
    styles.add(ParagraphStyle(
        'RiskBullet', parent=styles['Normal'],
        fontSize=10, spaceAfter=4, leading=15, leftIndent=20,
        bulletIndent=10, textColor=HexColor('#1e293b'),
    ))

    elements = []

    # ════════════════════════════════════════════════════
    # COVER PAGE
    # ════════════════════════════════════════════════════
    elements.append(Spacer(1, 4 * cm))

    # Cyan accent bar
    elements.append(HRFlowable(
        width="100%", thickness=4, color=HexColor(CYAN),
        spaceAfter=20, spaceBefore=0,
    ))

    elements.append(Paragraph('ST4RTUP', ParagraphStyle(
        'LogoText', parent=styles['Normal'],
        fontSize=16, textColor=HexColor(DARK_CYAN),
        fontName='Helvetica-Bold', spaceAfter=30,
    )))

    elements.append(Paragraph(title, styles['CoverTitle']))

    elements.append(HRFlowable(
        width="40%", thickness=2, color=HexColor(CYAN),
        spaceAfter=30, spaceBefore=10, hAlign='LEFT',
    ))

    if client_company:
        elements.append(Paragraph(f'Preparado para: <b>{client_company}</b>', styles['CoverSubtitle']))
    if client_name:
        elements.append(Paragraph(f'Contacto: {client_name}', styles['CoverMeta']))

    elements.append(Spacer(1, 1 * cm))
    elements.append(Paragraph(f'Fecha: {date_str}', styles['CoverMeta']))
    elements.append(Paragraph('Clasificacion: CONFIDENCIAL', styles['CoverMeta']))

    elements.append(Spacer(1, 3 * cm))

    # Footer info on cover
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=HexColor('#e2e8f0'),
        spaceAfter=10,
    ))
    elements.append(Paragraph(
        'St4rtup | CRM para Startups<br/>'
        '<font color="#0891b2">www.st4rtup.app</font> | <font color="#0891b2">hello@st4rtup.app</font>',
        ParagraphStyle('CoverFooter', parent=styles['Normal'],
                       fontSize=8, textColor=HexColor(GRAY), leading=12, alignment=1),
    ))

    elements.append(PageBreak())

    # ════════════════════════════════════════════════════
    # CONTENT PAGES
    # ════════════════════════════════════════════════════
    lines = markdown_text.split('\n')
    table_buffer = []
    in_table = False

    for line in lines:
        stripped = line.strip()

        if not stripped:
            if in_table and table_buffer:
                elements.append(_build_table(table_buffer))
                table_buffer = []
                in_table = False
            elements.append(Spacer(1, 6))
            continue

        # Table row
        if '|' in stripped and not stripped.startswith('#'):
            cells = [c.strip() for c in stripped.split('|') if c.strip()]
            if cells and not all(c.replace('-', '').replace(':', '') == '' for c in cells):
                table_buffer.append(cells)
                in_table = True
            continue

        if in_table and table_buffer:
            elements.append(_build_table(table_buffer))
            table_buffer = []
            in_table = False

        # Headers — add separator line before H1
        if stripped.startswith('# '):
            elements.append(HRFlowable(width="100%", thickness=1.5, color=HexColor(CYAN), spaceAfter=8, spaceBefore=12))
            elements.append(Paragraph(_clean_md(stripped[2:]), styles['RiskH1']))
        elif stripped.startswith('## '):
            elements.append(Paragraph(_clean_md(stripped[3:]), styles['RiskH2']))
        elif stripped.startswith('### '):
            elements.append(Paragraph(_clean_md(stripped[4:]), styles['RiskH3']))
        elif stripped.startswith('- ') or stripped.startswith('* '):
            text = _clean_md(stripped[2:])
            elements.append(Paragraph(f"\u2022 {text}", styles['RiskBullet']))
        elif re.match(r'^\d+\.\s', stripped):
            text = _clean_md(re.sub(r'^\d+\.\s', '', stripped))
            num = re.match(r'^(\d+)', stripped).group(1)
            elements.append(Paragraph(f"{num}. {text}", styles['RiskBullet']))
        else:
            elements.append(Paragraph(_clean_md(stripped), styles['RiskBody']))

    if table_buffer:
        elements.append(_build_table(table_buffer))

    doc.build(elements, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buffer.getvalue()


def _clean_md(text: str) -> str:
    """Remove markdown formatting for PDF."""
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    text = re.sub(r'`(.+?)`', r'<font face="Courier" color="#0891b2">\1</font>', text)
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'<font color="#0891b2">\1</font>', text)
    return text


def _build_table(rows: list[list[str]]):
    """Build a corporate-styled reportlab Table."""
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import Table, TableStyle, Spacer

    if not rows:
        return Spacer(1, 1)

    max_cols = max(len(r) for r in rows)
    normalized = [r + [''] * (max_cols - len(r)) for r in rows]

    table = Table(normalized, repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), HexColor(DARK_NAVY)),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor(WHITE)),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor(LIGHT_GRAY), HexColor(WHITE)]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]
    table.setStyle(TableStyle(style))
    return table
