// ═══════════════════════════════════════════════════════════════════════════
// FRAGMENTOS DE CÓDIGO PARA INTEGRACIÓN EN MisPagos.jsx
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// 1. AGREGAR ESTAS IMPORTACIONES AL INICIO DEL ARCHIVO
// ─────────────────────────────────────────────────────────────────────────

import ComprobanteModal from '../../components/UI/ComprobanteModal';

// ─────────────────────────────────────────────────────────────────────────
// 2. AGREGAR ESTOS ESTADOS EN LA SECCIÓN DE useState
// ─────────────────────────────────────────────────────────────────────────

const [comprobanteParaMostrar, setComprobanteParaMostrar] = useState(null);

// ─────────────────────────────────────────────────────────────────────────
// 3. CASO 1: PAGO CON TARJETA (Mercado Pago)
// ─────────────────────────────────────────────────────────────────────────

// Después de que Mercado Pago confirme el pago exitoso,
// el servidor debe crear el comprobante y retornarlo.

// En la función que maneja el callback de pago exitoso:

const handlePagoTarjetaExitoso = async (paymentData) => {
  try {
    // Enviar al backend para confirmar pago
    const response = await fetch('/api/portal/pagos/confirmar/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_id: paymentData.id,
        periodos: [...seleccionados].sort(),
        monto: total.toFixed(2),
      }),
    });

    const datos = await response.json();

    if (response.ok) {
      // El backend debe retornar el comprobante
      if (datos.comprobante) {
        setComprobanteParaMostrar(datos.comprobante);
      } else {
        // Mostrar éxito pero sin comprobante (versión anterior)
        setPagoExitoso(true);
      }
    }
  } catch (error) {
    console.error('Error al confirmar pago:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// 4. CASO 2: PAGO POR TRANSFERENCIA/PLIN (Subir Voucher)
// ─────────────────────────────────────────────────────────────────────────

// Cuando el admin aprueba la transferencia en AdminVouchers,
// se debe crear el comprobante y notificar al colegiado.

// Si usas WebSockets o polling:

const cargarHistorialComprobantes = async () => {
  try {
    const response = await fetch(`/api/finanzas/comprobantes/historial/?colegiado_id=${colegiado.id}`);
    const comprobantes = await response.json();
    
    // Si hay un comprobante no descargado recientemente, mostrarlo
    if (comprobantes.results && comprobantes.results.length > 0) {
      const ultimoComprobante = comprobantes.results[0];
      // Mostrar si fue creado en los últimos 2 minutos
      const tiempoCreacion = new Date(ultimoComprobante.fecha_hora_pago);
      const ahora = new Date();
      if ((ahora - tiempoCreacion) < 2 * 60 * 1000) {
        setComprobanteParaMostrar(ultimoComprobante);
      }
    }
  } catch (error) {
    console.error('Error al cargar comprobantes:', error);
  }
};

// Llamar después de una actualización de estado o cada X segundos

// ─────────────────────────────────────────────────────────────────────────
// 5. AGREGAR EL MODAL AL FINAL DEL COMPONENTE
// ─────────────────────────────────────────────────────────────────────────

// Justo antes de cerrar el componente, agregar:

{comprobanteParaMostrar && (
  <ComprobanteModal
    comprobante={comprobanteParaMostrar}
    colegiado={datosDelColegiado}
    onClose={() => setComprobanteParaMostrar(null)}
    onDescargar={(comp) => {
      console.log('Comprobante descargado:', comp.numero_comprobante);
      // Opcional: marcar como descargado en el servidor
      fetch(`/api/finanzas/comprobantes/${comp.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'DESCARGADO' }),
      });
    }}
  />
)}

// ─────────────────────────────────────────────────────────────────────────
// 6. MOSTRAR BOTÓN PARA DESCARGAR COMPROBANTES ANTERIORES
// ─────────────────────────────────────────────────────────────────────────

// Agregar una sección en la UI para listar comprobantes descargables:

const ComprobantesAnteriores = ({ colegiadoId }) => {
  const [comprobantes, setComprobantes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`/api/finanzas/comprobantes/historial/?colegiado_id=${colegiadoId}`)
      .then(r => r.json())
      .then(data => {
        setComprobantes(data.results || data);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [colegiadoId]);

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1rem' }}>
        Comprobantes Anteriores
      </h3>

      {cargando ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</p>
      ) : comprobantes.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay comprobantes previos
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {comprobantes.map(comp => (
            <div
              key={comp.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <p style={{ fontWeight: '600', margin: 0, marginBottom: '0.2rem' }}>
                  {comp.numero_comprobante}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  S/ {parseFloat(comp.monto).toFixed(2)} • {comp.fecha_formateada}
                </p>
              </div>
              <button
                onClick={() => setComprobanteParaMostrar(comp)}
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                📥 Descargar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Usar en el componente:
// <ComprobantesAnteriores colegiadoId={colegiado.id} />

// ─────────────────────────────────────────────────────────────────────────
// 7. BACKEND: RESPUESTA DE CONFIRMACIÓN DE PAGO
// ─────────────────────────────────────────────────────────────────────────

// El endpoint /api/portal/pagos/confirmar/ debe retornar:

{
  "ok": true,
  "mensaje": "Pago confirmado exitosamente",
  "comprobante": {
    "id": 2,
    "numero_comprobante": "CMP-20250525174530-5678",
    "colegiado": 5,
    "colegiado_cip": "12345",
    "colegiado_nombre": "Juan Pérez García",
    "monto": "80.00",
    "fecha_hora_pago": "2025-05-25T17:45:30.123456Z",
    "canal": "ONLINE",
    "metodo_pago": "TARJETA",
    "estado": "GENERADO",
    "transaccion_id": "MP-12345678"
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 8. NOTIFICACIÓN AL USUARIO (OPCIONAL)
// ─────────────────────────────────────────────────────────────────────────

// Mostrar toast o notificación después de descargar:

const handleDescargarComprobante = (comp) => {
  console.log('Comprobante descargado:', comp.numero_comprobante);
  
  // Opcional: mostrar mensaje
  // toast.success('✅ Comprobante descargado correctamente');
};

// ─────────────────────────────────────────────────────────────────────────
// FLUJO COMPLETO DE INTEGRACIÓN
// ─────────────────────────────────────────────────────────────────────────

/*
1. Usuario selecciona periodos para pagar
2. Usuario elige método:
   - Tarjeta: va a Mercado Pago
   - Transferencia: sube comprobante, espera aprobación

3. Mercado Pago o Admin aprueba:
   - Backend crea Comprobante
   - Retorna datos en respuesta JSON

4. Frontend recibe comprobante:
   - Muestra modal con "📥 Descargar Comprobante"
   - Usuario hace clic
   - Se descarga PDF

5. Usuario puede ver historial:
   - Sección "Comprobantes Anteriores"
   - Puede descargar comprobantes previos
*/
