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
