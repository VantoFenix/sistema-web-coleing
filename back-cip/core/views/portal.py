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
from .utils import _get_monto_mensualidad, _get_habilitado, _meses_entre

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
                """strftime seguro: normaliza datetime→date y maneja None y str."""
                if d is None:
                    return None
                if isinstance(d, str):
                    try:
                        from datetime import datetime as _dt
                        d = _dt.strptime(d[:10], '%Y-%m-%d').date()
                    except Exception:
                        return d
                if hasattr(d, 'date') and callable(d.date):  # es datetime
                    d = d.date()
                return d.strftime(fmt) if hasattr(d, 'strftime') else str(d)

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
                    fin_adelantos = date(hoy.year + 2, hoy.month, 1)
                    todos_los_meses = _meses_entre(col.colegiado_desde, fin_adelantos)
                    hoy_m = date(hoy.year, hoy.month, 1)

                    for m in todos_los_meses:
                        if m not in pagados_norm:
                            pendientes.append({
                                'periodo': m.strftime('%Y-%m'),
                                'fecha': m.strftime('%Y-%m-%d'),
                                'is_adelanto': m > hoy_m
                            })
            except Exception as e:
                print(f"[PAGOS] Error calculando pendientes: {e}", file=sys.stderr)
                pendientes = []

            # ── Vouchers Pendientes ───────────────────────────────────────────
            vouchers_pendientes = []
            try:
                import json
                from .models import PagoVoucherPendiente
                vps = PagoVoucherPendiente.objects.filter(colegiado=col, estado='PENDIENTE').order_by('-creado_en')
                for vp in vps:
                    periodos_list = []
                    try:
                        periodos_list = json.loads(vp.periodos_json)
                    except Exception:
                        periodos_list = [vp.periodos_json]
                    
                    vouchers_pendientes.append({
                        'id': vp.id,
                        'metodo': vp.metodo,
                        'monto': str(vp.monto),
                        'periodos': periodos_list,
                        'fecha': _fmt_date(vp.creado_en, '%Y-%m-%d %H:%M')
                    })
            except Exception as e:
                print(f"[PAGOS] Error obteniendo vouchers pendientes: {e}", file=sys.stderr)

            return Response({
                'historial': historial,
                'periodos_pendientes': pendientes,
                'vouchers_pendientes': vouchers_pendientes,
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

