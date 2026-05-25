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
    
    # RENIEC (proxy seguro)
    path('api/public/reniec/', views.ReniecConsultaView.as_view(), name='reniec-consulta'),

    # Public
    path('api/public/padron/', views.PublicPadronView.as_view(), name='public-padron'),
    path('api/public/solicitudes/', views.PublicConsultaSolicitudView.as_view(), name='public-consultar-solicitud'),
    path('api/postulaciones/', views.PublicPostulacionView.as_view(), name='crear-postulacion'),
    
    # Admin
    path('api/admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('api/admin/postulaciones/', views.AdminPostulacionesView.as_view(), name='admin-postulaciones'),
    path('api/admin/postulaciones/<int:pk>/resolver/', views.AdminResolverSolicitudView.as_view(), name='admin-resolver-postulacion'),
    path('api/admin/recaudacion/', views.AdminCargaRecaudacionView.as_view(), name='admin-recaudacion'),

    # HU14 — Pagos Presencial
    path('api/admin/colegiados/buscar/', views.AdminBuscarColegiadoView.as_view(), name='admin-buscar-colegiado'),
    path('api/admin/colegiados/<int:pk>/deuda/', views.AdminDeudaColegiadoView.as_view(), name='admin-deuda-colegiado'),
    path('api/admin/pagos/presencial/', views.AdminRegistrarPagoPresencialView.as_view(), name='admin-pago-presencial'),
    
    # Pago Online — MercadoPago
    path('api/pagos/mp-config/', views.MPConfigView.as_view(),   name='mp-config'),
    path('api/pagos/online/',    views.PagoOnlineView.as_view(), name='pago-online'),

    # Portal Colegiado
    path('api/portal/yo/', views.PortalPerfilView.as_view(), name='portal-yo'),
    path('api/portal/foto/', views.PortalFotoView.as_view(), name='portal-foto'),
    path('api/portal/mis-pagos/', views.PortalPagosView.as_view(), name='portal-pagos'),
    
    # Catch-all for React SPA
    re_path(r'^(?!api/|django-admin/|static/|media/).*$', views.react_catchall_view),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)