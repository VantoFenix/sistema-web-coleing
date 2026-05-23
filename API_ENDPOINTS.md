# 📡 API Endpoints Reference - CIP Backend

## 🔐 Authentication (JWT)

| Método | Endpoint | Descripción | Body |
|--------|----------|-------------|------|
| `POST` | `/api/token/` | Obtener tokens (login) | `{"username": "user", "password": "pass"}` |
| `POST` | `/api/token/refresh/` | Renovar access token | `{"refresh": "token_aqui"}` |

---

## 💰 Módulo Finanzas

### 📍 Sedes (Catálogo)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/finanzas/sedes/` | Listar todas las sedes |
| `POST` | `/api/finanzas/sedes/` | Crear nueva sede |
| `GET` | `/api/finanzas/sedes/{id}/` | Obtener sede específica |
| `PUT` | `/api/finanzas/sedes/{id}/` | Actualizar sede |
| `DELETE` | `/api/finanzas/sedes/{id}/` | Eliminar sede |

**Query Params:**
- `search=Lima` - Buscar por nombre
- `page=2` - Paginación
- `page_size=20` - Registros por página

---

### 🎓 Carreras (Catálogo)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/finanzas/carreras/` | Listar todas las carreras |
| `POST` | `/api/finanzas/carreras/` | Crear nueva carrera |
| `GET` | `/api/finanzas/carreras/{id}/` | Obtener carrera específica |
| `PUT` | `/api/finanzas/carreras/{id}/` | Actualizar carrera |
| `DELETE` | `/api/finanzas/carreras/{id}/` | Eliminar carrera |

---

### 👤 Colegiados (Padrón)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/finanzas/colegiados/` | Listar todos los colegiados |
| `POST` | `/api/finanzas/colegiados/` | Crear nuevo colegiado |
| `GET` | `/api/finanzas/colegiados/{id}/` | Obtener colegiado |
| `PUT` | `/api/finanzas/colegiados/{id}/` | Actualizar colegiado |
| `DELETE` | `/api/finanzas/colegiados/{id}/` | Eliminar colegiado |
| `GET` | `/api/finanzas/colegiados/{id}/deuda/` | Ver deuda total del colegiado |
| `GET` | `/api/finanzas/colegiados/habilitados/listar/` | Listar solo habilitados |
| `GET` | `/api/finanzas/colegiados/deshabilitados/listar/` | Listar solo deshabilitados |

**Query Params:**
- `search=Bruno` - Buscar por nombre, DNI, CIP, correo
- `ordering=nombre_completo` - Ordenar por campo

---

### 💳 Cuotas (Pagos Mensuales)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/finanzas/cuotas/` | Listar todas las cuotas |
| `POST` | `/api/finanzas/cuotas/` | Crear nueva cuota |
| `GET` | `/api/finanzas/cuotas/{id}/` | Obtener cuota |
| `PUT` | `/api/finanzas/cuotas/{id}/` | Actualizar cuota |
| `DELETE` | `/api/finanzas/cuotas/{id}/` | Eliminar cuota |
| `POST` | `/api/finanzas/cuotas/{id}/marcar_pagada/` | Marcar como pagada |
| `GET` | `/api/finanzas/cuotas/pendientes/listar/` | Listar cuotas pendientes |
| `GET` | `/api/finanzas/cuotas/pagadas/listar/` | Listar cuotas pagadas |
| `GET` | `/api/finanzas/cuotas/reportes/resumen/` | Resumen financiero |

**Body para crear cuota:**
```json
{
  "colegiado": 1,
  "mes_cobro": 5,
  "anio_cobro": 2026,
  "monto": 20.00
}
```

**Body para marcar pagada:**
```json
{
  "transaccion_id": "TRX123456"
}
```

---

## 📋 Módulo Trámites

