

### 1. Estructura del Frontend (React)

Para un MVP ágil de 5 días, la mejor arquitectura es agrupar por **características (features)** o por **tipo de archivo**. Usaremos la estructura clásica por tipo de archivo, que es la más fácil de entender para todo el equipo. Les recomiendo usar **Vite** para crear el proyecto React, ya que es muchísimo más rápido que Create React App.

```text
front-cip/
├── public/                 # Favicon y assets estáticos públicos
├── src/
│   ├── assets/             # Imágenes estáticas (ej. logo_upao.png, logo_cip.png)
│   ├── components/         # Componentes reutilizables
│   │   ├── Carnet/         # Componente visual del carnet y marca de agua
│   │   ├── Layout/         # Navbar, Sidebar, Footer
│   │   └── UI/             # Botones, Inputs, Modales genéricos
│   ├── context/            # Estado global (RBAC)
│   │   └── AuthContext.jsx # Manejo del usuario logueado y su token
│   ├── pages/              # Las vistas completas del sistema
│   │   ├── Login.jsx       # Interfaz unificada (DNI/CIP)
│   │   ├── Registro.jsx    # Formulario para postulantes nuevos
│   │   ├── Tramite.jsx     # Formulario de carga de documentos
│   │   ├── DashboardAdmin.jsx # Bandeja de solicitudes
│   │   ├── MiCarnet.jsx    # Vista del colegiado
│   │   └── Pagos.jsx       # Integración con Culqi
│   ├── services/           # Lógica de comunicación con el Backend
│   │   ├── api.js          # Configuración de Axios e interceptores
│   │   ├── authService.js  # Peticiones de login/registro
│   │   └── tramiteService.js # Peticiones para subir PDFs y fotos
│   ├── utils/              # Funciones de ayuda
│   │   └── formatters.js   # Formatear moneda (S/ 20.00), fechas, etc.
│   ├── App.jsx             # Enrutador principal (React Router)
│   └── main.jsx            # Punto de entrada de React
├── .env                    # Variables de entorno (URLs del backend, Keys de Culqi)
├── package.json
└── vite.config.js

```

### 2. Estructura del Backend (Django REST Framework)

En Django, la regla de oro es dividir el sistema en "Aplicaciones" (`apps`) que hagan una sola cosa bien. Basado en tus Módulos, esta es la división perfecta para que tus programadores backend se dividan el trabajo hoy mismo:

```text
back-cip/
├── manage.py
├── core/                   # Configuración principal del proyecto
│   ├── settings.py         # Configuración de BD, JWT, AWS S3
│   ├── urls.py             # Enrutador principal
│   └── wsgi.py
├── apps/                   # Carpeta contenedora de las aplicaciones
│   ├── usuarios/           # Módulo 1: Autenticación y Accesos
│   │   ├── models.py       # Tabla 'usuarios'
│   │   ├── views.py        # Login (DNI/CIP), Registro
│   │   ├── serializers.py  # Transformación de datos
│   │   └── urls.py
│   ├── tramites/           # Módulo 2 y 3: Inscripción y Administración
│   │   ├── models.py       # Tabla 'inscripciones' y 'colegiados'
│   │   ├── views.py        # Validación Mock RENIEC, Subida S3, Aprobar/Rechazar
│   │   ├── serializers.py
│   │   └── urls.py
│   └── finanzas/           # Módulo 4 y 5: Motor de Pagos
│       ├── models.py       # Tabla 'cuotas'
│       ├── views.py        # Generador de deuda mensual, Webhook Culqi
│       ├── serializers.py
│       └── urls.py
├── utils/                  # Utilidades compartidas
│   ├── mock_reniec.py      # Tu Mock API simulada (Diccionario de DNIs)
│   └── s3_storage.py       # Lógica para subir PDFs y fotos a AWS
├── requirements.txt        # Dependencias de Python
└── .env                    # Credenciales de BD y AWS (¡No subir a GitHub!)

```

--- 

### 3. Stack Tecnológico (Para copiar a tu `README.md`)

Esta redacción le dará un peso profesional enorme a su repositorio en GitHub:

```markdown
## 🛠️ Stack Tecnológico

Este Producto Mínimo Viable (MVP) ha sido desarrollado utilizando una arquitectura cliente-servidor, priorizando la escalabilidad, el rendimiento y la seguridad en la nube.

### Frontend (Cliente)
* **Librería Core:** React.js (v18)                             
* **Build Tool:** Vite (Optimización de tiempos de compilación)
* **Estilos:** TailwindCSS (Para un diseño responsivo ágil y renderizado dinámico del Carnet)
* **Enrutamiento:** React Router Dom v6 (Manejo de rutas protegidas por roles)
* **Peticiones HTTP:** Axios (Con interceptores para inyección de tokens)

### Backend (Servidor)
* **Framework Core:** Python 3 + Django (v5)
* **API Framework:** Django REST Framework (DRF)
* **Autenticación:** JSON Web Tokens (SimpleJWT) para Control de Acceso Basado en Roles (RBAC)
* **Base de Datos:** PostgreSQL (Bases de datos relacionales con cumplimiento ACID)
* **Almacenamiento de Objetos:** AWS S3 (Gestión segura de expedientes PDF e imágenes)

### Integraciones y Servicios Externos
* **Validación de Identidad:** Servicio Simulado (Mock API) basado en latencias reales para garantizar la continuidad de pruebas.


### Descripción Completa del MVP y su Flujo
* **Ahora juntemos todo: el DNI, la sede, el dinero y el carnet.

**Acto 1: La Llegada y el Trámite**
Un ingeniero entra a la plataforma. No hay pantallas de registro. Pone sus 8 dígitos del DNI en la página principal. El sistema verifica rápidamente y le avisa que no está colegiado. Le ofrece un botón para iniciar el trámite.
En el formulario web, el ingeniero selecciona que pertenece al **Consejo Departamental de La Libertad**, sube su foto, el PDF de su título y la foto de su voucher de S/ 1500 de inscripción. Al enviar, el sistema se conecta a un servicio externo y en **menos de 2 segundos** verifica que su DNI y nombre coincidan. Queda en estado "Pendiente".

**Acto 2: La Aprobación y el Nacimiento del CIP**
El administrador del colegio entra a su enlace privado (solo él usa contraseña). Abre la bandeja, revisa los archivos y hace clic en "Aprobar".
En ese instante, el sistema ve que es de "La Libertad" y le genera el siguiente número disponible: **CIP 00045**. El motor financiero se activa y le marca el mes actual con costo S/ 0.00.

**Acto 3: El Cobro y la Sanción Visual**
Pasan dos meses. El motor automático ya le generó dos deudas de S/ 20.00.
El ingeniero necesita su carnet para un trabajo. Entra a la web, pone su DNI y entra directo a su panel. El sistema tarda menos de 500 milisegundos en notar que debe dinero.
En la pantalla, se dibuja su carnet digital hermoso con su foto, su CIP 00045 y la sede de La Libertad, pero está manchado con una enorme franja roja de **"INHABILITADO"**.

**Acto 4: El Pago y la Liberación**
El ingeniero va a la sección de pagos. Ve que debe S/ 40.00 y no puede pagar solo la mitad. Usa su tarjeta mediante el formulario de Culqi.
Culqi procesa el cobro y manda la señal de éxito. La deuda se borra. El ingeniero vuelve a mirar su carnet y la franja de "INHABILITADO" ya no está. Descarga su carnet limpio o lo muestra desde su celular. Todo en tiempo real.
