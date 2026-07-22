from rest_framework.viewsets import ModelViewSet
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
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
from ..authentication import CustomJWTAuthentication
# pyrefly: ignore [missing-import]
from ..serializers import AdministradorSerializer, AdministradorCRUDSerializer, ColegiadoSerializer, SolicitudSerializer, CarreraSerializer, SedeSerializer
# pyrefly: ignore [missing-import]
from apps.tramites.services import BancoNacionMockService
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail


class AdminPostulacionesView(APIView):
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        admin = request.user
        estado = request.query_params.get('estado', 'EN_REVISION')
        origen = request.query_params.get('origen', 'TODAS')

        solicitudes = Solicitud.objects.all()

        if estado and estado != 'TODAS':
            solicitudes = solicitudes.filter(estado=estado)

        if origen == 'WEB':
            solicitudes = solicitudes.exclude(numero_operacion__startswith='CAJA-')
        elif origen == 'PRESENCIAL':
            solicitudes = solicitudes.filter(numero_operacion__startswith='CAJA-')
        
        if getattr(admin, 'rol', None) != 'MASTER_ADMIN' and getattr(admin, 'sede', None):
            solicitudes = solicitudes.filter(sede=admin.sede)
            
        solicitudes = solicitudes.order_by('creado_en')
        return Response(SolicitudSerializer(solicitudes, many=True).data)

class AdminResolverSolicitudView(APIView):
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        accion = request.data.get('accion') # 'APROBAR' o 'RECHAZAR'
        comentarios = request.data.get('comentarios', '')

        try:
            solicitud = Solicitud.objects.get(pk=pk, estado='EN_REVISION')
        except Solicitud.DoesNotExist:
            return Response({'error': 'Solicitud no encontrada o ya resuelta'}, status=status.HTTP_404_NOT_FOUND)

        admin = request.user
        if getattr(admin, 'rol', None) != 'MASTER_ADMIN' and getattr(admin, 'sede', None):
            if solicitud.sede != admin.sede:
                return Response({'error': 'No tiene permisos para procesar expedientes de esta sede.'}, status=status.HTTP_403_FORBIDDEN)

        if accion == 'RECHAZAR':
            solicitud.estado = 'RECHAZADA'
            solicitud.motivo_rechazo = comentarios
            solicitud.resuelto_en = datetime.utcnow()
            solicitud.save()
            return Response({'success': True, 'estado': 'RECHAZADA'})

        elif accion == 'APROBAR':
            if solicitud.numero_operacion and Solicitud.objects.filter(numero_operacion=solicitud.numero_operacion, estado='APROBADA').exclude(pk=solicitud.pk).exists():
                return Response({'error': 'El número de operación de este voucher ya fue validado en otra solicitud aprobada. Debe rechazar esta solicitud.'}, status=status.HTTP_409_CONFLICT)
                
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

                    fecha_colegiatura = solicitud.creado_en.date() if solicitud.creado_en else datetime.utcnow().date()
                    fecha_creado_en = solicitud.creado_en if solicitud.creado_en else timezone.now()

                    colegiado = Colegiado.objects.create(
                        dni=solicitud.dni,
                        nombres=solicitud.nombres,
                        foto_url=solicitud.foto_url,
                        carrera=solicitud.carrera,
                        sede=solicitud.sede,
                        nro_colegiado=siguiente_nro,
                        solicitud=solicitud,
                        correo=solicitud.correo,
                        celular=solicitud.celular,
                        colegiado_desde=fecha_colegiatura,
                        creado_en=fecha_creado_en
                    )

                    # Auto-crear registro de Pago de Incorporación
                    metodo_pago = None
                    canal_pago = 'PORTAL'
                    if solicitud.numero_operacion:
                        prefix = solicitud.numero_operacion.split('-')[0]
                        if prefix in ['MIXTO', 'YAPE_PLIN', 'EFECTIVO', 'CAJA']:
                            canal_pago = 'CAJA'
                            metodo_pago = prefix if prefix != 'CAJA' else 'EFECTIVO'
                    
                    # Para Web (PORTAL), usualmente es TRANSFERENCIA o YAPE, pero no tenemos el metodo exacto
                    # a menos que lo guardemos. Lo dejaremos como nulo si no es presencial.

                    # Para web, si no hay fecha_pago, usamos la fecha de hoy
                    f_pago = solicitud.fecha_pago if solicitud.fecha_pago else datetime.utcnow().date()

                    pago_inc = Pago.objects.create(
                        colegiado=colegiado,
                        tipo='INCORPORACION',
                        periodo=f_pago.replace(day=1), # Usamos el mes de la inscripción
                        monto=5.00,
                        canal=canal_pago,
                        metodo=metodo_pago,
                        nro_operacion=solicitud.numero_operacion,
                        fecha_pago=f_pago
                    )

                    try:
                        from apps.finanzas.services import crear_comprobante
                        comp = crear_comprobante(
                            colegiado=colegiado,
                            monto=5.00,
                            canal=canal_pago,
                            metodo_pago=metodo_pago,
                            transaccion_id=solicitud.numero_operacion,
                            observaciones=f"Inscripción Inicial: {solicitud.nombres}",
                            cliente_documento=solicitud.ruc_factura if solicitud.tipo_comprobante == '01' else None,
                            cliente_nombre=solicitud.razon_social_factura if solicitud.tipo_comprobante == '01' else None,
                            tipo_comprobante=solicitud.tipo_comprobante
                        )
                        
                        pdf_url = None
                        if comp.sunat_hash:
                            import os
                            ruc = os.getenv("SUNAT_RUC_EMISOR", "20123456789")
                            base_url = os.getenv("FACTU_URL", "https://20123456789.s2.factusmart.pe/api/v1/issuer/documents").split('/documents')[0]
                            pdf_url = f"{base_url}/documents/{comp.sunat_hash}/pdf?ruc={ruc}"
                            
                        if colegiado.correo:
                            from core.emails import enviar_confirmacion_pago
                            enviar_confirmacion_pago(
                                correo=colegiado.correo,
                                nombres=colegiado.nombres,
                                nro_colegiado=colegiado.nro_colegiado,
                                monto_total=5.00,
                                periodos_pagados=['Inscripción'],
                                nro_operacion=solicitud.numero_operacion or "INSCRIPCION",
                                pdf_url=pdf_url
                            )
                    except Exception as e:
                        import sys
                        print(f"[ERROR COMPROBANTE/EMAIL INSCRIPCION] {e}", file=sys.stderr)


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

