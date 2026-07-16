# Guía de Integración de Comprobantes de Pago

## Resumen de Cambios

Se ha implementado un sistema completo de comprobantes de pago con los siguientes componentes:

### Backend (Django/Python)

1. **Modelo `Comprobante`** (`back-cip/apps/finanzas/models.py`)
   - Registra cada comprobante emitido con: número único, monto, fecha/hora, método, estado
   - Relacionado con `Colegiado` y `Cuota`
   - Campos para tracking de descargas y observaciones

2. **Serializers** (`back-cip/apps/finanzas/serializers.py`)
   - `ComprobanteSerializer`: Detalle completo del comprobante
   - `ComprobanteListSerializer`: Listado resumido
   - `ComprobanteDetailSerializer`: Información completa con relaciones

3. **Servicios** (`back-cip/apps/finanzas/services.py`)
   - `generar_numero_comprobante()`: Genera número único (CMP-YYYYMMDDHHMMSS-XXXX)
   - `crear_comprobante()`: Crea instancia de Comprobante en BD
   - `generar_pdf_comprobante()`: Genera PDF profesional con ReportLab

4. **ViewSet API** (`back-cip/apps/finanzas/views.py`)
   - `ComprobanteViewSet`: CRUD de comprobantes
   - Endpoint: `GET /api/finanzas/comprobantes/{id}/descargar_pdf/` → Descarga PDF
   - Endpoint: `GET /api/finanzas/comprobantes/historial/?colegiado_id={id}` → Historial

5. **URLs** (`back-cip/apps/finanzas/urls.py`)
   - Registra automáticamente todas las rutas

### Frontend (React)

1. **Componente `ComprobanteModal`** (`front-cip/src/components/UI/ComprobanteModal.jsx`)
   - Modal reutilizable para mostrar datos del comprobante
   - Botón de descarga que consume el endpoint de PDF
   - Manejo de estados: cargando, error, éxito

## Pasos de Integración

### 1. Crear Migración de Base de Datos

```bash
cd back-cip
python manage.py makemigrations finanzas
python manage.py migrate
```

### 2. Instalar Dependencias

```bash
# En el backend
pip install -r requirements.txt
# Las nuevas librerías son:
# - reportlab>=4.0.0 (generar PDF)
# - PyPDF2>=3.0.0 (opcional, para procesamiento adicional)
```

### 3. Integración en AdminPagoPresencial (Pago Presencial)

**Ubicación**: `front-cip/src/pages/admin/AdminPagoPresencial.jsx`

**Cambios necesarios**:

```jsx
// 1. Importar el componente
import ComprobanteModal from '../../components/UI/ComprobanteModal';

// 2. Agregar estado para el comprobante
const [comprobanteParaMostrar, setComprobanteParaMostrar] = useState(null);

// 3. En la sección de resultado exitoso, después de mostrar el success:
// Dentro de la condición: if (resultado?.ok) { ... }

// Modificar la respuesta que recibe del backend para incluir el comprobante
// El backend debe retornar el objeto comprobante con id

// 4. Agregar botón de descarga en la UI de éxito
<button 
  onClick={() => setComprobanteParaMostrar(resultado.comprobante)}
  className="btn btn-primary"
  style={{ flex: 1 }}
>
  📥 Descargar Comprobante
</button>

// 5. Agregar el modal al final del componente (antes del return)
{comprobanteParaMostrar && (
  <ComprobanteModal
    comprobante={comprobanteParaMostrar}
    colegiado={colegiado}
    onClose={() => setComprobanteParaMostrar(null)}
    onDescargar={() => {
      // Opcional: ejecutar algo después de descargar
      console.log('Comprobante descargado');
    }}
  />
)}
```

### 4. Integración en MisPagos (Portal Colegiado)

**Ubicación**: `front-cip/src/pages/portal/MisPagos.jsx`

**Cambios necesarios**:

Después del pago exitoso (ya sea con Mercado Pago o transferencia), mostrar el comprobante:

```jsx
// 1. Importar
import ComprobanteModal from '../../components/UI/ComprobanteModal';

// 2. Agregar estado
const [comprobanteParaMostrar, setComprobanteParaMostrar] = useState(null);

// 3. En el manejo de pago exitoso:
// Cuando el backend confirme el pago, mostrar el modal
const handlePagoExitoso = (datosComprobante) => {
  setComprobanteParaMostrar(datosComprobante);
};

// 4. Agregar el modal
{comprobanteParaMostrar && (
  <ComprobanteModal
    comprobante={comprobanteParaMostrar}
    colegiado={datosDelUsuario}
    onClose={() => setComprobanteParaMostrar(null)}
  />
)}
```

