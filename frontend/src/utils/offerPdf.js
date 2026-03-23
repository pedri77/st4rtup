import jsPDF from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'

// Apply autoTable plugin to jsPDF
applyPlugin(jsPDF)

const BRAND_CYAN = [8, 145, 178]    // #0891b2
const BRAND_DARK = [21, 94, 117]    // #155e75
const GRAY_800 = [31, 41, 55]
const GRAY_600 = [75, 85, 99]
const GRAY_400 = [156, 163, 175]
const WHITE = [255, 255, 255]

// Catálogo de descripciones extendidas por área para el PDF
const AREA_DESCRIPTIONS = {
  'Plataforma GRC': {
    description: 'Plataforma integral de Gobernanza, Riesgo y Cumplimiento (GRC) que permite gestionar de forma centralizada todos los aspectos de seguridad de la información y cumplimiento normativo de su organización.',
    features: [
      'Panel de control ejecutivo con métricas en tiempo real',
      'Gestión centralizada de normativas y marcos regulatorios',
      'Automatización de flujos de trabajo de cumplimiento',
      'Generación automática de informes y evidencias',
      'Acceso multi-usuario con perfiles y permisos configurables',
      'API REST para integración con sistemas corporativos',
    ],
  },
  'Módulos Cumplimiento': {
    description: 'Módulos especializados de cumplimiento normativo que cubren las principales regulaciones europeas y nacionales de ciberseguridad. Cada módulo incluye frameworks predefinidos, controles mapeados y generación automática de evidencias.',
    features: [
      'Frameworks normativos completos precargados',
      'Mapeo automático de controles entre normativas',
      'Seguimiento del nivel de cumplimiento en tiempo real',
      'Generación de planes de adecuación y remediación',
      'Alertas automáticas de vencimientos y cambios regulatorios',
      'Exportación de informes para auditorías externas',
    ],
  },
  'Módulos Funcionales': {
    description: 'Módulos funcionales avanzados que complementan la plataforma GRC con capacidades específicas de gestión operativa de la seguridad de la información.',
    features: [
      'Metodologías de análisis de riesgos (MAGERIT, ISO 31000)',
      'Inventario y clasificación automática de activos',
      'Workflow de gestión de incidentes con escalado',
      'Planificación y seguimiento de auditorías internas',
      'Dashboards ejecutivos personalizables',
    ],
  },
  'Servicios': {
    description: 'Servicios profesionales de consultoría y acompañamiento para maximizar el valor de la plataforma St4rtup y asegurar una implantación exitosa en su organización.',
    features: [
      'Equipo consultor certificado (CISA, CISM, ISO 27001 LA)',
      'Metodología de implantación probada y documentada',
      'Formación adaptada al nivel y rol de cada usuario',
      'Acompañamiento continuo durante el periodo de adopción',
      'Transferencia de conocimiento y documentación completa',
    ],
  },
  'Soporte': {
    description: 'Planes de soporte técnico y mantenimiento que garantizan el correcto funcionamiento de la plataforma y la resolución ágil de incidencias.',
    features: [
      'Soporte técnico por email, teléfono y portal web',
      'Actualizaciones de seguridad y funcionalidad incluidas',
      'Monitorización proactiva de la plataforma',
      'Gestor de cuenta dedicado (plan Premium)',
      'SLA garantizado con tiempos de respuesta definidos',
    ],
  },
  'Design Partners': {
    description: 'Programa exclusivo de colaboración estratégica para organizaciones que desean participar activamente en el desarrollo y evolución de la plataforma St4rtup. Los Design Partners obtienen condiciones preferentes, acceso anticipado a nuevas funcionalidades y participan en la definición del roadmap del producto.',
    features: [
      'Licencia con condiciones económicas preferentes',
      'Acceso anticipado a nuevas funcionalidades (beta)',
      'Participación en el co-desarrollo de módulos normativos',
      'Advisory Board: influencia directa en el roadmap del producto',
      'Formación y soporte Premium incluidos',
      'Desarrollo de caso de éxito conjunto',
      'Visibilidad como referencia tecnológica en el sector',
    ],
  },
}

