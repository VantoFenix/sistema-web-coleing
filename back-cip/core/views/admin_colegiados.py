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
from .utils import _get_habilitado, _meses_entre

class AdminBuscarColegiadoView(APIView):
    """Busca colegiados por DNI, nombre o número de colegiado."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Q
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response([])

        colegiados = Colegiado.objects.filter(
            Q(dni__icontains=q) |
            Q(nombres__icontains=q) |
            Q(nro_colegiado__icontains=q),
            activo=True
        ).select_related('carrera', 'sede')[:10]

        resultados = []
        for col in colegiados:
            resultados.append({
                'id': col.id,
                'dni': col.dni,
                'nombres': col.nombres,
                'nro_colegiado': col.nro_colegiado,
                'carrera': col.carrera.nombre,
                'sede': col.sede.nombre if col.sede else '—',
                'colegiado_desde': col.colegiado_desde.strftime('%Y-%m-%d'),
                'habilitado': _get_habilitado(col.id),
            })

        return Response(resultados)

class AdminDeudaColegiadoView(APIView):
    """Devuelve todos los periodos del año actual + deudas previas de un colegiado.
    Cada periodo tiene estado: PAGADO | PENDIENTE | ADELANTO.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            col = Colegiado.objects.select_related('carrera', 'sede').get(pk=pk, activo=True)
        except Colegiado.DoesNotExist:
            return Response({'error': 'Colegiado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Periodos ya pagados — normalizados a date (Supabase puede devolver datetime)
        raw_pagados = Pago.objects.filter(colegiado=col, tipo='MENSUALIDAD').values_list('periodo', flat=True)
        pagados = set()
        for p in raw_pagados:
            if p is None:
                continue
            if hasattr(p, 'date') and callable(p.date):
                pagados.add(p.date())
            elif isinstance(p, str):
                try:
                    from datetime import datetime as _dt
                    pagados.add(_dt.strptime(p[:10], '%Y-%m-%d').date())
                except Exception:
                    pass
            else:
                pagados.add(p)

        hoy = date.today()
        mes_actual = date(hoy.year, hoy.month, 1)
        fin_adelantos = date(hoy.year + 2, hoy.month, 1)

        # Todos los meses: desde colegiado_desde hasta 24 meses en el futuro
        todos_los_meses = _meses_entre(col.colegiado_desde, fin_adelantos)

        periodos = []
        pendientes_compat = []  # para retrocompatibilidad

        for m in todos_los_meses:
            pagado    = m in pagados
            if pagado:
                estado = 'PAGADO'
            elif m > mes_actual:
                estado = 'ADELANTO'     # pago anticipado
            else:
                estado = 'PENDIENTE'    # mes pasado sin pagar → deuda

            periodos.append({
                'periodo': m.strftime('%Y-%m'),
                'fecha':   m.strftime('%Y-%m-%d'),
                'estado':  estado,
            })
            if not pagado:
                pendientes_compat.append({
                    'periodo': m.strftime('%Y-%m'),
                    'fecha':   m.strftime('%Y-%m-%d'),
                })

        total_deuda = sum(1 for p in periodos if p['estado'] == 'PENDIENTE')  # solo deudas reales (no MES_ACTUAL)

        return Response({
            'colegiado': {
                'id': col.id,
                'dni': col.dni,
                'nombres': col.nombres,
                'nro_colegiado': col.nro_colegiado,
                'carrera': col.carrera.nombre,
                'sede': col.sede.nombre if col.sede else '—',
                'colegiado_desde': col.colegiado_desde.strftime('%Y-%m-%d'),
                'habilitado': _get_habilitado(col.id),
            },
            'periodos': periodos,                  # ← nuevo
            'periodos_pendientes': pendientes_compat,  # ← compatibilidad
            'total_deuda': total_deuda,
        })

