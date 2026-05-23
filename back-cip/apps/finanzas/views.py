from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Sum, Count
from .models import Sede, Carrera, Colegiado, Cuota
from .serializers import (
    SedeSerializer, CarreraSerializer, ColegiadorSerializer,
    CuotaSerializer, CuotaListSerializer, CuotaDetailSerializer
)


# ==============================================================================
# CONFIGURACIÓN DE PAGINACIÓN
# ==============================================================================

class StandardPagination(PageNumberPagination):
    """Paginación estándar para listados"""
    page_size = 10
    page_size_query_param = 'page_size'
    page_size_query_description = 'Número de registros por página'
    max_page_size = 100


# ==============================================================================
# VIEWSETS PARA CATÁLOGOS
# ==============================================================================

class SedeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar sedes.
    
    Operaciones disponibles:
    - GET /sedes/: Listar todas las sedes
    - POST /sedes/: Crear nueva sede
    - GET /sedes/{id}/: Obtener detalle de una sede
    - PUT /sedes/{id}/: Actualizar una sede
    - DELETE /sedes/{id}/: Eliminar una sede
    """
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']


class CarreraViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar carreras.
    
    Operaciones disponibles:
    - GET /carreras/: Listar todas las carreras
    - POST /carreras/: Crear nueva carrera
    - GET /carreras/{id}/: Obtener detalle de una carrera
    - PUT /carreras/{id}/: Actualizar una carrera
    - DELETE /carreras/{id}/: Eliminar una carrera
    """
    queryset = Carrera.objects.all()
    serializer_class = CarreraSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']


# ==============================================================================
# VIEWSET PARA COLEGIADOS
# ==============================================================================

class ColegiadorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar colegiados.
    
    Operaciones disponibles:
    - GET /colegiados/: Listar colegiados con filtrado y búsqueda
    - POST /colegiados/: Crear nuevo colegiado
    - GET /colegiados/{id}/: Obtener detalle de un colegiado
    - PUT /colegiados/{id}/: Actualizar un colegiado
    - DELETE /colegiados/{id}/: Eliminar un colegiado
    
    Acciones adicionales:
    - GET /colegiados/{id}/deuda/: Ver deuda total del colegiado
    - GET /colegiados/habilitados/listar/: Listar solo colegiados habilitados
    - GET /colegiados/deshabilitados/listar/: Listar solo colegiados deshabilitados
    """
    queryset = Colegiado.objects.select_related('carrera', 'sede')
    serializer_class = ColegiadorSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre_completo', 'dni', 'cip', 'correo']
    ordering_fields = ['fecha_colegiatura', 'nombre_completo', 'habilitado']
    ordering = ['-fecha_colegiatura']

    @action(detail=True, methods=['get'])
    def deuda(self, request, pk=None):
        """
        Retorna la deuda total (cuotas pendientes) de un colegiado.
        Endpoint: GET /colegiados/{id}/deuda/
        """
        colegiado = self.get_object()
        cuotas_pendientes = colegiado.cuotas.filter(pagado=False)
        deuda_total = cuotas_pendientes.aggregate(Sum('monto'))['monto__sum'] or 0
        cantidad_cuotas = cuotas_pendientes.count()

        return Response({
            'colegiado_id': colegiado.id,
            'colegiado_nombre': colegiado.nombre_completo,
            'deuda_total': deuda_total,
            'cantidad_cuotas_pendientes': cantidad_cuotas,
            'habilitado': colegiado.habilitado
        })

    @action(detail=False, methods=['get'])
    def habilitados(self, request):
        """
        Retorna lista de colegiados habilitados.
        Endpoint: GET /colegiados/habilitados/listar/
        """
        queryset = self.queryset.filter(habilitado=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def deshabilitados(self, request):
        """
        Retorna lista de colegiados deshabilitados.
        Endpoint: GET /colegiados/deshabilitados/listar/
        """
        queryset = self.queryset.filter(habilitado=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ==============================================================================
# VIEWSET PARA CUOTAS
# ==============================================================================

class CuotaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar cuotas mensuales.
    
    Operaciones disponibles:
    - GET /cuotas/: Listar cuotas con filtrado y búsqueda
    - POST /cuotas/: Crear nueva cuota
    - GET /cuotas/{id}/: Obtener detalle de una cuota
    - PUT /cuotas/{id}/: Actualizar una cuota
    - DELETE /cuotas/{id}/: Eliminar una cuota
    
    Acciones adicionales:
    - GET /cuotas/pendientes/listar/: Listar cuotas pendientes
    - GET /cuotas/pagadas/listar/: Listar cuotas pagadas
    - POST /cuotas/{id}/marcar_pagada/: Marcar una cuota como pagada
    - GET /cuotas/reportes/resumen/: Obtener resumen financiero
    """
    queryset = Cuota.objects.select_related('colegiado').order_by('-anio_cobro', '-mes_cobro')
    serializer_class = CuotaSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['colegiado__nombre_completo', 'colegiado__cip', 'colegiado__dni']
    ordering_fields = ['anio_cobro', 'mes_cobro', 'monto', 'pagado']

    def get_serializer_class(self):
        """Retorna el serializador apropiado según la acción"""
        if self.action == 'list':
            return CuotaListSerializer
        elif self.action == 'retrieve':
            return CuotaDetailSerializer
        return CuotaSerializer

    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """
        Retorna lista de cuotas pendientes de pago.
        Endpoint: GET /cuotas/pendientes/listar/
        """
        queryset = self.queryset.filter(pagado=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pagadas(self, request):
        """
        Retorna lista de cuotas pagadas.
        Endpoint: GET /cuotas/pagadas/listar/
        """
        queryset = self.queryset.filter(pagado=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_pagada(self, request, pk=None):
        """
        Marca una cuota como pagada.
        Endpoint: POST /cuotas/{id}/marcar_pagada/
        
        Body esperado:
        {
            "transaccion_id": "TRX123456"  (opcional)
        }
        """
        from django.utils import timezone
        cuota = self.get_object()
        
        if cuota.pagado:
            return Response(
                {'detail': 'Esta cuota ya ha sido pagada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cuota.pagado = True
        cuota.fecha_pago = timezone.now()
        cuota.transaccion_id = request.data.get('transaccion_id')
        cuota.save()

        serializer = self.get_serializer(cuota)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Retorna un resumen del estado financiero.
        Endpoint: GET /cuotas/reportes/resumen/
        """
        total_cuotas = Cuota.objects.count()
        total_pagado = Cuota.objects.filter(pagado=True).aggregate(
            total=Sum('monto')
        )['total'] or 0
        total_pendiente = Cuota.objects.filter(pagado=False).aggregate(
            total=Sum('monto')
        )['total'] or 0
        cuotas_pagadas = Cuota.objects.filter(pagado=True).count()
        cuotas_pendientes = Cuota.objects.filter(pagado=False).count()

        return Response({
            'total_cuotas': total_cuotas,
            'cuotas_pagadas': cuotas_pagadas,
            'cuotas_pendientes': cuotas_pendientes,
            'monto_total_pagado': total_pagado,
            'monto_total_pendiente': total_pendiente,
            'monto_total': total_pagado + total_pendiente,
            'porcentaje_pagado': (
                round((cuotas_pagadas / total_cuotas * 100), 2) if total_cuotas > 0 else 0
            )
        })
