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
from .utils import _get_monto_mensualidad, _get_habilitado
from .utils import _get_monto_mensualidad, _get_habilitado

class PagoFlowCrearView(APIView):
    """
    Crea un intento de pago en Flow.cl (QR Interoperable y otros métodos).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import time, os, sys
        from core.flow_api import FlowAPI

        periodos = request.data.get('periodos', [])
        monto_custom = request.data.get('monto')

        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo.'}, status=400)

        colegiado = request.user
        
        # Si es admin, permitir cobrar a nombre de otro colegiado
        if getattr(request.user, 'is_staff', False):
            colegiado_id = request.data.get('colegiado_id')
            if colegiado_id:
                from core.models import Colegiado
                from django.shortcuts import get_object_or_404
                colegiado = get_object_or_404(Colegiado, id=colegiado_id)

        if monto_custom is not None:
            monto_total = round(float(monto_custom), 2)
        else:
            monto_total = round(len(periodos) * _get_monto_mensualidad(), 2)

        # Usar timestamp para evitar duplicados en pruebas
        timestamp = int(time.time())
        commerce_order = f"{colegiado.id}_{timestamp}_{','.join(sorted(periodos))}"

        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173').strip()
        if not frontend_url.startswith('http'):
            frontend_url = f"https://{frontend_url}"
        
        url_return = f"{frontend_url.rstrip('/')}/portal/pagos"
        
        url_confirmation = request.build_absolute_uri('/api/pagos/flow/confirmar/')
        if "localhost" in url_confirmation or "127.0.0.1" in url_confirmation:
            url_confirmation = "https://sistema-web-coleing.onrender.com/api/pagos/flow/confirmar/"

        subject = f"CIP - {len(periodos)} cuota(s) mensual(es)"
        email = getattr(colegiado, 'correo', None) or "usuario.cip.peru@gmail.com"

        try:
            from django.conf import settings
            if not getattr(settings, 'FLOW_API_KEY', ''):
                # Modo Mock
                mock_token = f"mock_token_{commerce_order}"
                return Response({
                    'init_point': f"{url_return}?token={mock_token}",
                    'token': mock_token,
                    'external_reference': commerce_order
                })

            flow_api = FlowAPI()
            res = flow_api.create_payment(
                commerce_order=commerce_order,
                subject=subject,
                amount=monto_total,
                email=email,
                url_confirmation=url_confirmation, # Webhook server-to-server opcional, por ahora usaremos retorno o polling
                url_return=url_return
            )
            
            print("[FLOW PREF] Respuesta:", res, file=sys.stderr)

            if "url" in res and "token" in res:
                # url_pago es la URL a la que se redirige al cliente
                url_pago = f"{res['url']}?token={res['token']}"
                return Response({
                    'init_point': url_pago,
                    'token': res['token'],
                    'external_reference': commerce_order
                })
            else:
                err = res.get('message', 'Error desconocido')
                return Response({'error': f"Error de Flow: {err}"}, status=400)

        except Exception as e:
            print("[FLOW ERROR]", e, file=sys.stderr)
            return Response({'error': str(e)}, status=500)

class PagoFlowConfirmarView(APIView):
    """
    Verifica un pago en Flow mediante el token (haciendo polling o retorno).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import sys
        from core.flow_api import FlowAPI

        token = request.data.get('token', '')
        if not token:
            return Response({'error': 'Token de Flow requerido.'}, status=400)

        try:
            if token.startswith("mock_token_"):
                commerce_order = token.replace("mock_token_", "")
                res = {
                    'status': 2,
                    'commerceOrder': commerce_order
                }
            else:
                flow_api = FlowAPI()
                res = flow_api.get_payment_status(token)
            
            print("[FLOW STATUS]", res, file=sys.stderr)

            # status 2 = pagado (en Flow)
            if res.get('status') != 2:
                # Si no es 2, significa que está pendiente (1) o rechazado (3, 4)
                estado = res.get('status')
                if estado == 1:
                    return Response({'pagado': False, 'status': 'pending'}, status=202)
                else:
                    return Response({'error': f"El pago no fue aprobado (estado Flow: {estado})."}, status=402)

            commerce_order = res.get('commerceOrder', '')
            
            # Formato: "{colegiado.id}_{timestamp}_{p1},{p2}"
            parts = commerce_order.split('_')
            col_id_str = parts[0]
            periodos = parts[2].split(',')
            if not getattr(request.user, 'is_staff', False):
                assert int(col_id_str) == request.user.id, "colegiado_id no coincide"
        except Exception as ex:
            print("[FLOW VERIFY ERROR] Error decodificando commerce_order: {} → {}".format(commerce_order, ex), file=sys.stderr)
            return Response({'error': 'Referencia de pago inválida.'}, status=400)

        if not periodos:
            return Response({'error': 'No se determinaron los periodos a registrar.'}, status=400)

        colegiado   = request.user
        from datetime import date
        hoy         = date.today()
        metodo_str  = f"FLOW ({res.get('paymentData', {}).get('media', 'Desconocido')})"
        nro_operacion = str(res.get('flowOrder', commerce_order))
        registrados = []
        ya_existian = []

        for periodo_str in sorted(periodos):
            try:
                año, mes = map(int, periodo_str.split('-'))
                _, created = Pago.objects.get_or_create(
                    colegiado=colegiado,
                    periodo=date(año, mes, 1),
                    defaults={
                        'tipo':          'MENSUALIDAD',
                        'monto':         _get_monto_mensualidad(),
                        'canal':         'PORTAL',
                        'metodo':        metodo_str,
                        'nro_operacion': nro_operacion,
                        'fecha_pago':    hoy,
                    }
                )
                (registrados if created else ya_existian).append(periodo_str)
            except Exception as ex:
                print("[FLOW VERIFY] Error guardando {}: {}".format(periodo_str, ex), file=sys.stderr)

        comprobante_data = None
        if registrados:
            try:
                # pyrefly: ignore [missing-import]
                from apps.finanzas.services import crear_comprobante_pago
                # pyrefly: ignore [missing-import]
                from apps.finanzas.serializers import ComprobanteSerializer
                comp = crear_comprobante_pago(
                    colegiado=colegiado,
                    monto=round(len(periodos) * _get_monto_mensualidad(), 2),
                    canal='PORTAL',
                    metodo_pago=metodo_str,
                    transaccion_id=nro_operacion,
                    observaciones=f"Pago de cuotas: {', '.join(registrados)}"
                )
                comprobante_data = ComprobanteSerializer(comp).data
            except Exception as e:
                print(f"[FLOW COMPROBANTE ERROR] {e}", file=sys.stderr)

            if getattr(colegiado, 'correo', None):
                try:
                    from core.emails import enviar_confirmacion_pago
                    enviar_confirmacion_pago(
                        correo=colegiado.correo,
                        nombres=colegiado.nombres,
                        nro_colegiado=colegiado.nro_colegiado,
                        monto_total=round(len(periodos) * _get_monto_mensualidad(), 2),
                        periodos_pagados=registrados,
                        nro_operacion=nro_operacion
                    )
                except Exception as e:
                    print(f"[EMAIL ERROR] {e}", file=sys.stderr)

        return Response({
            'success':          True,
            'periodos_pagados': registrados,
            'ya_existian':      ya_existian,
            'nro_operacion':    nro_operacion,
            'habilitado_nuevo': _get_habilitado(colegiado.id),
            'monto_cobrado':    round(len(periodos) * _get_monto_mensualidad(), 2),
            'comprobante':      comprobante_data
        })

