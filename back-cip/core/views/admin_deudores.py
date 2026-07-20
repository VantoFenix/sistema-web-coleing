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


class PanelDeudoresView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        admin = request.user
        if getattr(admin, 'rol', None) != 'CAJERO':
            return Response({'error': 'Solo el cajero puede ver deudores'}, status=403)

        colegiados = Colegiado.objects.all()
        if admin.sede:
            colegiados = colegiados.filter(sede=admin.sede)

        from django.utils import timezone
        now = timezone.now()
        mes_actual = now.month
        anio_actual = now.year

        resultados = []
        for c in colegiados:
            # Puedes usar tu lógica existente para determinar si es deudor
            ultimo_pago = Pago.objects.filter(colegiado=c, tipo='MENSUALIDAD').order_by('-periodo').first()
            es_deudor = False
            
            if not ultimo_pago:
                es_deudor = True
            else:
                if ultimo_pago.periodo.month < mes_actual and ultimo_pago.periodo.year <= anio_actual:
                    es_deudor = True
                    
            estado = 'INHABILITADO' if es_deudor else 'ACTIVO'
            
            resultados.append({
                'dni': c.dni, 
                'nombre': f"{c.nombres} {c.apellidos}" if hasattr(c, 'apellidos') and c.apellidos else c.nombres, 
                'estado': estado
            })

        return Response({'results': resultados})

class AdminNotificarDeudoresView(APIView):
    """Envía correos de recordatorio a los colegiados indicados en `ids`.
    Body: {"ids": [1, 2, 3]}. Si `ids` está vacío, notifica a todos los deudores
    de la sede del cajero."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        admin = request.user
        if getattr(admin, 'rol', None) != 'CAJERO':
            return Response({'error': 'Solo el cajero puede enviar recordatorios'}, status=403)

# pyrefly: ignore [missing-import]
        from ..emails import enviar_recordatorio_deuda

        ids = request.data.get('ids') or []
        sede_id = admin.sede_id if getattr(admin, 'sede_id', None) else None

        sql = """
            SELECT v.colegiado_id, v.nombres, v.nro_colegiado,
                   v.meses_adeudados, v.deuda_total, c.correo
            FROM v_estado_colegiado v
            JOIN colegiado c ON c.id = v.colegiado_id
            WHERE v.meses_adeudados > 0
        """
        params = []
        if ids:
            placeholders = ','.join(['%s'] * len(ids))
            sql += f" AND v.colegiado_id IN ({placeholders})"
            params.extend(ids)
        if sede_id:
            sql += " AND c.sede_id = %s"
            params.append(sede_id)

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        enviados, fallidos, sin_correo = 0, 0, 0
        detalles = []
        for r in rows:
            col_id, nombres, nro_col, meses, deuda, correo = r
            if not correo:
                sin_correo += 1
                detalles.append({'id': col_id, 'estado': 'SIN_CORREO'})
                continue
            try:
                enviar_recordatorio_deuda(
                    correo=correo,
                    nombres=nombres,
                    nro_colegiado=nro_col,
                    meses_adeudados=int(meses or 0),
                    deuda_total=float(deuda or 0),
                )
                enviados += 1
                detalles.append({'id': col_id, 'estado': 'ENVIADO'})
            except Exception as e:
                import sys
                print(f"[NOTIF] Fallo envio a {correo}: {e}", file=sys.stderr)
                fallidos += 1
                detalles.append({'id': col_id, 'estado': 'FALLIDO', 'error': str(e)})

        return Response({
            'enviados':    enviados,
            'fallidos':    fallidos,
            'sin_correo':  sin_correo,
            'total':       len(rows),
            'detalles':    detalles,
        })

class AdminDeudoresDetalladoView(APIView):
    """Variante enriquecida de PanelDeudoresView usada por el panel de
    notificaciones del cajero. Consulta v_estado_colegiado y devuelve
    meses_adeudados, deuda_total y correo por cada deudor.

    Endpoint independiente para no interferir con PanelDeudoresView (que
    otro miembro del equipo mantiene con su propio enfoque)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        admin = request.user
        if getattr(admin, 'rol', None) != 'CAJERO':
            return Response({'error': 'Solo el cajero puede ver deudores'}, status=403)

        sede_id = admin.sede_id if getattr(admin, 'sede_id', None) else None

        sql = """
            SELECT v.colegiado_id, v.dni, v.nombres, v.nro_colegiado,
                   v.carrera, v.sede, v.meses_adeudados, v.deuda_total,
                   c.correo, c.celular
            FROM v_estado_colegiado v
            JOIN colegiado c ON c.id = v.colegiado_id
            WHERE v.meses_adeudados > 0
        """
        params = []
        if sede_id:
            sql += " AND c.sede_id = %s"
            params.append(sede_id)
        sql += " ORDER BY v.meses_adeudados DESC, v.nombres"

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        deudores = [{
            'id':               r[0],
            'dni':              r[1],
            'nombre':           r[2],
            'nro_colegiado':    r[3],
            'carrera':          r[4],
            'sede':             r[5],
            'meses_adeudados':  int(r[6] or 0),
            'deuda_total':      float(r[7] or 0),
            'correo':           r[8] or '',
            'celular':          r[9] or '',
            'estado':           'INHABILITADO',
        } for r in rows]

        return Response(deudores)

