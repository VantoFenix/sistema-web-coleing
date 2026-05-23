# 📝 Cambios Realizados en settings.py

## Ubicación
`back-cip/core/settings.py`

---

## 1. INSTALLED_APPS (Línea 25-36)

### ❌ ANTES:
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # --- NUESTRAS APPS ---
    'apps.tramites',
    'apps.finanzas',
    'rest_framework',
]
```

### ✅ DESPUÉS:
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # --- THIRD PARTY APPS ---
    'rest_framework',
    'corsheaders',  # ← NUEVO
    
    # --- NUESTRAS APPS ---
    'apps.tramites',
    'apps.finanzas',
]
```

**Cambios:**
- Agregado: `'corsheaders'` (para CORS)
- Reorganizado: separar third-party apps de custom apps

---

## 2. MIDDLEWARE (Línea 38-46)

### ❌ ANTES:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

### ✅ DESPUÉS:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # ← NUEVO (DEBE SER PRIMERO)
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

**Cambios:**
- Agregado: `'corsheaders.middleware.CorsMiddleware'` como el SEGUNDO middleware
- Posición es crítica (después de SecurityMiddleware, antes de SessionMiddleware)

---

## 3. STATIC FILES (Línea 109-110)

### ❌ ANTES:
```python
STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

### ✅ DESPUÉS:
```python
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # ← NUEVO

# ==============================================================================
# CONFIGURACIÓN DE MEDIA (Archivos subidos por usuarios)
# ==============================================================================
MEDIA_URL = '/media/'  # ← NUEVO
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # ← NUEVO

# ==============================================================================
# CONFIGURACIÓN DE CORS (Cross-Origin Resource Sharing)
# ==============================================================================
CORS_ALLOWED_ORIGINS = [  # ← NUEVO
    'http://localhost:5173',      # React Dev (Vite)
    'http://127.0.0.1:5173',
    'http://localhost:3000',      # Alternativa
    'http://127.0.0.1:3000',
]

# Para desarrollo: permitir todos los orígenes
if DEBUG:  # ← NUEVO
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True  # ← NUEVO

# ==============================================================================
# CONFIGURACIÓN DE DJANGO REST FRAMEWORK
# ==============================================================================
REST_FRAMEWORK = {  # ← NUEVO
    # Autenticación por defecto: JWT
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    
    # Permisos por defecto
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    
    # Filtros globales
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    
    # Paginación
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    
    # Formato de respuestas
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

# ==============================================================================
# CONFIGURACIÓN DE JWT (JSON Web Tokens)
# ==============================================================================
from datetime import timedelta  # ← NUEVO

SIMPLE_JWT = {  # ← NUEVO
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JTI_CLAIM': 'jti',
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',

    'TOKEN_BLACKLIST_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenBlacklistSerializer',

    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_TYPE_CLAIM': 'token_type',

    'SLIDING_TOKEN_LIFETIME': timedelta(hours=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),

    'TOKEN_OBTAIN_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenObtainPairSerializer',
    'TOKEN_REFRESH_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenRefreshSerializer',
    'TOKEN_VERIFY_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenVerifySerializer',
    'TOKEN_BLACKLIST_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenBlacklistSerializer',
    'SLIDING_TOKEN_OBTAIN_SERIALIZER': 'rest_framework_simplejwt.serializers.SlidingTokenObtainSerializer',
    'SLIDING_TOKEN_REFRESH_SERIALIZER': 'rest_framework_simplejwt.serializers.SlidingTokenRefreshSerializer',
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

---

## 📊 Resumen de Cambios

| Sección | Tipo | Descripción |
|---------|------|-------------|
| INSTALLED_APPS | Adición | `corsheaders` |
| MIDDLEWARE | Adición | `CorsMiddleware` (PRIMERO) |
| STATIC FILES | Adición | `STATIC_ROOT` |
| MEDIA | Adición | `MEDIA_URL`, `MEDIA_ROOT` |
| CORS | Sección Nueva | Configuración CORS completa |
| REST_FRAMEWORK | Sección Nueva | Configuración DRF con JWT |
| SIMPLE_JWT | Sección Nueva | Configuración JWT tokens |
| Importes | Adición | `from datetime import timedelta` |

---

## ⚠️ Puntos Críticos

1. **CORS Middleware debe ser el 2do middleware** (después de SecurityMiddleware)
   ```python
   MIDDLEWARE = [
       'django.middleware.security.SecurityMiddleware',
       'corsheaders.middleware.CorsMiddleware',  # ← AQUÍ
       ...
   ]
   ```

2. **`CORS_ALLOW_ALL_ORIGINS` solo para desarrollo**
   ```python
   if DEBUG:
       CORS_ALLOW_ALL_ORIGINS = True  # ← NUNCA EN PRODUCCIÓN
   ```

3. **El import de `timedelta` debe estar cerca de SIMPLE_JWT**
   ```python
   from datetime import timedelta
   
   SIMPLE_JWT = {
       'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
       ...
   }
   ```

4. **`DEFAULT_AUTHENTICATION_CLASSES` usa JWT**
   ```python
   REST_FRAMEWORK = {
       'DEFAULT_AUTHENTICATION_CLASSES': [
           'rest_framework_simplejwt.authentication.JWTAuthentication',
       ],
       ...
   }
   ```

---

## 🔄 Migraciones Necesarias

Después de estos cambios, ejecuta:

```bash
# No hay cambios en modelos, pero necesitas asegurar que todo está bien
python manage.py check

# Si todo está bien
python manage.py migrate
```

---

## ✅ Verificación

Para verificar que los cambios están correctamente aplicados:

```bash
# 1. Revisar que el servidor inicia sin errores
python manage.py runserver

# 2. Obtener un token JWT
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. Probar CORS desde React (puerto 5173)
# El navegador no debe dar error de CORS

# 4. Usar el token en peticiones
curl -X GET http://localhost:8000/api/finanzas/colegiados/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐳 Con Docker

Si usas Docker, no necesitas cambiar nada en settings.py (ya está hecho).
Solo ejecuta:

```bash
docker compose up --build
docker compose exec backend python manage.py migrate
```

---

*Última actualización: Mayo 2026*
