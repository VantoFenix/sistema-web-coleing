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


from .utils import _get_monto_mensualidad

class MasterAdminPermission(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'rol', None) == 'MASTER_ADMIN'

class AdministradorViewSet(ModelViewSet):
    queryset = Administrador.objects.all()
    serializer_class = AdministradorCRUDSerializer
    permission_classes = [MasterAdminPermission]
    pagination_class = None

class SedeViewSet(ModelViewSet):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer
    permission_classes = [MasterAdminPermission]
    pagination_class = None

class CarreraViewSet(ModelViewSet):
    queryset = Carrera.objects.all()
    serializer_class = CarreraSerializer
    permission_classes = [MasterAdminPermission]
    pagination_class = None

class AdminConfiguracionView(APIView):
    """GET / PUT para leer y actualizar la configuración del sistema."""

    def get(self, request):
        return Response({
            'monto_mensualidad': str(_get_monto_mensualidad()),
        })

    def put(self, request):
        monto_str = request.data.get('monto_mensualidad', '')
        try:
            monto = round(float(str(monto_str).replace(',', '.')), 2)
            if monto <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'Ingrese un monto válido mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)

        Configuracion.objects.update_or_create(
            clave='monto_mensualidad',
            defaults={
                'valor':       str(monto),
                'descripcion': 'Monto de la mensualidad CIP (S/)',
            }
        )
        return Response({
            'success':          True,
            'monto_mensualidad': str(monto),
        })

class AdminDashboardView(APIView):
    authentication_classes = []   # omitir JWT para que tokens expirados no bloqueen
    permission_classes = [AllowAny]

    def get(self, request):
        hoy = date.today()

        # Postulaciones pendientes (EN_REVISION)
        postulaciones_nuevas = Solicitud.objects.filter(estado='EN_REVISION').count()

        # Colegiados activos
        colegiados_activos = Colegiado.objects.filter(activo=True).count()

        # Pagos procesados en el mes actual
        pagos_mes = Pago.objects.filter(
            fecha_pago__year=hoy.year,
            fecha_pago__month=hoy.month
        ).count()

        # Trámites atrasados: EN_REVISION por más de 3 días
        import datetime as dt
        ahora = dt.datetime.now(dt.timezone.utc)
        hace_3_dias = ahora - timedelta(days=3)
        tramites_atrasados = Solicitud.objects.filter(
            estado='EN_REVISION',
            creado_en__lt=hace_3_dias
        ).count()

        # Actividad reciente: últimas 5 solicitudes resueltas (usa resuelto_en o creado_en)
        recientes = Solicitud.objects.filter(
            estado__in=['APROBADA', 'RECHAZADA']
        ).order_by('-creado_en')[:5]

        actividad = []
        for s in recientes:
            referencia = s.resuelto_en or s.creado_en
            if referencia:
                if referencia.tzinfo is None:
                    referencia = referencia.replace(tzinfo=dt.timezone.utc)
                diff = ahora - referencia
                mins = int(diff.total_seconds() / 60)
                if mins < 60:
                    tiempo = f"Hace {mins} min"
                elif mins < 1440:
                    tiempo = f"Hace {mins // 60} h"
                else:
                    tiempo = f"Hace {mins // 1440} días"
            else:
                tiempo = "Recientemente"

            actividad.append({
                'nombres': s.nombres,
                'estado': s.estado,
                'tiempo': tiempo,
            })

        return Response({
            'postulaciones_nuevas': postulaciones_nuevas,
            'colegiados_activos': colegiados_activos,
            'pagos_mes': pagos_mes,
            'tramites_atrasados': tramites_atrasados,
            'actividad_reciente': actividad,
        })

