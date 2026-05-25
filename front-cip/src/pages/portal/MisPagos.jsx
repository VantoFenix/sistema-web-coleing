import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, XCircle, Calendar, Loader2, CreditCard,
  ShieldCheck, ArrowLeft, AlertCircle, Clock, Receipt,
  Smartphone, Building2, UploadCloud, CheckCheck,
} from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const MESES_CORTO = [
  'ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC',
];
const fmtPeriodo = (p) => {
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
};
const fmtPeriodoCorto = (p) => MESES_CORTO[parseInt(p.split('-')[1], 10) - 1];
const fmtFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// ── Paso: Selección de periodos (calendario estilo admin) ─────────────────
function StepPeriodos({ pendientes, historial, seleccionados, onToggle, onSelAll, onSelSoloDeuda, onDeselAll, montoUnit, onContinuar }) {
  const total = seleccionados.size * parseFloat(montoUnit);

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

  if (allPeriodos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <CheckCircle2 size={52} color="#16A34A" style={{ margin: '0 auto 1rem', display: 'block' }} />
        <h3 style={{ color: 'var(--cip-blue)', fontWeight: '800', marginBottom: '0.5rem' }}>¡Estás al día!</h3>
        <p style={{ color: 'var(--text-muted)' }}>No tienes cuotas pendientes de pago.</p>
      </div>
    );
  }

  // Agrupar por año
  const porAño = {};
  allPeriodos.forEach(p => {
    const año = p.periodo.split('-')[0];
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
                    onClick={() => onToggle(p.periodo)}
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
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {seleccionados.size} mes{seleccionados.size !== 1 ? 'es' : ''} × S/ {parseFloat(montoUnit).toFixed(2)}
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--cip-blue)' }}>
            S/ {total.toFixed(2)}
          </div>
        </div>
      )}

      <button
        onClick={onContinuar}
        disabled={seleccionados.size === 0}
        className="btn btn-primary btn-block"
        style={{
          padding: '0.875rem', fontSize: '1rem', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          opacity: seleccionados.size === 0 ? 0.5 : 1,
          cursor: seleccionados.size === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        <CreditCard size={18} /> Continuar al pago →
      </button>
    </div>
  );
}

