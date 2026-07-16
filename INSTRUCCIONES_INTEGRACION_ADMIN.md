// ═══════════════════════════════════════════════════════════════════════════
// FRAGMENTOS DE CÓDIGO PARA INTEGRACIÓN EN AdminPagoPresencial.jsx
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// 1. AGREGAR ESTAS IMPORTACIONES AL INICIO DEL ARCHIVO
// ─────────────────────────────────────────────────────────────────────────

import ComprobanteModal from '../../components/UI/ComprobanteModal';

// ─────────────────────────────────────────────────────────────────────────
// 2. AGREGAR ESTOS ESTADOS EN LA SECCIÓN DE useState
// ─────────────────────────────────────────────────────────────────────────

// En el archivo AdminPagoPresencial.jsx, busca donde están todos los useState
// y agrega estos nuevos:

const [comprobanteParaMostrar, setComprobanteParaMostrar] = useState(null);
const [comprobanteDescargando, setComprobanteDescargando] = useState(false);

// ─────────────────────────────────────────────────────────────────────────
// 3. MODIFICAR LA RESPUESTA exitosa (RESULTADO EXITOSO)
// ─────────────────────────────────────────────────────────────────────────

// BUSCAR ESTA SECCIÓN (alrededor de línea 211):
// if (resultado?.ok) { return ( ...

// ENCONTRARÁS ESTA PARTE:
/*
  <div style={{ display: 'flex', gap: '1rem' }}>
    <button onClick={handleNuevoPago} className="btn btn-primary" style={{ flex: 1 }}>
      Registrar otro pago
    </button>
    <button onClick={recargarDeuda} className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
      Ver deuda restante
    </button>
  </div>
*/

// REEMPLAZARLA CON:
/*
  <div style={{ display: 'flex', gap: '1rem' }}>
    <button 
      onClick={() => setComprobanteParaMostrar(resultado.comprobante)}
      className="btn btn-primary" 
      style={{ flex: 1, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
    >
      📥 Descargar Comprobante
    </button>
    <button onClick={handleNuevoPago} className="btn btn-primary" style={{ flex: 1 }}>
      Registrar otro pago
    </button>
    <button onClick={recargarDeuda} className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
      Ver deuda restante
    </button>
  </div>
*/

// ─────────────────────────────────────────────────────────────────────────
// 4. AGREGAR EL MODAL AL FINAL DEL COMPONENTE (ANTES DEL ÚLTIMO RETURN)
// ─────────────────────────────────────────────────────────────────────────

// Al final del componente, justo antes de cerrar el componente, agrega:
/*
  {comprobanteParaMostrar && (
    <ComprobanteModal
      comprobante={comprobanteParaMostrar}
      colegiado={colegiado}
      onClose={() => setComprobanteParaMostrar(null)}
      onDescargar={(comp) => {
        console.log('Comprobante descargado:', comp.numero_comprobante);
        // Opcional: hacer algo después de descargar
      }}
    />
  )}
*/

// ─────────────────────────────────────────────────────────────────────────
// 5. ASEGURAR QUE EL BACKEND RETORNA EL COMPROBANTE
// ─────────────────────────────────────────────────────────────────────────

// El backend debe retornar algo como:
/*
{
  "ok": true,
  "colegiado": "Juan Pérez",
  "total_registrado": 2,
  "periodos_registrados": ["2025-03", "2025-04"],
  "habilitado_nuevo": true,
  "comprobante": {
    "id": 1,
    "numero_comprobante": "CMP-20250525173015-1234",
    "colegiado": 5,
    "colegiado_cip": "12345",
    "colegiado_nombre": "Juan Pérez García",
    "monto": "50.00",
    "fecha_hora_pago": "2025-05-25T17:30:15.123456Z",
    "canal": "PRESENCIAL",
    "metodo_pago": "EFECTIVO",
    "estado": "GENERADO"
  }
}
*/

// ─────────────────────────────────────────────────────────────────────────
// CÓDIGO COMPLETO DE LA SECCIÓN DE ÉXITO (REFERENCIA)
// ─────────────────────────────────────────────────────────────────────────

/*
  if (resultado?.ok) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem' }}>
            ✅ Pago Registrado
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Los periodos han sido marcados como pagados correctamente.</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10B981', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: '#D1FAE5', padding: '1rem', borderRadius: '50%', color: '#059669', flexShrink: 0 }}>
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#065F46' }}>Pago registrado con éxito</h2>
              <p style={{ color: '#047857', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                {resultado.total_registrado} periodo{resultado.total_registrado !== 1 ? 's' : ''} abonado{resultado.total_registrado !== 1 ? 's' : ''} para{' '}
                <strong>{resultado.colegiado}</strong>
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
              Periodos pagados
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {resultado.periodos_registrados.map(p => (
                <span key={p} style={{ background: '#D1FAE5', color: '#065F46', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '600' }}>
                  {fmtPeriodo(p)}
                </span>
              ))}
            </div>
          </div>

          {resultado.ya_existian?.length > 0 && (
            <div style={{ marginBottom: '1rem', background: '#FEF3C7', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>
              <strong>⚠️ Ya tenían pago registrado:</strong>{' '}
              {resultado.ya_existian.map(p => fmtPeriodo(p)).join(', ')}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: resultado.habilitado_nuevo ? '#D1FAE5' : '#FEF3C7', borderRadius: '8px', marginBottom: '1.75rem' }}>
            {resultado.habilitado_nuevo ? <BadgeCheck size={20} color="#059669" /> : <AlertCircle size={20} color="#D97706" />}
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: resultado.habilitado_nuevo ? '#065F46' : '#92400E' }}>
              {resultado.habilitado_nuevo ? 'El colegiado ha pagado' : '-'}
            </span>
          </div>

          {/* NUEVA SECCIÓN: BOTONES ACTUALIZADOS */}
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            {resultado.comprobante && (
              <button 
                onClick={() => setComprobanteParaMostrar(resultado.comprobante)}
                className="btn btn-primary"
                style={{ 
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%'
                }}
              >
                📥 Descargar Comprobante
              </button>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleNuevoPago} className="btn btn-primary" style={{ flex: 1 }}>
                Registrar otro pago
              </button>
              <button onClick={recargarDeuda} className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
                Ver deuda restante
              </button>
            </div>
          </div>
        </div>

        {/* NUEVO: MODAL DE COMPROBANTE */}
        {comprobanteParaMostrar && (
          <ComprobanteModal
            comprobante={comprobanteParaMostrar}
            colegiado={colegiado}
            onClose={() => setComprobanteParaMostrar(null)}
            onDescargar={(comp) => {
              console.log('Comprobante descargado:', comp.numero_comprobante);
            }}
          />
        )}
      </div>
    );
  }
*/