class PagoOnlineView(APIView):
    """
    Procesa pagos online via MercadoPago.
    Soporta Tarjeta (Visa/MC/Amex): requiere token, payment_method_id, installments.
    (Yape usa PagoPreferenciaView + PagoVerificarPreferenciaView)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import mercadopago, sys

        payment_method_id = request.data.get('payment_method_id', '')
        periodos          = request.data.get('periodos', [])
        email_payer       = (
            request.data.get('email')
            or getattr(request.user, 'correo', None)
            or 'pagador@cip.org.pe'
        )

        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo.'}, status=400)
        if not payment_method_id:
            return Response({'error': 'Método de pago requerido.'}, status=400)

        monto_total = round(len(periodos) * _get_monto_mensualidad(), 2)
        sdk         = mercadopago.SDK(settings.MP_ACCESS_TOKEN)

        # ── Construir payload según método ──────────────────────────────────
        if payment_method_id == 'yape':
            # Yape: sin token, requiere teléfono del pagador
            phone_number = (
                request.data.get('phone')
                or (request.data.get('payer') or {}).get('phone', {}).get('number', '')
            )
            if not phone_number:
                return Response({'error': 'Número de teléfono Yape requerido.'}, status=400)

            # Extraer nombres del colegiado (first_name y last_name son requeridos por MP)
            nombres_completo = (getattr(request.user, 'nombres', '') or '').strip()
            partes           = nombres_completo.split() if nombres_completo else []
            first_name       = partes[0]          if partes               else 'Colegiado'
            last_name        = ' '.join(partes[1:]) if len(partes) > 1   else 'CIP'

            payment_data = {
                "transaction_amount": float(monto_total),
                "description":        f"CIP - {len(periodos)} cuota(s) mensual(es)",
                "payment_method_id":  "yape",
                "payer": {
                    "email":      email_payer,
                    "first_name": first_name,
                    "last_name":  last_name,
                    "phone":      {"area_code": "51", "number": str(phone_number)},
                },
            }
            metodo_registro = 'YAPE'

        else:
            # Tarjeta (Visa/MC/Amex): requiere token
            token        = request.data.get('token')
            installments = request.data.get('installments', 1)
            issuer_id    = request.data.get('issuer_id')

            if not token:
                return Response({'error': 'Token de tarjeta requerido.'}, status=400)

            payment_data = {
                "transaction_amount": float(monto_total),
                "token":              token,
                "description":        f"CIP - {len(periodos)} cuota(s) mensual(es)",
                "installments":       int(installments),
                "payment_method_id":  payment_method_id,
                "payer":              {"email": email_payer},
            }
            if issuer_id:
                payment_data["issuer_id"] = issuer_id
            metodo_registro = 'TARJETA'

        # ── Llamar a MP ──────────────────────────────────────────────────────
        print(f"[MP] Creando pago: metodo={metodo_registro} monto={monto_total} periodos={periodos}", file=sys.stderr)
        print(f"[MP] Payload enviado: {payment_data}", file=sys.stderr)
        result    = sdk.payment().create(payment_data)
        response  = result.get("response", {})
        mp_status = response.get("status")
        print(f"[MP] Respuesta completa: {response}", file=sys.stderr)

        # ── Manejar respuesta ────────────────────────────────────────────────
        if mp_status == "approved":
            colegiado   = request.user
            hoy         = date.today()
            registrados = []
            ya_existian = []

            for periodo_str in sorted(periodos):
                try:
                    año, mes = map(int, periodo_str.split('-'))
                    _, created = Pago.objects.get_or_create(
                        colegiado=colegiado,
                        periodo=date(año, mes, 1),
                        defaults={
                            'tipo':          'MENSUALIDAD',
                            'monto':         _get_monto_mensualidad(),
                            'canal':         'PORTAL',
                            'metodo':        metodo_registro,
                            'nro_operacion': str(response.get("id", "")),
                            'fecha_pago':    hoy,
                        }
                    )
                    (registrados if created else ya_existian).append(periodo_str)
                except Exception as ex:
                    print(f"[MP] Error guardando periodo {periodo_str}: {ex}", file=sys.stderr)

            if registrados and getattr(colegiado, 'correo', None):
                try:
                    from core.emails import enviar_confirmacion_pago
                    enviar_confirmacion_pago(
                        correo=colegiado.correo,
                        nombres=colegiado.nombres,
                        nro_colegiado=colegiado.nro_colegiado,
                        monto_total=monto_total,
                        periodos_pagados=registrados,
                        nro_operacion=str(response.get("id", ""))
                    )
                except Exception as e:
                    print(f"[EMAIL ERROR] {e}", file=sys.stderr)

            return Response({
                'success':          True,
                'periodos_pagados': registrados,
                'ya_existian':      ya_existian,
                'nro_operacion':    str(response.get("id", "")),
                'habilitado_nuevo': _get_habilitado(colegiado.id),
                'monto_cobrado':    monto_total,
            })

        elif mp_status in ("pending", "in_process"):
            # Yape puede quedar pending mientras el usuario aprueba en la app
            # Devolvemos pending_id para que el frontend haga polling
            return Response({
                'pending':      True,
                'mp_id':        str(response.get("id", "")),
                'periodos':     periodos,
                'monto':        monto_total,
            }, status=202)

        else:
            detalle   = response.get("status_detail", "")
            error_mp  = response.get("error", "")
            mp_msg    = response.get("message", "")
            causa_mp  = response.get("cause", [])
            print(f"[MP] RECHAZADO — status={mp_status} status_detail={detalle} error={error_mp} message={mp_msg} cause={causa_mp}", file=sys.stderr)

            msgs = {
                # Tarjeta
                "cc_rejected_bad_filled_card_number":   "Número de tarjeta incorrecto.",
                "cc_rejected_bad_filled_date":          "Fecha de vencimiento incorrecta.",
                "cc_rejected_bad_filled_security_code": "Código de seguridad incorrecto.",
                "cc_rejected_insufficient_amount":      "Fondos insuficientes en la tarjeta.",
                "cc_rejected_blacklist":                "Tarjeta bloqueada. Contacte a su banco.",
                "cc_rejected_call_for_authorize":       "Tarjeta requiere autorización. Llame a su banco.",
                "cc_rejected_card_disabled":            "Tarjeta desactivada. Active pagos en línea.",
                "cc_rejected_duplicated_payment":       "Pago duplicado. Espere unos minutos.",
                "cc_rejected_high_risk":                "Pago rechazado por seguridad. Intente con otra tarjeta.",
                # Yape
                "yape_rejected_other_reason":           "Pago Yape rechazado. Verifique que el número esté registrado en Yape.",
                "yape_rejected_not_enough_balance":     "Saldo insuficiente en Yape.",
                "yape_rejected_invalid_phone":          "Número de teléfono no registrado en Yape.",
            }

            if detalle in msgs:
                mensaje = msgs[detalle]
            elif mp_msg:
                # Mostrar el mensaje real de MP para diagnóstico
                mensaje = f"Error MP: {mp_msg}"
                if causa_mp:
                    first_cause = causa_mp[0] if isinstance(causa_mp, list) else causa_mp
                    cause_desc = first_cause.get("description", "") if isinstance(first_cause, dict) else str(first_cause)
                    if cause_desc:
                        mensaje += f" ({cause_desc})"
            elif error_mp:
                mensaje = f"Error MP: {error_mp}" + (f" — {detalle}" if detalle else "")
            elif detalle:
                mensaje = f"Pago rechazado: {detalle}"
            else:
                mensaje = f"Pago rechazado por MercadoPago (status: {mp_status})."

            return Response({'error': mensaje, 'mp_detail': detalle, 'mp_error': error_mp}, status=402)

class PagoOnlineStatusView(APIView):
    """Consulta el estado de un pago MP pendiente (polling para Yape)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, mp_id):
        import mercadopago, sys

        sdk      = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        result   = sdk.payment().get(mp_id)
        response = result.get("response", {})
        mp_status = response.get("status")

        if mp_status == "approved":
            # Registrar los periodos (venían en la URL como query params)
            periodos_str = request.query_params.get('periodos', '')
            periodos = [p for p in periodos_str.split(',') if p]
            colegiado = request.user
            hoy       = date.today()
            registrados = []

            for periodo_str in sorted(periodos):
                try:
                    año, mes = map(int, periodo_str.split('-'))
                    _, created = Pago.objects.get_or_create(
                        colegiado=colegiado,
                        periodo=date(año, mes, 1),
                        defaults={
                            'tipo':          'MENSUALIDAD',
                            'monto':         _get_monto_mensualidad(),
                            'canal':         'PORTAL',
                            'metodo':        'YAPE',
                            'nro_operacion': str(mp_id),
                            'fecha_pago':    hoy,
                        }
                    )
                    if created:
                        registrados.append(periodo_str)
                except Exception as ex:
                    print(f"[MP STATUS] Error guardando {periodo_str}: {ex}", file=sys.stderr)

            return Response({
                'success':          True,
                'status':           'approved',
                'periodos_pagados': registrados,
                'nro_operacion':    str(mp_id),
                'habilitado_nuevo': _get_habilitado(colegiado.id),
                'monto_cobrado':    round(len(periodos) * _get_monto_mensualidad(), 2),
            })

        elif mp_status in ("pending", "in_process"):
            return Response({'status': 'pending'}, status=202)

        else:
            return Response({'status': 'rejected', 'error': 'Pago rechazado o expirado.'}, status=402)

