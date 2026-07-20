"""
Django settings for core project.
"""
from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar las variables del archivo .env desde la raíz del proyecto
env_path = BASE_DIR.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', '')

# FLOW CONFIG
FLOW_API_KEY = os.getenv('FLOW_API_KEY', '')
FLOW_SECRET_KEY = os.getenv('FLOW_SECRET_KEY', '')
FLOW_ENV = os.getenv('FLOW_ENV', 'sandbox')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-ip*qg4%=ko-)+2kw@+v5s#l+c4%#db*)bocmukvafc3)(ot+k0'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # --- THIRD PARTY APPS ---
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'cloudinary_storage',
    'cloudinary',
    
    # --- NUESTRAS APPS ---
    'core.apps.CoreConfig',
    'apps.finanzas',
    'apps.tramites',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database
# Por defecto dj_database_url buscará la variable 'DATABASE_URL' en el entorno.
# Si no existe, armamos una a partir de las otras variables, previniendo 'None' si no existen.
if os.getenv('DB_USER'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'postgres'),
            'USER': os.getenv('DB_USER', ''),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'CONN_MAX_AGE': 0,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'es-pe' # Cambiado a español de Perú

TIME_ZONE = 'America/Lima' # Cambiado a tu zona horaria

USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Donde Django buscará archivos estáticos adicionales (Ej. el build de React)
FRONTEND_DIR = os.path.join(BASE_DIR.parent, 'front-cip', 'dist')
STATICFILES_DIRS = [FRONTEND_DIR] if os.path.exists(FRONTEND_DIR) else []

# Directorio raíz para archivos estáticos no vinculados a STATIC_URL (Soluciona la pantalla en blanco)
WHITENOISE_ROOT = FRONTEND_DIR

# Habilitar compresión y caché estática en producción
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ==============================================================================
# CONFIGURACIÓN DE MEDIA (Archivos subidos por usuarios)
# ==============================================================================
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET', '')

if CLOUDINARY_CLOUD_NAME:
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
        'API_KEY': CLOUDINARY_API_KEY,
        'API_SECRET': CLOUDINARY_API_SECRET,
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'


# ==============================================================================
# CONFIGURACIÓN DE CORS (Cross-Origin Resource Sharing)
# ==============================================================================
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# Para desarrollo: permitir todos los orígenes
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

# ==============================================================================
# CONFIGURACIÓN DE DJANGO REST FRAMEWORK
# ==============================================================================
REST_FRAMEWORK = {
    # Autenticación por defecto: JWT
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.CustomJWTAuthentication',
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
from datetime import timedelta

SIMPLE_JWT = {
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

# ==============================================================================
# CONFIGURACIÓN DE CORREO ELECTRÓNICO - Gmail SMTP
# ==============================================================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_TIMEOUT = 10

# Remitente fijo — debe coincidir con EMAIL_HOST_USER para pasar las
# verificaciones SPF/DKIM de Gmail y evitar rechazos.
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'noreply@cip.org.pe')

# ==============================================================================
# MERCADOPAGO
# ==============================================================================
MP_PUBLIC_KEY   = os.getenv('MP_PUBLIC_KEY', '')
MP_ACCESS_TOKEN = os.getenv('MP_ACCESS_TOKEN', '')
SITE_URL        = os.getenv('SITE_URL', '')   # URL pública del sitio, ej: https://cip.tudominio.com

# ==============================================================================
# FLOW (Pasarela QR Yape / Plin y Chile/Peru)
# ==============================================================================
FLOW_API_KEY    = os.getenv('FLOW_API_KEY', '')
FLOW_SECRET_KEY = os.getenv('FLOW_SECRET_KEY', '')
FLOW_API_URL    = os.getenv('FLOW_API_URL', 'https://www.flow.cl/api')  # producción
FLOW_ENV        = os.getenv('FLOW_ENV', 'sandbox') # sandbox o live

# URL del Frontend (para enlaces de correos, etc)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://sistema-web-coleing.onrender.com' if not DEBUG else 'http://localhost:5173')
