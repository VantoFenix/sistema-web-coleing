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
from .utils import _get_monto_mensualidad

class MasterAdminPermission(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'rol', None) == 'MASTER_ADMIN'

class AdministradorViewSet(ModelViewSet):
    queryset = Administrador.objects.all()
    serializer_class = AdministradorCRUDSerializer
    permission_classes = [MasterAdminPermission]
    pagination_class = None

    def perform_create(self, serializer):
        user = serializer.save(cuenta_confirmada=False)
        
        # Enviar correo para que configuren su contraseña
        try:
            from .auth import _prepare_user_for_token
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            from django.conf import settings
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            token_user = _prepare_user_for_token(user)
            token = default_token_generator.make_token(token_user)
            uid = urlsafe_base64_encode(force_bytes(user.id))
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            link = f"{frontend_url}/reset-password/{uid}/{token}/"
            
            rol_display = dict(Administrador._meta.get_field('rol').choices).get(user.rol, user.rol)
            
            plain_text = f"Hola {user.nombres},\n\nSe ha creado una cuenta para ti en el Sistema CIP ({rol_display}).\nHaz clic aquí para configurarla: {link}\n\nTienes 10 minutos."
            
            html_text = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50;">Colegio de Ingenieros del Perú</h2>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <h3 style="color: #34495e; margin-top: 0;">Bienvenido al Sistema CIP</h3>
                    <p style="color: #555; line-height: 1.5;">Hola <strong>{user.nombres}</strong>,</p>
                    <p style="color: #555; line-height: 1.5;">Se ha creado una cuenta interna para ti en el sistema con el rol de <strong>{rol_display}</strong>.</p>
                    <p style="color: #555; line-height: 1.5;">Tu usuario de acceso es: <strong>{user.usuario}</strong></p>
                    <p style="color: #555; line-height: 1.5;">Por favor, haz clic en el siguiente botón para configurar tu contraseña y activar tu cuenta:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{link}" style="background-color: #b32821; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Configurar Contraseña</a>
                    </div>
                </div>
                <div style="margin-top: 20px; font-size: 12px; color: #7f8c8d; text-align: center;">
                    <p><strong>Atención:</strong> Tienes 10 minutos para utilizar este enlace, de lo contrario tu solicitud expirará.</p>
                </div>
            </div>
            """

            message = Mail(
                from_email=settings.DEFAULT_FROM_EMAIL or 'vantofortnite@gmail.com',
                to_emails=user.correo,
                subject='Bienvenido al Sistema CIP - Configura tu contraseña',
                plain_text_content=plain_text,
                html_content=html_text
            )
            
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            print(f"[EMAIL SUCCESS] SendGrid StatusCode: {response.status_code}")
        except Exception as e:
            import sys
            print(f"[EMAIL ERROR CREATING ADMIN] {e}", file=sys.stderr)

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


class IsAdminSede(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'rol', None) == 'ADMIN'

class CajeroSedeViewSet(ModelViewSet):
    permission_classes = [IsAdminSede]
    serializer_class = AdministradorCRUDSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not user or not hasattr(user, 'sede') or not user.sede:
            return Administrador.objects.none()
        return Administrador.objects.filter(sede=user.sede, rol='CAJERO')

    def perform_create(self, serializer):
        user_admin = self.request.user
        user = serializer.save(rol='CAJERO', sede=user_admin.sede, cuenta_confirmada=False)
        
        # Enviar correo para que configuren su contraseña
        try:
            from .auth import _prepare_user_for_token
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            from django.conf import settings
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            token_user = _prepare_user_for_token(user)
            token = default_token_generator.make_token(token_user)
            uid = urlsafe_base64_encode(force_bytes(user.id))
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            link = f"{frontend_url}/reset-password/{uid}/{token}/"
            
            rol_display = "CAJERO (Atención Sede)"
            
            plain_text = f"Hola {user.nombres},\n\nSe ha creado una cuenta para ti en el Sistema CIP ({rol_display}).\nHaz clic aquí para configurarla: {link}\n\nTienes 10 minutos."
            
            html_text = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50;">Colegio de Ingenieros del Perú</h2>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <h3 style="color: #34495e; margin-top: 0;">Bienvenido al Sistema CIP</h3>
                    <p style="color: #555; line-height: 1.5;">Hola <strong>{user.nombres}</strong>,</p>
                    <p style="color: #555; line-height: 1.5;">Se ha creado una cuenta interna para ti en el sistema con el rol de <strong>{rol_display}</strong>.</p>
                    <p style="color: #555; line-height: 1.5;">Tu usuario de acceso es: <strong>{user.usuario}</strong></p>
                    <p style="color: #555; line-height: 1.5;">Por favor, haz clic en el siguiente botón para configurar tu contraseña y activar tu cuenta:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{link}" style="background-color: #b32821; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Configurar Contraseña</a>
                    </div>
                </div>
                <div style="margin-top: 20px; font-size: 12px; color: #7f8c8d; text-align: center;">
                    <p><strong>Atención:</strong> Tienes 10 minutos para utilizar este enlace, de lo contrario tu solicitud expirará.</p>
                </div>
            </div>
            """

            message = Mail(
                from_email=settings.DEFAULT_FROM_EMAIL or 'vantofortnite@gmail.com',
                to_emails=user.correo,
                subject='Bienvenido al Sistema CIP - Configura tu contraseña',
                plain_text_content=plain_text,
                html_content=html_text
            )
            
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            print(f"[EMAIL SUCCESS] SendGrid StatusCode: {response.status_code}")
        except Exception as e:
            import sys
            print(f"[EMAIL ERROR CREATING CAJERO] {e}", file=sys.stderr)

    def perform_update(self, serializer):
        user_admin = self.request.user
        serializer.save(rol='CAJERO', sede=user_admin.sede)

    def perform_destroy(self, instance):
        user_admin = self.request.user
        if instance.rol == 'CAJERO' and instance.sede == user_admin.sede:
            instance.delete()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No tiene permiso para eliminar este usuario.")


