from django.utils import timezone
from .models import Cuota, Comprobante
from .sunat import procesar_comprobante_sunat
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime


class CuotaNoPendienteException(Exception):
    pass


def marcar_cuota_como_pagada(cuota: Cuota, transaccion_id: str = None) -> Cuota:
    """
    Marca una cuota como pagada registrando su fecha y transacción.
    Valida que la cuota no esté pagada previamente.
    """
    if cuota.pagado:
        raise CuotaNoPendienteException("Esta cuota ya ha sido pagada.")
    
    cuota.pagado = True
    cuota.fecha_pago = timezone.now()
    if transaccion_id:
        cuota.transaccion_id = transaccion_id
    cuota.save(update_fields=['pagado', 'fecha_pago', 'transaccion_id'])
    
    # Crear comprobante en FactuSmart para el pago en efectivo
    comp = crear_comprobante(
        colegiado=cuota.colegiado,
        monto=cuota.monto,
        canal='PRESENCIAL',
        metodo_pago='EFECTIVO',
        transaccion_id=transaccion_id,
        cuota=cuota,
        observaciones=f"Pago de cuota en efectivo: {cuota.anio_cobro}-{cuota.mes_cobro:02d}"
    )
    
    # Enviar correo automáticamente al colegiado con el PDF
    if cuota.colegiado.correo:
        try:
            from core.emails import enviar_confirmacion_pago
            import os
            pdf_url = None
            if comp.sunat_hash:
                ruc = os.getenv("SUNAT_RUC_EMISOR", "20123456789")
                base_url = os.getenv("FACTU_URL", "https://20123456789.s2.factusmart.pe/api/v1/issuer/documents").split('/documents')[0]
                pdf_url = f"{base_url}/documents/{comp.sunat_hash}/pdf?ruc={ruc}"
                
            enviar_confirmacion_pago(
                correo=cuota.colegiado.correo,
                nombres=cuota.colegiado.nombre_completo,
                nro_colegiado=cuota.colegiado.cip,
                monto_total=float(cuota.monto),
                periodos_pagados=[f"{cuota.anio_cobro}-{cuota.mes_cobro:02d}"],
                nro_operacion=transaccion_id or "EFECTIVO-PRESENCIAL",
                pdf_url=pdf_url
            )
        except Exception as e:
            import sys
            print(f"[EMAIL ERROR EFECTIVO] {e}", file=sys.stderr)

    return cuota


def generar_numero_comprobante() -> str:
    """
    Genera un número de comprobante único basado en timestamp.
    Formato: CMP-YYYYMMDD-HHMMSS-XXXX
    """
    from datetime import datetime
    import random
    ahora = datetime.now()
    numero_random = random.randint(1000, 9999)
    return f"CMP-{ahora.strftime('%Y%m%d%H%M%S')}-{numero_random}"


def crear_comprobante(
    colegiado,
    monto,
    canal='PRESENCIAL',
    metodo_pago='EFECTIVO',
    transaccion_id=None,
    cuota=None,
    observaciones=None
) -> Comprobante:
    """
    Crea un nuevo comprobante de pago.
    
    Args:
        colegiado: Instancia de Colegiado
        monto: Decimal con el monto pagado
        canal: 'PRESENCIAL' o 'ONLINE'
        metodo_pago: Método de pago utilizado
        transaccion_id: ID de la transacción (opcional)
        cuota: Instancia de Cuota asociada (opcional)
        observaciones: Observaciones adicionales
    
    Returns:
        Comprobante creado
    """
    numero = generar_numero_comprobante()
    
    comprobante = Comprobante.objects.create(
        colegiado=colegiado,
        cuota=cuota,
        numero_comprobante=numero,
        monto=monto,
        canal=canal,
        metodo_pago=metodo_pago,
        transaccion_id=transaccion_id,
        observaciones=observaciones,
        estado='GENERADO'
    )
    
    # Procesar electrónicamente en SUNAT
    procesar_comprobante_sunat(comprobante)
    
    return comprobante


def generar_pdf_comprobante(comprobante: Comprobante) -> BytesIO:
    """
    Genera un PDF de comprobante de pago usando ReportLab.
    
    Args:
        comprobante: Instancia de Comprobante
    
    Returns:
        BytesIO con el PDF generado
    """
    # Crear buffer para el PDF
    buffer = BytesIO()
    
    # Crear el documento PDF
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    
    # Obtener estilos
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    titulo_style = ParagraphStyle(
        'TituloStyle',
        parent=styles['Normal'],
        fontSize=18,
        textColor=colors.HexColor('#003D7A'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    encabezado_style = ParagraphStyle(
        'EncabezadoStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#333333'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#666666'),
        spaceAfter=3,
        fontName='Helvetica-Bold'
    )
    
    valor_style = ParagraphStyle(
        'ValorStyle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#000000'),
        spaceAfter=8,
        fontName='Helvetica'
    )
    
    # Titulo
    story.append(Paragraph("COMPROBANTE DE PAGO", titulo_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Información institucional
    story.append(Paragraph("COLEGIO DE INGENIEROS DEL PERÚ", encabezado_style))
    story.append(Spacer(1, 0.08*inch))
    
    # Número de comprobante
    story.append(Paragraph(f"<b>Comprobante Nº:</b> {comprobante.numero_comprobante}", label_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Sección de Información del Colegiado
    story.append(Paragraph("<b>INFORMACIÓN DEL COLEGIADO</b>", label_style))
    
    data_colegiado = [
        ['ID Colegiado (CIP):', f"{comprobante.colegiado.cip}"],
        ['Nombre Completo:', f"{comprobante.colegiado.nombre_completo}"],
        ['Documento:', f"{comprobante.colegiado.numero_documento}"],
        ['Correo:', f"{comprobante.colegiado.correo}"],
    ]
    
    table_colegiado = Table(data_colegiado, colWidths=[2*inch, 4*inch])
    table_colegiado.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E8F0F8')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    story.append(table_colegiado)
    story.append(Spacer(1, 0.15*inch))
    
    # Sección de Información del Pago
    story.append(Paragraph("<b>INFORMACIÓN DEL PAGO</b>", label_style))
    
    fecha_pago = comprobante.fecha_hora_pago.strftime('%d/%m/%Y %H:%M:%S') if comprobante.fecha_hora_pago else 'N/A'
    
    data_pago = [
        ['Monto Pagado:', f"S/ {comprobante.monto:.2f}"],
        ['Fecha y Hora:', fecha_pago],
        ['Método de Pago:', comprobante.metodo_pago],
        ['Canal:', comprobante.canal],
        ['Estado:', comprobante.get_estado_display()],
    ]
    
    if comprobante.transaccion_id:
        data_pago.append(['Transacción ID:', comprobante.transaccion_id])
    
    table_pago = Table(data_pago, colWidths=[2*inch, 4*inch])
    table_pago.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F8E8')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    story.append(table_pago)
    story.append(Spacer(1, 0.15*inch))
    
    # Pie de página
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph(
        "<i>Este comprobante fue generado automáticamente por el sistema de gestión del Colegio de Ingenieros del Perú.</i>",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    ))
    
    # Construir el PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer
