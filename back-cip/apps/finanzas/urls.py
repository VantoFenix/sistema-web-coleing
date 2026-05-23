from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SedeViewSet, CarreraViewSet, ColegiadorViewSet, CuotaViewSet
)

# Inicializar el router predeterminado
router = DefaultRouter()

# Registrar los ViewSets
router.register(r'sedes', SedeViewSet, basename='sede')
router.register(r'carreras', CarreraViewSet, basename='carrera')
router.register(r'colegiados', ColegiadorViewSet, basename='colegiado')
router.register(r'cuotas', CuotaViewSet, basename='cuota')

# Las URLs se generan automáticamente por el router
urlpatterns = [
    path('', include(router.urls)),
]