class GenerarQRDinamicoView(APIView):
    """
    Genera un código QR dinámico interoperable (EMVCo) de Mercado Pago.
    Este QR se puede escanear con Yape, Plin o cualquier app bancaria.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import requests as http_requests, sys, time
        try:
            periodos = request.data.get('periodos', [])
            if not periodos:
                return Response({'error': 'Seleccione al menos un periodo.'}, status=400)

            colegiado = request.user
            monto_total = round(len(periodos) * _get_monto_mensualidad(), 2)
            
            timestamp = int(time.time())
            external_ref = 'cip-{}-{}-{}'.format(colegiado.id, '-'.join(sorted(periodos)), timestamp)
            
            token = settings.MP_ACCESS_TOKEN.strip()
            
            if not token or len(token) < 20:
                return Response({'error': 'Token de Mercado Pago no configurado.'}, status=500)

            mp_user_id = token.split("-")[-1]
            
            # 1. Obtener una caja del pool y bloquearla por 15 minutos (transacción atómica)
            from django.db import transaction
            from django.db.models import Q
            from django.utils import timezone
            from datetime import timedelta
            from .models import CajaPOS
            
            with transaction.atomic():
                caja = (
                    CajaPOS.objects
                    .select_for_update(skip_locked=True)
                    .filter(Q(en_uso_hasta__isnull=True) | Q(en_uso_hasta__lt=timezone.now()))
                    .order_by('id')
                    .first()
                )
                if not caja:
                    return Response({'error': 'No hay cajas disponibles en este momento, intenta de nuevo en unos segundos.'}, status=503)
                
                caja.en_uso_hasta = timezone.now() + timedelta(minutes=15)
                caja.save()
                
            external_pos_id = caja.external_id.strip()
            
            # Añadir el external_pos_id a la referencia para poder liberarlo luego
            external_ref = f"{external_ref}-{external_pos_id}"

            # 2. Generar el QR apuntando a esa caja estática
            qr_url = f"https://api.mercadopago.com/instore/orders/qr/seller/collectors/{mp_user_id}/pos/{external_pos_id}/qrs"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Expiración: 15 minutos desde ahora (ISO 8601 con zona horaria)
            from datetime import timezone as tz
            expiration = (datetime.now(tz.utc) + timedelta(minutes=15)).strftime('%Y-%m-%dT%H:%M:%S.000+00:00')
            
            # URL de notificación para que MP confirme el pago (webhook)
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
            # En producción usar la URL del backend de Render
            backend_url = os.getenv('BACKEND_URL', '')
            notification_url = f"{backend_url}/api/pagos/qr-presencial/status/" if backend_url else None
            
            order_data = {
                "external_reference": external_ref,
                "title": f"CIP - {len(periodos)} cuota(s)",
                "total_amount": float(monto_total),
                "description": "Pago de colegiatura CIP",
                "expiration_date": expiration,
                "items": [{
                    "sku_number": "CUOTA",
                    "category": "services",
                    "title": "Mensualidad CIP",
                    "description": f"Pago de {len(periodos)} cuota(s) de colegiatura",
                    "unit_price": float(monto_total),
                    "quantity": 1,
                    "unit_measure": "unit",
                    "total_amount": float(monto_total)
                }]
            }
            
            # Solo agregar notification_url si tenemos una URL de backend válida
            if notification_url:
                order_data["notification_url"] = notification_url
            
            print(f"[MP QR] PUT {qr_url}", file=sys.stderr)
            import json
            with open('mp_debug_payload.json', 'w') as f:
                json.dump({"url": qr_url, "headers": {k: v for k, v in headers.items() if k != "Authorization"}, "data": order_data}, f)
            resp = http_requests.put(qr_url, json=order_data, headers=headers, timeout=15)
            
            print(f"[MP QR] Status: {resp.status_code}", file=sys.stderr)
            
            if resp.status_code not in (200, 201):
                print(f"[MP QR FULL ERROR] Respuesta completa: {resp.text}", file=sys.stderr)
                import json
                with open('mp_error_dump.json', 'w') as f:
                    json.dump({"status": resp.status_code, "text": resp.text}, f)
                try:
                    mp_error = resp.json().get('message', resp.text[:300])
                    causes = resp.json().get('causes', [])
                    if causes:
                        mp_error += f" | Causas: {causes}"
                except Exception:
                    mp_error = resp.text[:300]
                return Response({'error': f'Mercado Pago ({resp.status_code}): {mp_error}'}, status=500)
                
            qr_data = resp.json().get('qr_data')
            
            return Response({
                'success': True,
                'qr_data': qr_data,
                'in_store_order_id': resp.json().get('in_store_order_id'),
                'external_reference': external_ref,
                'monto_total': float(monto_total)
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Error interno: {str(e)}'}, status=500)

class ConsultarEstadoQRView(APIView):
    """
    Consulta si una orden generada por QR ha sido pagada.
    Solo busca pagos recientes (últimos 30 min) para evitar falsos positivos.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        import mercadopago, sys
        from datetime import datetime, timedelta
        
        external_ref = request.query_params.get('external_reference')
        if not external_ref:
            return Response({'error': 'Referencia requerida'}, status=400)
            
        sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        
        # Solo buscar pagos creados en los últimos 30 minutos para evitar
        # encontrar pagos antiguos con la misma external_reference
        desde = (datetime.utcnow() - timedelta(minutes=30)).strftime('%Y-%m-%dT%H:%M:%SZ')
        
        search_result = sdk.payment().search({
            'external_reference': external_ref,
            'sort': 'date_created',
            'criteria': 'desc',
            'range': 'date_created',
            'begin_date': desde,
        })
        results = search_result.get("response", {}).get("results", [])
        
        print(f"[MP QR STATUS] Ref: {external_ref}, Pagos encontrados: {len(results)}", file=sys.stderr)
        for r in results:
            print(f"[MP QR STATUS]   - id={r.get('id')} status={r.get('status')} created={r.get('date_created')}", file=sys.stderr)
        
        if not results:
            return Response({'pagado': False, 'status': 'pending'})
            
        # Revisamos si alguno está aprobado
        approved_payment = next((p for p in results if p.get('status') == 'approved'), None)
        
        if not approved_payment:
            return Response({'pagado': False, 'status': results[0].get('status')})
            
        # Si fue aprobado, registramos el pago
        payment_id = approved_payment.get('id')
        try:
            parts = external_ref.split('-')
            
            # Formato: cip-{id}-{periodo1}-{periodo2}-...-{timestamp}-{pos_id}
            # Identificamos el colegiado
            col_id_str = parts[1]
            if int(col_id_str) != request.user.id:
                return Response({'error': 'Referencia inválida.'}, status=400)
                
            # Extraemos los periodos buscando el patrón YYYY-MM que ahora se partió en YYYY y MM
            # Espera, '2026-07' se partió en '2026' y '07' porque usé split('-')!!
            # Mejor busquemos los años que empiezan con 202
            periodos = []
            for i, part in enumerate(parts):
                if part.startswith("202") and len(part) == 4 and i+1 < len(parts):
                    periodos.append(f"{part}-{parts[i+1]}")
            
            # Buscamos CIPWEBPOS... para el ID de caja
            external_pos_id = None
            for part in parts:
                if part.startswith("CIPWEBPOS"):
                    external_pos_id = part
                    break
                    
            if external_pos_id:
                # Liberar la caja POS para que otros puedan usarla inmediatamente
                from .models import CajaPOS
                CajaPOS.objects.filter(external_id=external_pos_id).update(en_uso_hasta=None)
                
            if not periodos:
                periodos = []
                    
        except Exception as ex:
            import traceback
            traceback.print_exc()
            return Response({'error': 'Referencia de pago inválida.'}, status=400)
            
        colegiado = request.user
        hoy = date.today()
        metodo_str = (approved_payment.get('payment_method_id') or 'QR_PRESENCIAL').upper()
        
        total_pagado = float(approved_payment.get('transaction_amount', round(len(periodos) * _get_monto_mensualidad(), 2)))
        monto_por_periodo = round(total_pagado / max(len(periodos), 1), 2)
        
        registrados = []
        for periodo_str in sorted(periodos):
            año, mes = map(int, periodo_str.split('-'))
            pago, created = Pago.objects.get_or_create(
                colegiado=colegiado,
                periodo=date(año, mes, 1),
                defaults={
                    'tipo': 'MENSUALIDAD',
                    'monto': monto_por_periodo,
                    'canal': 'PORTAL',
                    'metodo': metodo_str,
                    'nro_operacion': str(payment_id),
                    'fecha_pago': hoy,
                }
            )
            if created:
                registrados.append(periodo_str)
                
        print(f"[MP QR STATUS] Pago aprobado: {payment_id}, periodos registrados: {registrados}", file=sys.stderr)

        if registrados and getattr(colegiado, 'correo', None):
            try:
                from core.emails import enviar_confirmacion_pago
                enviar_confirmacion_pago(
                    correo=colegiado.correo,
                    nombres=colegiado.nombres,
                    nro_colegiado=colegiado.nro_colegiado,
                    monto_total=total_pagado,
                    periodos_pagados=registrados,
                    nro_operacion=str(payment_id)
                )
            except Exception as e:
                print(f"[EMAIL ERROR] {e}", file=sys.stderr)

                
        return Response({
            'pagado': True,
            'status': 'approved',
            'periodos_pagados': registrados,
            'nro_operacion': str(payment_id),
            'habilitado_nuevo': _get_habilitado(colegiado.id)
        })