const LEGAL_TERMS = `
1. VALIDEZ DE LA OFERTA
La presente propuesta comercial tiene validez por el periodo indicado en la misma. Transcurrido dicho plazo, St4rtup se reserva el derecho de modificar las condiciones y precios aquí reflejados.

2. CONDICIONES DE PAGO
Salvo acuerdo expreso por escrito, las condiciones de pago serán las indicadas en esta propuesta. El impago en los plazos acordados devengará los intereses de demora establecidos por la Ley 3/2004 de lucha contra la morosidad.

3. PROPIEDAD INTELECTUAL
St4rtup retiene todos los derechos de propiedad intelectual e industrial sobre la plataforma, módulos, documentación y materiales entregados. El cliente adquiere una licencia de uso no exclusiva e intransferible por el periodo contratado.

4. CONFIDENCIALIDAD
Ambas partes se comprometen a mantener la confidencialidad de toda información intercambiada en el marco de esta propuesta y, en su caso, de la relación contractual. Esta obligación se mantendrá vigente durante 2 años tras la finalización del contrato.

5. PROTECCIÓN DE DATOS
St4rtup actuará como Encargado del Tratamiento conforme al artículo 28 del RGPD (UE) 2016/679. Se formalizará el correspondiente contrato de encargo de tratamiento. Los datos se alojarán en servidores ubicados dentro del Espacio Económico Europeo.

6. NIVEL DE SERVICIO (SLA)
Los niveles de servicio aplicables dependerán del plan de soporte contratado. Los SLA detallados se adjuntarán como anexo al contrato de servicio.

7. LEGISLACIÓN APLICABLE
La presente propuesta y la relación contractual derivada se regirán por la legislación española. Para la resolución de cualquier controversia, ambas partes se someten a los Juzgados y Tribunales de Madrid.
`.trim()

/**
 * Genera un PDF profesional de la oferta comercial y lo descarga
 * @param {Object} offer - Objeto de la oferta con todos sus datos
 */
