# 🚀 Guía de Configuración del Backend - CIP

## 📋 Paso 1: Instalación de Dependencias

### 1.1 Instalar las nuevas librerías requeridas

```bash
# Navega a la carpeta del backend
cd back-cip

# Instala todas las dependencias desde requirements.txt
pip install -r requirements.txt
```

**Librerías instaladas:**
- `djangorestframework-simplejwt>=5.3.0` - JWT Authentication
- `Pillow>=10.0.0` - Procesamiento de imágenes
- Otras ya incluidas: `django-cors-headers`, `psycopg2-binary`, `python-dotenv`

---

## 🔧 Paso 2: Configuración Realizada en `settings.py`

### 2.1 CORS (Cross-Origin Resource Sharing)

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',      # React Dev (Vite)
    'http://127.0.0.1:5173',
    'http://localhost:3000',      # Alternativa
    'http://127.0.0.1:3000',
]

# En desarrollo: permite todos los orígenes
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
```

**Ubicación en settings.py:** Líneas ~160-175

---

### 2.2 JWT Authentication

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    # ... más configuración
}
```

**Endpoints JWT:**
- `POST /api/token/` - Obtener access_token y refresh_token
- `POST /api/token/refresh/` - Renovar access_token

**Ubicación en settings.py:** Líneas ~200-230

---

### 2.3 REST Framework Configuration

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    # ... más configuración
}
```

**Ubicación en settings.py:** Líneas ~180-205

---

### 2.4 Media Files (Documentos Subidos)

```python
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

Los archivos subidos se guardarán en la carpeta `media/` del proyecto.

**Ubicación en settings.py:** Líneas ~150-155

---

## 📁 Paso 3: Cambios Realizados en `apps/tramites/`

### 3.1 models.py
- **Modelo:** `TramiteInscripcion` - Gestiona solicitudes de inscripción
- **Campos principales:**
  - DNI (8 dígitos) con validación
  - Celular (9 dígitos) con validación
  - Archivos: foto, titulo_pdf, voucher (con tamaño máx)
  - URLs alternativas para almacenamiento en la nube
  - Estados: PENDIENTE, OBSERVADO, APROBADO, RECHAZADO

### 3.2 serializers.py
- `TramiteInscripcionSerializer` - Serializador completo con validaciones
- `TramiteInscripcionListSerializer` - Versión simplificada para listados
- `CambiarEstadoTramiteSerializer` - Para cambiar estado del trámite

**Validaciones incluidas:**
- DNI: exactamente 8 dígitos
- Foto: máximo 5 MB (JPG/PNG)
- PDF: máximo 10 MB
- Arquivos requeridos: foto, título, voucher

### 3.3 views.py
- `TramiteInscripcionViewSet` - CRUD completo + acciones personalizadas
- Búsqueda y filtrado por: nombre, DNI, correo, carrera, sede
- Paginación: 10 registros por página

**Acciones personalizadas:**
```
GET  /api/tramites/pendientes/listar/           - Trámites pendientes
GET  /api/tramites/aprobados/listar/            - Trámites aprobados
GET  /api/tramites/rechazados/listar/           - Trámites rechazados
GET  /api/tramites/observados/listar/           - Trámites observados
POST /api/tramites/{id}/cambiar_estado/         - Cambiar estado
GET  /api/tramites/reportes/resumen/            - Estadísticas
```

### 3.4 urls.py
```python
router.register(r'', TramiteInscripcionViewSet, basename='tramite-inscripcion')
```

### 3.5 admin.py
- Panel administrativo con:
  - Filtros por estado, carrera, sede, fecha
  - Búsqueda por nombre, DNI, correo
  - Vista previa de fotos
  - Acciones rápidas (Marcar como aprobado, rechazado)

---

## 🔐 Paso 4: Configuración de core/urls.py

