# 🔧 Guía de Troubleshooting y Mejores Prácticas

## 🚨 Errores Comunes y Soluciones

### 1. Error: `ModuleNotFoundError: No module named 'rest_framework_simplejwt'`

**Solución:**
```bash
pip install djangorestframework-simplejwt>=5.3.0

# O reinstalar requirements.txt
pip install -r requirements.txt --force-reinstall
```

---

### 2. Error: `django.db.utils.OperationalError: could not connect to server`

**Solución:**
```bash
# Verificar que PostgreSQL está corriendo
docker compose ps

# Reiniciar la BD
docker compose restart db

# Revisar logs
docker compose logs db

# Si el error persiste, resetear la BD
docker compose down -v
docker compose up --build
```

---

### 3. Error: `psycopg2 not installed`

**Solución:**
```bash
pip install psycopg2-binary

# O en Docker
docker compose exec backend pip install psycopg2-binary
```

---

### 4. Error: `No such file or directory: 'media'`

**Solución:**
```bash
# Crear directorios necesarios
mkdir -p media/tramites/{fotos,titulos,vouchers}
mkdir -p staticfiles

# En Docker
docker compose exec backend mkdir -p media/tramites/{fotos,titulos,vouchers}
docker compose exec backend mkdir -p staticfiles
```

---

### 5. Error: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solución:**
Verificar que en `settings.py`:
```python
INSTALLED_APPS = [
    ...
    'corsheaders',  # ✅ Debe estar aquí
    ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ✅ Debe ser primero
    ...
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    ...
]
```

---

### 6. Error: `ModuleNotFoundError: No module named 'apps.finanzas'`

**Solución:**
Verificar que las apps estén en `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    ...
    'apps.tramites',
    'apps.finanzas',
]
```

Y que exista un archivo `__init__.py` en cada app.

---

### 7. Error: `Authentication credentials were not provided`

**Solución:**
- Necesitas un token JWT para acceder a la mayoría de endpoints
- Obtén el token primero:
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

- Luego usa el token en el header:
```bash
curl -X GET http://localhost:8000/api/finanzas/colegiados/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 8. Error: `Migrations are not permitted on this database`

**Solución:**
```bash
# Resetear migraciones de forma segura
docker compose exec backend python manage.py migrate --fake-initial
docker compose exec backend python manage.py migrate
```

---

### 9. Error: `The file uploaded exceeds the maximum allowed size`

**Solución:**
Aumentar `FILE_UPLOAD_MAX_MEMORY_SIZE` en `settings.py`:
```python
# En bytes (ejemplo: 50MB)
FILE_UPLOAD_MAX_MEMORY_SIZE = 50000000
DATA_UPLOAD_MAX_MEMORY_SIZE = 50000000
```

---

### 10. Error: `UNIQUE constraint failed: colegiados.cip`

**Solución:**
El CIP debe ser único dentro de la misma sede:
```python
class Meta:
    unique_together = (('cip', 'sede'),)  # ✅ Esto está configurado
```

Si necesitas insertar un CIP duplicado:
```bash
# Revisar datos existentes
SELECT * FROM colegiados WHERE cip = '12345';

# Cambiar el CIP o sede antes de insertar
```

---

## 📋 Checklist Pre-Producción

### Configuración de Seguridad
- [ ] `DEBUG = False` en producción
- [ ] `SECRET_KEY` debe ser única y segura
- [ ] `ALLOWED_HOSTS` específico para tu dominio
- [ ] `CORS_ALLOWED_ORIGINS` específico (no `CORS_ALLOW_ALL_ORIGINS`)
- [ ] HTTPS habilitado
- [ ] Certificados SSL/TLS configurados

### Base de Datos
- [ ] Backups automáticos configurados
- [ ] Contraseña de DB fuerte
- [ ] BD en servidor separado
- [ ] Logs de BD monitoreados
- [ ] Índices optimizados

### API
- [ ] Rate limiting habilitado
- [ ] Validaciones completas
- [ ] Documentación actualizada
- [ ] Tests ejecutándose correctamente
- [ ] Errores 500 registrados

### Monitoreo
- [ ] Sentry configurado para errores
- [ ] Logs centralizados (ELK, Datadog, etc)
- [ ] Métricas de performance
- [ ] Uptime monitoring
- [ ] Alertas configuradas

---

## 🎯 Mejores Prácticas Aplicadas

### 1. **Validaciones en Múltiples Niveles**
```python
# ✅ Validador a nivel de campo
dni = models.CharField(validators=[RegexValidator(...)])

# ✅ Validador a nivel de modelo
class Meta:
    unique_together = (('cip', 'sede'),)

# ✅ Validador en serializer
def validate_dni(self, value):
    if not value.isdigit():
        raise ValidationError("DNI inválido")
    return value
