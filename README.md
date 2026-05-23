# Sistema Web - Colegio de Ingenieros (CIP)

Plataforma integral para la gestión de colegiados, trámites de inscripción y motor financiero, desarrollada con arquitectura cliente-servidor.

## 🚀 Tecnologías Principales
- **Frontend:** React.js (Vite) + CSS.
- **Backend:** Python + Django REST Framework (DRF).
- **Base de Datos:** PostgreSQL en la nube (vía Supabase).
- **Despliegue Local:** Docker Compose.

---

## 🛠️ Cómo desplegar el Backend y el Frontend localmente

Dado que el proyecto utiliza contenedores y una base de datos en Supabase, levantar todo el entorno es sumamente sencillo.

### Prerrequisitos
1. **Docker Desktop** instalado y encendido.
2. Contar con el archivo `back-cip/.env` configurado con las credenciales del Pooler de Supabase.

### Pasos para iniciar el proyecto

Abre tu terminal en la carpeta principal del proyecto (donde está este archivo `README.md`) y ejecuta:

```bash
docker-compose up -d
```

Este único comando levantará dos servicios:
- **Backend (Django):** Estará disponible en `http://localhost:8001`
- **Frontend (React):** Estará disponible en `http://localhost:5173`

*(Nota: Ya no dependemos de un contenedor local de base de datos porque el backend se conecta automáticamente a Supabase en la nube usando tu archivo `.env`).*

### Operaciones Comunes (Comandos útiles)

**Ver los logs del backend o frontend en vivo:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Crear un superusuario de Django (Admin):**
```bash
docker-compose exec backend python manage.py createsuperuser
```

**Correr migraciones de Base de Datos:**
*(Normalmente se corren automáticamente al iniciar, pero si creas modelos nuevos, usa estos comandos)*
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

**Apagar el sistema:**
```bash
docker-compose down
```

---

## 🏗️ Estructura del Proyecto

```text
sistema-web-coleing/
├── front-cip/             # Código fuente de React (Vite)
├── back-cip/              # Código fuente de Django (API)
│   ├── apps/tramites/     # Módulo de Inscripciones
│   ├── apps/finanzas/     # Módulo de Cuotas y Pagos
│   └── core/              # Configuración principal
├── docker-compose.yml     # Orquestador de contenedores
└── README.md              # Este documento
```