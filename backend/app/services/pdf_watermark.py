"""PDF Watermarking service for Deal Room documents."""
import io
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def apply_watermark(
    pdf_bytes: bytes,
    company_name: str,
    recipient_email: str,
) -> bytes:
    """Apply diagonal watermark to all pages of a PDF."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.warning("PyMuPDF not installed, returning original PDF")
        return pdf_bytes

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    timestamp = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    watermark_text = f"{company_name}\n{recipient_email}\n{timestamp}\nCONFIDENCIAL — St4rtup"

    for page in doc:
        rect = page.rect
        # Diagonal watermark - semitransparent gray
        fontsize = 28

        # Calculate center position
        center_x = rect.width / 2
        center_y = rect.height / 2

        # Insert watermark text with rotation
        page.insert_text(
            fitz.Point(center_x - 200, center_y - 50),
            watermark_text,
            fontsize=fontsize,
            fontname="helv",
            color=(0.53, 0.53, 0.53),  # #888888
            rotate=45,
            overlay=True,
        )

    output = io.BytesIO()
    doc.save(output)
    doc.close()
    return output.getvalue()
