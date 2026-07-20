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


def _prepare_user_for_token(user):
    user.password = user.password_hash
    user.last_login = None
    user.get_email_field_name = lambda: 'correo'
    return user

def generate_jwt(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=1),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

class AuthLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role', 'COLEGIADO')  # 'ADMIN' o 'COLEGIADO'

        if not username:
            return Response({'error': 'Credenciales requeridas'}, status=status.HTTP_400_BAD_REQUEST)

        if role == 'ADMIN':
            # Admin: verifica usuario/correo + contraseña con hash
            if not password:
                return Response({'error': 'Credenciales requeridas'}, status=status.HTTP_400_BAD_REQUEST)
            admin = (Administrador.objects.filter(correo=username).first()
                     or Administrador.objects.filter(usuario=username).first())
            if admin and check_password(password, admin.password_hash):
                token = generate_jwt(admin.id, admin.rol)
                return Response({
                    'token': token,
                    'user': AdministradorSerializer(admin).data,
                    'role': admin.rol,
                    'sede_nombre': admin.sede.nombre if admin.sede else 'Sede Global'
                })
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)

        else:
            # Colegiado: solo verifica que el DNI exista en la BD (portal público)
            col = Colegiado.objects.filter(dni=username, activo=True).first()
            if col:
                token = generate_jwt(col.id, 'COLEGIADO')
                return Response({
                    'token': token,
                    'user': ColegiadoSerializer(col).data,
                    'role': 'COLEGIADO'
                })
            return Response({'error': 'DNI no encontrado. Verifique su número de colegiado.'}, status=status.HTTP_401_UNAUTHORIZED)

class PasswordResetRequestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        correo = request.data.get('correo')
        if not correo:
            return Response({'error': 'Correo requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = Administrador.objects.filter(correo=correo).first()
        if user:
            token_user = _prepare_user_for_token(user)
            token = default_token_generator.make_token(token_user)
            uid = urlsafe_base64_encode(force_bytes(user.id))
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            link = f"{frontend_url}/reset-password/{uid}/{token}/"
            
            try:
                send_mail(
                    'Restablecer o Configurar Contraseña',
                    f'''Haga clic en el siguiente enlace para configurar su contraseña:
{link}

Atención: Tiene 10 minutos para confirmar este enlace, de lo contrario su solicitud expirará y será eliminada del sistema.''',
                    settings.DEFAULT_FROM_EMAIL or 'admin@cip.com',
                    [correo],
                    fail_silently=True,
                )
            except Exception as e:
                import sys
                print(f"[EMAIL ERROR] {e}", file=sys.stderr)

            return Response({'success': 'Si el correo existe, se enviará un enlace de recuperación.'})
        else:
            return Response({'error': 'No se encontró ningún usuario con este correo.'}, status=status.HTTP_404_NOT_FOUND)

class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'Nueva contraseña requerida'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Administrador.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Administrador.DoesNotExist):
            user = None

        if user is not None:
            token_user = _prepare_user_for_token(user)
            if default_token_generator.check_token(token_user, token):
                user.password_hash = make_password(new_password)
                user.activo = True
                user.cuenta_confirmada = True
                user.save(update_fields=['password_hash', 'activo', 'cuenta_confirmada'])
                return Response({'success': 'Contraseña actualizada correctamente.'})

        return Response({'error': 'Enlace inválido o expirado'}, status=status.HTTP_400_BAD_REQUEST)

