from rest_framework.viewsets import ModelViewSet
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.hashers import check_password
from django.db import connection, transaction, IntegrityError
from django.http import HttpResponse
from django.core.files.storage import default_storage
import os
import uuid
from datetime import datetime, date
from django.conf import settings

# pyrefly: ignore [missing-import]
from ..models import Administrador, Colegiado, Solicitud, Carrera, Sede, Pago, PagoVoucherPendiente, Configuracion
from rest_framework.parsers import MultiPartParser, FormParser
# pyrefly: ignore [missing-import]
from ..serializers import AdministradorSerializer, AdministradorCRUDSerializer, ColegiadoSerializer, SolicitudSerializer, CarreraSerializer, SedeSerializer
# pyrefly: ignore [missing-import]
from apps.tramites.services import BancoNacionMockService
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail


# pyrefly: ignore [missing-import]
from .utils import _get_habilitado

class AdminRegistrarPagoPresencialView(APIView):
    """Registra uno o varios pagos presenciales para un colegiado."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        admin = request.user
        colegiado_id  = request.data.get('colegiado_id')
        periodos      = request.data.get('periodos', [])   # ["2025-01", "2025-02"]
        monto_total   = request.data.get('monto')
        metodo        = request.data.get('metodo', '').upper()  # YAPE|PLIN|EFECTIVO|TRANSFERENCIA
        nro_operacion = request.data.get('nro_operacion', '').strip() or None
        fecha_pago_str = request.data.get('fecha_pago', '')

        # Validaciones básicas
        if not colegiado_id:
            return Response({'error': 'Debe indicar el colegiado'}, status=status.HTTP_400_BAD_REQUEST)
        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo'}, status=status.HTTP_400_BAD_REQUEST)
        if not monto_total:
            return Response({'error': 'Ingrese el monto del pago'}, status=status.HTTP_400_BAD_REQUEST)
        if metodo not in ('YAPE_PLIN', 'EFECTIVO', 'TRANSFERENCIA', 'MIXTO'):
            return Response({'error': 'Método de pago inválido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            qs = Colegiado.objects.select_related('carrera').filter(activo=True)
            if getattr(admin, 'rol', None) in ('CAJERO', 'ADMIN') and getattr(admin, 'sede_id', None):
                qs = qs.filter(sede_id=admin.sede_id)
            colegiado = qs.get(pk=colegiado_id)
        except Colegiado.DoesNotExist:
            return Response({'error': 'Colegiado no encontrado, inactivo o no pertenece a su sede'}, status=status.HTTP_404_NOT_FOUND)

        try:
            monto_total = float(monto_total)
            if monto_total <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'Monto inválido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_pago = date.fromisoformat(fecha_pago_str) if fecha_pago_str else date.today()
        except ValueError:
            return Response({'error': 'Fecha de pago inválida (use YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)

        # Monto proporcional por periodo
        monto_por_periodo = round(monto_total / len(periodos), 2)

        registrados   = []
        ya_existian   = []
        errores       = []
        pagos_creados = []

        for periodo_str in periodos:
            try:
                año, mes = map(int, periodo_str.split('-'))
                periodo_date = date(año, mes, 1)

                pago, created = Pago.objects.get_or_create(
                    colegiado=colegiado,
                    periodo=periodo_date,
                    defaults={
                        'tipo': 'MENSUALIDAD',
                        'monto': monto_por_periodo,
                        'canal': 'CAJA',
                        'metodo': metodo,
                        'nro_operacion': nro_operacion,
                        'fecha_pago': fecha_pago,
                    }
                )

                if created:
                    registrados.append(periodo_str)
                    pagos_creados.append(pago)
                else:
                    ya_existian.append(periodo_str)

            except Exception as e:
                errores.append(f"Período {periodo_str}: {str(e)}")

        if not registrados:
            return Response({
                'success': False,
                'ya_pagados': True,
                'error': 'Todos los períodos seleccionados ya tenían pago registrado.',
                'ya_existian': ya_existian,
                'errores': errores,
            }, status=status.HTTP_200_OK)

        # Número de boleta basado en el ID del primer pago creado
        boleta_numero = f'B001-{str(pagos_creados[0].id).zfill(8)}'

        # Etiqueta de periodos para el comprobante
        MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        def _fmt_p(p):
            y, m = p.split('-')
            return f"{MESES_ES[int(m)-1]} {y}"
        periodos_label = ', '.join(_fmt_p(p) for p in sorted(registrados))

        from datetime import datetime as _dt
        emision = _dt.now().strftime('%d/%m/%Y, %I:%M %p')

        if colegiado.correo:
            try:
                from core.emails import enviar_confirmacion_pago
                enviar_confirmacion_pago(
                    correo=colegiado.correo,
                    nombres=colegiado.nombres,
                    nro_colegiado=colegiado.nro_colegiado,
                    monto_total=round(monto_total, 2),
                    periodos_pagados=registrados,
                    nro_operacion=boleta_numero
                )
            except Exception as e:
                import sys
                print(f"[EMAIL ERROR] {e}", file=sys.stderr)

        return Response({
            'success': True,
            # datos comprobante
            'boleta_numero':      boleta_numero,
            'colegiado_nombres':  colegiado.nombres,
            'colegiado_dni':      colegiado.dni,
            'periodos_label':     periodos_label,
            'monto_total':        round(monto_total, 2),
            'metodo':             metodo,
            'fecha_pago':         fecha_pago.strftime('%d/%m/%Y'),
            'emision':            emision,
            'pagos_parciales':    request.data.get('pagos_parciales', []),
            # datos operativos
            'periodos_registrados': registrados,
            'ya_existian':          ya_existian,
            'errores':              errores,
            'habilitado_nuevo':     _get_habilitado(colegiado.id),
            'total_registrado':     len(registrados),
            # alias de compatibilidad
            'colegiado':            colegiado.nombres,
        })

class AdminPagoTarjetaView(APIView):
    """
    Procesa pago con tarjeta vía MercadoPago para el módulo de Pagos Presenciales.
    Usa el CardPayment Brick; recibe token + payment_method_id generados por el Brick.
    El pago se registra con canal='CAJA' (iniciado por el admin).
    """
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        import mercadopago, sys

        colegiado_id      = request.data.get('colegiado_id')
        token             = request.data.get('token')
        payment_method_id = request.data.get('payment_method_id')
        installments      = request.data.get('installments', 1)
        issuer_id         = request.data.get('issuer_id')
        periodos          = request.data.get('periodos', [])
        monto             = request.data.get('monto')
        email_payer       = request.data.get('email') or 'pagador@cip.org.pe'

        if not all([colegiado_id, token, payment_method_id, periodos, monto]):
            return Response({'error': 'Faltan datos requeridos.'}, status=400)

        colegiado = Colegiado.objects.filter(pk=colegiado_id).first()
        if not colegiado:
            return Response({'error': 'Colegiado no encontrado.'}, status=404)

        monto_total = float(monto)
        sdk         = mercadopago.SDK(settings.MP_ACCESS_TOKEN)

        payment_data = {
            "transaction_amount": monto_total,
            "token":              token,
            "description":        f"CIP - {len(periodos)} cuota(s) mensual(es)",
            "installments":       int(installments),
            "payment_method_id":  payment_method_id,
            "payer":              {"email": email_payer},
        }
        if issuer_id:
            payment_data["issuer_id"] = issuer_id

        print(f"[ADMIN TARJETA] colegiado_id={colegiado_id} monto={monto_total} periodos={periodos}", file=sys.stderr)
        result    = sdk.payment().create(payment_data)
        response  = result.get("response", {})
        mp_status = response.get("status")
        print(f"[ADMIN TARJETA] MP respuesta: status={mp_status}", file=sys.stderr)

        if mp_status != "approved":
            detalle  = response.get("status_detail", "")
            mp_msg   = response.get("message", "")
            causa_mp = response.get("cause", [])
            msgs = {
                "cc_rejected_bad_filled_card_number":   "Número de tarjeta incorrecto.",
                "cc_rejected_bad_filled_date":          "Fecha de vencimiento incorrecta.",
                "cc_rejected_bad_filled_security_code": "Código de seguridad incorrecto.",
                "cc_rejected_insufficient_amount":      "Fondos insuficientes en la tarjeta.",
                "cc_rejected_blacklist":                "Tarjeta bloqueada. Contacte al banco emisor.",
                "cc_rejected_call_for_authorize":       "Tarjeta requiere autorización bancaria.",
                "cc_rejected_card_disabled":            "Tarjeta desactivada. Active pagos en línea.",
                "cc_rejected_high_risk":                "Pago rechazado por seguridad. Intente otra tarjeta.",
            }
            if detalle in msgs:
                mensaje = msgs[detalle]
            elif mp_msg:
                mensaje = f"Error MP: {mp_msg}"
                if causa_mp:
                    first = causa_mp[0] if isinstance(causa_mp, list) else causa_mp
                    desc  = first.get("description", "") if isinstance(first, dict) else str(first)
                    if desc: mensaje += f" ({desc})"
            elif detalle:
                mensaje = f"Pago rechazado: {detalle}"
            else:
                mensaje = f"Pago rechazado (status: {mp_status})."
            return Response({'error': mensaje}, status=402)

        # Aprobado — registrar periodos
        hoy         = date.today()
        monto_unit  = round(monto_total / max(len(periodos), 1), 2)
        nro_op      = str(response.get("id", ""))
        registrados = []; ya_existian = []
        for periodo_str in sorted(periodos):
            try:
                año, mes = map(int, periodo_str.split('-'))
                _, created = Pago.objects.get_or_create(
                    colegiado=colegiado, periodo=date(año, mes, 1),
                    defaults={
                        'tipo': 'MENSUALIDAD', 'monto': monto_unit,
                        'canal': 'CAJA', 'metodo': 'TARJETA',
                        'nro_operacion': nro_op, 'fecha_pago': hoy,
                    }
                )
                (registrados if created else ya_existian).append(periodo_str)
            except Exception as ex:
                print(f"[ADMIN TARJETA] Error guardando {periodo_str}: {ex}", file=sys.stderr)

        if registrados and colegiado.correo:
            try:
                from core.emails import enviar_confirmacion_pago
                enviar_confirmacion_pago(
                    correo=colegiado.correo,
                    nombres=colegiado.nombres,
                    nro_colegiado=colegiado.nro_colegiado,
                    monto_total=round(monto_total, 2),
                    periodos_pagados=registrados,
                    nro_operacion=nro_op
                )
            except Exception as e:
                print(f"[EMAIL ERROR] {e}", file=sys.stderr)

        return Response({
            'success':            True,
            'periodos_registrados': registrados,
            'ya_existian':        ya_existian,
            'nro_operacion':      nro_op,
            'colegiado':          colegiado.nombres,
            'total_registrado':   len(registrados),
            'habilitado_nuevo':   _get_habilitado(colegiado.id),
        })

