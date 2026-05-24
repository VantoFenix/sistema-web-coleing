import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.contrib.auth.hashers import check_password
from django.db import connection
from django.http import HttpResponse
import os

from .models import Administrador, Colegiado, Solicitud, Carrera, Sede
from .serializers import AdministradorSerializer, ColegiadoSerializer, SolicitudSerializer, CarreraSerializer, SedeSerializer

def generate_jwt(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=1),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

class AuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username') # puede ser DNI o Correo
        password = request.data.get('password')
        role = request.data.get('role', 'COLEGIADO') # 'ADMIN' or 'COLEGIADO'

        if not username or not password:
            return Response({'error': 'Credenciales requeridas'}, status=status.HTTP_400_BAD_REQUEST)

        if role == 'ADMIN':
            # Buscar en Administrador (por correo o usuario)
            admin = Administrador.objects.filter(correo=username).first() or Administrador.objects.filter(usuario=username).first()
            if admin and check_password(password, admin.password_hash):
                token = generate_jwt(admin.id, 'ADMIN')
                return Response({
                    'token': token,
                    'user': AdministradorSerializer(admin).data,
                    'role': 'ADMIN'
                })
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
            
        else:
            # Buscar en Colegiado (por DNI o Correo)
            col = Colegiado.objects.filter(dni=username).first() or Colegiado.objects.filter(correo=username).first()
            if col and check_password(password, col.password_hash):
                token = generate_jwt(col.id, 'COLEGIADO')
                return Response({
                    'token': token,
                    'user': ColegiadoSerializer(col).data,
                    'role': 'COLEGIADO'
                })
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


class PublicPadronView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        dni = request.query_params.get('dni')
        if not dni:
            return Response({'error': 'Debe proporcionar DNI'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar el colegiado
        col = Colegiado.objects.filter(dni=dni).first()
        if not col:
            return Response({'error': 'No se encontró un ingeniero colegiado con ese DNI'}, status=status.HTTP_404_NOT_FOUND)

        # Consultar la vista v_estado_colegiado
        with connection.cursor() as cursor:
            cursor.execute("SELECT habilitado FROM v_estado_colegiado WHERE colegiado_id = %s", [col.id])
            row = cursor.fetchone()
            habilitado = row[0] if row else False

        data = ColegiadoSerializer(col).data
        data['habilitado'] = habilitado
        return Response(data)

class AdminPostulacionesView(APIView):
    permission_classes = [AllowAny] # In production, protect via JWT check

    def get(self, request):
        solicitudes = Solicitud.objects.filter(estado='EN_REVISION').order_by('creado_en')
        return Response(SolicitudSerializer(solicitudes, many=True).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_catalogos(request):
    carreras = Carrera.objects.filter(activo=True)
    sedes = Sede.objects.filter(activo=True)
    return Response({
        'carreras': CarreraSerializer(carreras, many=True).data,
        'sedes': SedeSerializer(sedes, many=True).data
    })

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
