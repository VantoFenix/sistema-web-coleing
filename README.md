Aquí tienes la estructura de carpetas y el README actualizados a la perfección. He aplicado la "cirugía" necesaria para eliminar cualquier rastro de pasarelas reales (Culqi), he borrado el sistema de registro/contraseñas para ingenieros, y he integrado la tabla de Sedes y el "Mago de Oz".

Esta es la versión definitiva que tu equipo debe usar para armar el cascarón del proyecto hoy mismo.

---

### 1. Estructura del Frontend (React + Vite)

Hemos limpiado las vistas. Ahora hay una clara separación entre la ruta pública del DNI y la ruta secreta del Administrador. Además, reemplazamos la pasarela por nuestro modal simulado.

```text
front-cip/
├── public/                 # Favicon y assets estáticos
├── src/
│   ├── assets/             # Imágenes estáticas (ej. logo_upao.png)
│   ├── components/         # Componentes reutilizables
│   │   ├── Carnet/         # Componente visual del carnet (HTML/CSS) y franja roja
│   │   ├── MagoDeOz/       # Componente del Modal de Pago Simulado (Fricción de 2s)
│   │   ├── Layout/         # Navbar, Footer
│   │   └── UI/             # Botones, Inputs genéricos
│   ├── context/            # Estado global
│   │   └── AuthContext.jsx # Manejo exclusivo del token del Administrador
│   ├── pages/              # Las vistas completas del sistema
│   │   ├── HomeDNI.jsx     # (Acceso) Input único de 8 dígitos para postulantes/colegiados
│   │   ├── LoginAdmin.jsx  # (Oculto) Login clásico solo para el staff del CIP
│   │   ├── Inscripcion.jsx # Formulario (Sedes, Carrera, Carga de PDF/Fotos)
│   │   ├── PanelAdmin.jsx  # Bandeja de solicitudes pendientes y auditoría
│   │   └── PortalCIP.jsx   # Vista del colegiado (Muestra el Carnet y la Deuda)
│   ├── services/           # Lógica de comunicación con el Backend (Axios)
│   │   ├── api.js          # Configuración base
│   │   ├── publicService.js# Rutas basadas en DNI (Buscar trámite, buscar deuda)
│   │   ├── adminService.js # Rutas protegidas por Token (Aprobar/Rechazar)
│   │   └── pagoService.js  # Petición silenciosa de liquidación de deuda
│   ├── utils/              # Funciones de ayuda (formateo de moneda a S/, fechas)
│   ├── App.jsx             # Enrutador principal (React Router)
│   └── main.jsx            # Punto de entrada
├── .env                    # Variables de entorno (URL del backend local/nube)
├── package.json
└── vite.config.js

```

### 2. Estructura del Backend (Django REST Framework)

Al usar el administrador nativo de Django, **eliminamos la carpeta (app) de `usuarios**`. Todo el sistema se reduce a dos grandes cerebros: `tramites` y `finanzas`.

```text
back-cip/
├── manage.py
├── core/                   # Configuración principal del proyecto
│   ├── settings.py         # Configuración de Postgres, JWT y AWS S3
│   ├── urls.py             # Enrutador principal
│   └── wsgi.py
├── apps/                   # Carpeta contenedora de las aplicaciones
│   ├── tramites/           # Módulo de Inscripción y Padrón
│   │   ├── models.py       # Tablas: Sede, TramiteInscripcion, Colegiado
│   │   ├── views.py        # Mock apis.net.pe, Subida S3, Dictamen de Admin
│   │   ├── serializers.py  # Transformación de datos JSON
│   │   └── urls.py
│   └── finanzas/           # Módulo del Motor de Pagos
│       ├── models.py       # Tabla: Cuota
│       ├── views.py        # Generador de deuda (S/ 20.00) y Endpoint Simulador de Pago
│       ├── serializers.py
│       └── urls.py
├── utils/                  # Utilidades compartidas
│   ├── validator.py        # Conexión simulada para validar DNI
│   └── s3_storage.py       # Lógica para inyectar PDFs y fotos al Bucket AWS
├── requirements.txt        # Dependencias de Python (Django, psycopg2, boto3, etc.)
└── .env                    # Credenciales de Postgres y AWS (¡No subir a GitHub!)

```

### 3. Redacción para el README.md (Stack Tecnológico)

Copia este bloque en tu repositorio de GitHub o en tu informe para el profesor. La redacción refleja el nivel técnico del MVP:

```markdown
## 🛠️ Stack Tecnológico y Arquitectura

Este Producto Mínimo Viable (MVP) ha sido desarrollado bajo una arquitectura cliente-servidor orientada a servicios, priorizando la latencia, la integridad de los datos financieros y la seguridad de la infraestructura.

### Frontend (Cliente)
* **Librería Core:** React.js (v18)
* **Build Tool:** Vite (Optimización extrema de tiempos de compilación)
* **Estilos:** TailwindCSS (Diseño responsivo ágil y renderizado condicional de credenciales)
* **Enrutamiento:** React Router Dom v6 (Manejo de rutas dinámicas por DNI y rutas ocultas protegidas)
* **Peticiones HTTP:** Axios (Con interceptores para inyección de tokens administrativos)
* **Emulación Transaccional:** Implementación del patrón UI "Mago de Oz" para simulación de pasarela de pagos de alta fidelidad sin exposición de datos sensibles.

### Backend (Servidor)
* **Framework Core:** Python 3 + Django (v5)
* **API Framework:** Django REST Framework (DRF)
* **Autenticación:** JSON Web Tokens (SimpleJWT) aplicado bajo un modelo RBAC exclusivamente para el personal administrativo.
* **Base de Datos:** PostgreSQL (Cumplimiento estricto de propiedades ACID para transacciones financieras y validación de llaves compuestas).
* **Almacenamiento de Objetos:** AWS S3 (Gestión centralizada y segura de expedientes PDF e imágenes, sin exposición de URLs públicas directas).

### Integraciones y Servicios Externos
* **Validación de Identidad:** Servicio Simulado (Mock API) basado en latencias reales (apis.net.pe) para asegurar la continuidad del entorno de desarrollo.
* **Procesamiento de Pagos:** Rutas internas de liquidación directa automatizada (Mock Endpoint), garantizando la limpieza de deuda en tiempo real sin dependencias de terceros.

```