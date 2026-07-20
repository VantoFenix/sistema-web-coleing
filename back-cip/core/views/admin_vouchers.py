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

from ..models import Administrador, Colegiado, Solicitud, Carrera, Sede, Pago, PagoVoucherPendiente, Configuracion
from rest_framework.parsers import MultiPartParser, FormParser
from ..serializers import AdministradorSerializer, AdministradorCRUDSerializer, ColegiadoSerializer, SolicitudSerializer, CarreraSerializer, SedeSerializer
# pyrefly: ignore [missing-import]
from apps.tramites.services import BancoNacionMockService
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail


class AdminVouchersListView(APIView):
    """Lista todos los vouchers pendientes de verificación (estado=PENDIENTE)."""
    authentication_classes = []
    permission_classes     = [AllowAny]

    def get(self, request):
        import json as _json
        vouchers = (
            PagoVoucherPendiente.objects
            .filter(estado='PENDIENTE')
            .select_related('colegiado')
            .order_by('creado_en')
        )
        data = []
        for v in vouchers:
            try:
                periodos = _json.loads(v.periodos_json)
            except Exception:
                periodos = []
            data.append({
                'id':               v.id,
                'colegiado_id':     v.colegiado.id,
                'colegiado_nombre': v.colegiado.nombres,
                'colegiado_dni':    v.colegiado.dni,
                'colegiado_nro':    str(v.colegiado.nro_colegiado),
                'metodo':           v.metodo,
                'monto':            str(v.monto),
                'periodos':         periodos,
                'nro_referencia':   v.nro_referencia,
                'voucher_url':      request.build_absolute_uri(v.voucher.url) if v.voucher else None,
                'creado_en':        v.creado_en.isoformat(),
            })
        return Response(data)

class AdminVoucherResolverView(APIView):
    """Aprueba o rechaza un voucher pendiente. Acción: APROBAR | RECHAZAR."""
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request, pk):
        import json as _json, sys

        accion      = (request.data.get('accion') or '').upper()
        observacion = request.data.get('observacion', '')

        if accion not in ('APROBAR', 'RECHAZAR'):
            return Response({'error': 'Acción inválida. Use APROBAR o RECHAZAR.'}, status=400)

        voucher = PagoVoucherPendiente.objects.filter(pk=pk, estado='PENDIENTE').first()
        if not voucher:
            return Response({'error': 'Voucher no encontrado o ya fue procesado.'}, status=404)

        if accion == 'RECHAZAR':
            voucher.estado      = 'RECHAZADO'
            voucher.observacion = observacion
            voucher.save()
            return Response({'success': True, 'accion': 'RECHAZADO'})

        # ── APROBAR → registrar pagos en tabla pago ──────────────────────────
        periodos   = _json.loads(voucher.periodos_json)
        colegiado  = voucher.colegiado
        hoy        = date.today()
        monto_unit = round(float(voucher.monto) / max(len(periodos), 1), 2)
        registrados = []
        ya_existian = []
        errores     = []

        for periodo_str in sorted(periodos):
            try:
                año, mes = map(int, periodo_str.split('-'))
                _, created = Pago.objects.get_or_create(
                    colegiado=colegiado,
                    periodo=date(año, mes, 1),
                    defaults={
                        'tipo':          'MENSUALIDAD',
                        'monto':         monto_unit,
                        'canal':         'PORTAL',
                        'metodo':        voucher.metodo,
                        'nro_operacion': voucher.nro_referencia,
                        'fecha_pago':    hoy,
                    }
                )
                (registrados if created else ya_existian).append(periodo_str)
            except Exception as ex:
                print(f"[VOUCHER APROBAR] Error guardando {periodo_str}: {ex}", file=sys.stderr)
                errores.append(f"{periodo_str}: {str(ex)}")

        if errores and not registrados and not ya_existian:
            return Response({
                'error': f'No se pudo registrar ningún pago: {errores[0]}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        voucher.estado      = 'APROBADO'
        voucher.observacion = observacion
        voucher.save()

        return Response({
            'success':              True,
            'accion':               'APROBADO',
            'periodos_registrados': registrados,
            'ya_existian':          ya_existian,
            'habilitado_nuevo':     _get_habilitado(colegiado.id),
            'colegiado':            colegiado.nombres,
            'total_registrado':     len(registrados),
        })

