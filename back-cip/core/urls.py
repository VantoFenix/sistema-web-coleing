from django.contrib import admin
from django.urls import path, re_path
from . import views

urlpatterns = [
    path('django-admin/', admin.site.urls),
    
    # Auth
    path('api/auth/login/', views.AuthLoginView.as_view(), name='auth-login'),
    
    # Catalogos
    path('api/catalogos/', views.get_catalogos, name='catalogos'),
    
    # Public
    path('api/public/padron/', views.PublicPadronView.as_view(), name='public-padron'),
    
    # Admin
    path('api/admin/postulaciones/', views.AdminPostulacionesView.as_view(), name='admin-postulaciones'),
    
    # Catch-all for React SPA
    re_path(r'^(?!api/|django-admin/|static/).*$', views.react_catchall_view),
]
