from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth
    path('api/auth/login/', views.AuthLoginView.as_view(), name='auth-login'),
    
    # Catalogos
    path('api/catalogos/', views.get_catalogos, name='catalogos'),
    
    # Public
    path('api/public/padron/', views.PublicPadronView.as_view(), name='public-padron'),
    
    # Admin
    path('api/admin/postulaciones/', views.AdminPostulacionesView.as_view(), name='admin-postulaciones'),
]