```

### 2. **Relaciones Bien Definidas**
```python
# ✅ PROTECT para catálogos (evita eliminar referencias)
carrera = models.ForeignKey(Carrera, on_delete=models.PROTECT)

# ✅ CASCADE para datos transaccionales
cuota = models.ForeignKey(Colegiado, on_delete=models.CASCADE)
```

### 3. **Serializers Inteligentes**
```python
# ✅ Campos anidados para lectura
carrera_nombre = serializers.CharField(source='carrera.nombre', read_only=True)

# ✅ Diferentes serializers para diferentes acciones
def get_serializer_class(self):
    if self.action == 'list':
        return ListSerializer
    return DetailSerializer
```

### 4. **Búsqueda y Filtrado**
```python
# ✅ Búsqueda por múltiples campos
search_fields = ['nombre_completo', 'dni', 'cip', 'correo']

# ✅ Ordenamiento flexible
ordering_fields = ['fecha_solicitud', 'nombre_completo']
ordering = ['-fecha_solicitud']
```

### 5. **Acciones Personalizadas**
```python
# ✅ Lógica específica de negocio
@action(detail=True, methods=['post'])
def cambiar_estado(self, request, pk=None):
    # Lógica personalizada
    pass
```

### 6. **Admin Configurable**
```python
# ✅ Filtros específicos del negocio
list_filter = ['estado', 'carrera', 'sede', 'fecha_solicitud']

# ✅ Acciones rápidas
actions = ['marcar_aprobado', 'marcar_rechazado']

# ✅ Campos solo lectura
readonly_fields = ['fecha_solicitud', 'fecha_actualizacion']
```

### 7. **Documentación en Código**
```python
# ✅ Docstrings en ViewSets
"""
ViewSet para gestionar trámites de inscripción.

Operaciones disponibles:
- GET /tramites/: Listar trámites
- POST /tramites/: Crear trámite
- GET /tramites/{id}/deuda/: Acción personalizada
"""

# ✅ Help text en modelos
dni = models.CharField(..., help_text='8 dígitos del DNI')
```

---

## 🧪 Testing

### Estructura de Tests Recomendada
```python
# tests/test_models.py
class ColegiadorModelTest(TestCase):
    def setUp(self):
        self.colegiado = Colegiado.objects.create(...)
    
    def test_colegiado_str(self):
        self.assertEqual(str(self.colegiado), "...")

# tests/test_views.py
class ColegiadorViewSetTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(...)
        self.token = ...
    
    def test_list_colegiados(self):
        response = self.client.get('/api/finanzas/colegiados/')
        self.assertEqual(response.status_code, 200)
```

### Ejecutar Tests
```bash
# Todos los tests
python manage.py test

# Tests de una app específica
python manage.py test apps.finanzas

# Tests de una clase
python manage.py test apps.finanzas.tests.ColegiadorModelTest

# Con coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

---

## 📈 Performance Tips

### 1. Usar `select_related()` y `prefetch_related()`
```python
# ✅ Bueno
queryset = TramiteInscripcion.objects.select_related('carrera', 'sede')

# ❌ Malo
queryset = TramiteInscripcion.objects.all()  # N queries
```

### 2. Usar índices en BD
```python
class Meta:
    indexes = [
        models.Index(fields=['dni']),
        models.Index(fields=['estado', 'fecha_solicitud']),
    ]
```

### 3. Limitar campos en listados
```python
class ListSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['id', 'nombre', 'estado']  # No incluir campos pesados
```

### 4. Paginación
```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,  # No traer todo a la vez
}
```

### 5. Caching
```python
from django.views.decorators.cache import cache_page

@cache_page(60 * 5)  # 5 minutos
def get_reportes(request):
    pass
```

---

## 🔐 Seguridad Adicional

### Proteger Contra Ataques Comunes

1. **SQL Injection** - ORM previene automáticamente
2. **CSRF** - `CsrfViewMiddleware` habilitado
3. **XSS** - DRF escapa HTML automáticamente
4. **Brute Force** - Añadir rate limiting:
   ```bash
   pip install django-ratelimit
   ```

5. **Token Expirado** - JWT expira automáticamente
6. **Exposición de Datos** - Usar `permission_classes`

---

## 📞 Contacto y Soporte

Si necesitas ayuda:

1. Revisar los logs: `docker compose logs -f backend`
2. Ver detalles de error en la terminal
3. Activar debug en `settings.py`: `DEBUG = True`
4. Usar Django Shell: `python manage.py shell`
5. Revisar documentación oficial:
   - Django: https://docs.djangoproject.com/
   - DRF: https://www.django-rest-framework.org/
   - SimpleJWT: https://django-rest-framework-simplejwt.readthedocs.io/

---

*Última actualización: Mayo 2026*
*Backend implementado por: Senior Backend Engineer*
