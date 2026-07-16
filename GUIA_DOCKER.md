# 🐳 GUÍA DE INTEGRACIÓN CON DOCKER

## 🚀 Inicio Rápido (3 pasos)

### Paso 1: Reconstruir imagen del backend
```bash
docker-compose build backend
```
Esto instalará las nuevas librerías (reportlab, PyPDF2) en el contenedor.

### Paso 2: Iniciar los servicios
```bash
docker-compose up
```
Esto automáticamente ejecutará las migraciones en el comando de inicio.

### Paso 3: Validar que funcionó
```bash
# En otra terminal, verifica que el backend esté corriendo
docker-compose ps

# Deberías ver:
# cip_backend    running   port 8001:8000
# cip_frontend   running   port 5173:5173
```

---

## 📋 Comandos Útiles Docker

### Ver logs del backend
```bash
docker-compose logs backend
```

### Ver logs de todo
```bash
docker-compose logs
```

### Ejecutar migración manualmente (si falla automáticamente)
```bash
docker-compose exec backend python manage.py migrate
```

### Crear migraciones
```bash
docker-compose exec backend python manage.py makemigrations finanzas
```

### Acceder a la shell de Django en el contenedor
```bash
docker-compose exec backend python manage.py shell
```

### Reiniciar solo el backend
```bash
docker-compose restart backend
```

### Detener todo
```bash
docker-compose down
```

### Detener y eliminar volúmenes (⚠️ Perderá datos)
```bash
docker-compose down -v
```

---

## ✅ Verificación de Instalación

### 1. Verificar que reportlab esté instalado
```bash
docker-compose exec backend pip list | grep reportlab
```

Deberías ver:
```
reportlab   4.0.X
```

### 2. Probar endpoint de comprobantes
```bash
# Listar comprobantes
curl http://localhost:8001/api/finanzas/comprobantes/

# Debería retornar algo como:
# {"count":0,"next":null,"previous":null,"results":[]}
```

### 3. Probar generación de PDF (si hay comprobante con id=1)
```bash
curl http://localhost:8001/api/finanzas/comprobantes/1/descargar_pdf/ \
  -H "Accept: application/pdf" \
  --output test_comprobante.pdf

# Debería descargar un archivo PDF
```

---

## 🔄 Flujo Completo con Docker

### 1️⃣ Primero: Rebuild y start
```bash
# Reconstruir backend con nuevas dependencias
docker-compose build backend

# Iniciar servicios
docker-compose up
```

### 2️⃣ Esperar a que Django arranque
```
Verás en los logs:
✓ System check identified no issues (0 silenced).
✓ Starting development server at http://0.0.0.0:8000/
✓ Quit the server with CONTROL-C to stop it.
```

### 3️⃣ El backend automáticamente:
- Ejecuta `python manage.py migrate` (crea tabla Comprobante)
- Inicia en puerto 8001
- El frontend se conecta en puerto 5173

### 4️⃣ Verifica que todo está corriendo
```bash
docker-compose ps
```

Salida esperada:
```
CONTAINER ID   IMAGE              COMMAND                  STATUS         PORTS
...            cip_backend        "python manage.py ..."   Up (healthy)   0.0.0.0:8001->8000/tcp
...            cip_frontend       "npm run dev ..."        Up (healthy)   0.0.0.0:5173->5173/tcp
```

---

## 🧪 Testing API con Docker

### Test 1: Crear un comprobante (simulado)
```bash
# Desde tu máquina local
curl -X POST http://localhost:8001/api/finanzas/comprobantes/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "colegiado": 1,
    "monto": "50.00",
    "canal": "PRESENCIAL",
    "metodo_pago": "EFECTIVO"
  }'
```

### Test 2: Listar comprobantes
```bash
curl http://localhost:8001/api/finanzas/comprobantes/
```

### Test 3: Descargar PDF
```bash
curl http://localhost:8001/api/finanzas/comprobantes/1/descargar_pdf/ \
  --output comprobante_descargado.pdf

# Si obtuviste el PDF, ¡funcionó! 🎉
ls -lh comprobante_descargado.pdf
```

---