### 📝 Trámites de Inscripción

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/tramites/` | Listar todos los trámites |
| `POST` | `/api/tramites/` | Crear nuevo trámite |
| `GET` | `/api/tramites/{id}/` | Obtener trámite específico |
| `PUT` | `/api/tramites/{id}/` | Actualizar trámite |
| `DELETE` | `/api/tramites/{id}/` | Eliminar trámite |
| `GET` | `/api/tramites/pendientes/listar/` | Trámites pendientes |
| `GET` | `/api/tramites/aprobados/listar/` | Trámites aprobados |
| `GET` | `/api/tramites/rechazados/listar/` | Trámites rechazados |
| `GET` | `/api/tramites/observados/listar/` | Trámites observados |
| `POST` | `/api/tramites/{id}/cambiar_estado/` | Cambiar estado del trámite |
| `GET` | `/api/tramites/reportes/resumen/` | Estadísticas de trámites |

**Body para crear trámite (con archivos):**
```json
{
  "dni": "12345678",
  "nombre_completo": "Juan Pérez García",
  "correo": "juan@email.com",
  "celular": "987654321",
  "carrera": 1,
  "sede": 12,
  "foto": "file",
  "titulo_pdf": "file",
  "voucher": "file"
}
```

O con URLs externas:
```json
{
  "dni": "12345678",
  "nombre_completo": "Juan Pérez García",
  "correo": "juan@email.com",
  "celular": "987654321",
  "carrera": 1,
  "sede": 12,
  "foto_url": "https://example.com/foto.jpg",
  "titulo_pdf_url": "https://example.com/titulo.pdf",
  "voucher_url": "https://example.com/voucher.pdf"
}
```

**Body para cambiar estado:**
```json
{
  "estado": "APROBADO",
  "observacion": "Documentación válida"
}
```

Estados permitidos: `PENDIENTE`, `OBSERVADO`, `APROBADO`, `RECHAZADO`

**Query Params:**
- `search=Juan` - Buscar por nombre, DNI, correo, carrera, sede
- `ordering=-fecha_solicitud` - Ordenar por fecha
- `page=1` - Paginación
- `page_size=10` - Registros por página

---

## 🔑 Headers Requeridos

Todos los endpoints requieren autenticación JWT (excepto login):

```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json
```

---

## 📊 Respuestas Ejemplo

### ✅ Éxito (200 OK)
```json
{
  "id": 1,
  "nombre": "Consejo Departamental Lima",
  ...
}
```

### ⚠️ Error (400 Bad Request)
```json
{
  "field_name": ["Error message"],
  "non_field_errors": ["General error"]
}
```

### 🔓 No Autorizado (401 Unauthorized)
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 🚫 Prohibido (403 Forbidden)
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### ❌ No Encontrado (404 Not Found)
```json
{
  "detail": "Not found."
}
```

---

## 🧪 Ejemplos de cURL

### 1️⃣ Obtener Token
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2️⃣ Listar Colegiados
```bash
curl -X GET 'http://localhost:8000/api/finanzas/colegiados/?search=Bruno' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 3️⃣ Crear Trámite
```bash
curl -X POST http://localhost:8000/api/tramites/ \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'dni=12345678' \
  -F 'nombre_completo=Juan Pérez' \
  -F 'correo=juan@email.com' \
  -F 'celular=987654321' \
  -F 'carrera=1' \
  -F 'sede=12' \
  -F 'foto=@/path/to/foto.jpg' \
  -F 'titulo_pdf=@/path/to/titulo.pdf' \
  -F 'voucher=@/path/to/voucher.pdf'
```

### 4️⃣ Cambiar Estado de Trámite
```bash
curl -X POST http://localhost:8000/api/tramites/1/cambiar_estado/ \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"estado":"APROBADO","observacion":"Documentación válida"}'
```

### 5️⃣ Ver Resumen Financiero
```bash
curl -X GET http://localhost:8000/api/finanzas/cuotas/reportes/resumen/ \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 📝 Notas Importantes

1. **Validaciones:**
   - DNI: exactamente 8 dígitos
   - CIP: exactamente 5 dígitos
   - Celular: exactamente 9 dígitos
   - Mes: entre 1 y 12
   - Año: entre 2000 y 5 años en el futuro

2. **Límites de Archivos:**
   - Fotos: máx 5 MB (JPG, PNG)
   - PDFs: máx 10 MB
   - Voucher: máx 10 MB (PDF, JPG, PNG)

3. **Paginación:**
   - Por defecto: 10 registros por página
   - Máximo: 100 registros por página

4. **Tokens:**
   - Access Token: válido por 1 hora
   - Refresh Token: válido por 7 días
   - Incluye el access token en el header `Authorization: Bearer TOKEN`

---

## 🔗 Links Útiles

- **Admin Panel:** http://localhost:8000/admin/
- **Browsable API:** http://localhost:8000/api/
- **OpenAPI Schema:** http://localhost:8000/api/schema/ (si está configurado)

---

*Última actualización: Mayo 2026*
