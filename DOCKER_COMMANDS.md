# 🐳 Comandos para Docker Compose - CIP Backend

## ✅ Instalación y Setup Inicial

### 1. Construir e iniciar contenedores
```bash
docker compose up --build
```

### 2. Crear migraciones (en otra terminal)
```bash
docker compose exec backend python manage.py makemigrations
```

### 3. Aplicar migraciones
```bash
docker compose exec backend python manage.py migrate
```

### 4. Crear superusuario (admin)
```bash
docker compose exec backend python manage.py createsuperuser
```

**Responde las preguntas:**
```
Username: admin
Email: admin@example.com
Password: tu_contraseña_segura
Password (again): tu_contraseña_segura
Superuser created successfully.
```

### 5. Cargar datos iniciales (catálogos)
```bash
docker compose exec backend psql -U ${DB_USER} -d ${DB_NAME} -f init-db/init.sql
```

O si prefieres especificar directamente:
```bash
docker compose exec backend psql -U cip_user -d cip_db -f init-db/init.sql
```

---

## 🚀 Operación Diaria

### Iniciar los contenedores
```bash
docker compose up
```

### Iniciar en background
```bash
docker compose up -d
```

### Ver logs del backend
```bash
docker compose logs -f backend
```

### Ver logs de la base de datos
```bash
docker compose logs -f db
```

### Detener contenedores
```bash
docker compose down
```

### Detener y eliminar volúmenes (resetear BD)
```bash
docker compose down -v
```

---

## 🔧 Tareas Comunes

### Crear nueva migración después de cambios en models.py
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

### Ejecutar tests
```bash
docker compose exec backend python manage.py test
```

### Entrar en la shell de Django
```bash
docker compose exec backend python manage.py shell
```

### Entrar en la BD PostgreSQL
```bash
docker compose exec db psql -U cip_user -d cip_db
```

Comandos útiles en PostgreSQL:
```sql
\dt                    -- Listar tablas
\d tramites_inscripcion -- Ver estructura de tabla
SELECT * FROM colegiados LIMIT 5;  -- Ver datos
\q                     -- Salir
```

### Crear backup de la base de datos
```bash
docker compose exec db pg_dump -U cip_user cip_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar base de datos desde backup
```bash
docker compose exec db psql -U cip_user cip_db < backup_20260522_120000.sql
```

### Limpiar migraciones no aplicadas
```bash
docker compose exec backend python manage.py migrate --fake-initial
```

---

## 🧪 Testing API con Docker

### Obtener token JWT
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "tu_contraseña"
  }'
```

### Probar endpoint de finanzas
```bash
curl -X GET http://localhost:8000/api/finanzas/colegiados/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Crear un trámite (sin archivos)
```bash
curl -X POST http://localhost:8000/api/tramites/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dni": "12345678",
    "nombre_completo": "Juan Pérez",
    "correo": "juan@example.com",
    "celular": "987654321",
    "carrera": 1,
    "sede": 12,
    "foto_url": "https://example.com/foto.jpg",
    "titulo_pdf_url": "https://example.com/titulo.pdf",
    "voucher_url": "https://example.com/voucher.pdf"
  }'
```

---

## 🐛 Troubleshooting

### El contenedor no inicia
```bash
# Ver los logs de error
docker compose logs backend

# Reconstruir la imagen
docker compose down
docker compose up --build

# Eliminar todo y empezar de cero
docker compose down -v
docker system prune -a
docker compose up --build
```

### Error de conexión a la BD
```bash
# Verificar que el contenedor de BD esté corriendo
docker compose ps

# Revisar logs de la BD
docker compose logs db

# Reiniciar la BD
docker compose restart db
```

### Migraciones fallidas
```bash
# Ver estado de las migraciones
docker compose exec backend python manage.py showmigrations

# Revertir migración
docker compose exec backend python manage.py migrate finanzas 0001

# Forzar migración
docker compose exec backend python manage.py migrate --fake
```

### Archivos media no se guardan
```bash
# Verificar permisos
docker compose exec backend ls -la /app/media/

# Asegurar permisos
docker compose exec backend chmod -R 755 /app/media/
```

---

## 📊 Acceder a Servicios

Cuando los contenedores están corriendo:

- **Admin Panel:** http://localhost:8000/admin/
- **API Root:** http://localhost:8000/api/
- **Base de datos (internamente):** `host=db, port=5432`
- **API Docs (si están configurados):** http://localhost:8000/api/docs/

---

## 🔄 Pipeline Completo de Desarrollo

```bash
# 1. Iniciar ambiente
docker compose up -d

# 2. Hacer cambios en models.py

# 3. Crear y aplicar migraciones
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# 4. Probar en la API
# Usar Postman, curl o ir a http://localhost:8000/api/

# 5. Ver logs si hay problemas
docker compose logs -f backend

# 6. Al terminar
docker compose down
```

---

## 📝 Variables de Entorno Importantes

Revisa que tu `.env` tenga:

```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=cip_db
DB_USER=cip_user
DB_PASSWORD=secure_password_here
DB_HOST=db
DB_PORT=5432
DEBUG=True
SECRET_KEY=django-insecure-ip*qg4%=ko-)+2kw@+v5s#l+c4%#db*)bocmukvafc3)(ot+k0
```

---

## 🎯 Checklist de Inicialización Completa

```
✓ docker compose up --build
✓ docker compose exec backend python manage.py makemigrations
✓ docker compose exec backend python manage.py migrate
✓ docker compose exec backend python manage.py createsuperuser
✓ docker compose exec backend psql -U cip_user -d cip_db -f init-db/init.sql
✓ Verificar admin: http://localhost:8000/admin/
✓ Obtener token: curl http://localhost:8000/api/token/
✓ Probar endpoints: curl http://localhost:8000/api/finanzas/colegiados/
```

¡Backend listo para desarrollo! 🚀
