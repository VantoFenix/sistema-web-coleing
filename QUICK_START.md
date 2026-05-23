# 🚀 GUÍA RÁPIDA DE INICIO - Backend CIP

## ⏱️ Tiempo estimado: 15 minutos

---

## 📌 PASO 1: Verificar Requisitos (2 min)

Asegúrate de tener instalado:

```bash
# Verificar Docker
docker --version
# Debe ser: Docker version 20.10+

# Verificar Docker Compose
docker compose version
# Debe ser: Docker Compose version 2.0+

# Verificar PowerShell (Windows)
# Usar PowerShell 5.1 o superior
```

---

## 🏗️ PASO 2: Preparar la Carpeta del Proyecto (1 min)

```bash
# Navega a la carpeta del proyecto
cd C:\Users\vanto\Documents\parcialagile\sistema-web-coleing

# Verifica la estructura
dir
# Debes ver: back-cip, front-cip, init-db, docker-compose.yml
```

---

## 🐳 PASO 3: Iniciar Docker Compose (5 min)

Ejecuta en **PowerShell como usuario normal** (no necesita Admin):

```bash
# Construye e inicia los contenedores
docker compose up --build

# Verás algo como:
# [+] Building 45.3s
# ...
# backend | Django starting development server at 0.0.0.0:8000
```

**¡NO cierres esta ventana! Déjala ejecutándose.**

---

## 🔧 PASO 4: Crear Migraciones (3 min)

Abre **otra ventana de PowerShell** en la misma carpeta:

```bash
# Crear migraciones para los modelos
docker compose exec backend python manage.py makemigrations

# Deberías ver:
# Migrations for 'tramites':
#   apps/tramites/migrations/0001_initial.py
# Migrations for 'finanzas':
#   apps/finanzas/migrations/0001_initial.py
```

---

## 💾 PASO 5: Aplicar Migraciones (2 min)

En la misma ventana:

```bash
# Aplicar las migraciones a la base de datos
docker compose exec backend python manage.py migrate

# Deberías ver:
# Running migrations:
#   Applying tramites.0001_initial... OK
#   Applying finanzas.0001_initial... OK
```

---

## 👤 PASO 6: Crear Superusuario (2 min)

En la misma ventana:

```bash
# Crear usuario administrador
docker compose exec backend python manage.py createsuperuser
```

Responde las preguntas:

```
Username: admin
Email address: admin@example.com
Password: admin123
Password (again): admin123
Superuser created successfully.
```

**Guarda estos credenciales, los necesitarás para acceder al admin.**

---

## 📊 PASO 7: Cargar Datos Iniciales (1 min)

En la misma ventana:

```bash
# Cargar catálogos (sedes, carreras, datos de prueba)
docker compose exec backend psql -U cip_user -d cip_db -f init-db/init.sql

# Deberías ver:
# CREATE TABLE
# INSERT 0 12
# INSERT 0 12
# etc...
```

---

## ✅ PASO 8: Verificar que Todo Funciona (2 min)

### Opción A: Usar el Panel Admin

En tu navegador, abre:
```
http://localhost:8000/admin/
```

**Login con:**
- Usuario: `admin`
- Contraseña: `admin123`

Deberías ver el panel administrativo con secciones para:
- Colegiados
- Cuotas
- Trámites de Inscripción
- Sedes
- Carreras

### Opción B: Usar cURL (Terminal)

Abre **una tercera ventana** de PowerShell:

```bash
# 1. Obtener token JWT
$response = curl -X POST http://localhost:8000/api/token/ `
  -H "Content-Type: application/json" `
  -d '{
    "username": "admin",
    "password": "admin123"
  }' | ConvertFrom-Json

# 2. Guardar el token (valido por 1 hora)
$token = $response.access

# 3. Hacer una petición autenticada
curl -X GET http://localhost:8000/api/finanzas/colegiados/ `
  -H "Authorization: Bearer $token"