export function generateOfferPDF(offer) {
  try {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let y = 0

    const formatCurrency = (amount) =>
      new Intl.NumberFormat('es-ES', { style: 'currency', currency: offer.currency || 'EUR' }).format(amount || 0)

    const formatDate = (date) =>
      date ? new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

    const addPageFooter = (pageNum, totalPages) => {
      doc.setDrawColor(...GRAY_400)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
      doc.setFontSize(8)
      doc.setTextColor(...GRAY_400)
      doc.text('CONFIDENCIAL - St4rtup ' + new Date().getFullYear(), margin, pageHeight - 10)
      doc.text('Pagina ' + pageNum + ' de ' + totalPages, pageWidth - margin, pageHeight - 10, { align: 'right' })
      doc.text(offer.reference || '', pageWidth / 2, pageHeight - 10, { align: 'center' })
    }

    const checkNewPage = (needed) => {
      if (y + (needed || 30) > pageHeight - 25) {
        doc.addPage()
        y = 25
        return true
      }
      return false
    }

    // ========== PAGE 1: COVER ==========
    doc.setFillColor(...BRAND_DARK)
    doc.rect(0, 0, pageWidth, 55, 'F')
    doc.setFillColor(...BRAND_CYAN)
    doc.rect(0, 50, pageWidth, 5, 'F')

    // Logo text
    doc.setTextColor(...WHITE)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('RISKITERA', margin, 25)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Plataforma GRC de Ciberseguridad', margin, 33)

    // Reference
    doc.setFontSize(11)
    doc.text(offer.reference || '', pageWidth - margin, 25, { align: 'right' })
    doc.setFontSize(9)
    doc.text(formatDate(offer.created_at), pageWidth - margin, 33, { align: 'right' })

    // Title block
    y = 75
    doc.setTextColor(...GRAY_800)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('PROPUESTA COMERCIAL', margin, y)
    y += 10
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    const titleLines = doc.splitTextToSize(offer.title || 'Propuesta Comercial', contentWidth)
    doc.text(titleLines, margin, y)
    y += titleLines.length * 10 + 5

    // Decorative line
    doc.setDrawColor(...BRAND_CYAN)
    doc.setLineWidth(1)
    doc.line(margin, y, margin + 50, y)
    y += 15

    // Client info box
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'S')

    doc.setTextColor(...BRAND_CYAN)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE', margin + 8, y + 10)
    doc.setTextColor(...GRAY_800)
    doc.setFontSize(14)
    doc.text(offer.lead_name || 'Cliente', margin + 8, y + 20)

    if (offer.valid_until) {
      doc.setTextColor(...BRAND_CYAN)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('VALIDA HASTA', pageWidth / 2 + 10, y + 10)
      doc.setTextColor(...GRAY_800)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text(formatDate(offer.valid_until), pageWidth / 2 + 10, y + 20)
    }

    doc.setTextColor(...BRAND_CYAN)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('IMPORTE TOTAL', margin + 8, y + 32)
    doc.setTextColor(...BRAND_DARK)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(offer.total), margin + 50, y + 32)

    y += 50

    // Description
    if (offer.description) {
      y += 5
      doc.setTextColor(...GRAY_600)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(offer.description, contentWidth)
      doc.text(descLines, margin, y)
      y += descLines.length * 5 + 10
    }

    // ========== PAGE 2+: LINE ITEMS & DESCRIPTIONS ==========
    doc.addPage()
    y = 25

    // Section: Detalle de la propuesta
    doc.setTextColor(...BRAND_DARK)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalle de la Propuesta', margin, y)
    doc.setDrawColor(...BRAND_CYAN)
    doc.setLineWidth(0.8)
    doc.line(margin, y + 3, margin + 60, y + 3)
    y += 15

    // Items table
    if (offer.items && offer.items.length > 0) {
      doc.autoTable({
        startY: y,
        head: [['Concepto', 'Descripcion', 'Cant.', 'P. Unitario', 'Total']],
        body: offer.items.map(function(item) {
          return [
            item.name || '',
            item.description || '',
            String(item.quantity || 1),
            formatCurrency(item.unit_price),
            formatCurrency(item.total || (item.quantity || 1) * (item.unit_price || 0)),
          ]
        }),
        theme: 'striped',
        headStyles: {
          fillColor: BRAND_DARK,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: GRAY_800,
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 55 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      })

      y = doc.lastAutoTable.finalY + 8

      // Financial summary box
      checkNewPage(50)
      var summaryX = pageWidth - margin - 75
      var summaryW = 75

      doc.setFillColor(245, 247, 250)
      doc.roundedRect(summaryX, y, summaryW, 48, 2, 2, 'F')
      doc.setDrawColor(229, 231, 235)
      doc.roundedRect(summaryX, y, summaryW, 48, 2, 2, 'S')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY_600)

      var sy = y + 8
      doc.text('Subtotal', summaryX + 5, sy)
      doc.text(formatCurrency(offer.subtotal), summaryX + summaryW - 5, sy, { align: 'right' })
      sy += 7

      if (offer.discount_percent > 0) {
        doc.setTextColor(220, 38, 38)
        doc.text('Descuento (' + offer.discount_percent + '%)', summaryX + 5, sy)
        doc.text('-' + formatCurrency(offer.discount_amount), summaryX + summaryW - 5, sy, { align: 'right' })
        sy += 7
      }

      doc.setTextColor(...GRAY_600)
      doc.text('IVA (' + offer.tax_rate + '%)', summaryX + 5, sy)
      doc.text('+' + formatCurrency(offer.tax_amount), summaryX + summaryW - 5, sy, { align: 'right' })
      sy += 3

      doc.setDrawColor(...BRAND_CYAN)
      doc.setLineWidth(0.5)
      doc.line(summaryX + 5, sy, summaryX + summaryW - 5, sy)
      sy += 7

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BRAND_DARK)
      doc.text('TOTAL', summaryX + 5, sy)
      doc.text(formatCurrency(offer.total), summaryX + summaryW - 5, sy, { align: 'right' })

      y += 58
    }

    // ========== AREA DESCRIPTIONS ==========
    var itemCategories = new Set()
    if (offer.items && offer.items.length > 0) {
      for (var i = 0; i < offer.items.length; i++) {
        var nameLower = (offer.items[i].name || '').toLowerCase()
        if (nameLower.includes('plataforma') || nameLower.includes('licencia anual') || nameLower.includes('licencia mensual') || nameLower.includes('usuarios adicionales')) {
          itemCategories.add('Plataforma GRC')
        }
        if (nameLower.includes('modulo ens') || nameLower.includes('modulo nis') || nameLower.includes('modulo dora') || nameLower.includes('modulo iso') || nameLower.includes('modulo eu ai') || nameLower.includes('pack normativo') || nameLower.includes('módulo ens') || nameLower.includes('módulo nis') || nameLower.includes('módulo dora') || nameLower.includes('módulo iso') || nameLower.includes('módulo eu ai')) {
          itemCategories.add('Módulos Cumplimiento')
        }
        if (nameLower.includes('riesgos') || nameLower.includes('activos') || nameLower.includes('incidentes') || nameLower.includes('evidencias') || nameLower.includes('dashboard ejecutivo')) {
          itemCategories.add('Módulos Funcionales')
        }
        if (nameLower.includes('implantacion') || nameLower.includes('implantación') || nameLower.includes('formacion') || nameLower.includes('formación') || nameLower.includes('consultoria') || nameLower.includes('consultoría') || nameLower.includes('gap analysis') || nameLower.includes('auditoria de seguridad') || nameLower.includes('auditoría de seguridad')) {
          itemCategories.add('Servicios')
        }
        if (nameLower.includes('soporte') || nameLower.includes('bolsa de horas')) {
          itemCategories.add('Soporte')
        }
        if (nameLower.includes('design partner')) {
          itemCategories.add('Design Partners')
        }
      }
    }

    if (itemCategories.size > 0) {
      checkNewPage(40)
      doc.setTextColor(...BRAND_DARK)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Descripcion de los Servicios', margin, y)
      doc.setDrawColor(...BRAND_CYAN)
      doc.setLineWidth(0.8)
      doc.line(margin, y + 3, margin + 65, y + 3)
      y += 15

      for (var area of itemCategories) {
        var info = AREA_DESCRIPTIONS[area]
        if (!info) continue

        checkNewPage(60)

        // Area title
        doc.setFillColor(...BRAND_CYAN)
        doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(area.toUpperCase(), margin + 5, y + 5.5)
        y += 13

        // Description
        doc.setTextColor(...GRAY_800)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        var areaDescLines = doc.splitTextToSize(info.description, contentWidth - 5)
        doc.text(areaDescLines, margin + 3, y)
        y += areaDescLines.length * 4.5 + 5

        // Features list
        doc.setTextColor(...GRAY_600)
        doc.setFontSize(8.5)
        for (var fi = 0; fi < info.features.length; fi++) {
          checkNewPage(8)
          doc.setFillColor(...BRAND_CYAN)
          doc.circle(margin + 5, y - 1, 1, 'F')
          doc.text(info.features[fi], margin + 9, y)
          y += 5
        }
        y += 8
      }
    }

    // ========== PAYMENT TERMS ==========
    if (offer.payment_terms) {
      checkNewPage(30)
      doc.setTextColor(...BRAND_DARK)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Condiciones de Pago', margin, y)
      doc.setDrawColor(...BRAND_CYAN)
      doc.setLineWidth(0.8)
      doc.line(margin, y + 3, margin + 55, y + 3)
      y += 12

      doc.setTextColor(...GRAY_800)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      var payLines = doc.splitTextToSize(offer.payment_terms, contentWidth)
      doc.text(payLines, margin, y)
      y += payLines.length * 4.5 + 10
    }

    // ========== LEGAL TERMS ==========
    doc.addPage()
    y = 25

    doc.setTextColor(...BRAND_DARK)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Condiciones Legales', margin, y)
    doc.setDrawColor(...BRAND_CYAN)
    doc.setLineWidth(0.8)
    doc.line(margin, y + 3, margin + 55, y + 3)
    y += 15

    var legalSections = LEGAL_TERMS.split('\n\n')
    for (var li = 0; li < legalSections.length; li++) {
      checkNewPage(25)
      var secLines = legalSections[li].split('\n')
      var secTitle = secLines[0]
      var secBody = secLines.slice(1).join('\n').trim()

      doc.setTextColor(...GRAY_800)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(secTitle, margin, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY_600)
      doc.setFontSize(8.5)
      var bodyLines = doc.splitTextToSize(secBody, contentWidth - 5)
      doc.text(bodyLines, margin + 3, y)
      y += bodyLines.length * 4 + 8
    }

    // ========== SIGNATURE BLOCK ==========
    checkNewPage(50)
    y += 10
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 15

    doc.setTextColor(...GRAY_800)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Aceptacion de la Propuesta', margin, y)
    y += 12

    var colW = (contentWidth - 20) / 2

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY_600)

    // Left: St4rtup
    doc.text('Por St4rtup:', margin, y)
    var signY = y + 20
    doc.setDrawColor(...GRAY_400)
    doc.line(margin, signY, margin + colW, signY)
    doc.setFontSize(8)
    doc.text('Firma y sello', margin, signY + 5)
    doc.text('Fecha: ___/___/______', margin, signY + 10)

    // Right: Client
    var rightX = margin + colW + 20
    doc.setFontSize(9)
    doc.text('Por ' + (offer.lead_name || 'el Cliente') + ':', rightX, y)
    doc.line(rightX, signY, rightX + colW, signY)
    doc.setFontSize(8)
    doc.text('Firma y sello', rightX, signY + 5)
    doc.text('Fecha: ___/___/______', rightX, signY + 10)

    // ========== ADD PAGE NUMBERS ==========
    var totalPages = doc.internal.getNumberOfPages()
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      addPageFooter(p, totalPages)
    }

    // Save - download the file
    var filename = (offer.reference || 'Oferta') + '_' + (offer.lead_name || 'Cliente').replace(/\s+/g, '_') + '.pdf'
    doc.save(filename)
  } catch (err) {
    console.error('Error generating PDF:', err)
    alert('Error al generar el PDF: ' + err.message)
  }
}
