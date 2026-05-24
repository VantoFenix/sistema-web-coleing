import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.hashers import make_password, check_password
from django.db import connection
from django.http import HttpResponse
from django.core.files.storage import default_storage
import os
import uuid

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

class PublicPostulacionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        dni = request.data.get('dni')
        nombres = request.data.get('nombres')
        celular = request.data.get('celular')
        correo = request.data.get('correo')
        carrera_nombre = request.data.get('carrera')
        
        foto = request.FILES.get('foto')
        titulo = request.FILES.get('titulo')
        recibo = request.FILES.get('recibo')

        if not all([dni, nombres, correo, carrera_nombre, foto, titulo, recibo]):
            return Response({'error': 'Faltan campos o documentos requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar carrera
        carrera = Carrera.objects.filter(nombre=carrera_nombre).first()
        if not carrera:
            return Response({'error': 'Carrera no válida'}, status=status.HTTP_400_BAD_REQUEST)

        # Guardar archivos (Usando el sistema local temporal)
        base_path = 'postulaciones/'
        foto_name = f"{base_path}{uuid.uuid4()}_{foto.name}"
        titulo_name = f"{base_path}{uuid.uuid4()}_{titulo.name}"
        recibo_name = f"{base_path}{uuid.uuid4()}_{recibo.name}"

        default_storage.save(foto_name, foto)
        default_storage.save(titulo_name, titulo)
        default_storage.save(recibo_name, recibo)

        solicitud = Solicitud.objects.create(
            dni=dni,
            nombres=nombres,
            correo=correo,
            celular=celular,
            carrera=carrera,
            foto_url=f"/media/{foto_name}",
            titulo_pdf_url=f"/media/{titulo_name}",
            recibo_pago_url=f"/media/{recibo_name}",
            estado='EN_REVISION'
        )

        return Response({'success': True, 'solicitud_id': solicitud.id})

class AdminPostulacionesView(APIView):
    # En producción idealmente IsAuthenticated, lo dejamos AllowAny para MVP rápido
    permission_classes = [AllowAny] 

    def get(self, request):
        solicitudes = Solicitud.objects.filter(estado='EN_REVISION').order_by('creado_en')
        return Response(SolicitudSerializer(solicitudes, many=True).data)

class AdminResolverSolicitudView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        accion = request.data.get('accion') # 'APROBAR' o 'RECHAZAR'
        comentarios = request.data.get('comentarios', '')
        
        try:
            solicitud = Solicitud.objects.get(pk=pk, estado='EN_REVISION')
        except Solicitud.DoesNotExist:
            return Response({'error': 'Solicitud no encontrada o ya resuelta'}, status=status.HTTP_404_NOT_FOUND)

        if accion == 'RECHAZAR':
            solicitud.estado = 'RECHAZADA'
            solicitud.motivo_rechazo = comentarios
            solicitud.resuelto_en = datetime.utcnow()
            solicitud.save()
            return Response({'success': True, 'estado': 'RECHAZADA'})
            
        elif accion == 'APROBAR':
            solicitud.estado = 'APROBADA'
            solicitud.resuelto_en = datetime.utcnow()
            solicitud.save()
            
            # Generar Colegiado
            # Generar un Nro Colegiado (Simulado: max nro + 1)
            with connection.cursor() as cursor:
                cursor.execute("SELECT MAX(CAST(nro_colegiado AS INTEGER)) FROM colegiado")
                row = cursor.fetchone()
                siguiente_nro = str((row[0] or 10000) + 1)
            
            Colegiado.objects.create(
                correo=solicitud.correo,
                password_hash=make_password(solicitud.dni), # Contraseña por defecto
                dni=solicitud.dni,
                nombres=solicitud.nombres,
                celular=solicitud.celular,
                foto_url=solicitud.foto_url,
                carrera=solicitud.carrera,
                sede=solicitud.sede, # Puede ser null
                nro_colegiado=siguiente_nro,
                solicitud=solicitud,
                colegiado_desde=datetime.utcnow().date()
            )
            return Response({'success': True, 'estado': 'APROBADA'})
            
        return Response({'error': 'Acción inválida'}, status=status.HTTP_400_BAD_REQUEST)

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
