"""Helpers de envío de correo para el sistema CIP.

En desarrollo (sin EMAIL_HOST en .env) los correos se imprimen en la consola
del servidor gracias al backend `console` configurado en settings.py.
En producción se envían por SMTP.
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives


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

    msg = EmailMultiAlternatives(
        subject=asunto,
        body=texto,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
        to=[correo],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)


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

    html = f"""
    <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 560px;">
      <h2 style="color: #D97706; margin-bottom: 0.5rem;">Aviso Preventivo</h2>
      <p>Estimado(a) <strong>{nombres}</strong>,</p>
      <p>Su cuenta como colegiado CIP <strong>{nro_colegiado}</strong> está a 
         <strong>{dias_restantes} día(s)</strong> de quedar <strong>INHABILITADA</strong> por falta de pago.</p>
      <p style="background:#FFFBEB;border:1px solid #FDE68A;padding:0.75rem 1rem;border-radius:6px;color:#92400E;">
         Le sugerimos regularizar su mensualidad para mantener su estado activo y acceder a los beneficios del CIP.
      </p>
      <p>Puede pagar en línea desde el portal del colegiado o de forma presencial.</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:1.5rem 0;">
      <p style="color:#6B7280;font-size:0.85rem;">Colegio de Ingenieros del Perú</p>
    </div>
    """

    msg = EmailMultiAlternatives(
        subject=asunto,
        body=texto,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
        to=[correo],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)


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

    msg = EmailMultiAlternatives(
        subject=asunto,
        body=texto,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
        to=[correo],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)


def enviar_confirmacion_pago(*, correo, nombres, nro_colegiado, monto_total, periodos_pagados, nro_operacion):
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
        f"Gracias por mantenerse al día con sus obligaciones institucionales.\n\n"
        f"Colegio de Ingenieros del Perú"
    )

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
      <p>Puede descargar o imprimir su boleta oficial desde el portal web.</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:1.5rem 0;">
      <p style="color:#6B7280;font-size:0.85rem;">Colegio de Ingenieros del Perú</p>
    </div>
    """

    msg = EmailMultiAlternatives(
        subject=asunto,
        body=texto,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
        to=[correo],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)
