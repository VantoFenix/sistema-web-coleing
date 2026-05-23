from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from .models import TramiteInscripcion, EstadoTramiteChoices
from .serializers import (
    TramiteInscripcionSerializer,
    TramiteInscripcionListSerializer,
    CambiarEstadoTramiteSerializer
)


# ==============================================================================
# CONFIGURACIÓN DE PAGINACIÓN
# ==============================================================================

class StandardPagination(PageNumberPagination):
    """Paginación estándar para listados"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# ==============================================================================
# VIEWSET PARA TRÁMITES DE INSCRIPCIÓN
# ==============================================================================

class TramiteInscripcionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar trámites de inscripción.
    
    Operaciones disponibles:
    - GET /tramites/: Listar trámites con filtrado y búsqueda
    - POST /tramites/: Crear nuevo trámite
    - GET /tramites/{id}/: Obtener detalle de un trámite
    - PUT /tramites/{id}/: Actualizar un trámite
    - DELETE /tramites/{id}/: Eliminar un trámite
    
    Acciones personalizadas:
    - GET /tramites/pendientes/listar/: Listar trámites pendientes
    - GET /tramites/aprobados/listar/: Listar trámites aprobados
    - GET /tramites/rechazados/listar/: Listar trámites rechazados
    - GET /tramites/observados/listar/: Listar trámites observados
    - POST /tramites/{id}/cambiar_estado/: Cambiar estado del trámite
    - GET /tramites/reportes/resumen/: Resumen de trámites
    """

    queryset = TramiteInscripcion.objects.select_related('carrera', 'sede').order_by('-fecha_solicitud')
    serializer_class = TramiteInscripcionSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre_completo', 'dni', 'correo', 'carrera__nombre', 'sede__nombre']
    ordering_fields = ['fecha_solicitud', 'nombre_completo', 'estado', 'carrera', 'sede']

    def get_serializer_class(self):
        """Retorna el serializador apropiado según la acción"""
        if self.action == 'list':
            return TramiteInscripcionListSerializer
        elif self.action == 'cambiar_estado':
            return CambiarEstadoTramiteSerializer
        return TramiteInscripcionSerializer

    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """
        Retorna lista de trámites pendientes de revisión.
        Endpoint: GET /tramites/pendientes/listar/
        """
        queryset = self.queryset.filter(estado=EstadoTramiteChoices.PENDIENTE)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def aprobados(self, request):
        """
        Retorna lista de trámites aprobados.
        Endpoint: GET /tramites/aprobados/listar/
        """
        queryset = self.queryset.filter(estado=EstadoTramiteChoices.APROBADO)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def rechazados(self, request):
        """
        Retorna lista de trámites rechazados.
        Endpoint: GET /tramites/rechazados/listar/
        """
        queryset = self.queryset.filter(estado=EstadoTramiteChoices.RECHAZADO)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def observados(self, request):
        """
        Retorna lista de trámites con observaciones.
        Endpoint: GET /tramites/observados/listar/
        """
        queryset = self.queryset.filter(estado=EstadoTramiteChoices.OBSERVADO)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambia el estado de un trámite de inscripción.
        Endpoint: POST /tramites/{id}/cambiar_estado/
        
        Body esperado:
        {
            "estado": "APROBADO",
            "observacion": "Documentación válida" (opcional/requerido según estado)
        }
        """
        tramite = self.get_object()
        serializer = CambiarEstadoTramiteSerializer(data=request.data)
        
        if serializer.is_valid():
            estado = serializer.validated_data['estado']
            observacion = serializer.validated_data.get('observacion', '')

            tramite.estado = estado
            if observacion:
                tramite.observacion = observacion
            else:
                tramite.observacion = None
            tramite.save()

            # Retornar el trámite actualizado
            output_serializer = TramiteInscripcionSerializer(tramite)
            return Response(
                output_serializer.data,
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Retorna un resumen estadístico de los trámites.
        Endpoint: GET /tramites/reportes/resumen/
        """
        total_tramites = self.queryset.count()
        
        estadisticas = {
            'total_tramites': total_tramites,
            'por_estado': {
                'pendiente': self.queryset.filter(estado=EstadoTramiteChoices.PENDIENTE).count(),
                'observado': self.queryset.filter(estado=EstadoTramiteChoices.OBSERVADO).count(),
                'aprobado': self.queryset.filter(estado=EstadoTramiteChoices.APROBADO).count(),
                'rechazado': self.queryset.filter(estado=EstadoTramiteChoices.RECHAZADO).count(),
            },
            'por_carrera': {},
            'por_sede': {},
        }

        # Contar por carrera
        por_carrera = self.queryset.values('carrera__nombre').annotate(
            count=Count('id')
        ).order_by('-count')
        estadisticas['por_carrera'] = {
            item['carrera__nombre']: item['count'] for item in por_carrera
        }

        # Contar por sede
        por_sede = self.queryset.values('sede__nombre').annotate(
            count=Count('id')
        ).order_by('-count')
        estadisticas['por_sede'] = {
            item['sede__nombre']: item['count'] for item in por_sede
        }

        return Response(estadisticas)
