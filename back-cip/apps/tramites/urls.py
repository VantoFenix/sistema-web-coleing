from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TramiteInscripcionViewSet, VerificarOperacionBancoView

# Inicializar el router predeterminado
router = DefaultRouter()

# Registrar los ViewSets
router.register(r'', TramiteInscripcionViewSet, basename='tramite-inscripcion')

# Las URLs se generan automáticamente por el router
urlpatterns = [
    path('mock-banco/', VerificarOperacionBancoView.as_view(), name='mock-banco'),
    path('', include(router.urls)),
]