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


class ReniecConsultaView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        import urllib.request, urllib.error, json as _json, sys

        dni = request.query_params.get('dni')
        if not dni or len(dni) != 8 or not dni.isdigit():
            return Response({'error': 'DNI inválido'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar contra la BD antes de consumir la API externa
        if Colegiado.objects.filter(dni=dni).exists():
            return Response(
                {'error': 'DNI_YA_COLEGIADO', 'detalle': 'Este DNI ya está registrado como colegiado. Ingrese a su portal.'},
                status=status.HTTP_409_CONFLICT
            )
        if Solicitud.objects.filter(dni=dni, estado__in=['EN_REVISION', 'APROBADA']).exists():
            return Response(
                {'error': 'DNI_CON_SOLICITUD', 'detalle': 'Este DNI ya tiene una solicitud activa. Puede consultar su estado en la página principal.'},
                status=status.HTTP_409_CONFLICT
            )

        token = os.getenv('RENIEC_TOKEN')
        if not token:
            print('[RENIEC] ERROR: Variable RENIEC_TOKEN no configurada en el entorno', file=sys.stderr)
            return Response(
                {'error': 'CONFIG_ERROR', 'detalle': 'La variable RENIEC_TOKEN no está configurada en el servidor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            req = urllib.request.Request(
                f'https://api.decolecta.com/v1/reniec/dni?numero={dni}',
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = _json.loads(resp.read().decode())
                nombre_completo = data.get('full_name', '').strip()
                if not nombre_completo:
                    return Response({'error': 'DNI no encontrado en RENIEC'}, status=status.HTTP_404_NOT_FOUND)
                return Response({'nombre_completo': nombre_completo})

        except urllib.error.HTTPError as e:
            body = ''
            try: body = e.read().decode()[:200]
            except: pass
            print(f'[RENIEC] HTTPError {e.code}: {body}', file=sys.stderr)
            if e.code == 429:
                return Response({'error': 'RATE_LIMIT', 'detalle': 'Límite de consultas alcanzado'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            if e.code in (401, 403):
                return Response(
                    {'error': 'TOKEN_INVALIDO', 'detalle': f'Token rechazado por decolecta.com (HTTP {e.code}). Puede ser restricción de IP del servidor de producción.'},
                    status=status.HTTP_502_BAD_GATEWAY
                )
            return Response({'error': 'DNI no encontrado en RENIEC'}, status=status.HTTP_404_NOT_FOUND)

        except urllib.error.URLError as e:
            print(f'[RENIEC] URLError: {e.reason}', file=sys.stderr)
            return Response(
                {'error': 'RED_ERROR', 'detalle': f'No se pudo conectar con decolecta.com: {e.reason}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            print(f'[RENIEC] Error inesperado: {e}', file=sys.stderr)
            return Response({'error': 'ERROR_INTERNO', 'detalle': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class PublicPadronView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        dni = request.query_params.get('dni')
        cip = request.query_params.get('cip')
        nombres = request.query_params.get('nombres')
        
        queryset = Colegiado.objects.all()
        
        if dni:
            queryset = queryset.filter(dni=dni)
        elif cip:
            queryset = queryset.filter(nro_colegiado=cip)
        elif nombres:
            queryset = queryset.filter(nombres__icontains=nombres)
        else:
            return Response({'error': 'Debe proporcionar DNI, CIP o Nombres'}, status=status.HTTP_400_BAD_REQUEST)
        
        resultados = []
        for col in queryset:
            with connection.cursor() as cursor:
                cursor.execute("SELECT habilitado FROM v_estado_colegiado WHERE colegiado_id = %s", [col.id])
                row = cursor.fetchone()
                habilitado = row[0] if row else False
            
            data = ColegiadoSerializer(col).data
            data['habilitado'] = habilitado
            resultados.append(data)
            
        return Response(resultados)

class PublicConsultaSolicitudView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        dni = request.query_params.get('dni')
        if not dni:
            return Response({'error': 'DNI es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar la solicitud más reciente para ese DNI
        sol = Solicitud.objects.filter(dni=dni).order_by('-creado_en').first()
        if not sol:
            return Response({'error': 'No se encontró ninguna solicitud con ese DNI'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'id': sol.id,
            'estado': sol.estado,
            'motivo_rechazo': sol.motivo_rechazo
        })

class PublicPostulacionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        dni = request.data.get('dni')
        nombres = request.data.get('nombres')
        carrera_nombre = request.data.get('carrera')
        sede_nombre = request.data.get('sede')
        numero_operacion = request.data.get('numero_operacion')
        fecha_pago = request.data.get('fecha_pago')
        banco = request.data.get('banco')
        correo = request.data.get('correo')
        celular = request.data.get('celular')

        foto = request.FILES.get('foto')
        titulo = request.FILES.get('titulo')
        recibo = request.FILES.get('recibo')

        if not all([dni, nombres, carrera_nombre, sede_nombre, foto, titulo, recibo, numero_operacion, fecha_pago, correo, celular]):
            return Response({'error': 'Faltan campos o documentos requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        # Validacion de formatos de archivo
        if not foto.content_type.startswith('image/'):
            return Response({'error': 'La foto debe ser un archivo de imagen válido (JPG, PNG).'}, status=status.HTTP_400_BAD_REQUEST)
        if titulo.content_type != 'application/pdf':
            return Response({'error': 'El Título Profesional debe ser un archivo PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (recibo.content_type.startswith('image/') or recibo.content_type == 'application/pdf'):
            return Response({'error': 'El Recibo de Caja debe ser un PDF o una imagen.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validar el comprobante con el Mock del Banco de la Nación
        if banco == 'BN':
            resultado = BancoNacionMockService.verificar_operacion(numero_operacion, fecha_pago)
            if not resultado["valido"]:
                return Response({'error': resultado["mensaje"]}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que el DNI no pertenezca a un colegiado ya registrado
        if Colegiado.objects.filter(dni=dni).exists():
            return Response(
                {'error': 'El DNI ya está registrado como colegiado. Si ya es colegiado, ingrese a su portal.'},
                status=status.HTTP_409_CONFLICT
            )
            
        # Verificar que el número de operación no haya sido usado y validado en una postulación aprobada
        if Solicitud.objects.filter(numero_operacion=numero_operacion, estado='APROBADA').exists():
            return Response(
                {'error': 'Este número de operación ya ha sido validado y utilizado en una postulación exitosa.'},
                status=status.HTTP_409_CONFLICT
            )

        # Verificar que no exista ya una solicitud activa para ese DNI
        if Solicitud.objects.filter(dni=dni, estado__in=['EN_REVISION', 'APROBADA']).exists():
            return Response(
                {'error': 'Ya existe una solicitud activa para este DNI. Puede consultar su estado en la página principal.'},
                status=status.HTTP_409_CONFLICT
            )

        # Buscar carrera y sede
        carrera = Carrera.objects.filter(nombre=carrera_nombre).first()
        sede = Sede.objects.filter(nombre=sede_nombre).first()
        if not carrera or not sede:
            return Response({'error': 'Carrera o Sede no válida'}, status=status.HTTP_400_BAD_REQUEST)

        # Guardar archivos
        base_path = 'postulaciones/'
        foto_name = f"{base_path}{uuid.uuid4()}_{foto.name}"
        titulo_name = f"{base_path}{uuid.uuid4()}_{titulo.name}"
        recibo_name = f"{base_path}{uuid.uuid4()}_{recibo.name}"

        try:
            default_storage.save(foto_name, foto)
            default_storage.save(titulo_name, titulo)
            default_storage.save(recibo_name, recibo)
        except Exception as e:
            import sys
            print(f"[ERROR] Fallo al guardar archivos: {e}", file=sys.stderr)
            return Response({'error': f'Error al guardar los archivos: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            solicitud = Solicitud.objects.create(
                dni=dni,
                nombres=nombres,
                carrera=carrera,
                sede=sede,
                foto_url=f"/media/{foto_name}",
                titulo_pdf_url=f"/media/{titulo_name}",
                recibo_pago_url=f"/media/{recibo_name}",
                numero_operacion=numero_operacion,
                fecha_pago=fecha_pago,
                correo=correo,
                celular=celular,
                estado='EN_REVISION'
            )
        except Exception as e:
            import sys
            print(f"[ERROR] Fallo al crear solicitud en BD: {e}", file=sys.stderr)
            return Response({'error': f'Error al registrar la solicitud: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        return Response({'success': True, 'solicitud_id': solicitud.id})

class PublicActualizarPostulacionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            sol = Solicitud.objects.get(pk=pk, estado='RECHAZADA')
            return Response({
                'motivo_rechazo': sol.motivo_rechazo
            })
        except Solicitud.DoesNotExist:
            return Response({'error': 'Solicitud no encontrada o no está rechazada'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        try:
            solicitud = Solicitud.objects.get(pk=pk, estado='RECHAZADA')
        except Solicitud.DoesNotExist:
            return Response({'error': 'Solicitud no encontrada o no está rechazada'}, status=status.HTTP_404_NOT_FOUND)

        solicitud.correo = request.data.get('correo', solicitud.correo)
        solicitud.celular = request.data.get('celular', solicitud.celular)
        carrera_nombre = request.data.get('carrera')
        sede_nombre = request.data.get('sede')
        if carrera_nombre:
            carrera = Carrera.objects.filter(nombre=carrera_nombre).first()
            if carrera: solicitud.carrera = carrera
        if sede_nombre:
            sede = Sede.objects.filter(nombre=sede_nombre).first()
            if sede: solicitud.sede = sede

        numero_operacion = request.data.get('numero_operacion')
        fecha_pago = request.data.get('fecha_pago')
        if numero_operacion: solicitud.numero_operacion = numero_operacion
        if fecha_pago: solicitud.fecha_pago = fecha_pago

        # Check unique operation number
        if numero_operacion and Solicitud.objects.filter(numero_operacion=numero_operacion).exclude(id=solicitud.id).exclude(estado='RECHAZADA').exists():
            return Response({'error': 'Este número de operación ya ha sido registrado en otra postulación. Por favor verifique sus datos.'}, status=status.HTTP_409_CONFLICT)

        foto = request.FILES.get('foto')
        titulo = request.FILES.get('titulo')
        recibo = request.FILES.get('recibo')
        base_path = 'postulaciones/'

        try:
            if foto:
                if not foto.content_type.startswith('image/'):
                    return Response({'error': 'La foto debe ser imagen válida.'}, status=status.HTTP_400_BAD_REQUEST)
                fn = f"{base_path}{uuid.uuid4()}_{foto.name}"
                default_storage.save(fn, foto)
                solicitud.foto_url = f"/media/{fn}"

            if titulo:
                if titulo.content_type != 'application/pdf':
                    return Response({'error': 'El Título debe ser PDF.'}, status=status.HTTP_400_BAD_REQUEST)
                tn = f"{base_path}{uuid.uuid4()}_{titulo.name}"
                default_storage.save(tn, titulo)
                solicitud.titulo_pdf_url = f"/media/{tn}"

            if recibo:
                if not (recibo.content_type.startswith('image/') or recibo.content_type == 'application/pdf'):
                    return Response({'error': 'El Recibo debe ser PDF o imagen.'}, status=status.HTTP_400_BAD_REQUEST)
                rn = f"{base_path}{uuid.uuid4()}_{recibo.name}"
                default_storage.save(rn, recibo)
                solicitud.recibo_pago_url = f"/media/{rn}"
        except Exception as e:
            return Response({'error': f'Error guardando archivos: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        solicitud.estado = 'EN_REVISION'
        solicitud.save()

        return Response({'success': True, 'solicitud_id': solicitud.id})

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_catalogos(request):
    carreras = Carrera.objects.filter(activo=True)
    sedes = Sede.objects.filter(activo=True)
    return Response({
        'carreras': CarreraSerializer(carreras, many=True).data,
        'sedes': SedeSerializer(sedes, many=True).data
    })

