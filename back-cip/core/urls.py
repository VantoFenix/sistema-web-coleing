from django.contrib import admin
from django.urls import path, re_path
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('django-admin/', admin.site.urls),
    
    # Auth
    path('api/auth/login/', views.AuthLoginView.as_view(), name='auth-login'),
    
    # Catalogos
    path('api/catalogos/', views.get_catalogos, name='catalogos'),
    
    # Public
    path('api/public/padron/', views.PublicPadronView.as_view(), name='public-padron'),
    path('api/public/solicitudes/', views.PublicConsultaSolicitudView.as_view(), name='public-consultar-solicitud'),
    path('api/postulaciones/', views.PublicPostulacionView.as_view(), name='crear-postulacion'),
    
    # Admin
    path('api/admin/postulaciones/', views.AdminPostulacionesView.as_view(), name='admin-postulaciones'),
    path('api/admin/postulaciones/<int:pk>/resolver/', views.AdminResolverSolicitudView.as_view(), name='admin-resolver-postulacion'),
    path('api/admin/recaudacion/', views.AdminCargaRecaudacionView.as_view(), name='admin-recaudacion'),
    
    # Portal Colegiado
    path('api/portal/yo/', views.PortalPerfilView.as_view(), name='portal-yo'),
    path('api/portal/mis-pagos/', views.PortalPagosView.as_view(), name='portal-pagos'),
    
    # Catch-all for React SPA
    re_path(r'^(?!api/|django-admin/|static/|media/).*$', views.react_catchall_view),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)