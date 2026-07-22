"""Helpers de envío de correo para el sistema CIP.

En desarrollo (sin EMAIL_HOST en .env) los correos se imprimen en la consola
del servidor gracias al backend `console` configurado en settings.py.
En producción se envían por SMTP.
"""
from django.conf import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def _send_via_sendgrid(subject, html_content, to_email, plain_text_content=None):
    from django.conf import settings
    message = Mail(
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'vantofortnite@gmail.com'),
        to_emails=to_email,
        subject=subject,
        plain_text_content=plain_text_content or 'Por favor, habilite HTML para ver este correo.',
        html_content=html_content
    )
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        import sys
        print(f'[EMAIL ERROR] {e}', file=sys.stderr)
        if hasattr(e, 'body'):
            print(f'[EMAIL ERROR BODY] {e.body}', file=sys.stderr)


def enviar_recordatorio_deuda(*, correo, nombres, nro_colegiado,
                              meses_adeudados, deuda_total):
    """Envía un recordatorio de deuda a un colegiado.

    Args:
        correo: destinatario.
        nombres: nombre completo del colegiado.
        nro_colegiado: código CIP.
        meses_adeudados: cantidad de meses en deuda.
        deuda_total: monto total adeudado (S/).
    """
    asunto = f"Recordatorio de pago - Colegio de Ingenieros del Perú"
    monto = f"S/ {deuda_total:.2f}"

    texto = (
        f"Estimado(a) {nombres},\n\n"
        f"Le recordamos que su cuenta como colegiado CIP {nro_colegiado} "
        f"registra {meses_adeudados} mes(es) de mensualidades pendientes, "
        f"por un total de {monto}.\n\n"
        f"Mientras la deuda se mantenga, su estado figura como INHABILITADO "
        f"en nuestros registros. Al regularizar el pago, su habilitación se "
        f"restablecerá de forma automática.\n\n"
        f"Puede pagar en línea desde el portal del colegiado o de forma "
        f"presencial en la sede.\n\n"
        f"Colegio de Ingenieros del Perú"
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 560px;">
      <h2 style="color: #DC2626; margin-bottom: 0.5rem;">Recordatorio de pago</h2>
      <p>Estimado(a) <strong>{nombres}</strong>,</p>
      <p>Su cuenta como colegiado CIP <strong>{nro_colegiado}</strong> registra
         <strong>{meses_adeudados}</strong> mes(es) de mensualidades pendientes,
         por un total de <strong>{monto}</strong>.</p>
      <p style="background:#FEF2F2;border:1px solid #FCA5A5;padding:0.75rem 1rem;border-radius:6px;color:#991B1B;">
         Su estado actual es <strong>INHABILITADO</strong>. Al regularizar el
         pago, se restablecerá automáticamente.
      </p>
      <p>Puede pagar en línea desde el portal del colegiado o de forma
         presencial en la sede.</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:1.5rem 0;">
      <p style="color:#6B7280;font-size:0.85rem;">Colegio de Ingenieros del Perú</p>
    </div>
    """

    _send_via_sendgrid(subject=asunto, plain_text_content=texto, to_email=correo, html_content=html)


def enviar_aviso_preventivo(*, correo, nombres, nro_colegiado, dias_restantes):
    """Envía un aviso preventivo antes de la inhabilitación."""
    asunto = f"Aviso preventivo: Pronta inhabilitación - Colegio de Ingenieros del Perú"
    
    texto = (
        f"Estimado(a) {nombres},\n\n"
        f"Le informamos que su cuenta como colegiado CIP {nro_colegiado} "
        f"está a {dias_restantes} día(s) de quedar INHABILITADA por falta de pago del mes actual.\n\n"
        f"Le sugerimos regularizar su mensualidad para mantener su estado activo.\n\n"
        f"Puede pagar en línea desde el portal del colegiado o de forma presencial.\n\n"
        f"Colegio de Ingenieros del Perú"
    )

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    logo_url = f"{frontend_url}/webp-logo-cip.webp"
    portal_url = f"{frontend_url}/portal/pagos"

    html = f"""
    <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 560px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img src="{logo_url}" alt="Logo CIP" style="height: 64px; width: auto; margin-bottom: 1rem;" />
        <h2 style="color: #D97706; margin: 0; font-size: 1.5rem;">Aviso Preventivo</h2>
      </div>
      <p style="font-size: 1.1rem; color: #374151;">Estimado(a) <strong>{nombres}</strong>,</p>
      <p style="line-height: 1.6; color: #4B5563;">
         Su cuenta como colegiado CIP <strong>{nro_colegiado}</strong> está a 
         <strong>{dias_restantes} día(s)</strong> de quedar <strong>INHABILITADA</strong> por falta de pago de la mensualidad actual.
      </p>
      <div style="background:#FFFBEB; border-left: 4px solid #F59E0B; padding: 1rem; border-radius: 4px; color: #92400E; margin: 1.5rem 0;">
         <strong>Sugerencia:</strong> Le invitamos a regularizar su pago para mantener su estado activo y seguir disfrutando de los beneficios del CIP.
      </div>
      <div style="text-align: center; margin: 2rem 0;">
        <a href="{portal_url}" style="background-color: #2563EB; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pagar en línea ahora</a>
      </div>
      <hr style="border:none; border-top:1px solid #E5E7EB; margin: 1.5rem 0;">
      <p style="color:#6B7280; font-size: 0.85rem; text-align: center; margin: 0;">
         <em>Este es un mensaje automático generado por el Sistema CIP.</em>
      </p>
    </div>
    """

    _send_via_sendgrid(subject=asunto, plain_text_content=texto, to_email=correo, html_content=html)


def enviar_aviso_inicio_deuda(*, correo, nombres, nro_colegiado, monto):
    """Envía un aviso el día que se genera una nueva deuda (meses_adeudados = 1)."""
    asunto = f"Nueva Mensualidad Generada - Colegio de Ingenieros del Perú"
    
    texto = (
        f"Estimado(a) {nombres},\n\n"
        f"Le informamos que se ha generado la mensualidad correspondiente al mes en curso para su cuenta CIP {nro_colegiado}.\n\n"
        f"El monto de su nueva mensualidad es de S/ {monto:.2f}.\n\n"
        f"Le recordamos que al mantener deuda pendiente, su estado figura como INHABILITADO. Al regularizar su pago, su habilitación se restablecerá de forma automática.\n\n"
        f"Puede pagar en línea desde el portal del colegiado o de forma presencial.\n\n"
        f"Colegio de Ingenieros del Perú"
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 560px;">
      <h2 style="color: #2563EB; margin-bottom: 0.5rem;">Nueva Mensualidad Generada</h2>
      <p>Estimado(a) <strong>{nombres}</strong>,</p>
      <p>Le informamos que se ha generado la mensualidad correspondiente al mes en curso para su cuenta CIP <strong>{nro_colegiado}</strong>.</p>
      <p>El monto de su nueva mensualidad es de <strong>S/ {monto:.2f}</strong>.</p>
      <p style="background:#FEF2F2;border:1px solid #FCA5A5;padding:0.75rem 1rem;border-radius:6px;color:#991B1B;">
         Le recordamos que al mantener deuda pendiente, su estado figura como <strong>INHABILITADO</strong>. 
         Al regularizar el pago, su habilitación se restablecerá automáticamente.
      </p>
      <p>Puede pagar de manera rápida y segura en línea desde el portal del colegiado.</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:1.5rem 0;">
      <p style="color:#6B7280;font-size:0.85rem;">Colegio de Ingenieros del Perú</p>
    </div>
    """

    _send_via_sendgrid(subject=asunto, plain_text_content=texto, to_email=correo, html_content=html)


def enviar_aviso_inhabilitacion(*, correo, nombres, nro_colegiado):
    """Envía un aviso el día que el colegiado pasa a inhabilitado."""
    asunto = f"Aviso: Cuenta Inhabilitada - Colegio de Ingenieros del Perú"
    
    texto = (
        f"Estimado(a) {nombres},\n\n"
        f"Le informamos que el plazo para el pago de su mensualidad ha vencido. "
        f"Por lo tanto, su cuenta como colegiado CIP {nro_colegiado} se encuentra ahora INHABILITADA.\n\n"
        f"Al regularizar su pago, su habilitación se restablecerá de forma automática.\n\n"
        f"Puede pagar en línea desde el portal del colegiado o de forma presencial.\n\n"
        f"Colegio de Ingenieros del Perú"
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 560px;">
      <h2 style="color: #DC2626; margin-bottom: 0.5rem;">Cuenta Inhabilitada</h2>
      <p>Estimado(a) <strong>{nombres}</strong>,</p>
      <p>Le informamos que el plazo para el pago de su mensualidad ha vencido. Por lo tanto, 
         su cuenta como colegiado CIP <strong>{nro_colegiado}</strong> se encuentra ahora 
         <strong>INHABILITADA</strong>.</p>
      <p style="background:#FEF2F2;border:1px solid #FCA5A5;padding:0.75rem 1rem;border-radius:6px;color:#991B1B;">
         Al regularizar el pago pendiente, su habilitación se restablecerá automáticamente.
      </p>
      <p>Puede pagar en línea desde el portal del colegiado o de forma presencial.</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:1.5rem 0;">
      <p style="color:#6B7280;font-size:0.85rem;">Colegio de Ingenieros del Perú</p>
    </div>
    """

    _send_via_sendgrid(subject=asunto, plain_text_content=texto, to_email=correo, html_content=html)


def enviar_confirmacion_pago(*, correo, nombres, nro_colegiado, monto_total, periodos_pagados, nro_operacion, pdf_url=None):
    """Envía confirmación de pago de cuotas."""
    asunto = f"Confirmación de Pago - Colegio de Ingenieros del Perú"
    periodos_str = ', '.join(periodos_pagados)
    
    texto = (
        f"Estimado(a) {nombres},\n\n"
        f"Hemos registrado exitosamente su pago por concepto de cuotas institucionales.\n\n"
        f"Detalle del pago:\n"
        f"- Colegiado CIP: {nro_colegiado}\n"
        f"- Monto Total: S/ {monto_total:.2f}\n"
        f"- Periodos Pagados: {periodos_str}\n"
        f"- Nro. Operación: {nro_operacion}\n\n"
    )
    if pdf_url:
        texto += f"Puede descargar su boleta/factura electrónica aquí: {pdf_url}\n\n"
        
    texto += (
        f"Gracias por mantenerse al día con sus obligaciones institucionales.\n\n"
        f"Colegio de Ingenieros del Perú"
    )

    boton_html = ""
    if pdf_url:
        boton_html = f"""
        <div style="text-align: center; margin-top: 1.5rem; margin-bottom: 1.5rem;">
            <a href="{pdf_url}" target="_blank" style="background-color: #2563EB; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px;">
                Descargar Boleta/Factura Electrónica
            </a>
        </div>
        """
    else:
        boton_html = "<p>Puede descargar o imprimir su boleta oficial desde el portal web.</p>"

    html = f"""
    <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 560px;">
      <h2 style="color: #059669; margin-bottom: 0.5rem;">Confirmación de Pago Exitoso</h2>
      <p>Estimado(a) <strong>{nombres}</strong>,</p>
      <p>Hemos registrado exitosamente su pago por concepto de cuotas institucionales.</p>
      <div style="background:#F3F4F6;border-left:4px solid #10B981;padding:1rem;border-radius:4px;">
         <p style="margin:0.25rem 0;"><strong>Colegiado CIP:</strong> {nro_colegiado}</p>
         <p style="margin:0.25rem 0;"><strong>Monto Total:</strong> S/ {monto_total:.2f}</p>
         <p style="margin:0.25rem 0;"><strong>Meses Pagados:</strong> {periodos_str}</p>
         <p style="margin:0.25rem 0;"><strong>Nro. Operación:</strong> {nro_operacion}</p>
      </div>
      {boton_html}
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:1.5rem 0;">
      <p style="color:#6B7280;font-size:0.85rem;">Colegio de Ingenieros del Perú</p>
    </div>
    """

    _send_via_sendgrid(subject=asunto, plain_text_content=texto, to_email=correo, html_content=html)