// ── Paso: Selección de método ──────────────────────────────────────────────
function StepMetodo({ totalBase, total, onMontoChange, onVolver, onSeleccionar }) {
  const [montoInput, setMontoInput] = useState(total.toFixed(2));
  const [editando, setEditando]     = useState(false);

  const handleMontoBlur = () => {
    const val = parseFloat(montoInput);
    if (!isNaN(val) && val > 0) {
      onMontoChange(Math.round(val * 100) / 100);
      setMontoInput((Math.round(val * 100) / 100).toFixed(2));
    } else {
      setMontoInput(total.toFixed(2));
    }
    setEditando(false);
  };

  const metodos = [
    {
      id: 'TARJETA',
      label: 'Tarjeta de crédito / débito',
      desc: 'Visa, Mastercard o American Express · pago inmediato',
      icon: <CreditCard size={26} />,
      bg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
      badge: 'Inmediato',
    },
    {
      id: 'TRANSFERENCIA',
      label: 'Transferencia / Plin',
      desc: 'Transferencia bancaria o Plin · sube el comprobante',
      icon: <Building2 size={26} />,
      bg: 'linear-gradient(135deg, #0F766E 0%, #0D6F68 100%)',
      badge: 'Revisión 24h',
    },
  ];

  return (
    <div>
      <button onClick={onVolver} style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--text-muted)', background: 'none', border: 'none',
        cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.875rem',
      }}>
        <ArrowLeft size={15} /> Cambiar periodos
      </button>

      <h3 style={{ fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
        ¿Cómo deseas pagar?
      </h3>

      {/* Total editable */}
      <div style={{
        background: '#EFF6FF', border: `1.5px solid ${editando ? 'var(--cip-blue)' : '#BFDBFE'}`,
        borderRadius: '10px', padding: '0.75rem 1rem',
        marginBottom: '1.5rem', marginTop: '0.75rem',
        transition: 'border-color 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.15rem' }}>
              Monto a cobrar
            </p>
            {totalBase !== total && (
              <p style={{ fontSize: '0.68rem', color: '#64748B' }}>
                Base calculada: S/ {totalBase.toFixed(2)}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--cip-blue)' }}>S/</span>
            <input
              type="number"
              min="1"
              step="0.50"
              value={montoInput}
              onFocus={() => { setEditando(true); setMontoInput(total.toFixed(2)); }}
              onChange={e => setMontoInput(e.target.value)}
              onBlur={handleMontoBlur}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()}
              style={{
                width: '110px', padding: '0.4rem 0.6rem',
                border: `1.5px solid ${editando ? 'var(--cip-blue)' : 'transparent'}`,
                borderRadius: '8px', outline: 'none',
                fontSize: '1.5rem', fontWeight: '900', color: 'var(--cip-blue)',
                fontFamily: 'monospace', textAlign: 'right',
                background: editando ? 'white' : 'transparent',
                transition: 'all 0.15s',
              }}
            />
          </div>
        </div>
        <p style={{ fontSize: '0.68rem', color: '#3B82F6', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ✏️ Puedes editar el monto directamente
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {metodos.map(m => (
          <button
            key={m.id}
            onClick={() => onSeleccionar(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem 1.25rem', borderRadius: '12px', border: 'none',
              background: m.bg, color: 'white', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
          >
            <span style={{ flexShrink: 0, opacity: 0.9 }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '800', fontSize: '0.95rem', margin: 0 }}>{m.label}</p>
              <p style={{ fontSize: '0.75rem', margin: '0.1rem 0 0', opacity: 0.85 }}>{m.desc}</p>
            </div>
            <span style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: '999px',
              padding: '0.15rem 0.55rem', fontSize: '0.65rem', fontWeight: '700',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>{m.badge}</span>
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
        <ShieldCheck size={12} /> Pago seguro — datos cifrados
      </p>
    </div>
  );
}

// ── Componente reutilizable: upload de voucher ─────────────────────────────
function VoucherUpload({ archivo, onChange }) {
  return (
    <div>
      <p style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
        📎 Sube el comprobante de tu pago
      </p>
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', padding: '1.25rem', borderRadius: '10px', cursor: 'pointer',
        border: `2px dashed ${archivo ? '#16A34A' : '#CBD5E1'}`,
        background: archivo ? '#F0FDF4' : '#F8FAFC',
        transition: 'all 0.2s',
      }}>
        {archivo
          ? <CheckCheck size={28} color="#16A34A" />
          : <UploadCloud size={28} color="#94A3B8" />
        }
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: archivo ? '#15803D' : '#64748B' }}>
          {archivo ? archivo.name : 'Clic para subir imagen o PDF'}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>JPG, PNG o PDF · máx. 5MB</span>
        <input
          type="file"
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={e => onChange(e.target.files[0] || null)}
        />
      </label>
    </div>
  );
}

// ── Paso: Yape online (flujo transparente — sin redirect, sin login MP) ───────
function StepYape({ total, periodos, onVolver, onExito, onError }) {
  const [telefono, setTelefono]   = useState('');
  const [enviando, setEnviando]   = useState(false);
  const [esperando, setEsperando] = useState(false);
  const [mpId, setMpId]           = useState(null);
  const [errLocal, setErrLocal]   = useState('');
  const pollRef                   = useRef(null);

  // Limpiar polling al desmontar
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const iniciarPolling = (paymentId) => {
    let intentos = 0;
    const MAX = 60; // 60 × 3 s = 3 min
    pollRef.current = setInterval(async () => {
      intentos++;
      if (intentos > MAX) {
        clearInterval(pollRef.current);
        setEsperando(false);
        setErrLocal('Tiempo agotado. No recibimos confirmación de Yape. Intenta de nuevo.');
        return;
      }
      try {
        const token = localStorage.getItem('colToken');
        const periodosStr = periodos.join(',');
        const res = await fetch(`/api/pagos/online/status/${paymentId}?periodos=${encodeURIComponent(periodosStr)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          clearInterval(pollRef.current);
          setEsperando(false);
          onExito(data);
        } else if (data.status === 'rejected' || data.error) {
          clearInterval(pollRef.current);
          setEsperando(false);
          const msg = data.error || 'Pago rechazado por Yape.';
          setErrLocal(msg);
          onError(msg);
        }
        // status === 'pending' → seguir esperando
      } catch { /* error de red — seguir intentando */ }
    }, 3000);
  };

  const handleCancelar = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setEsperando(false);
    setMpId(null);
  };

  const handlePagar = async () => {
    const tel = telefono.trim();
    if (tel.length < 9) { setErrLocal('Ingresa tu número de Yape (9 dígitos).'); return; }
    setErrLocal('');
    setEnviando(true);
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/pagos/online/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ payment_method_id: 'yape', phone: tel, periodos }),
      });
      const data = await res.json();
      if (data.success) {
        onExito(data);
      } else if (data.pending && data.mp_id) {
        setMpId(data.mp_id);
        setEsperando(true);
        iniciarPolling(data.mp_id);
      } else {
        const msg = data.error || 'No se pudo procesar el pago Yape.';
        setErrLocal(msg);
        onError(msg);
      }
    } catch {
      setErrLocal('Error de conexión. Intente de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // ── Pantalla de espera (usuario debe aprobar en su app Yape) ──────────────
  if (esperando) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <Smartphone size={32} color="white" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <p style={{ color: 'white', fontWeight: '800', fontSize: '1.05rem', marginBottom: '0.2rem' }}>Aprueba el pago en Yape</p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>S/ {total.toFixed(2)}</p>
        </div>

        <Loader2 size={40} className="spin" color="#7C3AED" style={{ margin: '0 auto 1rem', display: 'block' }} />

        <p style={{ fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.4rem', fontSize: '1rem' }}>
          Esperando tu confirmación…
        </p>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Abre tu app <strong>Yape</strong>, revisa las notificaciones<br />
          y acepta el cobro de <strong>S/ {total.toFixed(2)}</strong>
        </p>

        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#5B21B6', textAlign: 'left' }}>
          <p>📱 Revisa las notificaciones push de tu app Yape</p>
          <p style={{ marginTop: '0.35rem' }}>⏱️ La solicitud expira en aprox. 3 minutos</p>
          <p style={{ marginTop: '0.35rem' }}>📲 Número enviado: <strong>+51 {telefono}</strong></p>
        </div>

        <button onClick={handleCancelar} style={{
          background: 'none', border: '1px solid #CBD5E1', borderRadius: '8px',
          padding: '0.6rem 1.5rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem',
        }}>
          Cancelar y volver
        </button>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────
  return (
    <div>
      <button onClick={onVolver} style={{ display:'flex', alignItems:'center', gap:'0.4rem', color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', marginBottom:'1.25rem', fontSize:'0.875rem' }}>
        <ArrowLeft size={15} /> Cambiar método
      </button>

      {/* Encabezado */}
      <div style={{ background:'linear-gradient(135deg,#7C3AED,#6D28D9)', borderRadius:'12px', padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'white' }}>
          <Smartphone size={20} />
          <span style={{ fontWeight:'800', fontSize:'1rem' }}>Pago con Yape</span>
        </div>
        <span style={{ color:'white', fontWeight:'900', fontSize:'1.4rem' }}>S/ {total.toFixed(2)}</span>
      </div>

      {/* Cómo funciona */}
      <div style={{ background:'#F5F3FF', border:'1.5px solid #DDD6FE', borderRadius:'12px', padding:'0.9rem 1.1rem', marginBottom:'1.25rem' }}>
        <p style={{ fontWeight:'800', fontSize:'0.82rem', color:'#5B21B6', marginBottom:'0.5rem' }}>¿Cómo funciona?</p>
        {[
          '1. Ingresa tu número Yape (9 dígitos)',
          '2. Haz clic en "Pagar con Yape"',
          '3. Recibirás una notificación en tu app Yape',
          '4. Acepta el cobro · el pago queda registrado ✓',
        ].map((s, i) => (
          <p key={i} style={{ fontSize:'0.78rem', color:'#6D28D9', marginBottom:'0.15rem' }}>{s}</p>
        ))}
      </div>

      {/* Input teléfono */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
          📱 Tu número de Yape
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#7C3AED', fontWeight: '700', fontSize: '0.9rem', pointerEvents: 'none' }}>
            +51
          </span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={9}
            value={telefono}
            onChange={e => { setTelefono(e.target.value.replace(/\D/g, '')); setErrLocal(''); }}
            placeholder="999 888 777"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.875rem 1rem 0.875rem 3.25rem',
              border: '2px solid #DDD6FE', borderRadius: '10px', outline: 'none',
              fontSize: '1.1rem', fontWeight: '700', letterSpacing: '1.5px',
              background: '#FAFAFA', color: 'var(--text-main)', transition: 'border 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#7C3AED'; e.target.style.background = 'white'; }}
            onBlur={e => { e.target.style.borderColor = '#DDD6FE'; e.target.style.background = '#FAFAFA'; }}
          />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          El número de 9 dígitos registrado en tu app Yape
        </p>
      </div>

      {/* Periodos */}
      <div style={{ background:'#EDE9FE', borderRadius:'8px', padding:'0.6rem 1rem', marginBottom:'1.25rem', fontSize:'0.8rem', color:'#5B21B6' }}>
        <strong>Periodos:</strong> {periodos.map(p => fmtPeriodo(p)).join(', ')}
      </div>

      {errLocal && (
        <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'0.75rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.875rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink:0 }} /> {errLocal}
        </div>
      )}

      <button
        onClick={handlePagar}
        disabled={enviando || telefono.length < 9}
        style={{
          width:'100%', padding:'1rem', border:'none', borderRadius:'10px',
          background: (enviando || telefono.length < 9) ? '#C4B5FD' : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
          color:'white', fontWeight:'800', fontSize:'1.05rem',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem',
          cursor: (enviando || telefono.length < 9) ? 'not-allowed' : 'pointer',
          boxShadow: (enviando || telefono.length < 9) ? 'none' : '0 4px 14px rgba(109,40,217,0.4)',
          transition:'all 0.2s',
        }}
      >
        {enviando
          ? <><Loader2 size={18} className="spin" /> Enviando solicitud…</>
          : <><Smartphone size={18} /> Pagar con Yape</>
        }
      </button>

      <p style={{ textAlign:'center', fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.75rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem' }}>
        <ShieldCheck size={12} /> Sin redirects · Sin cuenta MP · Registro automático
      </p>
    </div>
  );
}

// ── Paso: Transferencia bancaria ───────────────────────────────────────────
function StepTransferencia({ total, periodos, onVolver, onExito, onError }) {
  const [voucher, setVoucher]   = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errLocal, setErrLocal] = useState('');

  const handleEnviar = async () => {
    if (!voucher) { setErrLocal('Debes subir el comprobante de transferencia.'); return; }
    setErrLocal('');
    setEnviando(true);
    try {
      const token = localStorage.getItem('colToken');
      const fd = new FormData();
      fd.append('periodos', JSON.stringify(periodos));
      fd.append('metodo', 'TRANSFERENCIA');
      fd.append('voucher', voucher);

      const res = await fetch('/api/portal/pago-voucher/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) onExito(data);
      else { setErrLocal(data.error || 'Error al enviar comprobante.'); onError(data.error || ''); }
    } catch {
      const msg = 'Error de conexión. Intente de nuevo.';
      setErrLocal(msg);
      onError(msg);
    } finally {
      setEnviando(false);
    }
  };

  // Datos bancarios CIP (ajusta con los datos reales)
  const cuentas = [
    { banco: '🏦 BCP', tipo: 'Cuenta Corriente', numero: '215-2205555-0-54', cci: '002 215 002205555054 20' },
    { banco: '🏦 Interbank', tipo: 'Cuenta Corriente', numero: '200-3001234567', cci: '003 200 003001234567 34' },
  ];

  return (
    <div>
      <button onClick={onVolver} style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--text-muted)', background: 'none', border: 'none',
        cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.875rem',
      }}>
        <ArrowLeft size={15} /> Cambiar método
      </button>

      <h3 style={{ fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem', fontSize: '1rem' }}>
        🏦 Transferencia bancaria
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Realiza la transferencia al banco de tu preferencia, luego sube el comprobante.
      </p>

      {/* Monto destacado */}
      <div style={{
        background: 'linear-gradient(135deg, #0F766E, #0D6F68)', borderRadius: '10px',
        padding: '0.75rem 1.25rem', marginBottom: '1rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>Monto exacto a transferir</span>
        <span style={{ color: 'white', fontWeight: '900', fontSize: '1.3rem' }}>S/ {total.toFixed(2)}</span>
      </div>

      {/* Cuentas bancarias */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {cuentas.map((c, i) => (
          <div key={i} style={{
            border: '1px solid #E2E8F0', borderRadius: '10px',
            padding: '0.75rem 1rem', background: 'white',
          }}>
            <p style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>{c.banco}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.78rem' }}>
              <div>
                <p style={{ color: '#64748B', marginBottom: '0.1rem' }}>Tipo</p>
                <p style={{ fontWeight: '600', color: '#1E293B' }}>{c.tipo}</p>
              </div>
              <div>
                <p style={{ color: '#64748B', marginBottom: '0.1rem' }}>N° Cuenta</p>
                <p style={{ fontWeight: '700', color: '#1E293B', fontFamily: 'monospace' }}>{c.numero}</p>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <p style={{ color: '#64748B', marginBottom: '0.1rem' }}>CCI (Código Interbancario)</p>
                <p style={{ fontWeight: '700', color: '#1E293B', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{c.cci}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Titular */}
        <div style={{ background: '#F1F5F9', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
          <span style={{ color: '#64748B' }}>Titular: </span>
          <span style={{ fontWeight: '700', color: '#1E293B' }}>Consejo Departamental La Libertad — CIP</span>
        </div>
      </div>

      {/* Upload voucher */}
      <div style={{ marginBottom: '1.25rem' }}>
        <VoucherUpload archivo={voucher} onChange={setVoucher} />
      </div>

      {errLocal && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errLocal}
        </div>
      )}

      <button
        onClick={handleEnviar}
        disabled={enviando || !voucher}
        className="btn btn-block"
        style={{
          padding: '0.9rem', fontSize: '1rem', border: 'none', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0F766E, #0D6F68)', color: 'white', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          opacity: (enviando || !voucher) ? 0.6 : 1,
          cursor: (enviando || !voucher) ? 'not-allowed' : 'pointer',
        }}
      >
        {enviando ? <><Loader2 size={18} className="spin" /> Enviando…</> : <><UploadCloud size={18} /> Enviar comprobante</>}
      </button>
    </div>
  );
}

// ── Paso: Tarjeta (MercadoPago Bricks) ────────────────────────────────────
function StepTarjeta({ total, periodos, onVolver, onExito, onError }) {
  const [mpListo, setMpListo]       = useState(false);
  const [cargandoMP, setCargandoMP] = useState(true);
  const [errLocal, setErrLocal]     = useState('');

  useEffect(() => {
    fetch('/api/pagos/mp-config/')
      .then(r => r.json())
      .then(d => { initMercadoPago(d.public_key, { locale: 'es-PE' }); setMpListo(true); })
      .catch(() => setErrLocal('No se pudo cargar la pasarela de pago.'))
      .finally(() => setCargandoMP(false));
  }, []);

  const handleSubmit = async (formData) => {
    setErrLocal('');
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/pagos/online/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          token:             formData.token,
          payment_method_id: formData.payment_method_id,
          installments:      formData.installments,
          issuer_id:         formData.issuer_id,
          periodos,
          email:             formData.payer?.email,
        }),
      });
      const data = await res.json();
      if (data.success) onExito(data);
      else { const msg = data.error || 'No se pudo procesar el pago.'; setErrLocal(msg); onError(msg); }
    } catch {
      const msg = 'Error de conexión. Intente de nuevo.';
      setErrLocal(msg);
      onError(msg);
    }
  };

  return (
    <div>
      <button onClick={onVolver} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
        <ArrowLeft size={15} /> Cambiar método
      </button>

      <div style={{ background: '#EFF6FF', borderRadius: '8px', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total a cobrar</span>
        <span style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--cip-blue)' }}>S/ {total.toFixed(2)}</span>
      </div>

      {cargandoMP && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto', display: 'block', color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Cargando pasarela de pago…</p>
        </div>
      )}

      {errLocal && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errLocal}
        </div>
      )}

      {mpListo && (
        <CardPayment
          initialization={{ amount: total }}
          customization={{ paymentMethods: { minInstallments: 1, maxInstallments: 1 } }}
          onSubmit={handleSubmit}
          onError={(err) => setErrLocal(err.message || 'Error en la pasarela de pago.')}
        />
      )}

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
        <ShieldCheck size={12} /> Pago procesado por MercadoPago · Datos cifrados
      </p>
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
function StepExito({ resultado, onNuevoPago }) {
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

      <button onClick={onNuevoPago} className="btn btn-primary btn-block" style={{ padding: '0.8rem' }}>
        Ver historial de pagos
      </button>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function MisPagos() {
  const [tab, setTab]                     = useState('pagar');
  const [cargando, setCargando]           = useState(true);
  const [error, setError]                 = useState('');

  const [pendientes, setPendientes]       = useState([]);
  const [historial, setHistorial]         = useState([]);
  const [habilitado, setHabilitado]       = useState(null);
  const [montoUnit, setMontoUnit]         = useState('20.00');

  // paso: 'periodos' | 'metodo' | 'tarjeta' | 'yape' | 'transferencia' | 'pendiente' | 'exito'
  const [paso, setPaso]                   = useState('periodos');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [montoCustom, setMontoCustom]     = useState(null); // null = cálculo automático
  const [errPago, setErrPago]             = useState('');
  const [resultadoPago, setResultadoPago] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

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
      setHabilitado(data.habilitado ?? null);
      setMontoUnit(data.monto_mensualidad || '20.00');
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
        setHabilitado(d.habilitado ?? null);
        setMontoUnit(d.monto_mensualidad || '20.00');
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
              {errPago && paso === 'periodos' && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <span>{errPago}</span>
                </div>
              )}
              {paso === 'periodos' && (
                <StepPeriodos
                  pendientes={pendientes}
                  historial={historial}
                  seleccionados={seleccionados}
                  onToggle={p => setSeleccionados(prev => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; })}
                  onSelAll={(set) => setSeleccionados(set)}
                  onSelSoloDeuda={() => setSeleccionados(new Set(pendientes.map(p => p.periodo)))}
                  onDeselAll={() => setSeleccionados(new Set())}
                  montoUnit={montoUnit}
                  onContinuar={() => { setErrPago(''); setPaso('metodo'); }}
                />
              )}
              {paso === 'metodo' && (
                <StepMetodo
                  totalBase={totalBase}
                  total={totalSeleccionado}
                  onMontoChange={(v) => setMontoCustom(v)}
                  onVolver={() => { setPaso('periodos'); setMontoCustom(null); }}
                  onSeleccionar={(m) => {
                    setErrPago('');
                    if (m === 'TARJETA')        setPaso('tarjeta');
                    else if (m === 'YAPE')       setPaso('yape');
                    else                         setPaso('transferencia');
                  }}
                />
              )}
              {paso === 'tarjeta' && (
                <StepTarjeta
                  total={totalSeleccionado}
                  periodos={periodosArray}
                  onVolver={() => setPaso('metodo')}
                  onExito={(data) => { setResultadoPago(data); setPaso('exito'); }}
                  onError={(msg) => setErrPago(msg)}
                />
              )}
              {paso === 'transferencia' && (
                <StepTransferencia
                  total={totalSeleccionado}
                  periodos={periodosArray}
                  onVolver={() => setPaso('metodo')}
                  onExito={(data) => { setResultadoPago(data); setPaso('pendiente'); }}
                  onError={(msg) => setErrPago(msg)}
                />
              )}
              {paso === 'pendiente' && (
                <StepPendiente resultado={resultadoPago} onVerHistorial={handleNuevoPago} />
              )}
              {paso === 'exito' && (
                <StepExito resultado={resultadoPago} onNuevoPago={handleNuevoPago} />
              )}
            </>
          )}

          {/* ── Tab: Historial ── */}
          {tab === 'historial' && (
            historial.length === 0 ? (
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
            )
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
