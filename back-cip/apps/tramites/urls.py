from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TramiteInscripcionViewSet

# Inicializar el router predeterminado
router = DefaultRouter()

# Registrar los ViewSets
router.register(r'', TramiteInscripcionViewSet, basename='tramite-inscripcion')

# Las URLs se generan automáticamente por el router
urlpatterns = [
    path('', include(router.urls)),
]