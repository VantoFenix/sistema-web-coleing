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

        reniec_url_template = os.getenv('RENIEC_URL', 'https://api.decolecta.com/v1/reniec/dni?numero={dni}')
        reniec_url = reniec_url_template.replace('{dni}', dni)

        try:
            req = urllib.request.Request(
                reniec_url,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = _json.loads(resp.read().decode())
                
                # Extraer nombre completo soportando múltiples proveedores (Decolecta, ApisPerú, Apiperu.dev, etc.)
                nombre_completo = None
                if isinstance(data, dict):
                    nombre_completo = (
                        data.get('full_name') or 
                        data.get('nombre_completo') or 
                        data.get('name') or
                        (f"{data.get('nombres', '')} {data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip() if data.get('apellidoPaterno') else None) or
                        (data.get('data', {}).get('nombre_completo') if isinstance(data.get('data'), dict) else None)
                    )
                
                if not nombre_completo or not str(nombre_completo).strip():
                    return Response({'error': 'DNI no encontrado en RENIEC'}, status=status.HTTP_404_NOT_FOUND)
                return Response({'nombre_completo': str(nombre_completo).strip()})

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

from rest_framework.throttling import AnonRateThrottle

class CheckDniView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        dni = request.query_params.get('dni', '').strip()
        tipo = request.query_params.get('tipo', 'todos').strip().lower()

        if not dni or len(dni) != 8 or not dni.isdigit():
            return Response({'error': 'DNI inválido. Debe contener 8 dígitos.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Verificar en Administrador (Usuarios / Cajeros)
        if tipo in ['usuario', 'todos'] and Administrador.objects.filter(usuario=dni).exists():
            return Response({
                'exists': True,
                'mensaje': 'Este DNI ya se encuentra registrado.'
            }, status=status.HTTP_200_OK)

        # 2. Verificar en Colegiado
        if tipo in ['colegiado', 'todos'] and Colegiado.objects.filter(dni=dni).exists():
            return Response({
                'exists': True,
                'mensaje': 'Este DNI ya se encuentra registrado.'
            }, status=status.HTTP_200_OK)

        # 3. Verificar en Solicitud (Trámites activos)
        if tipo in ['colegiado', 'todos'] and Solicitud.objects.filter(dni=dni, estado__in=['EN_REVISION', 'APROBADA']).exists():
            return Response({
                'exists': True,
                'mensaje': 'Este DNI ya se encuentra registrado.'
            }, status=status.HTTP_200_OK)

        return Response({'exists': False}, status=status.HTTP_200_OK)


from ..authentication import CustomJWTAuthentication
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from datetime import datetime, date, time

class PublicPostulacionView(APIView):
    authentication_classes = [CustomJWTAuthentication]
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
        tipo_comprobante = request.data.get('tipo_comprobante', '03')
        ruc_factura = request.data.get('ruc_factura')
        razon_social_factura = request.data.get('razon_social_factura')

        foto = request.FILES.get('foto')
        titulo = request.FILES.get('titulo')
        recibo = request.FILES.get('recibo')
        dni_anverso = request.FILES.get('dni_anverso')
        dni_reverso = request.FILES.get('dni_reverso')

        if not all([dni, nombres, carrera_nombre, sede_nombre, foto, titulo, dni_anverso, dni_reverso, numero_operacion, fecha_pago, correo, celular]):
            return Response({'error': 'Faltan campos o documentos requeridos'}, status=status.HTTP_400_BAD_REQUEST)
            
        if banco not in ['CAJA', 'MIXTO', 'YAPE_PLIN', 'EFECTIVO'] and not recibo:
            return Response({'error': 'El voucher de pago es requerido para pagos online.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validacion de formatos de archivo
        if not foto.content_type.startswith('image/'):
            return Response({'error': 'La foto debe ser un archivo de imagen válido (JPG, PNG).'}, status=status.HTTP_400_BAD_REQUEST)
        if titulo.content_type != 'application/pdf':
            return Response({'error': 'El Título Profesional debe ser un archivo PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        if recibo and not (recibo.content_type.startswith('image/') or recibo.content_type == 'application/pdf'):
            return Response({'error': 'El Recibo de Caja debe ser un PDF o una imagen.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (dni_anverso.content_type.startswith('image/') or dni_anverso.content_type == 'application/pdf'):
            return Response({'error': 'El DNI Anverso debe ser un PDF o una imagen.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (dni_reverso.content_type.startswith('image/') or dni_reverso.content_type == 'application/pdf'):
            return Response({'error': 'El DNI Reverso debe ser un PDF o una imagen.'}, status=status.HTTP_400_BAD_REQUEST)

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
        recibo_name = f"{base_path}{uuid.uuid4()}_{recibo.name}" if recibo else None
        dni_anverso_name = f"{base_path}{uuid.uuid4()}_{dni_anverso.name}"
        dni_reverso_name = f"{base_path}{uuid.uuid4()}_{dni_reverso.name}"

        try:
            import sys
            sys.path.append(os.path.join(settings.BASE_DIR, '..'))
            from utils.storage import select_raw_storage, select_media_storage
            raw_storage = select_raw_storage()
            media_storage = select_media_storage()
            
            def save_file_and_get_url(name, file_obj):
                if not file_obj:
                    return None
                if file_obj.content_type.startswith('image/'):
                    saved = media_storage.save(name, file_obj)
                    return media_storage.url(saved)
                else:
                    saved = raw_storage.save(name, file_obj)
                    return raw_storage.url(saved)
            
            foto_url_val = save_file_and_get_url(foto_name, foto)
            titulo_url_val = save_file_and_get_url(titulo_name, titulo)
            recibo_url_val = save_file_and_get_url(recibo_name, recibo) if recibo else None
            dni_anverso_url_val = save_file_and_get_url(dni_anverso_name, dni_anverso)
            dni_reverso_url_val = save_file_and_get_url(dni_reverso_name, dni_reverso)
        except Exception as e:
            import sys
            print(f"[ERROR] Fallo al guardar archivos: {e}", file=sys.stderr)
            return Response({'error': f'Error al guardar los archivos: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        creado_en_input = request.data.get('creado_en')
        fecha_creacion_final = timezone.now()

        # Candado de Seguridad: Solo usuarios autenticados con rol CAJERO, ADMIN o MASTER_ADMIN pueden enviar fecha personalizada
        if request.user and getattr(request.user, 'is_authenticated', False) and getattr(request.user, 'rol', None) in ['CAJERO', 'ADMIN', 'MASTER_ADMIN']:
            if creado_en_input:
                try:
                    parsed_date = datetime.strptime(str(creado_en_input).strip(), '%Y-%m-%d').date()
                    naive_dt = datetime.combine(parsed_date, time.min)
                    fecha_creacion_final = timezone.make_aware(naive_dt)
                except ValueError:
                    parsed_dt = parse_datetime(str(creado_en_input))
                    if parsed_dt:
                        if timezone.is_naive(parsed_dt):
                            fecha_creacion_final = timezone.make_aware(parsed_dt)
                        else:
                            fecha_creacion_final = parsed_dt

        try:
            solicitud = Solicitud.objects.create(
                dni=dni,
                nombres=nombres,
                carrera=carrera,
                sede=sede,
                foto_url=foto_url_val,
                titulo_pdf_url=titulo_url_val,
                recibo_pago_url=recibo_url_val,
                dni_anverso_url=dni_anverso_url_val,
                dni_reverso_url=dni_reverso_url_val,
                numero_operacion=numero_operacion,
                fecha_pago=fecha_pago,
                correo=correo,
                celular=celular,
                tipo_comprobante=tipo_comprobante,
                ruc_factura=ruc_factura,
                razon_social_factura=razon_social_factura,
                estado='EN_REVISION',
                creado_en=fecha_creacion_final
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
            from utils.storage import select_raw_storage, select_media_storage
            media_storage = select_media_storage()
            raw_storage = select_raw_storage()

            if foto:
                if not foto.content_type.startswith('image/'):
                    return Response({'error': 'La foto debe ser imagen válida.'}, status=status.HTTP_400_BAD_REQUEST)
                fn = f"{base_path}{uuid.uuid4()}_{foto.name}"
                saved = media_storage.save(fn, foto)
                solicitud.foto_url = media_storage.url(saved)

            if titulo:
                if titulo.content_type != 'application/pdf':
                    return Response({'error': 'El Título debe ser PDF.'}, status=status.HTTP_400_BAD_REQUEST)
                tn = f"{base_path}{uuid.uuid4()}_{titulo.name}"
                saved = raw_storage.save(tn, titulo)
                solicitud.titulo_pdf_url = raw_storage.url(saved)

            if recibo:
                if not (recibo.content_type.startswith('image/') or recibo.content_type == 'application/pdf'):
                    return Response({'error': 'El Recibo debe ser PDF o imagen.'}, status=status.HTTP_400_BAD_REQUEST)
                rn = f"{base_path}{uuid.uuid4()}_{recibo.name}"
                st = media_storage if recibo.content_type.startswith('image/') else raw_storage
                saved = st.save(rn, recibo)
                solicitud.recibo_pago_url = st.url(saved)
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

