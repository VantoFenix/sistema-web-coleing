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


def _get_monto_mensualidad():
    """Devuelve el monto de mensualidad configurado en BD (default S/ 20.00)."""
    try:
        return round(float(Configuracion.objects.get(clave='monto_mensualidad').valor), 2)
    except (Configuracion.DoesNotExist, ValueError, TypeError):
        return 20.00

def _get_habilitado(colegiado_id):
    """Consulta la vista v_estado_colegiado y retorna True/False."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT habilitado FROM v_estado_colegiado WHERE colegiado_id = %s",
                [colegiado_id]
            )
            row = cursor.fetchone()
            return bool(row[0]) if row else False
    except Exception:
        return False

def _meses_entre(inicio, fin):
    """Genera lista de primer-día-del-mes entre inicio y fin (inclusive).
    Normaliza a date por si Supabase devuelve datetime en vez de date.
    """
    # Normalizar a date (Supabase a veces devuelve datetime para DateField)
    if hasattr(inicio, 'date'):
        inicio = inicio.date()
    if hasattr(fin, 'date'):
        fin = fin.date()
    resultado = []
    current = date(inicio.year, inicio.month, 1)
    fin_m   = date(fin.year, fin.month, 1)
    while current <= fin_m:
        resultado.append(current)
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return resultado

def react_catchall_view(request):
    try:
        with open(os.path.join(settings.FRONTEND_DIR, 'index.html')) as f:
            return HttpResponse(f.read())
    except FileNotFoundError:
        return HttpResponse(
            """
            <h2>React Frontend not built!</h2>
            <p>Run <code>npm run build</code> in front-cip, or make sure the build script ran properly.</p>
            """,
            status=501,
        )

