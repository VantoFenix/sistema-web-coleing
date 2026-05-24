import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import Colegiado, Administrador, Carrera, Sede
from django.contrib.auth.hashers import make_password

# 1. ACTUALIZAR ADMIN 1
admin1 = Administrador.objects.filter(usuario='admin').first()
if admin1:
    admin1.password_hash = make_password('Admin123!')
    admin1.save()

# 2. CREAR ADMIN 2
admin2, created = Administrador.objects.get_or_create(
    usuario='admin2',
    defaults={
        'correo': 'admin2@cip.org.pe',
        'password_hash': make_password('Admin123!'),
        'nombres': 'Administrador Secundario'
    }
)
if not created:
    admin2.password_hash = make_password('Admin123!')
    admin2.save()

# 3. ACTUALIZAR COLEGIADO 1 (Bruno - Habilitado)
col1 = Colegiado.objects.filter(correo='bruno@email.com').first()
if col1:
    col1.password_hash = make_password('Colegiado123!')
    col1.save()

# 4. ACTUALIZAR COLEGIADA 2 (Ana - Inhabilitada)
col2 = Colegiado.objects.filter(correo='ana@email.com').first()
if col2:
    col2.password_hash = make_password('Colegiado123!')
    col2.save()

print("Usuarios listos con contraseñas seguras.")
