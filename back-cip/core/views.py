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


class PublicPadronView(APIView):
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

        default_storage.save(foto_name, foto)
        default_storage.save(titulo_name, titulo)
        default_storage.save(recibo_name, recibo)

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
            # Generar un Nro Colegiado (Simulado: max nro + 1 por carrera)
            with connection.cursor() as cursor:
                cursor.execute("SELECT MAX(CAST(nro_colegiado AS INTEGER)) FROM colegiado WHERE carrera_id = %s", [solicitud.carrera_id])
                row = cursor.fetchone()
                siguiente_nro = str((row[0] or 1000) + 1)
            
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

class PortalPagosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        pagos = Pago.objects.filter(colegiado_id=user_id).order_by('-fecha_pago', '-periodo')
        
        pagos_data = []
        for p in pagos:
            pagos_data.append({
                'id': p.id,
                'tipo': p.tipo,
                'periodo': p.periodo.strftime('%Y-%m'),
                'monto': p.monto,
                'canal': p.canal,
                'nro_operacion': p.nro_operacion,
                'fecha_pago': p.fecha_pago.strftime('%Y-%m-%d'),
            })
            
        return Response(pagos_data)

class AdminCargaRecaudacionView(APIView):
    permission_classes = [AllowAny] # MVP: En prod debería ser IsAuthenticated(Admin)

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
