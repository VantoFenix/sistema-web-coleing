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

1. **Frontend en Modo Desarrollo (React + Vite)**
   - Abre una nueva terminal en tu editor de código.
   - Accede a la carpeta de React: `cd front-cip`
   - Instala librerías (si no lo hiciste): `npm install`
   - Levanta el servidor: `npm run dev`
   - El sistema estará disponible en tu navegador en `http://localhost:5173`.

2. **Backend en Modo Producción (Docker)**
   - `docker-compose up -d --build`

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

---

## 🏛️ Arquitectura del Backend (Service Layer Pattern)

El backend en Django sigue estrictamente el patrón de **Capa de Servicios** y **Selectores** para lograr un *Vertical Slicing* limpio. Esta arquitectura evita el anti-patrón de "Vistas Gordas" (*Fat Views*). 

Si exploras dentro de una App (ej. `apps/finanzas/`), encontrarás estos 5 archivos clave:

1. **`models.py`**: Define la estructura de las tablas en la base de datos (PostgreSQL/Supabase). No debe contener lógica de negocio compleja, solo definición de datos.
2. **`services.py`**: **Capa de Escritura.** Contiene la lógica de negocio que *modifica, crea o elimina* datos (Mutaciones). Ejemplo: `marcar_cuota_como_pagada()`. Si necesitas hacer un INSERT o UPDATE complejo, el código va aquí.
3. **`selectors.py`**: **Capa de Lectura.** Contiene las consultas (*queries*) complejas a la base de datos. Ejemplo: `calcular_deuda_total()`. Cualquier `Sum`, `Count` o `filter` complejo debe vivir aquí para poder reutilizarlo.
4. **`serializers.py`**: Define cómo transformar los objetos de la base de datos a formato JSON (para enviarlo a React) y viceversa.
5. **`views.py`**: **Capa de Entrega HTTP.** Su única responsabilidad es recibir la petición de internet, llamar a la función correspondiente de `services.py` o `selectors.py`, y devolver la respuesta JSON al cliente. **No debe tener lógica de negocio directa.**