class FlowGenerarQRView(APIView):
    """
    POST /api/flow/generar-qr/
    Genera un pago con QR interoperable (Yape/Plin) vía Flow.
    Body JSON: { "email": "correo@ejemplo.com" }   (opcional, tiene default)
    Retorna:  { "url": "https://sandbox.flow.cl/app/pay/...", "token": "..." }
    """
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _firmar_parametros(params, secret_key):
        """
        Firma HMAC-SHA256 según la documentación oficial de Flow:
        1. Ordena los parámetros alfabéticamente por su LLAVE.
        2. Concatena como 'llave=valor' separados por '&' (sin URL-encode).
        3. Firma ese string con HMAC-SHA256 usando la secret_key.
        IMPORTANTE: Todos los valores se convierten a string.
        """
        llaves_ordenadas = sorted(params.keys())
        cadena = '&'.join(f'{k}={str(params[k])}' for k in llaves_ordenadas)
        firma = hmac.new(
            secret_key.encode('utf-8'),
            cadena.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return firma

    def post(self, request):
        import sys
        # 1. Validar credenciales de Flow en settings
        api_key    = settings.FLOW_API_KEY
        secret_key = settings.FLOW_SECRET_KEY
        flow_url   = settings.FLOW_API_URL

        if not api_key or not secret_key:
            return Response(
                {'error': 'Las credenciales de Flow no están configuradas en el servidor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        email = request.data.get('email', '')
        if not email:
            email = 'vantofortnite@gmail.com'
            
        commerce_order = f'FICHA-{int(time.time())}'
        monto = request.data.get('amount', '5')
        concepto = request.data.get('subject', 'Pago Ficha de Inscripcion Presencial')

        params = {
            'apiKey':          api_key,
            'commerceOrder':   commerce_order,
            'subject':         concepto,
            'currency':        'PEN',
            'amount':          str(monto),
            'email':           email,
            'urlConfirmation': 'https://sistema-web-coleing.onrender.com/api/flow/webhook/',
            'urlReturn':       'https://sistema-web-coleing.onrender.com/admin/presencial',
            'paymentMethod':   '169',
        }

        # 3. Firmar los parámetros
        params['s'] = self._firmar_parametros(params, secret_key)

        print(f"[FLOW DEBUG] Sending to: {flow_url}/payment/create", file=sys.stderr)
        print(f"[FLOW DEBUG] apiKey: {api_key[:8]}...", file=sys.stderr)
        print(f"[FLOW DEBUG] params keys: {sorted(params.keys())}", file=sys.stderr)

        # 4. POST a Flow /payment/create
        try:
            resp = http_requests.post(
                f'{flow_url}/payment/create',
                data=params,
                timeout=15
            )
            print(f"[FLOW DEBUG] Response status: {resp.status_code}", file=sys.stderr)
            print(f"[FLOW DEBUG] Response body: {resp.text[:500]}", file=sys.stderr)

            if resp.status_code != 200:
                return Response(
                    {'error': 'Error de Flow', 'detalle': resp.text},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            print(f"[FLOW ERROR] Connection error: {e}", file=sys.stderr)
            return Response(
                {'error': f'Error de conexión con Flow: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        flow_data = resp.json()
        # Flow retorna { url, token, flowOrder }
        payment_url = f'{flow_data.get("url")}?token={flow_data.get("token")}'

        return Response({
            'url':       payment_url,
            'token':     flow_data.get('token'),
            'flowOrder': flow_data.get('flowOrder'),
            'commerceOrder': commerce_order,
        })

class FlowWebhookView(APIView):
    """
    POST /api/flow/webhook/
    Recibe la confirmación de pago de Flow (callback server-to-server).
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token', '')
        if not token:
            return Response({'error': 'Token ausente'}, status=400)

        api_key    = settings.FLOW_API_KEY
        secret_key = settings.FLOW_SECRET_KEY
        flow_url   = settings.FLOW_API_URL

        params = {
            'apiKey': api_key,
            'token':  token,
        }
        params['s'] = FlowGenerarQRView._firmar_parametros(params, secret_key)

        try:
            resp = http_requests.get(
                f'{flow_url}/payment/getStatus',
                params=params,
                timeout=15
            )
            if resp.status_code == 200:
                data = resp.json()
                # data contiene: status (1=pendiente, 2=pagado, 3=rechazado, 4=anulado)
                import sys
                print(f"[FLOW WEBHOOK] Order={data.get('commerceOrder')} Status={data.get('status')}", file=sys.stderr)
                # Aquí puedes actualizar el estado de la solicitud en BD si lo necesitas
        except Exception as e:
            import sys
            print(f"[FLOW WEBHOOK ERROR] {e}", file=sys.stderr)

        return Response({'received': True})