### 5. Modificar Endpoints del Backend

Los endpoints de pago deben retornar el comprobante creado.

**Ejemplo para pago presencial** (`back-cip`):

```python
# En el endpoint que maneja el pago presencial (/api/admin/pagos/presencial/)
from .services import crear_comprobante
from .serializers import ComprobanteSerializer

# Después de marcar cuotas como pagadas:
comprobante = crear_comprobante(
    colegiado=colegiado,
    monto=monto,
    canal='PRESENCIAL',
    metodo_pago=metodo,
    cuota=cuota  # Si es una sola cuota
)

# Retornar en la respuesta
return Response({
    'ok': True,
    'comprobante': ComprobanteSerializer(comprobante).data,
    # ... otros datos
})
```

## Estructura de Datos

### Objeto Comprobante (JSON)
```json
{
  "id": 1,
  "numero_comprobante": "CMP-20250525173015-1234",
  "colegiado": 5,
  "colegiado_cip": "12345",
  "colegiado_nombre": "Juan Pérez García",
  "monto": "50.00",
  "fecha_hora_pago": "2025-05-25T17:30:15.123456Z",
  "fecha_hora_pago_formateada": "25/05/2025 17:30:15",
  "canal": "PRESENCIAL",
  "metodo_pago": "EFECTIVO",
  "estado": "GENERADO",
  "transaccion_id": null,
  "observaciones": null
}
```

## Flujo Completo

### Pago Presencial (Admin)
1. Admin busca colegiado
2. Selecciona periodos
3. Selecciona método de pago
4. Ingresa monto
5. Hace clic en "Registrar pago"
6. Backend:
   - Marca cuotas como pagadas
   - Crea comprobante
   - Retorna datos del comprobante
7. Frontend:
   - Muestra modal de éxito
   - Usuario ve botón "Descargar Comprobante"
   - Al hacer clic, se descarga PDF

### Pago Online (Portal)
1. Colegiado selecciona periodos
2. Elige método de pago (Tarjeta/Transferencia)
3. Si es Tarjeta: paga con Mercado Pago
4. Si es Transferencia: sube comprobante, espera aprobación
5. Cuando se confirma el pago:
   - Backend crea comprobante
   - Frontend muestra modal con opción de descargar

## Endpoints API Disponibles

### Listar Comprobantes
```
GET /api/finanzas/comprobantes/
GET /api/finanzas/comprobantes/?page=1&page_size=20
```

### Obtener Detalle
```
GET /api/finanzas/comprobantes/{id}/
```

### Descargar PDF
```
GET /api/finanzas/comprobantes/{id}/descargar_pdf/
```
Retorna archivo PDF descargable

### Historial de un Colegiado
```
GET /api/finanzas/comprobantes/historial/?colegiado_id={id}
```

## Personalización del PDF

El PDF se genera en `back-cip/apps/finanzas/services.py` - función `generar_pdf_comprobante()`.

Puedes personalizar:
- Colores (usa HexColor)
- Fuentes
- Tamaño de página (letter/A4)
- Márgenes
- Contenido adicional (logos, etc.)

## Notas Importantes

1. **Migración**: Ejecutar `migrate` después de los cambios en modelos
2. **Permisos**: Verificar que usuarios admin puedan acceder a los endpoints
3. **Almacenamiento**: Los comprobantes se generan dinámicamente (no se guardan archivos)
4. **Transaccionalidad**: Usar `transaction.atomic()` si actualizar múltiples cuotas
5. **Auditoría**: Todos los comprobantes quedan registrados en la BD para auditoría

## Testing

Para probar localmente:

```bash
# Backend
curl http://localhost:8000/api/finanzas/comprobantes/
curl http://localhost:8000/api/finanzas/comprobantes/1/descargar_pdf/

# Frontend (en browser console)
fetch('/api/finanzas/comprobantes/1/descargar_pdf/')
  .then(r => r.blob())
  .then(b => {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test.pdf';
    a.click();
  });
```

## Soporte

Si hay errores:

1. Verificar que el modelo esté registrado en admin
2. Revisar logs del servidor: `python manage.py runserver`
3. Verificar que reportlab esté instalado: `pip list | grep reportlab`
4. Revisar console del navegador para errores JS
5. Verificar que los IDs de comprobante existan en la BD
