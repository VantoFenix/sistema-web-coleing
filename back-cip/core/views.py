import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.hashers import make_password, check_password
from django.db import connection
from django.http import HttpResponse
from django.core.files.storage import default_storage
import os
import uuid
import pandas as pd
from datetime import datetime, date
from django.core.mail import send_mail
from django.conf import settings

from .models import Administrador, Colegiado, Solicitud, Carrera, Sede, Pago, CargaRecaudacion
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
        celular = request.data.get('celular')
        correo = request.data.get('correo')
        carrera_nombre = request.data.get('carrera')
        sede_nombre = request.data.get('sede')
        
        foto = request.FILES.get('foto')
        titulo = request.FILES.get('titulo')
        recibo = request.FILES.get('recibo')

        if not all([dni, nombres, correo, carrera_nombre, sede_nombre, foto, titulo, recibo]):
            return Response({'error': 'Faltan campos o documentos requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        # Validacion de formatos de archivo
        if not foto.content_type.startswith('image/'):
            return Response({'error': 'La foto debe ser un archivo de imagen válido (JPG, PNG).'}, status=status.HTTP_400_BAD_REQUEST)
        if titulo.content_type != 'application/pdf':
            return Response({'error': 'El Título Profesional debe ser un archivo PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (recibo.content_type.startswith('image/') or recibo.content_type == 'application/pdf'):
            return Response({'error': 'El Recibo de Caja debe ser un PDF o una imagen.'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar carrera y sede
        carrera = Carrera.objects.filter(nombre=carrera_nombre).first()
        sede = Sede.objects.filter(nombre=sede_nombre).first()
        if not carrera or not sede:
            return Response({'error': 'Carrera o Sede no válida'}, status=status.HTTP_400_BAD_REQUEST)

        # Guardar archivos (Usando el sistema local temporal)
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
                correo=correo,
                celular=celular,
                carrera=carrera,
                sede=sede,
                foto_url=f"/media/{foto_name}",
                titulo_pdf_url=f"/media/{titulo_name}",
                recibo_pago_url=f"/media/{recibo_name}",
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
            solicitud.estado = 'APROBADA'
            solicitud.resuelto_en = datetime.utcnow()
            solicitud.save()
            
            # Generar Nro Colegiado — único por CARRERA + SEDE
            # Ej: Civil Lima → 00001, 00002 ... independiente de Civil Arequipa → 00001, 00002
            with connection.cursor() as cursor:
                if solicitud.sede_id:
                    cursor.execute(
                        "SELECT MAX(CAST(nro_colegiado AS INTEGER)) "
                        "FROM colegiado WHERE carrera_id = %s AND sede_id = %s",
                        [solicitud.carrera_id, solicitud.sede_id]
                    )
                else:
                    # Sin sede → serie propia solo por carrera (sin sede asignada)
                    cursor.execute(
                        "SELECT MAX(CAST(nro_colegiado AS INTEGER)) "
                        "FROM colegiado WHERE carrera_id = %s AND sede_id IS NULL",
                        [solicitud.carrera_id]
                    )
                row = cursor.fetchone()
                siguiente_nro = str((row[0] or 0) + 1).zfill(5)
            
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

            # Enviar correo de bienvenida al colegiado
            try:
                asunto = f"¡Bienvenido al Colegio de Ingenieros del Perú!"
                mensaje = f"""Estimado(a) {solicitud.nombres},

Su solicitud de colegiatura ha sido APROBADA satisfactoriamente.

Sus credenciales de acceso al Portal del Colegiado son:
- Número de Colegiatura (CIP): {siguiente_nro}
- DNI: {solicitud.dni}
- Contraseña temporal: {solicitud.dni}

Puede ingresar a su portal aquí:
https://tu-dominio.com/login

Atentamente,
Colegio de Ingenieros del Perú
"""
                send_mail(
                    asunto,
                    mensaje,
                    settings.DEFAULT_FROM_EMAIL,
                    [solicitud.correo],
                    fail_silently=True,
                )
            except Exception as e:
                import sys
                print(f"[MAIL WARNING] No se pudo enviar el correo: {e}", file=sys.stderr)

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
                'monto_mensualidad': '20.00',
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

class AdminCargaRecaudacionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]  # MVP: En prod debería ser IsAuthenticated(Admin)

    def post(self, request):
        archivo = request.FILES.get('archivo')
        carrera = request.data.get('carrera')
        if not archivo or not carrera:
            return Response({'error': 'Archivo o carrera no proporcionados'}, status=status.HTTP_400_BAD_REQUEST)

        # Leer archivo con pandas
        try:
            if archivo.name.endswith('.csv'):
                df = pd.read_csv(archivo)
            else:
                df = pd.read_excel(archivo)
        except Exception as e:
            return Response({'error': f'Error al leer el archivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalizar nombres de columnas
        df.columns = df.columns.str.strip().str.upper()
        requeridas = ['CIP', 'MES', 'MONTO']
        for req in requeridas:
            if req not in df.columns:
                return Response({'error': f'Columna requerida no encontrada: {req}'}, status=status.HTTP_400_BAD_REQUEST)

        # Crear registro de auditoría (asumiendo que el admin tiene ID 1 para el MVP, en real sacar de request.user)
        admin = Administrador.objects.first()
        carga = CargaRecaudacion.objects.create(
            nombre_archivo=archivo.name,
            procesado_por=admin,
            total_filas=len(df),
            filas_ok=0,
            filas_error=0
        )

        filas_ok = 0
        filas_error = 0
        errores = []

        # Como todos los pagos se suben "a fin de mes", usaremos el final del mes provisto, o la fecha actual
        fecha_pago_defecto = date.today()

        for index, row in df.iterrows():
            try:
                cip_str = str(row['CIP']).strip()
                if cip_str.endswith('.0'): cip_str = cip_str[:-2]
                
                carrera_nombre = carrera.strip()
                mes_str = str(row['MES']).strip() # Esperado '2026-05' o '2026-05-01'
                monto = float(row['MONTO'])

                # Parsear el periodo
                if len(mes_str) >= 7:
                    año = int(mes_str[0:4])
                    mes = int(mes_str[5:7])
                    periodo_date = date(año, mes, 1)
                else:
                    raise ValueError(f"Formato de mes inválido: {mes_str}")

                # Buscar colegiado
                colegiado = Colegiado.objects.filter(nro_colegiado=cip_str, carrera__nombre=carrera_nombre).first()
                if not colegiado:
                    raise ValueError(f"Colegiado no encontrado (CIP: {cip_str}, Carrera: {carrera_nombre})")

                # Crear el pago o actualizar si existe (solo hay 1 pago de mensualidad por periodo)
                pago, created = Pago.objects.update_or_create(
                    colegiado=colegiado,
                    periodo=periodo_date,
                    defaults={
                        'tipo': 'MENSUALIDAD',
                        'monto': monto,
                        'canal': 'ARCHIVO_RECAUDACION',
                        'fecha_pago': fecha_pago_defecto,
                        'carga': carga,
                        'registrado_por': admin,
                        'nro_operacion': f"CARGA-{carga.id}-ROW-{index}"
                    }
                )
                filas_ok += 1
            except Exception as e:
                filas_error += 1
                errores.append(f"Fila {index + 2}: {str(e)}")

        # Actualizar auditoría
        carga.filas_ok = filas_ok
        carga.filas_error = filas_error
        carga.save()

        return Response({
            'success': True,
            'carga_id': carga.id,
            'total': len(df),
            'ok': filas_ok,
            'error': filas_error,
            'errores': errores[:10] # Enviar solo los primeros 10 errores para no saturar
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
    """Devuelve los periodos sin pago de un colegiado (su deuda pendiente)."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            col = Colegiado.objects.select_related('carrera', 'sede').get(pk=pk, activo=True)
        except Colegiado.DoesNotExist:
            return Response({'error': 'Colegiado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Periodos ya pagados como mensualidad
        pagos_existentes = set(
            Pago.objects.filter(colegiado=col, tipo='MENSUALIDAD')
            .values_list('periodo', flat=True)
        )

        # Todos los meses desde colegiado_desde hasta hoy
        hoy = date.today()
        todos_los_meses = _meses_entre(col.colegiado_desde, hoy)

        pendientes = []
        for m in todos_los_meses:
            if m not in pagos_existentes:
                pendientes.append({
                    'periodo': m.strftime('%Y-%m'),
                    'fecha': m.strftime('%Y-%m-%d'),
                })

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
            'periodos_pendientes': pendientes,
            'total_deuda': len(pendientes),
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
