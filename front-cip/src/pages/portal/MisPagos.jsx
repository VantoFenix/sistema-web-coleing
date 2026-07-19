import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, XCircle, Calendar, Loader2, CreditCard,
  ShieldCheck, ArrowLeft, AlertCircle, Clock, Receipt,
  Smartphone, Building2, UploadCloud, CheckCheck, ExternalLink, Edit2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import ComprobanteModal from '../../components/UI/ComprobanteModal';

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const MESES_CORTO = [
  'ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC',
];
const fmtPeriodo = (p) => {
  if (!p) return '—';
  const parts = p.split('-');
  if (parts.length < 2) return p;
  return `${MESES[parseInt(parts[1], 10) - 1] || ''} ${parts[0]}`;
};
const fmtPeriodoCorto = (p) => {
  if (!p) return '—';
  const parts = p.split('-');
  if (parts.length < 2) return p;
  return MESES_CORTO[parseInt(parts[1], 10) - 1] || '';
};
const fmtFecha = (iso) => {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// ── Paso: Selección de periodos (calendario estilo admin) ──────────────────
function StepPeriodos({ pendientes, historial, seleccionados, onSelAll, onSelSoloDeuda, onDeselAll, montoUnit, onError, onGenerarQR, onEditMonto }) {
  const [generando, setGenerando] = useState(false);
  const [editMonto, setEditMonto] = useState(false);
  const total = seleccionados.size * parseFloat(montoUnit);
  const [tempMonto, setTempMonto] = useState(total);

  const handleGenerarQR = async () => {
    setGenerando(true);
    await onGenerarQR(Array.from(seleccionados));
    setGenerando(false);
  };

  // Construir lista completa de periodos (pendientes + mes actual + adelantos)
  const hoy           = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const pagadosSet    = new Set((historial || []).map(h => h.periodo));
  const pendientesSet = new Set(pendientes.map(p => p.periodo));

  const allPeriodos = [];
  pendientes.forEach(p => allPeriodos.push({ periodo: p.periodo, estado: 'PENDIENTE' }));
  if (!pendientesSet.has(periodoActual) && !pagadosSet.has(periodoActual)) {
    allPeriodos.push({ periodo: periodoActual, estado: 'MES_ACTUAL' });
  }
  for (let i = 1; i <= 5; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    const per = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!pendientesSet.has(per) && !pagadosSet.has(per))
      allPeriodos.push({ periodo: per, estado: 'ADELANTO' });
  }
  allPeriodos.sort((a, b) => a.periodo.localeCompare(b.periodo));

  // Lógica de selección en cascada (igual que admin)
  const handleToggle = (periodo, estado) => {
    let s = new Set(seleccionados);
    if (estado === 'PENDIENTE') {
      // Pendientes se seleccionan/deseleccionan como bloque
      const todasSel = pendientes.every(p => s.has(p.periodo));
      if (todasSel) {
        // Al deseleccionar deudas, limpiar TODO (no se puede tener adelantos sin pagar la deuda)
        s.clear();
      } else {
        pendientes.forEach(p => s.add(p.periodo));
      }
    } else {
      // MES_ACTUAL / ADELANTO: en cascada
      if (s.has(periodo)) {
        // Deseleccionar: también quitar todos los meses posteriores
        const idx = allPeriodos.findIndex(p => p.periodo === periodo);
        allPeriodos.slice(idx).forEach(p => s.delete(p.periodo));
      } else {
        // Seleccionar: primero agrega todos los meses anteriores (incluyendo deudas)
        for (const p of allPeriodos) {
          if (p.periodo === periodo) break;
          s.add(p.periodo);
        }
        s.add(periodo);
      }
    }
    onSelAll(s);
  };



  // Agrupar por año
  const porAño = {};
  allPeriodos.forEach(p => {
    const pStr = p.periodo || '';
    const año = pStr.includes('-') ? pStr.split('-')[0] : 'Desconocido';
    if (!porAño[año]) porAño[año] = [];
    porAño[año].push(p);
  });
  const años = Object.keys(porAño).sort();

  return (
    <div>
      {/* Cabecera con botones de selección rápida */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--cip-blue)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={15} /> Periodos del Año {hoy.getFullYear()}
          </h3>
          {seleccionados.size > 0 && (
            <p style={{ fontSize: '0.73rem', color: '#059669', fontWeight: '600', margin: '0.2rem 0 0' }}>
              {seleccionados.size} mes{seleccionados.size !== 1 ? 'es' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''} · S/ {total.toFixed(2)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {pendientes.length > 0 && (
            <button onClick={onSelSoloDeuda} style={{ fontSize: '0.68rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1.5px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer', fontWeight: '700' }}>
              Solo deudas
            </button>
          )}
          <button onClick={() => onSelAll(new Set(allPeriodos.map(p => p.periodo)))} style={{ fontSize: '0.68rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer', fontWeight: '700' }}>
            Todos
          </button>
          <button onClick={onDeselAll} style={{ fontSize: '0.68rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', fontWeight: '700' }}>
            Ninguno
          </button>
        </div>
      </div>

      {/* Grilla de meses agrupada por año */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.25rem' }}>
        {años.map(año => (
          <div key={año}>
            {/* Separador de año */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ background: 'var(--cip-blue)', color: 'white', fontSize: '0.7rem', fontWeight: '800', padding: '0.15rem 0.55rem', borderRadius: '5px', letterSpacing: '0.5px' }}>
                {año}
              </span>
              <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            </div>

            {/* Meses: 6 por fila */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem' }}>
              {porAño[año].map(p => {
                const { estado } = p;
                const sel = seleccionados.has(p.periodo);

                const paleta =
                  estado === 'PENDIENTE' ? {
                    bg: sel ? '#FFF1F2' : '#FEF2F2', border: sel ? '#DC2626' : '#FCA5A5',
                    txt: '#991B1B', accent: '#DC2626', tagBg: '#FEE2E2', tagTxt: '#991B1B', tag: 'PAGAR',
                  } : estado === 'MES_ACTUAL' ? {
                    bg: sel ? '#FFFBEB' : '#FFFDF5', border: sel ? '#F59E0B' : '#FCD34D',
                    txt: '#78350F', accent: '#D97706', tagBg: '#FEF3C7', tagTxt: '#92400E', tag: 'MES ACT.',
                  } : {
                    bg: sel ? '#EFF6FF' : '#F8FAFF', border: sel ? '#3B82F6' : '#BFDBFE',
                    txt: '#1E40AF', accent: '#2563EB', tagBg: '#DBEAFE', tagTxt: '#1D4ED8', tag: 'ADELANTO',
                  };

                return (
                  <div
                    key={p.periodo}
                    onClick={() => handleToggle(p.periodo, p.estado)}
                    style={{
                      background: paleta.bg,
                      border: `2px solid ${sel ? paleta.accent : paleta.border}`,
                      borderRadius: '8px', padding: '0.5rem 0.25rem',
                      cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.22rem',
                      boxShadow: sel ? `0 0 0 2px ${paleta.accent}25` : 'none',
                      transform: sel ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <p style={{ fontSize: '0.76rem', fontWeight: '800', color: paleta.txt, margin: 0, letterSpacing: '0.3px' }}>
                      {fmtPeriodoCorto(p.periodo)}
                    </p>
                    <input type="checkbox" checked={sel} readOnly
                      style={{ accentColor: paleta.accent, width: 12, height: 12, pointerEvents: 'none' }} />
                    <span style={{
                      fontSize: '0.5rem', fontWeight: '700', padding: '0.07rem 0.28rem',
                      borderRadius: '999px', background: paleta.tagBg, color: paleta.tagTxt,
                      textTransform: 'uppercase', letterSpacing: '0.2px', whiteSpace: 'nowrap',
                    }}>
                      {paleta.tag}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen monto */}
      {seleccionados.size > 0 && (
        <div style={{ background: '#F1F5F9', borderRadius: '10px', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {seleccionados.size} mes{seleccionados.size !== 1 ? 'es' : ''} × S/ {parseFloat(montoUnit).toFixed(2)}
            {!editMonto && (
              <button 
                onClick={() => {
                  setTempMonto(total);
                  setEditMonto(true);
                }} 
                title="Editar precio (Solo demostración)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cip-blue)', padding: 0, display: 'flex' }}>
                <Edit2 size={14} />
              </button>
            )}
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--cip-blue)', display: 'flex', alignItems: 'center' }}>
            {editMonto ? (
              <>
                S/ 
                <input
                  type="number"
                  value={tempMonto}
                  onChange={(e) => setTempMonto(e.target.value)}
                  onBlur={() => {
                    setEditMonto(false);
                    const newTotal = parseFloat(tempMonto);
                    if (!isNaN(newTotal) && seleccionados.size > 0) {
                      onEditMonto(newTotal / seleccionados.size);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                  }}
                  autoFocus
                  style={{ 
                    width: '80px', padding: '0 0.3rem', border: 'none', borderBottom: '2px solid var(--cip-blue)', 
                    background: 'transparent', color: 'var(--cip-blue)', fontSize: '1.375rem', fontWeight: '800',
                    outline: 'none', textAlign: 'right', marginLeft: '0.2rem'
                  }}
                />
              </>
            ) : (
              `S/ ${total.toFixed(2)}`
            )}
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '10px', border: '2px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, background: '#EFF6FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Smartphone size={24} color="#2563EB" />
        </div>
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--cip-blue)', fontSize: '1rem', fontWeight: '800' }}>Medio de Pago</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Yape / Plin / Tarjeta (Flow)</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <CheckCircle2 size={24} color="#059669" />
        </div>
      </div>

      <button
        onClick={handleGenerarQR}
          disabled={seleccionados.size === 0 || generando}
          className="btn btn-block"
          style={{
            padding: '1rem', fontSize: '1.05rem', display: 'flex', fontWeight: '800', border: 'none',
            alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '10px', color: 'white',
            background: (seleccionados.size === 0 || generando) ? '#94A3B8' : 'linear-gradient(135deg, #7C3AED 0%, #059669 100%)',
            cursor: (seleccionados.size === 0 || generando) ? 'not-allowed' : 'pointer',
            boxShadow: (seleccionados.size === 0 || generando) ? 'none' : '0 4px 14px rgba(5,150,105,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {generando
            ? <><Loader2 size={18} className="spin" /> Procesando…</>
            : <><Smartphone size={18} /> Proceder con el pago</>
          }
        </button>
    </div>
  );
}


// ── Paso: Checkout MercadoPago (Yape/Tarjeta) ──────────────────────────────
function StepCheckoutMP({ initPoint, extRef, total, onExito, onError, onCancelar }) {
  useEffect(() => {
    if (!extRef) return;
    const token = localStorage.getItem('colToken');
    const interval = setInterval(async () => {
      try {
        // Buscar pagos por external_reference usando el endpoint de verificación
        const res = await fetch('/api/pagos/verificar/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ payment_id: '', external_reference: extRef })
        });
        const data = await res.json();
        if (data.success) {
          clearInterval(interval);
          onExito(data);
        }
      } catch (err) {
        // Silenciar errores de polling (el pago aún no se completó)
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [extRef, onExito]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'center', padding: '2rem 1rem' }}>
      <h3 style={{ color: 'var(--cip-blue)', fontWeight: '800', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
        Pagar S/ {total.toFixed(2)}
      </h3>
      <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.6' }}>
        Escanea el QR con la <strong>camara de tu celular</strong> o toca el boton para abrir el checkout de MercadoPago. Ahi podras pagar con <strong>Yape, tarjeta o transferencia</strong>.
      </p>
      
      <div style={{ background: 'white', padding: '1.25rem', display: 'inline-block', borderRadius: '16px', border: '4px solid #009EE3', marginBottom: '1.25rem', boxShadow: '0 10px 25px rgba(0,158,227,0.2)' }}>
        <QRCodeSVG value={initPoint} size={220} level={"H"} />
      </div>

      <a
        href={initPoint}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          width: '100%', padding: '0.9rem', marginBottom: '1rem',
          background: 'linear-gradient(135deg, #009EE3 0%, #00B1EA 100%)', color: 'white',
          fontWeight: '800', borderRadius: '12px', border: 'none', cursor: 'pointer',
          fontSize: '0.95rem', textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(0,158,227,0.4)',
        }}
      >
        <ExternalLink size={18} /> Abrir enlace de pago
      </a>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#009EE3', marginBottom: '1rem', fontWeight: '700' }}>
        <Loader2 size={18} className="spin" /> Esperando confirmacion del pago...
      </div>

      <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '1.5rem' }}>
        Una vez que completes el pago, esta pantalla se actualizara automaticamente.
      </p>

      <button
        onClick={onCancelar}
        style={{ width: '100%', padding: '0.9rem', background: 'white', color: '#334155', fontWeight: '700', borderRadius: '12px', border: '2px solid #CBD5E1', cursor: 'pointer', fontSize: '0.95rem' }}
      >
        Cancelar
      </button>
    </div>
  );
}

// ── Paso: Pago pendiente de revisión (voucher enviado) ─────────────────────
function StepPendiente({ resultado, onVerHistorial }) {
  const labels = { YAPE: '🟣 Yape', PLIN: '🟢 Plin', TRANSFERENCIA: '🏦 Transferencia' };
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
        <Clock size={38} color="#D97706" />
      </div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
        ¡Comprobante recibido!
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
        Tu pago está siendo verificado. Te notificaremos en las próximas <strong>24 horas hábiles</strong>.
      </p>

      {/* Periodos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {(resultado.periodos || []).map(p => (
          <span key={p} style={{ background: '#FEF3C7', color: '#92400E', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
            {fmtPeriodo(p)}
          </span>
        ))}
      </div>

      {/* Detalles */}
      <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>N° Referencia</span>
          <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{resultado.nro_referencia}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Método</span>
          <span style={{ fontWeight: '700' }}>{labels[resultado.metodo] || resultado.metodo}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Monto enviado</span>
          <span style={{ fontWeight: '700', color: 'var(--cip-blue)' }}>S/ {parseFloat(resultado.monto).toFixed(2)}</span>
        </div>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left' }}>
        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <span>Guarda tu N° de referencia. Una vez aprobado, los periodos se registrarán automáticamente.</span>
      </div>

      <button onClick={onVerHistorial} className="btn btn-primary btn-block" style={{ padding: '0.8rem' }}>
        Ver historial de pagos
      </button>
    </div>
  );
}

// ── Paso: Éxito tarjeta (inmediato) ────────────────────────────────────────
function StepExito({ resultado, onNuevoPago, onVerComprobante }) {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
        <CheckCircle2 size={38} color="#059669" />
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
        ¡Pago exitoso!
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Se procesó el pago de{' '}
        <strong style={{ color: 'var(--cip-blue)' }}>
          {resultado.periodos_pagados.length} mes{resultado.periodos_pagados.length !== 1 ? 'es' : ''}
        </strong>
        {' '}por un total de{' '}
        <strong style={{ color: 'var(--cip-blue)' }}>S/ {parseFloat(resultado.monto_cobrado).toFixed(2)}</strong>.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {resultado.periodos_pagados.map(p => (
          <span key={p} style={{ background: '#D1FAE5', color: '#065F46', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
            {fmtPeriodo(p)}
          </span>
        ))}
      </div>

      <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Receipt size={14} /> N° operación
        </span>
        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-main)' }}>
          {resultado.nro_operacion}
        </span>
      </div>

      <div style={{
        padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem',
        background: resultado.habilitado_nuevo ? '#D1FAE5' : '#FEF3C7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      }}>
        {resultado.habilitado_nuevo
          ? <CheckCircle2 size={18} color="#059669" />
          : <AlertCircle size={18} color="#D97706" />
        }
        <span style={{ fontWeight: '700', fontSize: '0.875rem', color: resultado.habilitado_nuevo ? '#065F46' : '#92400E' }}>
          {resultado.habilitado_nuevo ? 'Tu cuenta está HABILITADA ✓' : 'Aún tienes meses pendientes'}
        </span>
      </div>

      {resultado.comprobante && (
        <button
          onClick={() => onVerComprobante(resultado.comprobante)}
          className="btn btn-primary btn-block"
          style={{ padding: '0.8rem', marginBottom: '0.75rem', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none' }}
        >
          📥 Descargar Comprobante
        </button>
      )}
      <button onClick={onNuevoPago} className="btn btn-primary btn-block" style={{ padding: '0.8rem' }}>
        Ver historial de pagos
      </button>
    </div>
  );
}


// ── Comprobantes Anteriores ────────────────────────────────────────────────
const ComprobantesAnteriores = ({ onVerComprobante }) => {
  const [comprobantes, setComprobantes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('colToken');
    fetch('/api/finanzas/comprobantes/historial/', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const arr = data.results || data;
        setComprobantes(Array.isArray(arr) ? arr : []);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  if (cargando) return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando comprobantes...</p>;
  if (comprobantes.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1rem' }}>
        Comprobantes Electrónicos
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {comprobantes.map(comp => (
          <div
            key={comp.id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.875rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <p style={{ fontWeight: '600', margin: 0, marginBottom: '0.2rem' }}>
                {comp.numero_comprobante}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                S/ {parseFloat(comp.monto).toFixed(2)} • {comp.fecha_hora_pago_formateada || comp.fecha_formateada}
              </p>
            </div>
            <button
              onClick={() => onVerComprobante(comp)}
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: 'white', border: 'none', borderRadius: '6px',
                padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              📥 Descargar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function MisPagos() {
  const [tab, setTab]                     = useState('pagar');
  const [cargando, setCargando]           = useState(true);
  const [error, setError]                 = useState('');

  const [comprobanteParaMostrar, setComprobanteParaMostrar] = useState(null);

  const [pendientes, setPendientes]       = useState([]);
  const [historial, setHistorial]         = useState([]);
  const [montoUnit, setMontoUnit]         = useState(0);
  const [montoBase, setMontoBase]         = useState(0);

  const [seleccionados, setSeleccionados] = useState(new Set());

  useEffect(() => {
    if (montoBase) setMontoUnit(montoBase);
  }, [seleccionados, montoBase]);
  
  const [initPoint, setInitPoint]         = useState(null);
  const [extRef, setExtRef]               = useState(null);
  const [resultadoPago, setResultadoPago] = useState(null);

  const handlePagarFlow = async (periodosArray) => {
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/pagos/flow/crear/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ periodos: periodosArray, monto: (periodosArray.length * parseFloat(montoUnit)).toFixed(2) })
      });
      const data = await res.json();
      if (data.init_point) {
        // Redirigir directamente a la pasarela de Flow
        window.location.href = data.init_point;
      } else {
        setError(data.error || 'No se pudo crear el enlace de pago con Flow.');
      }
    } catch {
      setError('Error de conexion al crear el enlace de pago.');
    }
  };
  const [montoCustom, setMontoCustom]     = useState(null); // null = cálculo automático
  const [errPago, setErrPago]             = useState('');

  const [vouchersPendientes, setVouchersPendientes] = useState([]);
  const [habilitado, setHabilitado]       = useState(null);
  const [paso, setPaso]                   = useState('periodos');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFlow = params.get('token');

    if (tokenFlow) {
      verificarPagoFlow(tokenFlow);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      cargarDatos();
    }
  }, []);

  const verificarPagoFlow = async (tokenFlow) => {
    setCargando(true);
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/pagos/flow/confirmar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ token: tokenFlow })
      });
      const data = await res.json();
      if (data.success) {
        setResultadoPago(data);
      } else {
        setErrPago(data.error || 'Error al confirmar el pago en Flow.');
      }
    } catch (err) {
      setErrPago('Error de conexión al verificar el pago.');
    }
    cargarDatos();
    setCargando(false);
  };

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/portal/mis-pagos/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('colToken');
        localStorage.removeItem('colUser');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        let detalle = '';
        try { const d = await res.json(); detalle = d.error || ''; } catch (_) {}
        throw new Error(detalle || `Error ${res.status}`);
      }
      const data = await res.json();
      setPendientes(data.periodos_pendientes || []);
      setHistorial(data.historial || []);
      setVouchersPendientes(data.vouchers_pendientes || []);
      setHabilitado(data.habilitado ?? null);
      setMontoUnit(data.monto_mensualidad || '20.00');
      setMontoBase(data.monto_mensualidad || '20.00');
      setSeleccionados(new Set((data.periodos_pendientes || []).map(p => p.periodo)));
    } catch (e) {
      setError(`No se pudo cargar la información de pagos: ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  const verificarPagoMP = async (paymentId, externalRef, mpStatus) => {
    setCargando(true);
    try {
      const token = localStorage.getItem('colToken');

      // Recargar datos frescos siempre
      const resFresh = await fetch('/api/portal/mis-pagos/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resFresh.ok) {
        const d = await resFresh.json();
        setPendientes(d.periodos_pendientes || []);
        setHistorial(d.historial || []);
        setVouchersPendientes(d.vouchers_pendientes || []);
        setHabilitado(d.habilitado ?? null);
        setMontoUnit(d.monto_mensualidad || '20.00');
        setMontoBase(d.monto_mensualidad || '20.00');
        setSeleccionados(new Set((d.periodos_pendientes || []).map(p => p.periodo)));
      }

      if (mpStatus === 'approved') {
        const res = await fetch('/api/pagos/verificar/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ payment_id: paymentId, external_reference: externalRef }),
        });
        const data = await res.json();
        if (data.success) {
          setResultadoPago(data);
          setPaso('exito');
          setTab('pagar');
        } else {
          setErrPago(data.error || 'El pago fue aprobado por Yape pero hubo un error al registrarlo. Contacte al administrador.');
          setPaso('periodos');
        }
      } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
        setErrPago('Tu pago con Yape está siendo procesado. Espera unos minutos y recarga la página.');
        setPaso('periodos');
      } else {
        // rejected, cancelled, null, etc.
        setErrPago('El pago fue rechazado o cancelado. Por favor, intenta de nuevo.');
        setPaso('periodos');
      }
    } catch {
      setErrPago('Error al verificar el pago. Por favor, recarga la página.');
      setPaso('periodos');
    } finally {
      setCargando(false);
    }
  };

  const handleNuevoPago = () => {
    cargarDatos();
    setPaso('periodos');
    setMontoCustom(null);
    setResultadoPago(null);
    setErrPago('');
    setTab('historial');
  };

  const totalBase         = seleccionados.size * parseFloat(montoUnit);
  const totalSeleccionado = montoCustom !== null ? montoCustom : totalBase;
  const periodosArray     = [...seleccionados].sort();

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="spin" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
        <p>Cargando información de pagos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
        <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
        <p style={{ color: '#991B1B', fontWeight: '600' }}>{error}</p>
        <button onClick={cargarDatos} className="btn btn-outline" style={{ marginTop: '1.5rem', borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>

      {/* ── Estado de cuenta ── */}
      <div className="card" style={{
        marginBottom: '1.5rem', padding: '1.25rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: habilitado === false ? '#FEF2F2' : habilitado ? '#F0FDF4' : 'white',
        border: `1px solid ${habilitado === false ? '#FECACA' : habilitado ? '#86EFAC' : 'var(--border-color)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {habilitado === false ? <XCircle size={26} color="#DC2626" /> : habilitado ? <CheckCircle2 size={26} color="#16A34A" /> : <Clock size={26} color="var(--text-muted)" />}
          <div>
            <p style={{ fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.1rem' }}>Estado de cuenta</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {pendientes.length > 0 ? `${pendientes.length} mes${pendientes.length !== 1 ? 'es' : ''} pendiente${pendientes.length !== 1 ? 's' : ''} de pago` : 'Pagos al día'}
            </p>
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800',
          background: habilitado === false ? '#FEE2E2' : habilitado ? '#D1FAE5' : '#F1F5F9',
          color: habilitado === false ? '#991B1B' : habilitado ? '#065F46' : 'var(--text-muted)',
        }}>
          {habilitado === false ? <XCircle size={13} /> : habilitado ? <CheckCircle2 size={13} /> : null}
          {habilitado === false ? 'Inhabilitado' : habilitado ? 'Habilitado' : '—'}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
          {[
            { id: 'pagar',    label: 'Pagar Mensualidades', icon: <CreditCard size={15} /> },
            { id: 'historial',label: 'Historial',           icon: <Receipt size={15} /> },
          ].map(t => (
            <button key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'pagar' && paso === 'exito') { setPaso('periodos'); } }}
              style={{
                flex: 1, padding: '1rem', border: 'none', background: 'transparent',
                fontWeight: tab === t.id ? '700' : '500',
                color: tab === t.id ? 'var(--cip-blue)' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '3px solid var(--cip-blue)' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                fontSize: '0.9rem',
              }}
            >
              {t.icon} {t.label}
              {t.id === 'pagar' && pendientes.length > 0 && (
                <span style={{ background: 'var(--cip-red)', color: 'white', borderRadius: '999px', fontSize: '0.65rem', padding: '0.1rem 0.45rem', fontWeight: '800' }}>
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.75rem' }}>

          {/* ── Tab: Pagar ── */}
          {tab === 'pagar' && (
            <>
              {/* Mensaje de error al volver de MP (pago rechazado/cancelado) */}
              {errPago && !initPoint && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <span>{errPago}</span>
                </div>
              )}
              {!resultadoPago && (
                <StepPeriodos
                  pendientes={pendientes}
                  historial={historial}
                  seleccionados={seleccionados}
                  onSelAll={(set) => setSeleccionados(set)}
                  onSelSoloDeuda={() => setSeleccionados(new Set(pendientes.map(p => p.periodo)))}
                  onDeselAll={() => setSeleccionados(new Set())}
                  montoUnit={montoUnit}
                  onError={(msg) => setErrPago(msg)}
                  onGenerarQR={handlePagarFlow}
                  onEditMonto={(newVal) => setMontoUnit(newVal)}
                />
              )}

              {/* StepCheckoutMP removed for Flow */}

              {resultadoPago && (
                <StepExito resultado={resultadoPago} onVerComprobante={setComprobanteParaMostrar} onNuevoPago={() => {
                  setResultadoPago(null);
                  setInitPoint(null);
                  setExtRef(null);
                  setTab('historial');
                  cargarDatos();
                }} />
              )}
            </>
          )}

          {/* ── Tab: Historial ── */}
          {tab === 'historial' && (
            <>
              {vouchersPendientes.length > 0 && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', color: '#1D4ED8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <AlertCircle size={20} style={{ color: '#3B82F6' }} />
                    <strong style={{ fontSize: '1rem', color: '#1E40AF' }}>Pagos Pendientes de Verificación</strong>
                  </div>
                  <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Tienes envíos de comprobantes que están siendo verificados por administración. Una vez aprobados, pasarán a tu historial como "PAGADOS".
                  </p>
                  <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse', background: 'rgba(255,255,255,0.7)', borderRadius: '4px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid #93C5FD', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem', fontWeight: '600' }}>Fecha Envío</th>
                        <th style={{ padding: '0.5rem', fontWeight: '600' }}>Método</th>
                        <th style={{ padding: '0.5rem', fontWeight: '600', textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchersPendientes.map((vp) => (
                        <tr key={vp.id} style={{ borderBottom: '1px solid #DBEAFE' }}>
                          <td style={{ padding: '0.5rem' }}>{vp.fecha}</td>
                          <td style={{ padding: '0.5rem', fontWeight: '500' }}>{vp.metodo}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>S/ {parseFloat(vp.monto).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {historial.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  <Calendar size={40} style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.3 }} />
                  <p style={{ fontWeight: '600' }}>Sin pagos registrados aún.</p>
                </div>
              ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Periodo</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Fecha</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Canal</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>Monto</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: '600', color: 'var(--cip-blue)' }}>
                          {fmtPeriodo(h.periodo)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                          {fmtFecha(h.fecha_pago)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            background: h.canal === 'PORTAL' ? '#EDE9FE' : '#F0F9FF',
                            color: h.canal === 'PORTAL' ? '#5B21B6' : '#0369A1',
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                          }}>
                            {h.canal === 'PORTAL'
                              ? h.metodo === 'TARJETA' ? '💳 Tarjeta'
                              : h.metodo === 'YAPE'     ? '🟣 Yape'
                              : h.metodo === 'PLIN'     ? '🟢 Plin'
                              : h.metodo === 'TRANSFERENCIA' ? '🏦 Transferencia'
                              : `💼 ${h.metodo || 'Portal'}`
                            : h.canal === 'CAJA' ? `🏢 ${h.metodo || 'Caja'}`
                            : h.canal}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: '700' }}>
                          S/ {parseFloat(h.monto).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <span style={{ background: '#D1FAE5', color: '#065F46', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700' }}>
                            PAGADO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
              <ComprobantesAnteriores onVerComprobante={setComprobanteParaMostrar} />
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />

      {/* NUEVO: MODAL DE COMPROBANTE */}
      {comprobanteParaMostrar && (
        <ComprobanteModal
          comprobante={comprobanteParaMostrar}
          colegiado={{}} // Pasamos un objeto vacío o los datos del colegiado si los tuviéramos a la mano
          onClose={() => setComprobanteParaMostrar(null)}
          onDescargar={(comp) => {
            console.log('Comprobante descargado:', comp.numero_comprobante);
            fetch(`/api/finanzas/comprobantes/${comp.id}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ estado: 'DESCARGADO' }),
            });
          }}
        />
      )}
    </div>
  );
}
