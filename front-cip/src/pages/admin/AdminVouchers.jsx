import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Loader2, AlertCircle, Eye,
  Clock, RefreshCw, FileCheck, Smartphone, Building2, BadgeCheck,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmtPeriodo = (p) => {
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
};

const fmtFechaHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const METODO_BADGE = {
  YAPE:          { bg: '#EDE9FE', color: '#5B21B6', icon: <Smartphone size={12} />, label: '🟣 Yape' },
  PLIN:          { bg: '#ECFDF5', color: '#065F46', icon: <Smartphone size={12} />, label: '🟢 Plin' },
  TRANSFERENCIA: { bg: '#F0F9FF', color: '#0369A1', icon: <Building2 size={12} />,  label: '🏦 Transferencia' },
};

// ── Tarjeta de un voucher ──────────────────────────────────────────────────
function VoucherCard({ voucher, onResuelto }) {
  const [accion, setAccion]           = useState(null); // 'APROBAR' | 'RECHAZAR'
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando]   = useState(false);
  const [resultado, setResultado]     = useState(null);
  const [errLocal, setErrLocal]       = useState('');

  const metodo = METODO_BADGE[voucher.metodo] || { bg: '#F1F5F9', color: '#475569', label: voucher.metodo };

  const handleConfirmar = async () => {
    if (accion === 'RECHAZAR' && !observacion.trim()) {
      setErrLocal('Indica el motivo del rechazo.');
      return;
    }
    setErrLocal('');
    setProcesando(true);
    try {
      const res = await fetch(`/api/admin/vouchers/${voucher.id}/resolver/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, observacion }),
      });
      const data = await res.json();
      if (data.success) {
        setResultado({ accion, ...data });
        setTimeout(() => onResuelto(voucher.id), 1800);
      } else {
        setErrLocal(data.error || 'Error al procesar.');
      }
    } catch {
      setErrLocal('Error de conexión.');
    } finally {
      setProcesando(false);
    }
  };

  // ── Estado resuelto ──
  if (resultado) {
    const esAprobado = resultado.accion === 'APROBADO';
    return (
      <div className="card" style={{
        padding: '1.25rem 1.5rem',
        borderLeft: `4px solid ${esAprobado ? '#10B981' : '#EF4444'}`,
        background: esAprobado ? '#F0FDF4' : '#FEF2F2',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        {esAprobado
          ? <CheckCircle2 size={28} color="#10B981" style={{ flexShrink: 0 }} />
          : <XCircle size={28} color="#EF4444" style={{ flexShrink: 0 }} />
        }
        <div>
          <p style={{ fontWeight: '700', color: esAprobado ? '#065F46' : '#991B1B', marginBottom: '0.1rem' }}>
            {esAprobado
              ? `✅ Aprobado — ${resultado.total_registrado} periodo${resultado.total_registrado !== 1 ? 's' : ''} registrado${resultado.total_registrado !== 1 ? 's' : ''}`
              : '❌ Rechazado'}
          </p>
          <p style={{ fontSize: '0.8rem', color: esAprobado ? '#166534' : '#991B1B' }}>
            {voucher.colegiado_nombre} · {metodo.label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #F59E0B' }}>
      {/* ── Fila superior: info colegiado + badges ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--cip-blue)', marginBottom: '0.2rem' }}>
            {voucher.colegiado_nombre}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            DNI {voucher.colegiado_dni} &nbsp;·&nbsp; CIP {voucher.colegiado_nro}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Badge método */}
          <span style={{ background: metodo.bg, color: metodo.color, padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700' }}>
            {metodo.label}
          </span>
          {/* Badge estado */}
          <span style={{ background: '#FEF3C7', color: '#92400E', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={11} /> Pendiente
          </span>
        </div>
      </div>

      {/* ── Fila media: periodos + monto + fecha ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.3rem' }}>
            Periodos a acreditar
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {voucher.periodos.map(p => (
              <span key={p} style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '0.18rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                {fmtPeriodo(p)}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Monto</p>
          <p style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--cip-blue)' }}>S/ {parseFloat(voucher.monto).toFixed(2)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Enviado</p>
          <p style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-main)' }}>{fmtFechaHora(voucher.creado_en)}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ref: {voucher.nro_referencia}</p>
        </div>
      </div>

      {/* ── Ver comprobante ── */}
      {voucher.voucher_url && (
        <a
          href={voucher.voucher_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.9rem', borderRadius: '7px', fontSize: '0.8rem',
            fontWeight: '600', color: '#1D4ED8',
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            textDecoration: 'none', marginBottom: '1rem', transition: 'all 0.15s',
          }}
        >
          <Eye size={14} /> Ver comprobante
        </a>
      )}

      {/* ── Formulario de acción ── */}
      {!accion ? (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setAccion('APROBAR'); setErrLocal(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem',
              borderRadius: '8px', border: 'none', background: '#10B981', color: 'white',
              fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#059669'}
            onMouseLeave={e => e.currentTarget.style.background = '#10B981'}
          >
            <CheckCircle2 size={16} /> Aprobar pago
          </button>
          <button
            onClick={() => { setAccion('RECHAZAR'); setErrLocal(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem',
              borderRadius: '8px', border: 'none', background: '#EF4444', color: 'white',
              fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}
          >
            <XCircle size={16} /> Rechazar
          </button>
        </div>
      ) : (
        <div style={{ background: accion === 'APROBAR' ? '#F0FDF4' : '#FEF2F2', borderRadius: '10px', padding: '1rem', border: `1px solid ${accion === 'APROBAR' ? '#86EFAC' : '#FCA5A5'}` }}>
          <p style={{ fontWeight: '700', fontSize: '0.875rem', color: accion === 'APROBAR' ? '#065F46' : '#991B1B', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {accion === 'APROBAR' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {accion === 'APROBAR' ? `Confirmar aprobación — ${voucher.periodos.length} periodo${voucher.periodos.length !== 1 ? 's' : ''} quedarán registrados` : 'Confirmar rechazo'}
          </p>
          <textarea
            placeholder={accion === 'APROBAR' ? 'Observación (opcional)…' : 'Motivo del rechazo (requerido)…'}
            value={observacion}
            onChange={e => { setObservacion(e.target.value); setErrLocal(''); }}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem',
              border: `1px solid ${accion === 'APROBAR' ? '#86EFAC' : '#FCA5A5'}`,
              borderRadius: '7px', fontSize: '0.82rem', resize: 'vertical',
              fontFamily: 'inherit', outline: 'none', marginBottom: '0.6rem',
            }}
          />
          {errLocal && (
            <p style={{ fontSize: '0.8rem', color: '#991B1B', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <AlertCircle size={13} /> {errLocal}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleConfirmar}
              disabled={procesando}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem',
                borderRadius: '7px', border: 'none', fontWeight: '700', fontSize: '0.82rem',
                background: accion === 'APROBAR' ? '#10B981' : '#EF4444', color: 'white',
                cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? 0.7 : 1,
              }}
            >
              {procesando
                ? <><Loader2 size={14} className="spin" /> Procesando…</>
                : accion === 'APROBAR' ? <><CheckCircle2 size={14} /> Confirmar aprobación</> : <><XCircle size={14} /> Confirmar rechazo</>
              }
            </button>
            <button
              onClick={() => { setAccion(null); setObservacion(''); setErrLocal(''); }}
              disabled={procesando}
              style={{ padding: '0.55rem 0.9rem', borderRadius: '7px', border: '1px solid #CBD5E1', background: 'white', color: '#64748B', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminVouchers() {
  const [vouchers, setVouchers]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/admin/vouchers/');
      if (res.ok) {
        setVouchers(await res.json());
      } else {
        setError(`Error ${res.status} al cargar vouchers.`);
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleResuelto = (id) => {
    setVouchers(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileCheck size={26} /> Verificación de Vouchers
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Revise y apruebe los comprobantes de pago subidos por los colegiados.
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
        >
          <RefreshCw size={15} className={cargando ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      {/* ── Estado carga ── */}
      {cargando && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader2 size={36} className="spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p>Cargando vouchers pendientes…</p>
        </div>
      )}

      {!cargando && error && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <p style={{ color: '#991B1B', fontWeight: '600' }}>{error}</p>
          <button onClick={cargar} className="btn btn-outline" style={{ marginTop: '1rem', borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && vouchers.length === 0 && (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <BadgeCheck size={52} color="#10B981" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>Sin pendientes</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay vouchers esperando verificación en este momento.</p>
        </div>
      )}

      {!cargando && !error && vouchers.length > 0 && (
        <>
          {/* Contador */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#FEF3C7', color: '#92400E', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={13} /> {vouchers.length} voucher{vouchers.length !== 1 ? 's' : ''} pendiente{vouchers.length !== 1 ? 's' : ''} de verificación
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {vouchers.map(v => (
              <VoucherCard key={v.id} voucher={v} onResuelto={handleResuelto} />
            ))}
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