## 🐛 Solución de Problemas con Docker

### ❌ Error: "port 8001 already in use"
```bash
# Solución 1: Cambiar puerto en docker-compose.yml
# Cambiar "8001:8000" por "8002:8000"

# Solución 2: Liberar puerto
docker-compose down
# Esperar 10 segundos
docker-compose up
```

### ❌ Error: "ModuleNotFoundError: No module named 'reportlab'"
```bash
# El build anterior no incluyó las dependencias
# Reconstruir desde cero
docker-compose down
docker-compose build --no-cache backend
docker-compose up
```

### ❌ Error: "Database migration failed"
```bash
# Ver qué pasó
docker-compose logs backend

# Ejecutar migración manualmente
docker-compose exec backend python manage.py migrate

# Ver estado de migraciones
docker-compose exec backend python manage.py showmigrations
```

### ❌ Error: "Cannot connect to backend from frontend"
```bash
# Verificar que backend está corriendo
docker-compose ps

# Ver logs del backend
docker-compose logs backend | tail -20

# Restart
docker-compose restart
```

---

## 📊 Verificar BD desde dentro de Docker

### Acceder a PostgreSQL (si usas)
```bash
# Entrar en contenedor
docker-compose exec backend bash

# Dentro del contenedor
python manage.py dbshell

# Dentro de la BD
SELECT * FROM finanzas_comprobante;
```

### Ver todas las tablas
```bash
docker-compose exec backend python manage.py dbshell
\dt  -- Listar tablas (PostgreSQL)
```

---

## 🔧 Modificar y Recargar Código

### El frontend recarga automáticamente (Vite hot-reload)
```bash
# Editas un archivo en front-cip/
# Se recarga automáticamente en http://localhost:5173
```

### El backend recarga automáticamente (Django watch)
```bash
# Editas un archivo en back-cip/
# Django detecta cambios y recarga
```

### Si no recarga automáticamente
```bash
docker-compose restart backend
```

---

## 🚀 Desplegar a Producción con Docker

### Build para producción
```bash
# Usar el script de build
./build.sh

# O manualmente:
docker-compose build --no-cache

# Esto ejecuta:
# - npm install + npm run build (frontend)
# - pip install -r requirements.txt (backend)
# - collectstatic (archivos estáticos)
```

### Ejecutar en modo producción
```bash
# En docker-compose.yml cambiar:
# command: "gunicorn core.wsgi:application --bind 0.0.0.0:8000"

# Luego:
docker-compose -f docker-compose.prod.yml up
```

---

## 📝 Checklist Rápido

- [ ] Ejecuté `docker-compose build backend`
- [ ] Ejecuté `docker-compose up`
- [ ] Veo "migrations applied" en los logs
- [ ] `curl http://localhost:8001/api/finanzas/comprobantes/` retorna JSON
- [ ] Frontend carga en http://localhost:5173
- [ ] Ambos contenedores en estado "Up"

---

## 💡 Tips Pro

### Tip 1: Ver tamaño de la imagen
```bash
docker images | grep cip
```

### Tip 2: Limpiar imágenes viejas
```bash
docker-compose down
docker system prune -a
docker-compose build
```

### Tip 3: Ambiente local vs Docker
```bash
# Local (sin Docker):
pip install -r requirements.txt
python manage.py migrate

# Docker:
docker-compose build backend
docker-compose up
# ¡Se hace automáticamente!
```

### Tip 4: Persistencia de volúmenes
```bash
# Los datos en ./back-cip y ./front-cip persisten
# Si eliminas el contenedor, los datos no se pierden
docker-compose down
docker-compose up
# Todo sigue igual
```

---

## 📋 Resumen Final

```
Tu flujo con Docker es:

1. docker-compose build backend      ← Instala dependencias
2. docker-compose up                  ← Inicia servicios
3. ✓ Backend en puerto 8001
4. ✓ Frontend en puerto 5173
5. ✓ Migraciones automáticas
6. ✓ Frontend hot-reload
7. ✓ Backend auto-reload

Todo listo para integración frontend 🎉
```

---

¿Tienes problemas específicos con Docker? Avísame y te ayudo.
