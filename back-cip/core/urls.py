from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views

from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/master/sedes', views.SedeViewSet, basename='master-sedes')
router.register(r'api/master/carreras', views.CarreraViewSet, basename='master-carreras')
router.register(r'api/master/usuarios', views.AdministradorViewSet, basename='master-usuarios')

urlpatterns = [
    path('django-admin/', admin.site.urls),
    
    # Auth
    path('api/auth/login/', views.AuthLoginView.as_view(), name='auth-login'),
    path('api/auth/password-reset/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('api/auth/password-reset/confirm/<str:uidb64>/<str:token>/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Catalogos
    path('api/catalogos/', views.get_catalogos, name='catalogos'),
    
    # RENIEC (proxy seguro)
    path('api/public/reniec/', views.ReniecConsultaView.as_view(), name='reniec-consulta'),

    # Public
    path('api/public/padron/', views.PublicPadronView.as_view(), name='public-padron'),
    path('api/public/solicitudes/', views.PublicConsultaSolicitudView.as_view(), name='public-consultar-solicitud'),
    path('api/postulaciones/', views.PublicPostulacionView.as_view(), name='crear-postulacion'),
    # Tramites
    path('api/tramites/', include('apps.tramites.urls')),

    # Admin
    path('api/admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('api/admin/configuracion/', views.AdminConfiguracionView.as_view(), name='admin-configuracion'),
    path('api/admin/deudores/', views.PanelDeudoresView.as_view(), name='admin-deudores'),
    path('api/admin/postulaciones/', views.AdminPostulacionesView.as_view(), name='admin-postulaciones'),
    path('api/admin/postulaciones/<int:pk>/resolver/', views.AdminResolverSolicitudView.as_view(), name='admin-resolver-postulacion'),
    # HU14 — Pagos Presencial
    path('api/admin/colegiados/buscar/', views.AdminBuscarColegiadoView.as_view(), name='admin-buscar-colegiado'),
    path('api/admin/colegiados/<int:pk>/deuda/', views.AdminDeudaColegiadoView.as_view(), name='admin-deuda-colegiado'),
    path('api/admin/pagos/presencial/', views.AdminRegistrarPagoPresencialView.as_view(), name='admin-pago-presencial'),
    # HU15 — Verificación de Vouchers
    path('api/admin/vouchers/', views.AdminVouchersListView.as_view(), name='admin-vouchers-list'),
    path('api/admin/vouchers/<int:pk>/resolver/', views.AdminVoucherResolverView.as_view(), name='admin-voucher-resolver'),
    # Pago tarjeta presencial (admin + MP gateway)
    path('api/admin/pagos/tarjeta/', views.AdminPagoTarjetaView.as_view(), name='admin-pago-tarjeta'),
    
    # Pago Online — MercadoPago
    path('api/pagos/mp-config/',    views.MPConfigView.as_view(),                    name='mp-config'),
    path('api/pagos/online/',       views.PagoOnlineView.as_view(),                  name='pago-online'),
    path('api/pagos/online/status/<str:mp_id>/', views.PagoOnlineStatusView.as_view(), name='pago-online-status'),
    # Checkout Pro (Yape automático)
    path('api/pagos/preferencia/',  views.PagoPreferenciaView.as_view(),             name='pago-preferencia'),
    path('api/pagos/verificar/',    views.PagoVerificarPreferenciaView.as_view(),    name='pago-verificar'),

    # Portal Colegiado
    path('api/portal/yo/', views.PortalPerfilView.as_view(), name='portal-yo'),
    path('api/portal/foto/', views.PortalFotoView.as_view(), name='portal-foto'),
    path('api/portal/mis-pagos/', views.PortalPagosView.as_view(), name='portal-pagos'),
    path('api/portal/pago-voucher/', views.PortalPagoVoucherView.as_view(), name='portal-pago-voucher'),
    
    # Catch-all for React SPA
    re_path(r'^(?!api/|django-admin/|static/|media/).*$', views.react_catchall_view),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += router.urls