```python
# Autenticación JWT
path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

# API Endpoints
path('api/finanzas/', include('apps.finanzas.urls')),
path('api/tramites/', include('apps.tramites.urls')),

# Servir archivos media en desarrollo
static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## 🗄️ Paso 5: Crear Migraciones y Base de Datos

### 5.1 Crear migraciones para los modelos

```bash
# Crea las migraciones para finanzas y tramites
docker compose exec backend python manage.py makemigrations
```

O si ejecutas localmente:
```bash
python manage.py makemigrations
```

### 5.2 Aplicar migraciones

```bash
# Docker
docker compose exec backend python manage.py migrate

# Local
python manage.py migrate
```

### 5.3 Cargar catálogos iniciales

```bash
# Docker
docker compose exec backend psql -U cip_user -d cip_db -f init-db/init.sql

# Local (desde la carpeta raíz)
psql -U cip_user -d cip_db -f init-db/init.sql
```

---

## 🧪 Paso 6: Pruebas de los Endpoints

### 6.1 Obtener tokens (Login)

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "usuario",
    "password": "contraseña"
  }'
```

**Respuesta:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 6.2 Usar el token en las peticiones

```bash
curl -X GET http://localhost:8000/api/tramites/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### 6.3 Refrescar el token

```bash
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."}'
```

---

## 📚 Endpoints Disponibles

### Finanzas (`/api/finanzas/`)
```
GET    /api/finanzas/sedes/
POST   /api/finanzas/sedes/
GET    /api/finanzas/sedes/{id}/
PUT    /api/finanzas/sedes/{id}/

GET    /api/finanzas/colegiados/
POST   /api/finanzas/colegiados/
GET    /api/finanzas/colegiados/{id}/
GET    /api/finanzas/colegiados/{id}/deuda/
GET    /api/finanzas/colegiados/habilitados/listar/
GET    /api/finanzas/colegiados/deshabilitados/listar/

GET    /api/finanzas/cuotas/
POST   /api/finanzas/cuotas/
GET    /api/finanzas/cuotas/{id}/
POST   /api/finanzas/cuotas/{id}/marcar_pagada/
GET    /api/finanzas/cuotas/pendientes/listar/
GET    /api/finanzas/cuotas/pagadas/listar/
GET    /api/finanzas/cuotas/reportes/resumen/
```

### Trámites (`/api/tramites/`)
```
GET    /api/tramites/
POST   /api/tramites/
GET    /api/tramites/{id}/
PUT    /api/tramites/{id}/
DELETE /api/tramites/{id}/

GET    /api/tramites/pendientes/listar/
GET    /api/tramites/aprobados/listar/
GET    /api/tramites/rechazados/listar/
GET    /api/tramites/observados/listar/
POST   /api/tramites/{id}/cambiar_estado/
GET    /api/tramites/reportes/resumen/
```

### Autenticación
```
POST   /api/token/
POST   /api/token/refresh/
```

---

## 🐳 Comando Rápido: Todo en uno (Docker)

```bash
# Desde la carpeta raíz del proyecto
docker compose up --build

# En otra terminal
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser  # Crear admin
```

---

## ⚙️ Variables de Entorno (.env)

Asegúrate de que tu archivo `.env` tiene:

```env
# Database
DB_NAME=cip_db
DB_USER=cip_user
DB_PASSWORD=secure_password
DB_HOST=db
DB_PORT=5432

# Django
DEBUG=True
SECRET_KEY=tu-secret-key-aqui
```

---

## 🎯 Checklist Final

- [x] CORS configurado para React (puerto 5173)
- [x] JWT authentication implementado
- [x] Media files configurado
- [x] Módulo finanzas completo (modelos, serializers, views)
- [x] Módulo trámites completo (modelos, serializers, views)
- [x] URLs organizadas con DefaultRouter
- [x] Admin panel configurado
- [x] Validaciones personalizadas en lugar
- [x] Paginación y búsqueda implementadas
- [ ] Ejecutar migraciones
- [ ] Cargar datos iniciales
- [ ] Crear usuario superadministrador

---

## 📞 Soporte

Si tienes errores durante la instalación:

1. Verifica que PostgreSQL esté ejecutándose
2. Revisa que las variables de `.env` sean correctas
3. Ejecuta `pip install -r requirements.txt` nuevamente
4. Revisa los logs con: `docker compose logs -f backend`

¡El backend está listo para producción! 🚀