# Deberías recibir un JSON con la lista de colegiados
```

---

## 🎯 Endpoints Principales

Una vez verificado, prueba estos endpoints:

### 1. Login (obtener token)
```bash
POST http://localhost:8000/api/token/
Body: {"username":"admin","password":"admin123"}
```

### 2. Listar Colegiados
```bash
GET http://localhost:8000/api/finanzas/colegiados/
Header: Authorization: Bearer TOKEN
```

### 3. Listar Trámites
```bash
GET http://localhost:8000/api/tramites/
Header: Authorization: Bearer TOKEN
```

### 4. Ver Deuda de un Colegiado
```bash
GET http://localhost:8000/api/finanzas/colegiados/2/deuda/
Header: Authorization: Bearer TOKEN
```

### 5. Ver Resumen Financiero
```bash
GET http://localhost:8000/api/finanzas/cuotas/reportes/resumen/
Header: Authorization: Bearer TOKEN
```

---

## 📚 Documentación Disponible

Una vez que el servidor esté corriendo, tienes acceso a:

| Documento | Contenido |
|-----------|----------|
| `SETUP_BACKEND.md` | Instalación detallada |
| `API_ENDPOINTS.md` | Referencia de todos los endpoints |
| `DOCKER_COMMANDS.md` | Comandos útiles de Docker |
| `SETTINGS_CHANGES.md` | Cambios realizados en settings.py |
| `TROUBLESHOOTING.md` | Solución de problemas comunes |
| `BACKEND_SUMMARY.md` | Resumen general del proyecto |

---

## 🛑 Detener el Proyecto

### Opción A: Detener sin eliminar datos
```bash
docker compose down
```

### Opción B: Detener y eliminar TODO (resetear)
```bash
docker compose down -v
```

### Opción C: Pausar y continuar después
```bash
docker compose pause
docker compose unpause
```

---

## 🔄 Reiniciar el Proyecto

Si necesitas reiniciar desde cero:

```bash
# 1. Detener y limpiar
docker compose down -v

# 2. Reconstruir e iniciar
docker compose up --build

# 3. Repetir PASOS 4-7 anteriores
```

---

## 💡 Tips Útiles

### Ver logs en tiempo real
```bash
docker compose logs -f backend
```

### Ejecutar comando en el contenedor
```bash
docker compose exec backend [COMANDO]
```

### Entrar en la shell de Django
```bash
docker compose exec backend python manage.py shell
```

### Entrar en PostgreSQL
```bash
docker compose exec db psql -U cip_user -d cip_db
```

### Crear un archivo .env para secretos
```bash
echo "DEBUG=False" > .env
echo "SECRET_KEY=tu-secret-key-aqui" >> .env
```

---

## ✨ ¡Listo!

El backend ahora está:
- ✅ Ejecutándose en `http://localhost:8000`
- ✅ Con autenticación JWT
- ✅ CORS habilitado para React (puerto 5173)
- ✅ Base de datos PostgreSQL funcionando
- ✅ Admin panel accesible
- ✅ API REST completamente funcional

---

## 📞 Si Algo Sale Mal

### El contenedor no inicia
```bash
docker compose logs backend
# Revisa el error en la salida
```

### No puedo conectar a la BD
```bash
docker compose ps
# Verifica que el contenedor 'db' esté running

docker compose restart db
```

### Error de autenticación
```bash
# Verifica que hayas creado el superusuario
docker compose exec backend python manage.py createsuperuser
```

### Puerto 8000 ya está en uso
```bash
# Cambiar el puerto en docker-compose.yml:
# ports:
#   - "8001:8000"

docker compose up
# Accede a http://localhost:8001
```

---

## 🎓 Próximos Pasos

1. **Conectar con el Frontend React**
   - Abrir el proyecto front-cip
   - Configurar la URL base de la API: `http://localhost:8000`
   - Asegurar que el puerto sea 5173

2. **Crear más datos de prueba**
   - Usar el admin panel
   - O hacer POST a los endpoints

3. **Implementar más funcionalidades**
   - Pagos
   - Reportes
   - Notificaciones

4. **Preparar para producción**
   - Revisar `TROUBLESHOOTING.md`
   - Configurar variables de entorno
   - Ejecutar tests

---

## 📋 Checklist Final

- [ ] Docker Compose instalado y funcionando
- [ ] Backend iniciado correctamente
- [ ] Migraciones aplicadas
- [ ] Superusuario creado
- [ ] Datos iniciales cargados
- [ ] Admin panel accesible
- [ ] Token JWT obtenido
- [ ] Endpoint de API respondiendo
- [ ] CORS habilitado para React

---

## 🚀 ¡A Codificar!

El backend está listo. Ahora puedes:
1. Conectar el frontend React
2. Implementar formularios de inscripción
3. Crear dashboard de gestión
4. Integrar pagos online

¡Buena suerte! 🎉

---

*Tiempo total: ~15 minutos*  
*Último actualizado: Mayo 2026*  
*Backend implementado por: Senior Backend Engineer*
