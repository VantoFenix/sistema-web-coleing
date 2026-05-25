import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.hashers import make_password, check_password
from django.db import connection, transaction, IntegrityError
from django.http import HttpResponse
from django.core.files.storage import default_storage
import os
import uuid
from datetime import datetime, date
from django.conf import settings

from .models import Administrador, Colegiado, Solicitud, Carrera, Sede, Pago, PagoVoucherPendiente, Configuracion
from rest_framework.parsers import MultiPartParser, FormParser
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
    authentication_classes = []
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
            # Buscar en Colegiado (solo por DNI)
            col = Colegiado.objects.filter(dni=username).first()
            if col and check_password(password, col.password_hash):
                token = generate_jwt(col.id, 'COLEGIADO')
                return Response({
                    'token': token,
                    'user': ColegiadoSerializer(col).data,
                    'role': 'COLEGIADO'
                })
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


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

        foto = request.FILES.get('foto')
        titulo = request.FILES.get('titulo')
        recibo = request.FILES.get('recibo')

        if not all([dni, nombres, carrera_nombre, sede_nombre, foto, titulo, recibo]):
            return Response({'error': 'Faltan campos o documentos requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        # Validacion de formatos de archivo
        if not foto.content_type.startswith('image/'):
            return Response({'error': 'La foto debe ser un archivo de imagen válido (JPG, PNG).'}, status=status.HTTP_400_BAD_REQUEST)
        if titulo.content_type != 'application/pdf':
            return Response({'error': 'El Título Profesional debe ser un archivo PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (recibo.content_type.startswith('image/') or recibo.content_type == 'application/pdf'):
            return Response({'error': 'El Recibo de Caja debe ser un PDF o una imagen.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que el DNI no pertenezca a un colegiado ya registrado
        if Colegiado.objects.filter(dni=dni).exists():
            return Response(
                {'error': 'El DNI ya está registrado como colegiado. Si ya es colegiado, ingrese a su portal.'},
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
                correo=f"sin-correo-{dni}@cip.sistema",
                carrera=carrera,
                sede=sede,
                foto_url=f"/media/{foto_name}",
                titulo_pdf_url=f"/media/{titulo_name}",
                recibo_pago_url=f"/media/{recibo_name}",
                firma_url='',
                estado='EN_REVISION'
            )
        except Exception as e:
            import sys
            print(f"[ERROR] Fallo al crear solicitud en BD: {e}", file=sys.stderr)
            return Response({'error': f'Error al registrar la solicitud: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        return Response({'success': True, 'solicitud_id': solicitud.id})

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


class AdminPostulacionesView(APIView):
    # En producción idealmente IsAuthenticated, lo dejamos AllowAny para MVP rápido
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        solicitudes = Solicitud.objects.filter(estado='EN_REVISION').order_by('creado_en')
        return Response(SolicitudSerializer(solicitudes, many=True).data)

class AdminResolverSolicitudView(APIView):
    authentication_classes = []
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
            import sys

            try:
                with transaction.atomic():
                    solicitud.estado = 'APROBADA'
                    solicitud.resuelto_en = datetime.utcnow()
                    solicitud.save()

                    # Generar Nro Colegiado — único por CARRERA + SEDE
                    with connection.cursor() as cursor:
                        if solicitud.sede_id:
                            cursor.execute(
                                "SELECT MAX(CAST(nro_colegiado AS INTEGER)) "
                                "FROM colegiado WHERE carrera_id = %s AND sede_id = %s",
                                [solicitud.carrera_id, solicitud.sede_id]
                            )
                        else:
                            cursor.execute(
                                "SELECT MAX(CAST(nro_colegiado AS INTEGER)) "
                                "FROM colegiado WHERE carrera_id = %s AND sede_id IS NULL",
                                [solicitud.carrera_id]
                            )
                        row = cursor.fetchone()
                        siguiente_nro = str((row[0] or 0) + 1).zfill(5)

                    Colegiado.objects.create(
                        correo=solicitud.correo,
                        password_hash=make_password(solicitud.dni),
                        dni=solicitud.dni,
                        nombres=solicitud.nombres,
                        foto_url=solicitud.foto_url,
                        carrera=solicitud.carrera,
                        sede=solicitud.sede,
                        nro_colegiado=siguiente_nro,
                        solicitud=solicitud,
                        colegiado_desde=datetime.utcnow().date()
                    )

            except IntegrityError as e:
                msg = str(e)
                if 'dni' in msg:
                    detalle = f"El DNI '{solicitud.dni}' ya pertenece a otro colegiado."
                else:
                    detalle = f"Conflicto de datos únicos: {msg}"
                print(f"[APROBAR] IntegrityError solicitud_id={pk}: {e}", file=sys.stderr)
                return Response({'error': detalle}, status=status.HTTP_409_CONFLICT)
            except Exception as e:
                print(f"[APROBAR] Error solicitud_id={pk}: {e}", file=sys.stderr)
                return Response(
                    {'error': f'Error al crear la cuenta: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response({'success': True, 'estado': 'APROBADA'})

        return Response({'error': 'Acción inválida'}, status=status.HTTP_400_BAD_REQUEST)

class PortalPerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        col = Colegiado.objects.filter(id=user_id).first()
        if not col:
            return Response({'error': 'No se encontró el colegiado'}, status=status.HTTP_404_NOT_FOUND)
        
        # Consultar si está habilitado usando la vista SQL
        with connection.cursor() as cursor:
            cursor.execute("SELECT habilitado FROM v_estado_colegiado WHERE colegiado_id = %s", [col.id])
            row = cursor.fetchone()
            habilitado = row[0] if row else False

        data = ColegiadoSerializer(col).data
        data['habilitado'] = habilitado
        return Response(data)

class PortalFotoView(APIView):
    """Permite al colegiado autenticado subir/actualizar su foto de perfil."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.id
        col = Colegiado.objects.filter(id=user_id, activo=True).first()
        if not col:
            return Response({'error': 'Colegiado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        foto = request.FILES.get('foto')
        if not foto:
            return Response({'error': 'No se envió ningún archivo'}, status=status.HTTP_400_BAD_REQUEST)

        # Validar que sea imagen
        if not foto.content_type.startswith('image/'):
            return Response({'error': 'El archivo debe ser una imagen (JPG, PNG)'}, status=status.HTTP_400_BAD_REQUEST)

        # Máximo 5 MB
        if foto.size > 5 * 1024 * 1024:
            return Response({'error': 'La imagen no debe superar los 5 MB'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ext = foto.name.split('.')[-1].lower()
            foto_name = f"fotos/{uuid.uuid4().hex}.{ext}"
            saved_path = default_storage.save(foto_name, foto)
            foto_url = f"/media/{saved_path}"

            col.foto_url = foto_url
            col.save(update_fields=['foto_url'])

            return Response({'success': True, 'foto_url': foto_url})
        except Exception as e:
            return Response({'error': f'Error al guardar la imagen: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PortalPagosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Historial de pagos + deuda pendiente del colegiado autenticado."""
        import sys
        try:
            user_id = request.user.id
            # Sin filtro activo=True para que coincida con PortalPerfilView
            col = Colegiado.objects.filter(id=user_id).first()
            if not col:
                return Response({'error': 'Colegiado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            # ── Historial de pagos ────────────────────────────────────────────
            def _fmt_date(d, fmt):
                """strftime seguro: normaliza datetime→date y maneja None."""
                if d is None:
                    return None
                if hasattr(d, 'date') and callable(d.date):  # es datetime
                    d = d.date()
                return d.strftime(fmt)

            pagos = Pago.objects.filter(colegiado=col).order_by('-periodo')
            historial = []
            for p in pagos:
                try:
                    historial.append({
                        'id': p.id,
                        'tipo': p.tipo or '',
                        'periodo': _fmt_date(p.periodo, '%Y-%m') or '',
                        'monto': str(p.monto) if p.monto is not None else '0.00',
                        'canal': p.canal or '',
                        'metodo': p.metodo or '',
                        'nro_operacion': p.nro_operacion or '',
                        'fecha_pago': _fmt_date(p.fecha_pago, '%Y-%m-%d') or '',
                    })
                except Exception as ep:
                    print(f"[PAGOS] Error serializando pago id={p.id}: {ep}", file=sys.stderr)

            # ── Periodos pendientes ───────────────────────────────────────────
            pendientes = []
            try:
                if col.colegiado_desde:
                    raw_pagados = set(
                        Pago.objects.filter(colegiado=col, tipo='MENSUALIDAD')
                        .values_list('periodo', flat=True)
                    )
                    # Normalizar a date una sola vez fuera del bucle
                    pagados_norm = set()
                    for p in raw_pagados:
                        if p is None:
                            continue
                        if hasattr(p, 'date') and callable(p.date):
                            pagados_norm.add(p.date())
                        elif isinstance(p, str):
                            try:
                                from datetime import datetime as dt
                                pagados_norm.add(dt.strptime(p[:10], '%Y-%m-%d').date())
                            except Exception:
                                pass
                        else:
                            pagados_norm.add(p)

                    hoy = date.today()
                    todos_los_meses = _meses_entre(col.colegiado_desde, hoy)
                    for m in todos_los_meses:
                        if m not in pagados_norm:
                            pendientes.append({
                                'periodo': m.strftime('%Y-%m'),
                                'fecha': m.strftime('%Y-%m-%d'),
                            })
            except Exception as e:
                print(f"[PAGOS] Error calculando pendientes: {e}", file=sys.stderr)
                pendientes = []

            return Response({
                'historial': historial,
                'periodos_pendientes': pendientes,
                'habilitado': _get_habilitado(col.id),
                'monto_mensualidad': str(_get_monto_mensualidad()),
            })

        except Exception as e:
            import traceback
            print(f"[PAGOS GET] Error inesperado: {e}\n{traceback.format_exc()}", file=sys.stderr)
            return Response({'error': f'Error interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Procesa pago desde la pasarela virtual del portal del colegiado."""
        user_id = request.user.id
        col = Colegiado.objects.filter(id=user_id, activo=True).first()
        if not col:
            return Response({'error': 'Colegiado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        periodos = request.data.get('periodos', [])
        monto_total = request.data.get('monto')
        metodo_pago = request.data.get('metodo', 'EFECTIVO').upper()
        # Validar método permitido
        if metodo_pago not in ('EFECTIVO', 'TARJETA'):
            metodo_pago = 'EFECTIVO'

        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo'}, status=status.HTTP_400_BAD_REQUEST)
        if not monto_total:
            return Response({'error': 'Monto inválido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            monto_total = float(monto_total)
        except (ValueError, TypeError):
            return Response({'error': 'Monto inválido'}, status=status.HTTP_400_BAD_REQUEST)

        monto_por_periodo = round(monto_total / len(periodos), 2)
        fecha_hoy = date.today()

        # Generar código de operación único
        nro_operacion = f"WEB-{uuid.uuid4().hex[:10].upper()}"

        registrados = []
        ya_existian = []

        for periodo_str in periodos:
            try:
                año, mes = map(int, periodo_str.split('-'))
                periodo_date = date(año, mes, 1)
                pago, created = Pago.objects.get_or_create(
                    colegiado=col,
                    periodo=periodo_date,
                    defaults={
                        'tipo': 'MENSUALIDAD',
                        'monto': monto_por_periodo,
                        'canal': 'PORTAL',
                        'metodo': metodo_pago,
                        'nro_operacion': nro_operacion,
                        'fecha_pago': fecha_hoy,
                    }
                )
                if created:
                    registrados.append(periodo_str)
                else:
                    ya_existian.append(periodo_str)
            except Exception:
                pass

        if not registrados:
            return Response({'error': 'Esos periodos ya tenían pago registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'periodos_pagados': registrados,
            'nro_operacion': nro_operacion,
            'habilitado_nuevo': _get_habilitado(col.id),
            'monto_cobrado': monto_total,
        })

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


# ==============================================================================
# HU14 — Registro de Pagos Presencial por Administrador
# ==============================================================================

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
        fin_anio   = date(hoy.year, 12, 1)   # diciembre del año en curso

        # Todos los meses: desde colegiado_desde hasta diciembre del año actual
        todos_los_meses = _meses_entre(col.colegiado_desde, fin_anio)

        periodos = []
        pendientes_compat = []  # para retrocompatibilidad

        for m in todos_los_meses:
            pagado    = m in pagados
            if pagado:
                estado = 'PAGADO'
            elif m == mes_actual:
                estado = 'MES_ACTUAL'   # dentro del plazo → todo el mes para pagar
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


class AdminRegistrarPagoPresencialView(APIView):
    """Registra uno o varios pagos presenciales para un colegiado."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        colegiado_id  = request.data.get('colegiado_id')
        periodos      = request.data.get('periodos', [])   # ["2025-01", "2025-02"]
        monto_total   = request.data.get('monto')
        metodo        = request.data.get('metodo', '').upper()  # YAPE|PLIN|EFECTIVO|TRANSFERENCIA
        nro_operacion = request.data.get('nro_operacion', '').strip() or None
        fecha_pago_str = request.data.get('fecha_pago', '')

        # Validaciones básicas
        if not colegiado_id:
            return Response({'error': 'Debe indicar el colegiado'}, status=status.HTTP_400_BAD_REQUEST)
        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo'}, status=status.HTTP_400_BAD_REQUEST)
        if not monto_total:
            return Response({'error': 'Ingrese el monto del pago'}, status=status.HTTP_400_BAD_REQUEST)
        if metodo not in ('YAPE', 'PLIN', 'EFECTIVO', 'TRANSFERENCIA'):
            return Response({'error': 'Método de pago inválido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            colegiado = Colegiado.objects.select_related('carrera').get(pk=colegiado_id, activo=True)
        except Colegiado.DoesNotExist:
            return Response({'error': 'Colegiado no encontrado o inactivo'}, status=status.HTTP_404_NOT_FOUND)

        try:
            monto_total = float(monto_total)
            if monto_total <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'Monto inválido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha_pago = date.fromisoformat(fecha_pago_str) if fecha_pago_str else date.today()
        except ValueError:
            return Response({'error': 'Fecha de pago inválida (use YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)

        # Monto proporcional por periodo
        monto_por_periodo = round(monto_total / len(periodos), 2)

        registrados = []
        ya_existian = []
        errores     = []

        for periodo_str in periodos:
            try:
                año, mes = map(int, periodo_str.split('-'))
                periodo_date = date(año, mes, 1)

                pago, created = Pago.objects.get_or_create(
                    colegiado=colegiado,
                    periodo=periodo_date,
                    defaults={
                        'tipo': 'MENSUALIDAD',
                        'monto': monto_por_periodo,
                        'canal': 'CAJA',
                        'metodo': metodo,
                        'nro_operacion': nro_operacion,
                        'fecha_pago': fecha_pago,
                    }
                )

                if created:
                    registrados.append(periodo_str)
                else:
                    ya_existian.append(periodo_str)

            except Exception as e:
                errores.append(f"Período {periodo_str}: {str(e)}")

        if not registrados:
            return Response({
                'error': 'No se registró ningún pago nuevo.',
                'ya_existian': ya_existian,
                'errores': errores,
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'colegiado': colegiado.nombres,
            'periodos_registrados': registrados,
            'ya_existian': ya_existian,
            'errores': errores,
            'habilitado_nuevo': _get_habilitado(colegiado.id),
            'total_registrado': len(registrados),
        })

# ==============================================================================
# PAGO ONLINE — MercadoPago
# ==============================================================================

class MPConfigView(APIView):
    """Devuelve solo la public key al frontend (nunca el access token)."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'public_key': settings.MP_PUBLIC_KEY})


class PagoPreferenciaView(APIView):
    """
    Crea una preferencia de MercadoPago Checkout Pro.
    Usado para Yape: redirige al checkout nativo de MP donde el usuario paga.
    Al volver, PagoVerificarPreferenciaView registra el pago automáticamente.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import mercadopago, sys

        periodos = request.data.get('periodos', [])
        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo.'}, status=400)

        colegiado   = request.user
        monto_total = round(len(periodos) * _get_monto_mensualidad(), 2)

        # external_reference: "cip-{id}~{p1}~{p2}" — URL-safe, parseable en el retorno
        external_ref = 'cip-{}~{}'.format(colegiado.id, '~'.join(sorted(periodos)))

        sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)

        # Usar SITE_URL del .env si está definida, si no construir desde la request
        site_url = getattr(settings, 'SITE_URL', '').rstrip('/')
        if not site_url:
            site_url = request.scheme + '://' + request.get_host()

        success_url = '{}/portal/pagos'.format(site_url)
        failure_url = '{}/portal/pagos'.format(site_url)
        pending_url = '{}/portal/pagos'.format(site_url)

        preference_data = {
            "items": [{
                "title":       "CIP - {} cuota(s) mensual(es)".format(len(periodos)),
                "quantity":    1,
                "unit_price":  float(monto_total),
                "currency_id": "PEN",
            }],
            "payer": {
                "email": getattr(colegiado, 'correo', 'pagador@cip.org.pe'),
            },
            "back_urls": {
                "success": success_url,
                "failure": failure_url,
                "pending": pending_url,
            },
            # auto_return omitido: requiere URL HTTPS pública validada por MP.
            # MP mostrará botón "Volver al sitio" → misma URL con payment_id en params.
            "external_reference": external_ref,
        }

        print("[MP PREF] Creando preferencia: {} monto={}".format(external_ref, monto_total), file=sys.stderr)
        result   = sdk.preference().create(preference_data)
        response = result.get("response", {})
        pref_id  = response.get("id")
        init_pt  = response.get("init_point")

        print("[MP PREF] Respuesta: {}".format(response), file=sys.stderr)

        if not pref_id or not init_pt:
            err = response.get("message") or response.get("error") or "Error desconocido"
            return Response({'error': 'No se pudo crear el enlace de pago: {}'.format(err)}, status=500)

        return Response({'preference_id': pref_id, 'init_point': init_pt})


class PagoVerificarPreferenciaView(APIView):
    """
    Verifica y registra un pago de Checkout Pro luego de la redirección desde MP.
    MP pasa payment_id y external_reference como query params en la back_url.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import mercadopago, sys

        payment_id   = request.data.get('payment_id', '')
        external_ref = request.data.get('external_reference', '')

        if not payment_id:
            return Response({'error': 'payment_id requerido.'}, status=400)

        sdk      = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        result   = sdk.payment().get(payment_id)
        response = result.get("response", {})
        mp_status = response.get("status")

        print("[MP VERIFY] payment_id={} status={}".format(payment_id, mp_status), file=sys.stderr)
        print("[MP VERIFY] response={}".format(response), file=sys.stderr)

        if mp_status != "approved":
            return Response(
                {'error': 'El pago no fue aprobado (estado: {}).'.format(mp_status)},
                status=402,
            )

        # Decodificar external_reference → "cip-{id}~{p1}~{p2}"
        try:
            parts        = external_ref.split('~')
            col_id_str   = parts[0].replace('cip-', '')
            periodos     = parts[1:]
            assert int(col_id_str) == request.user.id, "colegiado_id no coincide"
        except Exception as ex:
            print("[MP VERIFY] external_ref inválido: {} → {}".format(external_ref, ex), file=sys.stderr)
            return Response({'error': 'Referencia de pago inválida.'}, status=400)

        if not periodos:
            return Response({'error': 'No se determinaron los periodos a registrar.'}, status=400)

        colegiado   = request.user
        hoy         = date.today()
        metodo_str  = (response.get('payment_method_id') or 'CHECKOUT_PRO').upper()
        registrados = []
        ya_existian = []

        for periodo_str in sorted(periodos):
            try:
                año, mes = map(int, periodo_str.split('-'))
                _, created = Pago.objects.get_or_create(
                    colegiado=colegiado,
                    periodo=date(año, mes, 1),
                    defaults={
                        'tipo':          'MENSUALIDAD',
                        'monto':         _get_monto_mensualidad(),
                        'canal':         'PORTAL',
                        'metodo':        metodo_str,
                        'nro_operacion': str(payment_id),
                        'fecha_pago':    hoy,
                    }
                )
                (registrados if created else ya_existian).append(periodo_str)
            except Exception as ex:
                print("[MP VERIFY] Error guardando {}: {}".format(periodo_str, ex), file=sys.stderr)

        return Response({
            'success':          True,
            'periodos_pagados': registrados,
            'ya_existian':      ya_existian,
            'nro_operacion':    str(payment_id),
            'habilitado_nuevo': _get_habilitado(colegiado.id),
            'monto_cobrado':    round(len(periodos) * _get_monto_mensualidad(), 2),
        })


class PagoOnlineView(APIView):
    """
    Procesa pagos online via MercadoPago.
    Soporta Tarjeta (Visa/MC/Amex): requiere token, payment_method_id, installments.
    (Yape usa PagoPreferenciaView + PagoVerificarPreferenciaView)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import mercadopago, sys

        payment_method_id = request.data.get('payment_method_id', '')
        periodos          = request.data.get('periodos', [])
        email_payer       = (
            request.data.get('email')
            or getattr(request.user, 'correo', None)
            or 'pagador@cip.org.pe'
        )

        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo.'}, status=400)
        if not payment_method_id:
            return Response({'error': 'Método de pago requerido.'}, status=400)

        monto_total = round(len(periodos) * _get_monto_mensualidad(), 2)
        sdk         = mercadopago.SDK(settings.MP_ACCESS_TOKEN)

        # ── Construir payload según método ──────────────────────────────────
        if payment_method_id == 'yape':
            # Yape: sin token, requiere teléfono del pagador
            phone_number = (
                request.data.get('phone')
                or (request.data.get('payer') or {}).get('phone', {}).get('number', '')
            )
            if not phone_number:
                return Response({'error': 'Número de teléfono Yape requerido.'}, status=400)

            # Extraer nombres del colegiado (first_name y last_name son requeridos por MP)
            nombres_completo = (getattr(request.user, 'nombres', '') or '').strip()
            partes           = nombres_completo.split() if nombres_completo else []
            first_name       = partes[0]          if partes               else 'Colegiado'
            last_name        = ' '.join(partes[1:]) if len(partes) > 1   else 'CIP'

            payment_data = {
                "transaction_amount": float(monto_total),
                "description":        f"CIP - {len(periodos)} cuota(s) mensual(es)",
                "payment_method_id":  "yape",
                "payer": {
                    "email":      email_payer,
                    "first_name": first_name,
                    "last_name":  last_name,
                    "phone":      {"area_code": "51", "number": str(phone_number)},
                },
            }
            metodo_registro = 'YAPE'

        else:
            # Tarjeta (Visa/MC/Amex): requiere token
            token        = request.data.get('token')
            installments = request.data.get('installments', 1)
            issuer_id    = request.data.get('issuer_id')

            if not token:
                return Response({'error': 'Token de tarjeta requerido.'}, status=400)

            payment_data = {
                "transaction_amount": float(monto_total),
                "token":              token,
                "description":        f"CIP - {len(periodos)} cuota(s) mensual(es)",
                "installments":       int(installments),
                "payment_method_id":  payment_method_id,
                "payer":              {"email": email_payer},
            }
            if issuer_id:
                payment_data["issuer_id"] = issuer_id
            metodo_registro = 'TARJETA'

        # ── Llamar a MP ──────────────────────────────────────────────────────
        print(f"[MP] Creando pago: metodo={metodo_registro} monto={monto_total} periodos={periodos}", file=sys.stderr)
        print(f"[MP] Payload enviado: {payment_data}", file=sys.stderr)
        result    = sdk.payment().create(payment_data)
        response  = result.get("response", {})
        mp_status = response.get("status")
        print(f"[MP] Respuesta completa: {response}", file=sys.stderr)

        # ── Manejar respuesta ────────────────────────────────────────────────
        if mp_status == "approved":
            colegiado   = request.user
            hoy         = date.today()
            registrados = []
            ya_existian = []

            for periodo_str in sorted(periodos):
                try:
                    año, mes = map(int, periodo_str.split('-'))
                    _, created = Pago.objects.get_or_create(
                        colegiado=colegiado,
                        periodo=date(año, mes, 1),
                        defaults={
                            'tipo':          'MENSUALIDAD',
                            'monto':         _get_monto_mensualidad(),
                            'canal':         'PORTAL',
                            'metodo':        metodo_registro,
                            'nro_operacion': str(response.get("id", "")),
                            'fecha_pago':    hoy,
                        }
                    )
                    (registrados if created else ya_existian).append(periodo_str)
                except Exception as ex:
                    print(f"[MP] Error guardando periodo {periodo_str}: {ex}", file=sys.stderr)

            return Response({
                'success':          True,
                'periodos_pagados': registrados,
                'ya_existian':      ya_existian,
                'nro_operacion':    str(response.get("id", "")),
                'habilitado_nuevo': _get_habilitado(colegiado.id),
                'monto_cobrado':    monto_total,
            })

        elif mp_status in ("pending", "in_process"):
            # Yape puede quedar pending mientras el usuario aprueba en la app
            # Devolvemos pending_id para que el frontend haga polling
            return Response({
                'pending':      True,
                'mp_id':        str(response.get("id", "")),
                'periodos':     periodos,
                'monto':        monto_total,
            }, status=202)

        else:
            detalle   = response.get("status_detail", "")
            error_mp  = response.get("error", "")
            mp_msg    = response.get("message", "")
            causa_mp  = response.get("cause", [])
            print(f"[MP] RECHAZADO — status={mp_status} status_detail={detalle} error={error_mp} message={mp_msg} cause={causa_mp}", file=sys.stderr)

            msgs = {
                # Tarjeta
                "cc_rejected_bad_filled_card_number":   "Número de tarjeta incorrecto.",
                "cc_rejected_bad_filled_date":          "Fecha de vencimiento incorrecta.",
                "cc_rejected_bad_filled_security_code": "Código de seguridad incorrecto.",
                "cc_rejected_insufficient_amount":      "Fondos insuficientes en la tarjeta.",
                "cc_rejected_blacklist":                "Tarjeta bloqueada. Contacte a su banco.",
                "cc_rejected_call_for_authorize":       "Tarjeta requiere autorización. Llame a su banco.",
                "cc_rejected_card_disabled":            "Tarjeta desactivada. Active pagos en línea.",
                "cc_rejected_duplicated_payment":       "Pago duplicado. Espere unos minutos.",
                "cc_rejected_high_risk":                "Pago rechazado por seguridad. Intente con otra tarjeta.",
                # Yape
                "yape_rejected_other_reason":           "Pago Yape rechazado. Verifique que el número esté registrado en Yape.",
                "yape_rejected_not_enough_balance":     "Saldo insuficiente en Yape.",
                "yape_rejected_invalid_phone":          "Número de teléfono no registrado en Yape.",
            }

            if detalle in msgs:
                mensaje = msgs[detalle]
            elif mp_msg:
                # Mostrar el mensaje real de MP para diagnóstico
                mensaje = f"Error MP: {mp_msg}"
                if causa_mp:
                    first_cause = causa_mp[0] if isinstance(causa_mp, list) else causa_mp
                    cause_desc = first_cause.get("description", "") if isinstance(first_cause, dict) else str(first_cause)
                    if cause_desc:
                        mensaje += f" ({cause_desc})"
            elif error_mp:
                mensaje = f"Error MP: {error_mp}" + (f" — {detalle}" if detalle else "")
            elif detalle:
                mensaje = f"Pago rechazado: {detalle}"
            else:
                mensaje = f"Pago rechazado por MercadoPago (status: {mp_status})."

            return Response({'error': mensaje, 'mp_detail': detalle, 'mp_error': error_mp}, status=402)


class AdminPagoTarjetaView(APIView):
    """
    Procesa pago con tarjeta vía MercadoPago para el módulo de Pagos Presenciales.
    Usa el CardPayment Brick; recibe token + payment_method_id generados por el Brick.
    El pago se registra con canal='CAJA' (iniciado por el admin).
    """
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        import mercadopago, sys

        colegiado_id      = request.data.get('colegiado_id')
        token             = request.data.get('token')
        payment_method_id = request.data.get('payment_method_id')
        installments      = request.data.get('installments', 1)
        issuer_id         = request.data.get('issuer_id')
        periodos          = request.data.get('periodos', [])
        monto             = request.data.get('monto')
        email_payer       = request.data.get('email') or 'pagador@cip.org.pe'

        if not all([colegiado_id, token, payment_method_id, periodos, monto]):
            return Response({'error': 'Faltan datos requeridos.'}, status=400)

        colegiado = Colegiado.objects.filter(pk=colegiado_id).first()
        if not colegiado:
            return Response({'error': 'Colegiado no encontrado.'}, status=404)

        monto_total = float(monto)
        sdk         = mercadopago.SDK(settings.MP_ACCESS_TOKEN)

        payment_data = {
            "transaction_amount": monto_total,
            "token":              token,
            "description":        f"CIP - {len(periodos)} cuota(s) mensual(es)",
            "installments":       int(installments),
            "payment_method_id":  payment_method_id,
            "payer":              {"email": email_payer},
        }
        if issuer_id:
            payment_data["issuer_id"] = issuer_id

        print(f"[ADMIN TARJETA] colegiado_id={colegiado_id} monto={monto_total} periodos={periodos}", file=sys.stderr)
        result    = sdk.payment().create(payment_data)
        response  = result.get("response", {})
        mp_status = response.get("status")
        print(f"[ADMIN TARJETA] MP respuesta: status={mp_status}", file=sys.stderr)

        if mp_status != "approved":
            detalle  = response.get("status_detail", "")
            mp_msg   = response.get("message", "")
            causa_mp = response.get("cause", [])
            msgs = {
                "cc_rejected_bad_filled_card_number":   "Número de tarjeta incorrecto.",
                "cc_rejected_bad_filled_date":          "Fecha de vencimiento incorrecta.",
                "cc_rejected_bad_filled_security_code": "Código de seguridad incorrecto.",
                "cc_rejected_insufficient_amount":      "Fondos insuficientes en la tarjeta.",
                "cc_rejected_blacklist":                "Tarjeta bloqueada. Contacte al banco emisor.",
                "cc_rejected_call_for_authorize":       "Tarjeta requiere autorización bancaria.",
                "cc_rejected_card_disabled":            "Tarjeta desactivada. Active pagos en línea.",
                "cc_rejected_high_risk":                "Pago rechazado por seguridad. Intente otra tarjeta.",
            }
            if detalle in msgs:
                mensaje = msgs[detalle]
            elif mp_msg:
                mensaje = f"Error MP: {mp_msg}"
                if causa_mp:
                    first = causa_mp[0] if isinstance(causa_mp, list) else causa_mp
                    desc  = first.get("description", "") if isinstance(first, dict) else str(first)
                    if desc: mensaje += f" ({desc})"
            elif detalle:
                mensaje = f"Pago rechazado: {detalle}"
            else:
                mensaje = f"Pago rechazado (status: {mp_status})."
            return Response({'error': mensaje}, status=402)

        # Aprobado — registrar periodos
        hoy         = date.today()
        monto_unit  = round(monto_total / max(len(periodos), 1), 2)
        nro_op      = str(response.get("id", ""))
        registrados = []; ya_existian = []
        for periodo_str in sorted(periodos):
            try:
                año, mes = map(int, periodo_str.split('-'))
                _, created = Pago.objects.get_or_create(
                    colegiado=colegiado, periodo=date(año, mes, 1),
                    defaults={
                        'tipo': 'MENSUALIDAD', 'monto': monto_unit,
                        'canal': 'CAJA', 'metodo': 'TARJETA',
                        'nro_operacion': nro_op, 'fecha_pago': hoy,
                    }
                )
                (registrados if created else ya_existian).append(periodo_str)
            except Exception as ex:
                print(f"[ADMIN TARJETA] Error guardando {periodo_str}: {ex}", file=sys.stderr)

        return Response({
            'success':            True,
            'periodos_registrados': registrados,
            'ya_existian':        ya_existian,
            'nro_operacion':      nro_op,
            'colegiado':          colegiado.nombres,
            'total_registrado':   len(registrados),
            'habilitado_nuevo':   _get_habilitado(colegiado.id),
        })


class PagoOnlineStatusView(APIView):
    """Consulta el estado de un pago MP pendiente (polling para Yape)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, mp_id):
        import mercadopago, sys

        sdk      = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        result   = sdk.payment().get(mp_id)
        response = result.get("response", {})
        mp_status = response.get("status")

        if mp_status == "approved":
            # Registrar los periodos (venían en la URL como query params)
            periodos_str = request.query_params.get('periodos', '')
            periodos = [p for p in periodos_str.split(',') if p]
            colegiado = request.user
            hoy       = date.today()
            registrados = []

            for periodo_str in sorted(periodos):
                try:
                    año, mes = map(int, periodo_str.split('-'))
                    _, created = Pago.objects.get_or_create(
                        colegiado=colegiado,
                        periodo=date(año, mes, 1),
                        defaults={
                            'tipo':          'MENSUALIDAD',
                            'monto':         _get_monto_mensualidad(),
                            'canal':         'PORTAL',
                            'metodo':        'YAPE',
                            'nro_operacion': str(mp_id),
                            'fecha_pago':    hoy,
                        }
                    )
                    if created:
                        registrados.append(periodo_str)
                except Exception as ex:
                    print(f"[MP STATUS] Error guardando {periodo_str}: {ex}", file=sys.stderr)

            return Response({
                'success':          True,
                'status':           'approved',
                'periodos_pagados': registrados,
                'nro_operacion':    str(mp_id),
                'habilitado_nuevo': _get_habilitado(colegiado.id),
                'monto_cobrado':    round(len(periodos) * _get_monto_mensualidad(), 2),
            })

        elif mp_status in ("pending", "in_process"):
            return Response({'status': 'pending'}, status=202)

        else:
            return Response({'status': 'rejected', 'error': 'Pago rechazado o expirado.'}, status=402)


# ==============================================================================
# PORTAL — Pago con Voucher (Yape / Plin / Transferencia)
# ==============================================================================
class PortalPagoVoucherView(APIView):
    """Recibe voucher de pago manual y lo guarda como PENDIENTE de revisión."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        import json as _json

        user_id = request.user.id
        col = Colegiado.objects.filter(id=user_id, activo=True).first()
        if not col:
            return Response({'error': 'Colegiado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Periodos: puede llegar como string JSON o como lista
        periodos_raw = request.data.get('periodos', '')
        metodo       = request.data.get('metodo', '').upper()
        voucher_file = request.FILES.get('voucher')

        if not periodos_raw:
            return Response({'error': 'Seleccione al menos un periodo.'}, status=status.HTTP_400_BAD_REQUEST)
        if metodo not in ('YAPE', 'PLIN', 'TRANSFERENCIA'):
            return Response({'error': 'Método de pago inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not voucher_file:
            return Response({'error': 'Debe adjuntar el comprobante de pago.'}, status=status.HTTP_400_BAD_REQUEST)

        # Parsear periodos
        try:
            periodos = _json.loads(periodos_raw) if isinstance(periodos_raw, str) else list(periodos_raw)
        except Exception:
            return Response({'error': 'Formato de periodos inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if not periodos:
            return Response({'error': 'Seleccione al menos un periodo.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que los periodos no estén ya pagados
        ya_pagados = []
        for ps in periodos:
            try:
                año, mes = map(int, ps.split('-'))
                if Pago.objects.filter(colegiado=col, periodo=date(año, mes, 1)).exists():
                    ya_pagados.append(ps)
            except Exception:
                pass
        if ya_pagados:
            return Response({'error': f'Los siguientes periodos ya están pagados: {", ".join(ya_pagados)}'}, status=status.HTTP_400_BAD_REQUEST)

        monto      = round(len(periodos) * _get_monto_mensualidad(), 2)
        nro_ref    = f"VOC-{uuid.uuid4().hex[:8].upper()}"

        PagoVoucherPendiente.objects.create(
            colegiado=col,
            periodos_json=_json.dumps(periodos),
            monto=monto,
            metodo=metodo,
            voucher=voucher_file,
            nro_referencia=nro_ref,
        )

        return Response({
            'success':       True,
            'nro_referencia': nro_ref,
            'monto':          f'{monto:.2f}',
            'periodos':       periodos,
            'metodo':         metodo,
        })


# ==============================================================================
# ADMIN — Verificación de Vouchers (HU15)
# ==============================================================================
class AdminVouchersListView(APIView):
    """Lista todos los vouchers pendientes de verificación (estado=PENDIENTE)."""
    authentication_classes = []
    permission_classes     = [AllowAny]

    def get(self, request):
        import json as _json
        vouchers = (
            PagoVoucherPendiente.objects
            .filter(estado='PENDIENTE')
            .select_related('colegiado')
            .order_by('creado_en')
        )
        data = []
        for v in vouchers:
            try:
                periodos = _json.loads(v.periodos_json)
            except Exception:
                periodos = []
            data.append({
                'id':               v.id,
                'colegiado_id':     v.colegiado.id,
                'colegiado_nombre': v.colegiado.nombres,
                'colegiado_dni':    v.colegiado.dni,
                'colegiado_nro':    str(v.colegiado.nro_colegiado),
                'metodo':           v.metodo,
                'monto':            str(v.monto),
                'periodos':         periodos,
                'nro_referencia':   v.nro_referencia,
                'voucher_url':      request.build_absolute_uri(v.voucher.url) if v.voucher else None,
                'creado_en':        v.creado_en.isoformat(),
            })
        return Response(data)


class AdminVoucherResolverView(APIView):
    """Aprueba o rechaza un voucher pendiente. Acción: APROBAR | RECHAZAR."""
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request, pk):
        import json as _json, sys

        accion      = (request.data.get('accion') or '').upper()
        observacion = request.data.get('observacion', '')

        if accion not in ('APROBAR', 'RECHAZAR'):
            return Response({'error': 'Acción inválida. Use APROBAR o RECHAZAR.'}, status=400)

        voucher = PagoVoucherPendiente.objects.filter(pk=pk, estado='PENDIENTE').first()
        if not voucher:
            return Response({'error': 'Voucher no encontrado o ya fue procesado.'}, status=404)

        if accion == 'RECHAZAR':
            voucher.estado      = 'RECHAZADO'
            voucher.observacion = observacion
            voucher.save()
            return Response({'success': True, 'accion': 'RECHAZADO'})

        # ── APROBAR → registrar pagos en tabla pago ──────────────────────────
        periodos   = _json.loads(voucher.periodos_json)
        colegiado  = voucher.colegiado
        hoy        = date.today()
        monto_unit = round(float(voucher.monto) / max(len(periodos), 1), 2)
        registrados = []
        ya_existian = []

        for periodo_str in sorted(periodos):
            try:
                año, mes = map(int, periodo_str.split('-'))
                _, created = Pago.objects.get_or_create(
                    colegiado=colegiado,
                    periodo=date(año, mes, 1),
                    defaults={
                        'tipo':          'MENSUALIDAD',
                        'monto':         monto_unit,
                        'canal':         'PORTAL',
                        'metodo':        voucher.metodo,
                        'nro_operacion': voucher.nro_referencia,
                        'fecha_pago':    hoy,
                    }
                )
                (registrados if created else ya_existian).append(periodo_str)
            except Exception as ex:
                print(f"[VOUCHER APROBAR] Error guardando {periodo_str}: {ex}", file=sys.stderr)

        voucher.estado      = 'APROBADO'
        voucher.observacion = observacion
        voucher.save()

        return Response({
            'success':              True,
            'accion':               'APROBADO',
            'periodos_registrados': registrados,
            'ya_existian':          ya_existian,
            'habilitado_nuevo':     _get_habilitado(colegiado.id),
            'colegiado':            colegiado.nombres,
            'total_registrado':     len(registrados),
        })


# ==============================================================================
# ADMIN — Configuración del sistema (precio mensualidad, etc.)
# ==============================================================================
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
